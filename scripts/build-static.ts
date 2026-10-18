#!/usr/bin/env bun
/**
 * build:static — Static export for Capacitor/native builds.
 *
 * 1. Auto-generates page.static.tsx + fallback components for dynamic routes
 *    (same as generate:static — no need to run separately)
 * 2. Swaps every (page|layout|not-found).static.(tsx|ts) into place — e.g.
 *    app/layout.static.tsx becomes the export's single root layout and
 *    app/[locale]/layout.static.tsx a nested layout without <html>/<body>
 * 3. Hides dynamic route dirs
 * 4. Hides the paths listed in ignoreInStatic.json (falls back to removing all API routes)
 * 5. Runs `next build` with output: "export" and checks out/index.html
 * 6. Restores all original files (even on failure or Ctrl-C), then regenerates
 *    .next/types for the restored tree (`next typegen`)
 * 7. If `next dev` is running (it holds .next/dev/lock), re-touches the restored
 *    paths so its file watcher drops the static tree, and waits until it has
 *    rewritten .next/dev/types for the restored tree
 *
 * Usage:
 *   bun scripts/build-static.ts [options]
 *
 * Options:
 *   --dry-run    Show what would be done without modifying files
 *   --verbose    Print detailed file operations
 *   --generate   Only generate static pages, don't build
 *   --help       Show this help message
 */

import { execSync, spawnSync } from "child_process";
import { existsSync, renameSync, unlinkSync, writeFileSync, readFileSync, readdirSync, statSync, mkdirSync, rmdirSync, rmSync } from "fs";
import { join, relative, dirname, basename } from "path";

const ROOT = join(import.meta.dir, "..");
const APP_DIR = join(ROOT, "app");
const BACKUP_DIR = join(ROOT, ".static-build-backup");
const HIDDEN_SUFFIX = ".__hidden__";
const IGNORED_SUFFIX = ".__static_ignore__";
// 构建时换入的变体:page / layout / not-found 的 .static.(tsx|ts)
const STATIC_VARIANT_RE = /^(page|layout|not-found)\.static\.(tsx|ts)$/;
// next dev 运行期间持有这个锁(正常退出时删掉);它的路由表和 .next/dev/types 都跟着自己的文件监听走
const DEV_LOCK = join(ROOT, ".next", "dev", "lock");
const ROUTE_TYPES = join(ROOT, ".next", "types", "routes.d.ts");
const DEV_ROUTE_TYPES = join(ROOT, ".next", "dev", "types", "routes.d.ts");
const DEV_RESYNC_ROUNDS = 2;
const DEV_RESYNC_WAIT_MS = 5000;

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const verbose = args.includes("--verbose");
const generateOnly = args.includes("--generate");
if (args.includes("--help")) {
  console.log(`
  build:static — Static export for Capacitor/native builds

  Usage:  bun scripts/build-static.ts [options]

  Options:
    --dry-run    Show what would be done without modifying files
    --verbose    Print detailed file operations
    --generate   Only generate static pages, don't build
    --help       Show this help message

  How it works:
    1. Generates page.static.tsx for dynamic routes (if missing)
    2. Swaps (page|layout|not-found).static.tsx → .tsx during build
    3. Hides dynamic route dirs
    4. Hides ignoreInStatic.json paths (or removes all API routes)
    5. Runs next build → ./out/
    6. Restores all files and regenerates .next/types (next typegen)
    7. Resyncs a running next dev with the restored tree
  `);
  process.exit(0);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

interface Move {
  original: string;
  hidden: string;
}

function findFilesRecursive(dir: string, match: (name: string) => boolean): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...findFilesRecursive(full, match));
    } else if (match(entry)) {
      results.push(full);
    }
  }
  return results;
}

// [locale] 段是"静态化的动态段"(generateStaticParams 固定返回 BUILD_LOCALES),
// 静态导出完全支持,不算需要隐藏/生成 fallback 的动态路由
function isDynamicPath(p: string): boolean { return p.split("[locale]").join("").includes("["); }
function rel(p: string) { return relative(ROOT, p); }
/** p 是 dir 本身或位于 dir 之内 */
function isInside(p: string, dir: string): boolean { return p === dir || p.startsWith(dir + "/"); }
function errorMessage(err: unknown): string { return err instanceof Error ? err.message : String(err); }

function extractParams(filePath: string): string[] {
  // Handles [id], catch-all [...slug], and optional catch-all [[...slug]]
  const matches = [...filePath.matchAll(/\[\[?(?:\.\.\.)?([a-zA-Z][a-zA-Z0-9]*)\]\]?/g)];
  return matches.map((m) => m[1]).filter((p) => p !== "locale");
}

function findParentRoute(filePath: string): string {
  const parts = relative(APP_DIR, dirname(filePath)).split("/");
  const staticParts: string[] = [];
  for (const part of parts) {
    if (part === "[locale]") continue; // 语言段不算动态,继续往下取父路由
    if (part.includes("[")) break;
    if (part.startsWith("(") && part.endsWith(")")) continue;
    staticParts.push(part);
  }
  return "/" + staticParts.join("/") || "/";
}

/** 上次构建被强杀、没走到恢复步骤时留下的备份目录与隐藏文件/目录 */
function findLeftovers(): string[] {
  const found: string[] = existsSync(BACKUP_DIR) ? [rel(BACKUP_DIR)] : [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (entry.endsWith(HIDDEN_SUFFIX) || entry.endsWith(IGNORED_SUFFIX)) found.push(rel(full));
      else if (statSync(full).isDirectory()) walk(full);
    }
  };
  if (existsSync(APP_DIR)) walk(APP_DIR);
  return found;
}

/** ignoreInStatic.json 形如 {"ignore": ["app/api", "app/x/**"]}(路径或 glob);文件不存在返回 null */
function loadIgnorePatterns(): string[] | null {
  const configPath = join(ROOT, "ignoreInStatic.json");
  if (!existsSync(configPath)) return null;
  const config: unknown = JSON.parse(readFileSync(configPath, "utf-8"));
  const patterns = typeof config === "object" && config !== null ? (config as { ignore?: unknown }).ignore : undefined;
  if (!Array.isArray(patterns) || !patterns.every((p): p is string => typeof p === "string")) {
    throw new Error('ignoreInStatic.json must look like {"ignore": ["app/api", ...]}');
  }
  return patterns;
}

function expandIgnorePatterns(patterns: string[]): string[] {
  const paths: string[] = [];
  for (const pattern of patterns) {
    if (pattern.includes("*") || pattern.includes("?") || pattern.includes("{")) {
      const glob = new Bun.Glob(pattern);
      for (const match of glob.scanSync({ cwd: ROOT, onlyFiles: false })) {
        paths.push(join(ROOT, match));
      }
    } else {
      paths.push(join(ROOT, pattern));
    }
  }
  return paths;
}

/** 所有最外层的动态路由目录([locale] 除外),改名为 _x_.__hidden__(下划线开头 = Next 私有目录) */
function collectDirsToHide(): Move[] {
  const dynamicDirs: string[] = [];
  const collect = (dir: string) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (!statSync(full).isDirectory()) continue;
      if (entry.includes("[") && entry !== "[locale]") dynamicDirs.push(full);
      collect(full);
    }
  };
  collect(APP_DIR);
  const topLevel = dynamicDirs.filter((d) =>
    !dynamicDirs.some((other) => other !== d && isInside(d, other))
  );
  // 只改最后一段目录名(路径上层可能含 [locale],整条替换会指向不存在的父目录)
  return topLevel.map((dir) => ({
    original: dir,
    hidden: join(dirname(dir), basename(dir).replace(/\[/g, "_").replace(/\]/g, "_") + HIDDEN_SUFFIX),
  }));
}

// ─── Backup/Restore ─────────────────────────────────────────────────────────

const backedUpFiles: string[] = [];
const generatedFiles: string[] = [];
const swappedTargets: string[] = [];
const dirsHidden: Move[] = [];
const ignoredHidden: Move[] = [];

function backupFile(filePath: string) {
  if (!existsSync(filePath)) return;
  const backupPath = join(BACKUP_DIR, rel(filePath));
  mkdirSync(dirname(backupPath), { recursive: true });
  writeFileSync(backupPath, readFileSync(filePath));
  backedUpFiles.push(filePath);
}

/** 从备份逐个放回;全部成功才删备份目录,返回失败项(备份保留) */
function restoreBackups(): string[] {
  const problems: string[] = [];
  for (const filePath of backedUpFiles) {
    const backupPath = join(BACKUP_DIR, rel(filePath));
    if (!existsSync(backupPath)) continue;
    try {
      if (existsSync(filePath)) unlinkSync(filePath);
      renameSync(backupPath, filePath);
      if (verbose) console.log(`  restored: ${rel(filePath)}`);
    } catch (err) {
      problems.push(`${rel(filePath)} (backup kept in ${rel(BACKUP_DIR)}): ${errorMessage(err)}`);
    }
  }
  if (problems.length === 0) rmSync(BACKUP_DIR, { recursive: true, force: true });
  return problems;
}

/** 撤销本次构建的全部改动:先放回隐藏的文件/目录,再删换入的文件、从备份还原,最后删生成的文件;全部还原返回 true */
function restoreAll(): boolean {
  console.log("🔄 Restoring original files...");
  const problems: string[] = [];
  const attempt = (what: string, fn: () => void) => {
    try {
      fn();
    } catch (err) {
      problems.push(`${what}: ${errorMessage(err)}`);
    }
  };
  for (const { original, hidden } of [...ignoredHidden, ...dirsHidden]) {
    if (!existsSync(hidden)) continue;
    if (existsSync(original)) {
      problems.push(`${rel(hidden)} not moved back: ${rel(original)} already exists`);
      continue;
    }
    attempt(rel(original), () => renameSync(hidden, original));
  }
  for (const target of swappedTargets) {
    if (existsSync(target)) attempt(rel(target), () => unlinkSync(target));
  }
  problems.push(...restoreBackups());
  for (const f of generatedFiles) {
    if (!existsSync(f)) continue;
    attempt(rel(f), () => unlinkSync(f));
    if (verbose) console.log(`  deleted: ${rel(f)}`);
  }
  if (problems.length > 0) {
    console.error(`❌ Some files could not be restored — fix them by hand:\n${problems.map((p) => `   ${p}`).join("\n")}\n`);
    process.exitCode = 1;
    return false;
  }
  console.log("✅ All files restored.\n");
  return true;
}

/**
 * next build 按换入后的静态树重写了 .next/types(routes.d.ts、validator.ts),tsconfig 又 include 它们:
 * 不按还原后的 web 树重新生成,tsc 会报找不到只在静态树里存在的 app/layout、app/page。
 * next typegen 只扫描路由文件写类型(不编译、不动源码);去掉 NEXT_OUTPUT,按 web 配置生成。
 * .next/dev/types(tsconfig 同样 include)归运行中的 next dev 自己重写,见 resyncDevServer。成功返回 true
 */
function regenerateRouteTypes(): boolean {
  console.log("🔄 Regenerating .next/types for the restored tree (next typegen)...");
  const env = { ...process.env };
  delete env.NEXT_OUTPUT;
  try {
    execSync("bun next typegen", { cwd: ROOT, stdio: "inherit", env });
    return true;
  } catch (err) {
    console.error(`❌ next typegen failed — .next/types still describes the static tree; run \`bun next typegen\` before tsc: ${errorMessage(err)}\n`);
    process.exitCode = 1;
    return false;
  }
}

// ─── Running next dev ───────────────────────────────────────────────────────

/**
 * 正在运行的 next dev 一直打开着 .next/dev/lock:返回这些进程的 pid,没有 dev server 返回 null
 * (锁文件还在但没人打开 = 上次 dev 被强杀留下的)。没装 lsof 时只能凭锁文件存在判断,返回空数组
 */
function findDevServer(): string[] | null {
  if (!existsSync(DEV_LOCK)) return null;
  const lsof = spawnSync("lsof", ["-t", "--", DEV_LOCK], { encoding: "utf-8" });
  if (lsof.error) return [];
  const pids = lsof.stdout.split("\n").filter(Boolean);
  return pids.length > 0 ? pids : null;
}

function devServerLabel(pids: string[]): string {
  return pids.length > 0 ? `next dev (pid ${pids.join(", ")})` : "next dev";
}

/**
 * 戳一遍 next dev 的文件监听(它自己的路由表 + Turbopack),让它按当前的树重新看这些路径:
 * 还原回来的文件/目录按各自的时间 touch(内容、mtime 都不变,只产生文件事件);
 * 换入后已不存在的路径瞬时 mkdir + rmdir(用目录而不是空文件,监听赶上了也不会被当成 layout/page 编译)。
 * 返回没戳成功的路径
 */
function nudgeDevWatchers(): string[] {
  const failures: string[] = [];
  const restored = new Set([...dirsHidden, ...ignoredHidden].map((m) => m.original).concat(backedUpFiles));
  for (const p of restored) {
    if (!existsSync(p)) continue;
    const touch = spawnSync("touch", ["-c", "-r", p, p], { encoding: "utf-8" });
    if (touch.error || touch.status !== 0) {
      failures.push(`${rel(p)}: ${touch.error ? errorMessage(touch.error) : touch.stderr.trim()}`);
    }
  }
  for (const p of swappedTargets) {
    if (existsSync(p) || !existsSync(dirname(p))) continue;
    try {
      mkdirSync(p);
      rmdirSync(p);
    } catch (err) {
      failures.push(`${rel(p)}: ${errorMessage(err)}${existsSync(p) ? " — remove this directory by hand" : ""}`);
    }
  }
  return failures;
}

/** next dev 按当前的树重扫路由后重写 .next/dev/types/routes.d.ts,内容与 typegen 生成的逐字节相同;缺任一文件返回 null */
function devRouteTypesMatch(): boolean | null {
  if (!existsSync(ROUTE_TYPES) || !existsSync(DEV_ROUTE_TYPES)) return null;
  return readFileSync(DEV_ROUTE_TYPES, "utf-8") === readFileSync(ROUTE_TYPES, "utf-8");
}

/**
 * next dev 的文件监听看得到这次换入,却可能漏掉还原(next build 刚往 out/、.next 写完大批文件,FSEvents 可能丢事件)。
 * 漏掉后它继续按静态树的路由表服务(API 路由 404),.next/dev/types 也停在静态树(tsc 报 app/layout、app/page 找不到)。
 * 还原后戳它的监听,并等它把 .next/dev/types/routes.d.ts 重写成与刚 typegen 出的 .next/types 一致
 * (没等到就再戳一轮);typesFresh 为 false 时没有可比的基准,只戳一次
 */
function resyncDevServer(pids: string[], typesFresh: boolean) {
  const label = devServerLabel(pids);
  console.log(`🔄 Re-touching the restored paths so ${label} drops the static tree...`);
  const verify = typesFresh && devRouteTypesMatch() !== null;
  const failures = new Set<string>();
  let synced = false;
  for (let round = 0; round < DEV_RESYNC_ROUNDS && !synced; round++) {
    for (const failure of nudgeDevWatchers()) failures.add(failure);
    if (!verify) break;
    const deadline = Date.now() + DEV_RESYNC_WAIT_MS;
    while (!synced && Date.now() < deadline) {
      Bun.sleepSync(250);
      synced = devRouteTypesMatch() === true;
    }
  }
  if (failures.size > 0) {
    console.error(`⚠ Could not re-touch — ${label} may not see these:\n${[...failures].map((f) => `   ${f}`).join("\n")}`);
  }
  if (synced) {
    console.log(`✅ ${label} has picked up the restored tree.\n`);
  } else if (!verify) {
    console.log(`   Not verified (needs a freshly generated ${rel(ROUTE_TYPES)} and an existing ${rel(DEV_ROUTE_TYPES)}) — restart ${label} if it still serves the static tree.\n`);
  } else {
    console.error(`⚠ ${label} still has the static tree after ${(DEV_RESYNC_ROUNDS * DEV_RESYNC_WAIT_MS) / 1000}s (${rel(DEV_ROUTE_TYPES)} differs from ${rel(ROUTE_TYPES)}) — restart it before using it or running tsc.\n`);
  }
}

// ─── Step 1: Generate static pages ─────────────────────────────────────────

function generateStaticPages() {
  console.log("\n📄 Step 1: Generate static pages for dynamic routes\n");

  const allPages = findFilesRecursive(APP_DIR, (n) => n === "page.tsx" || n === "page.ts");
  const dynamicPages = allPages.filter((p) => isDynamicPath(p));
  let generated = 0;

  for (const pagePath of dynamicPages) {
    const dir = dirname(pagePath);
    const ext = pagePath.endsWith(".ts") ? "ts" : "tsx";
    const staticPath = join(dir, `page.static.${ext}`);
    const contentPath = join(dir, "page-content.tsx");
    const params = extractParams(pagePath);
    const parentRoute = findParentRoute(pagePath);
    const paramType = `{ ${params.map((p) => `${p}: string`).join("; ")} }`;

    if (existsSync(staticPath)) {
      if (verbose) console.log(`  · ${rel(staticPath)} — exists, skip`);
      continue;
    }

    const hasContent = existsSync(contentPath);
    let pageCode: string;
    let helperPath: string;
    let helperCode: string;

    if (hasContent) {
      pageCode = `// Auto-generated by build:static
import { Suspense } from "react";
import Content from "./page-content-static";

export function generateStaticParams() { return []; }
export const dynamicParams = false;

export default function StaticPage() {
  return <Suspense><Content /></Suspense>;
}
`;
      helperPath = join(dir, "page-content-static.tsx");
      helperCode = `"use client";
import { useRouteParams } from "@/lib/use-route-params";
import PageContent from "./page-content";

export default function Wrapper() {
  const params = useRouteParams<${paramType}>();
${params.map((p) => `  const ${p} = params.${p};`).join("\n")}
  if (${params.map((p) => `!${p}`).join(" || ")}) return null;
  return <PageContent ${params.map((p) => `${p}={${p}}`).join(" ")} />;
}
`;
    } else {
      pageCode = `// Auto-generated by build:static
import { Suspense } from "react";
import Fallback from "./static-fallback";

export function generateStaticParams() { return []; }
export const dynamicParams = false;

export default function StaticPage() {
  return <Suspense><Fallback /></Suspense>;
}
`;
      helperPath = join(dir, "static-fallback.tsx");
      helperCode = `"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRouteParams } from "@/lib/use-route-params";

export default function StaticFallback() {
  const router = useRouter();
  const params = useRouteParams<${paramType}>();
${params.map((p) => `  const ${p} = params.${p};`).join("\n")}

  useEffect(() => {
    if (${params.map((p) => `!${p}`).join(" && ")}) {
      router.replace("${parentRoute}");
    }
  }, [${params.join(", ")}, router]);

  if (${params.map((p) => `!${p}`).join(" && ")}) return null;

  return (
    <div className="flex h-full items-center justify-center text-muted-foreground text-sm p-4 text-center">
      <p>This page requires a server. Open in browser to access.</p>
    </div>
  );
}
`;
    }

    console.log(`  ${hasContent ? "✦" : "○"} ${rel(staticPath)} — ${hasContent ? "page-content.tsx" : "fallback"} (${params.join(", ")})`);
    if (!dryRun) {
      generatedFiles.push(staticPath, helperPath);
      writeFileSync(staticPath, pageCode);
      writeFileSync(helperPath, helperCode);
    }
    generated++;
  }

  console.log(`  ${generated} generated, ${dynamicPages.length - generated} already exist`);
}

// ─── Main ───────────────────────────────────────────────────────────────────

// 上次构建若被强杀,源码树里还留着隐藏的路由与备份:先人工恢复,否则这次恢复不到它们
const leftovers = findLeftovers();
if (leftovers.length > 0) {
  console.error(`\n❌ Leftovers of an interrupted build:\n${leftovers.map((l) => `   ${l}`).join("\n")}\n   Rename them back (drop the ${HIDDEN_SUFFIX} / ${IGNORED_SUFFIX} suffix, copy files out of ${rel(BACKUP_DIR)}) and retry.\n`);
  process.exit(1);
}

let ignorePatterns: string[] | null;
try {
  ignorePatterns = loadIgnorePatterns();
} catch (err) {
  console.error(`\n❌ ${errorMessage(err)}\n`);
  process.exit(1);
}

if (generateOnly) {
  generateStaticPages();
  console.log("\n  --generate flag: skipping build.\n");
  process.exit(0);
}

// Ctrl-C / kill:next build 子进程随之退出、execSync 抛错,照常走 finally 恢复源码后再以非 0 退出
// (不注册监听时进程会被直接杀掉,隐藏的路由和换入的文件都留在源码树里)
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    console.error(`\n⚠ ${signal} received`);
    process.exitCode = signal === "SIGINT" ? 130 : 143;
  });
}

// next dev 在跑也照常打包(开发中要随时能出包),只是它会跟着换入的静态树走,还原后由 resyncDevServer 拉回来
const devServerAtStart = dryRun ? null : findDevServer();
if (devServerAtStart !== null) {
  console.log(`\n⚠ ${devServerLabel(devServerAtStart)} is running: it serves the swapped-in static tree while this build runs;\n   the restored paths are re-touched afterwards so its file watcher picks them up again.`);
}

// next build 一启动就按静态树重写 .next/types,还原源码后要跟着重新生成
let nextBuildStarted = false;

try {
  generateStaticPages();

  // ─── Step 2: Collect files to process ─────────────────────────────────────

  // Re-scan after generation
  const staticVariants = findFilesRecursive(APP_DIR, (n) => STATIC_VARIANT_RE.test(n));

  // Hide ALL top-level dynamic dirs — Next.js can't handle nested routes
  // under dynamic segments in static export even with generateStaticParams
  const dirsToHide = collectDirsToHide();
  // 已随动态目录整体隐藏的路径不再单独处理(目录改名后再动它们会 ENOENT)
  const insideHiddenDir = (p: string) => dirsToHide.some((d) => isInside(p, d.original));

  if (ignorePatterns === null) {
    console.log("  ⚠ ignoreInStatic.json not found — falling back to removing all API routes");
  }

  // Route handlers inside ignored paths (directories: only route.ts/tsx, keeping supporting files like core.ts)
  const ignoredToHide: Move[] = [];
  const seen = new Set<string>();
  for (const p of expandIgnorePatterns(ignorePatterns ?? [])) {
    if (!existsSync(p)) continue;
    const files = statSync(p).isDirectory()
      ? findFilesRecursive(p, (n) => n === "route.ts" || n === "route.tsx")
      : [p];
    for (const file of files) {
      if (seen.has(file) || insideHiddenDir(file)) continue;
      seen.add(file);
      ignoredToHide.push({ original: file, hidden: file + IGNORED_SUFFIX });
    }
  }

  // API routes (fallback when there is no ignoreInStatic.json)
  const apiRoutes = ignorePatterns === null
    ? findFilesRecursive(join(APP_DIR, "api"), (n) => n === "route.ts").filter((p) => !insideHiddenDir(p))
    : [];

  console.log(`
📦 Step 2: Build static${dryRun ? " (dry run)" : ""}
   ${staticVariants.length} .static.tsx swap(s)
   ${dirsToHide.length} dynamic dir(s) to hide
   ${ignoredToHide.length} path(s) to hide from ignoreInStatic.json
   ${apiRoutes.length} API route(s) to remove (fallback)
`);

  // ─── Step 3: Execute ──────────────────────────────────────────────────────

  // Swap (page|layout|not-found).static.(tsx|ts) → (page|layout|not-found).(tsx|ts)
  for (const staticPath of staticVariants) {
    const targetPath = staticPath.replace(/\.static\.(tsx|ts)$/, ".$1");
    console.log(`  ✦ ${rel(targetPath)} → swap`);
    if (dryRun) continue;
    let content = readFileSync(staticPath, "utf-8");
    // 只给动态段下的 page 补空 generateStaticParams;layout / not-found 原样换入
    if (basename(staticPath).startsWith("page.") && isDynamicPath(staticPath) && !content.includes("generateStaticParams")) {
      const gsp = `\nexport function generateStaticParams() { return []; }\n`;
      content = gsp + content;
    }
    backupFile(targetPath);
    swappedTargets.push(targetPath);
    writeFileSync(targetPath, content);
    backupFile(staticPath);
    if (existsSync(staticPath)) unlinkSync(staticPath);
  }

  // Hide dynamic dirs
  for (const move of dirsToHide) {
    console.log(`  ✕ ${rel(move.original)}/ → hide`);
    if (dryRun || !existsSync(move.original)) continue;
    renameSync(move.original, move.hidden);
    dirsHidden.push(move);
  }

  // Hide ignored paths from ignoreInStatic.json
  for (const move of ignoredToHide) {
    console.log(`  ✕ ${rel(move.original)} → hide (ignoreInStatic.json)`);
    if (dryRun || !existsSync(move.original)) continue;
    renameSync(move.original, move.hidden);
    ignoredHidden.push(move);
  }

  // Remove remaining API routes (fallback when no ignoreInStatic.json)
  for (const routePath of apiRoutes) {
    console.log(`  ✕ ${rel(routePath)} → remove (API)`);
    if (dryRun || !existsSync(routePath)) continue;
    backupFile(routePath);
    unlinkSync(routePath);
  }

  if (dryRun) {
    console.log("\n  (dry run — no build executed)\n");
  } else {
    console.log(`\n🔨 Step 3: next build (output: export)...\n`);
    nextBuildStarted = true;
    execSync("bun next build", {
      cwd: ROOT,
      stdio: "inherit",
      env: {
        ...process.env,
        NEXT_OUTPUT: "static",
        NEXT_PUBLIC_OUTPUT: "static",
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_APP_URL || "",
      },
    });

    // Capacitor 的 webDir 是 out/,App 入口是 out/index.html(app/page.static.tsx)
    console.log("🔍 Step 4: Checking output...\n");
    if (!existsSync(join(ROOT, "out", "index.html"))) {
      throw new Error("out/index.html is missing — the export has no app entry");
    }

    console.log(`\n✅ Static build complete! Output in ./out/\n`);
  }
} catch (err) {
  console.error(`\n❌ Build failed! ${errorMessage(err)}\n`);
  process.exitCode = 1;
} finally {
  if (!dryRun) {
    const restored = restoreAll();
    let routeTypesFresh = false;
    if (nextBuildStarted) {
      if (restored) routeTypesFresh = regenerateRouteTypes();
      else console.error("⚠ .next/types still describes the static tree — run `bun next typegen` once the files above are fixed.\n");
    }
    // 重新检测:构建途中才启动的 next dev 同样可能停在静态树
    const devServer = findDevServer();
    if (devServer !== null) resyncDevServer(devServer, routeTypesFresh);
  }
}

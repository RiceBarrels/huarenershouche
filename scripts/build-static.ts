#!/usr/bin/env bun
/**
 * build:static — Static export for Capacitor/native builds.
 *
 * 1. Auto-generates page.static.tsx + fallback components for dynamic routes
 *    (same as generate:static — no need to run separately)
 * 2. Swaps page.static.tsx → page.tsx everywhere
 * 3. Hides dynamic route dirs that have no static fallback
 * 4. Removes API routes
 * 5. Runs `next build` with output: "export"
 * 6. Restores all original files (even on failure)
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

import { execSync } from "child_process";
import { existsSync, renameSync, unlinkSync, writeFileSync, readFileSync, readdirSync, statSync, mkdirSync } from "fs";
import { join, relative, dirname, basename } from "path";

const ROOT = join(import.meta.dir, "..");
const APP_DIR = join(ROOT, "app");

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
    2. Swaps page.static.tsx → page.tsx during build
    3. Hides dynamic dirs with no static fallback
    4. Removes API routes
    5. Runs next build → ./out/
    6. Restores all files
  `);
  process.exit(0);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

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

// [locale] 段是"静态化的动态段"(generateStaticParams 固定返回 zh/en),
// 静态导出完全支持,不算需要隐藏/生成 fallback 的动态路由
function isDynamicPath(p: string): boolean { return p.split("[locale]").join("").includes("["); }
function rel(p: string) { return relative(ROOT, p); }

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

// ─── Backup/Restore ─────────────────────────────────────────────────────────

const BACKUP_DIR = join(ROOT, ".static-build-backup");
const backedUpFiles: string[] = [];

function backupFile(filePath: string) {
  if (!existsSync(filePath)) return;
  const backupPath = join(BACKUP_DIR, rel(filePath));
  mkdirSync(join(backupPath, ".."), { recursive: true });
  writeFileSync(backupPath, readFileSync(filePath));
  backedUpFiles.push(filePath);
}

function restoreAll() {
  for (const filePath of backedUpFiles) {
    const backupPath = join(BACKUP_DIR, rel(filePath));
    if (existsSync(backupPath)) {
      if (existsSync(filePath)) unlinkSync(filePath);
      renameSync(backupPath, filePath);
      if (verbose) console.log(`  restored: ${rel(filePath)}`);
    }
  }
  try { execSync(`rm -rf "${BACKUP_DIR}"`, { stdio: "ignore" }); } catch {}
}

// ─── Step 1: Generate static pages ─────────────────────────────────────────

console.log("\n📄 Step 1: Generate static pages for dynamic routes\n");

const allPages = findFilesRecursive(APP_DIR, (n) => n === "page.tsx" || n === "page.ts");
const dynamicPages = allPages.filter((p) => isDynamicPath(p));
let generated = 0;
const generatedFiles: string[] = [];

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
    writeFileSync(staticPath, pageCode);
    writeFileSync(helperPath, helperCode);
    generatedFiles.push(staticPath, helperPath);
  }
  generated++;
}

console.log(`  ${generated} generated, ${dynamicPages.length - generated} already exist`);

if (generateOnly) {
  console.log("\n  --generate flag: skipping build.\n");
  process.exit(0);
}

// ─── Step 2: Collect files to process ───────────────────────────────────────

// Re-scan after generation
const staticPages = findFilesRecursive(APP_DIR, (n) => /^page\.static\.(tsx|ts)$/.test(n));

// Find top-level dynamic dirs
const dynamicDirs: string[] = [];
function collectDynamicDirs(dir: string) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (!statSync(full).isDirectory()) continue;
    if (entry.includes("[") && entry !== "[locale]") dynamicDirs.push(full);
    collectDynamicDirs(full);
  }
}
collectDynamicDirs(APP_DIR);
const topLevel = dynamicDirs.filter((d) =>
  !dynamicDirs.some((other) => other !== d && d.startsWith(other + "/"))
);

// Hide ALL top-level dynamic dirs — Next.js can't handle nested routes
// under dynamic segments in static export even with generateStaticParams
const dirsToHide: { original: string; hidden: string }[] = [];
for (const dir of topLevel) {
  // 只改最后一段目录名(路径上层可能含 [locale],整条替换会指向不存在的父目录)
  dirsToHide.push({
    original: dir,
    hidden: join(dirname(dir), basename(dir).replace(/\[/g, "_").replace(/\]/g, "_") + ".__hidden__"),
  });
}

// Ignored paths from ignoreInStatic.json (user-editable, supports globs)
const ignoreConfigPath = join(ROOT, "ignoreInStatic.json");
let ignoredPaths: string[] = [];
if (existsSync(ignoreConfigPath)) {
  const ignoreConfig = JSON.parse(readFileSync(ignoreConfigPath, "utf-8"));
  for (const pattern of ignoreConfig.ignore as string[]) {
    if (pattern.includes("*") || pattern.includes("?") || pattern.includes("{")) {
      const glob = new Bun.Glob(pattern);
      for (const match of glob.scanSync({ cwd: ROOT, onlyFiles: false })) {
        ignoredPaths.push(join(ROOT, match));
      }
    } else {
      ignoredPaths.push(join(ROOT, pattern));
    }
  }
} else {
  console.log("  ⚠ ignoreInStatic.json not found — falling back to removing all API routes");
}

// API routes (only from non-ignored dirs, as fallback when no config)
const apiRoutes = ignoredPaths.length === 0
  ? findFilesRecursive(join(APP_DIR, "api"), (n) => n === "route.ts")
  : [];

const swappedStatic: { staticPath: string; pagePath: string }[] = [];
const dirsHidden: { original: string; hidden: string }[] = [];

// Find route.ts files inside ignored paths (only hide route handlers, not supporting files like core.ts)
const ignoredToHide: { original: string; hidden: string }[] = [];
for (const p of ignoredPaths) {
  if (!existsSync(p)) continue;
  if (statSync(p).isDirectory()) {
    for (const route of findFilesRecursive(p, (n) => n === "route.ts" || n === "route.tsx")) {
      ignoredToHide.push({ original: route, hidden: route + ".__static_ignore__" });
    }
  } else {
    ignoredToHide.push({ original: p, hidden: p + ".__static_ignore__" });
  }
}

console.log(`
📦 Step 2: Build static${dryRun ? " (dry run)" : ""}
   ${staticPages.length} page.static.tsx swap(s)
   ${dirsToHide.length} dynamic dir(s) to hide
   ${ignoredToHide.length} route(s) to hide from ignoreInStatic.json
   ${apiRoutes.length} API route(s) to remove (fallback)
`);

// ─── Step 3: Execute ────────────────────────────────────────────────────────

try {
  // Swap page.static.tsx → page.tsx
  for (const staticPath of staticPages) {
    const pagePath = staticPath.replace(/page\.static\.(tsx|ts)$/, "page.$1");
    console.log(`  ✦ ${rel(pagePath)} → swap`);
    if (!dryRun) {
      if (existsSync(pagePath)) backupFile(pagePath);
      let content = readFileSync(staticPath, "utf-8");
      if (isDynamicPath(staticPath) && !content.includes("generateStaticParams")) {
        const gsp = `\nexport function generateStaticParams() { return []; }\n`;
        content = gsp + content;
      }
      writeFileSync(pagePath, content);
      backupFile(staticPath);
      unlinkSync(staticPath);
      swappedStatic.push({ staticPath, pagePath });
    }
  }

  // Hide dynamic dirs
  for (const { original, hidden } of dirsToHide) {
    console.log(`  ✕ ${rel(original)}/ → hide`);
    if (!dryRun) {
      renameSync(original, hidden);
      dirsHidden.push({ original, hidden });
    }
  }

  // Hide ignored paths from ignoreInStatic.json
  for (const { original, hidden } of ignoredToHide) {
    console.log(`  ✕ ${rel(original)} → hide (ignoreInStatic.json)`);
    if (!dryRun) {
      renameSync(original, hidden);
    }
  }

  // Remove remaining API routes (fallback when no ignoreInStatic.json)
  for (const routePath of apiRoutes) {
    console.log(`  ✕ ${rel(routePath)} → remove (API)`);
    if (!dryRun) {
      backupFile(routePath);
      unlinkSync(routePath);
    }
  }

  if (dryRun) {
    console.log("\n  (dry run — no build executed)\n");
    process.exit(0);
  }

  console.log(`\n🔨 Step 3: next build (output: export)...\n`);
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
  // Post-process HTML files
  console.log("📝 Step 4: Post-processing HTML...\n");
  const outDir = join(ROOT, "out");

  console.log(`\n✅ Static build complete! Output in ./out/\n`);

} catch (err) {
  console.error("\n❌ Build failed!\n");
  process.exitCode = 1;
} finally {
  if (!dryRun) {
    console.log("🔄 Restoring original files...");
    // Un-hide ignored paths from ignoreInStatic.json
    for (const { original, hidden } of ignoredToHide) {
      if (existsSync(hidden)) renameSync(hidden, original);
    }
    // Un-hide dynamic directories
    for (const { original, hidden } of dirsHidden) {
      if (existsSync(hidden)) renameSync(hidden, original);
    }
    // Delete swapped page.tsx files
    for (const { pagePath } of swappedStatic) {
      if (existsSync(pagePath)) unlinkSync(pagePath);
    }
    // Restore backed up originals
    restoreAll();
    // Delete generated static files (page.static.tsx, static-fallback.tsx, etc.)
    for (const f of generatedFiles) {
      if (existsSync(f)) { unlinkSync(f); if (verbose) console.log(`  deleted: ${rel(f)}`); }
    }
    console.log("✅ All files restored.\n");
  }
}

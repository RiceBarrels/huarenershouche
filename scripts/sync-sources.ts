#!/usr/bin/env bun
/**
 * sync-sources — crawl whitelisted dealer sites and syndicate into `cars`.
 *
 * Usage:
 *   bun scripts/sync-sources.ts --dry-run [--limit N] [--key KEY]
 *       Crawls the live site, parses the first N details (default 3),
 *       prints parsed JSON + a summary. No env vars / DB required.
 *
 *   bun scripts/sync-sources.ts [--key KEY]
 *       Real sync (force). Requires NEXT_PUBLIC_SUPABASE_URL +
 *       SUPABASE_SERVICE_ROLE_KEY (from .env.local, auto-loaded by bun).
 *
 * Options:
 *   --dry-run    Parse only, no DB writes
 *   --limit N    Number of details to parse in dry-run mode (default 3)
 *   --key KEY    Only sync/parse this source key (default: ideal-bayside in
 *                dry-run; all enabled sources otherwise)
 *   --help       Show this help message
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { adapters, getAdapter } from "../lib/sources/index";
import { fetchHtml } from "../lib/sources/types";

const ROOT = join(import.meta.dir, "..");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const limitIdx = args.indexOf("--limit");
const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) || 3 : 3;
const keyIdx = args.indexOf("--key");
const onlyKey = keyIdx >= 0 ? args[keyIdx + 1] : undefined;

if (args.includes("--help")) {
  console.log(`
  sync-sources — crawl whitelisted dealer sites and syndicate into cars

  Usage:  bun scripts/sync-sources.ts [options]

  Options:
    --dry-run    Crawl + parse only, print JSON, no env/DB needed
    --limit N    Details to parse in dry-run mode (default 3)
    --key KEY    Only this source key
    --help       Show this help message
  `);
  process.exit(0);
}

// Bun auto-loads .env/.env.local from cwd; when run from elsewhere, load manually.
function loadEnvLocal() {
  const envPath = join(ROOT, ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const value = m[2].replace(/^["']|["']$/g, "");
    if (!process.env[m[1]]) process.env[m[1]] = value;
  }
}

async function dryRunMode() {
  const key = onlyKey ?? "ideal-bayside";
  const adapter = getAdapter(key);
  if (!adapter) {
    console.error(`✗ Unknown adapter key "${key}". Known: ${Object.keys(adapters).join(", ")}`);
    process.exit(1);
  }

  console.log(`\n🔍 Dry run: ${key} — crawling list pages...\n`);
  const crawl = await adapter.listAll(fetchHtml);
  console.log(`  found:         ${crawl.refs.length}`);
  console.log(`  totalDeclared: ${crawl.totalDeclared ?? "?"}`);
  console.log(`  pagesFetched:  ${crawl.pagesFetched}`);
  console.log(`  failed:        ${crawl.failed}`);

  const n = Math.min(limit, crawl.refs.length);
  console.log(`\n📋 Parsing first ${n} detail page(s)...\n`);
  let ok = 0;
  for (const ref of crawl.refs.slice(0, n)) {
    try {
      const parsed = await adapter.fetchDetail(fetchHtml, ref);
      const imgCount = (parsed.image_url ? 1 : 0) + parsed.images.length;
      console.log(JSON.stringify({ ...parsed, images: parsed.images.slice(0, 3).concat(parsed.images.length > 3 ? [`… +${parsed.images.length - 3} more`] : []) }, null, 2));
      console.log(`  → ${ref.sourceListingId}: ${parsed.title} | $${parsed.price} | ${imgCount} photos | ${parsed.features.length} features\n`);
      ok++;
    } catch (err) {
      console.error(`  ✗ ${ref.sourceListingId} (${ref.url}): ${err instanceof Error ? err.message : err}\n`);
    }
  }
  console.log(`\n✅ Dry run complete: ${ok}/${n} parsed, ${crawl.refs.length} refs found (site declares ${crawl.totalDeclared ?? "?"}).\n`);
}

async function realMode() {
  loadEnvLocal();
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("✗ NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (set them in .env.local).");
    process.exit(1);
  }
  const { syncAll } = await import("../lib/sources/sync");
  console.log(`\n🔄 Syncing ${onlyKey ?? "all enabled sources"} (force)...\n`);
  const results = await syncAll({ force: true, onlyKey });
  for (const r of results) {
    const icon = r.status === "success" ? "✅" : r.status === "skipped" ? "⏭" : r.status === "partial" ? "⚠️" : "❌";
    console.log(`${icon} ${r.key}: ${r.status} — found ${r.found}, +${r.inserted} inserted, ~${r.updated} updated, -${r.delisted} delisted (${(r.duration_ms / 1000).toFixed(1)}s)`);
    for (const e of r.errors.slice(0, 10)) console.log(`     · ${e}`);
  }
  const failed = results.some((r) => r.status === "error");
  process.exit(failed ? 1 : 0);
}

(dryRun ? dryRunMode() : realMode()).catch((err) => {
  console.error("✗ Fatal:", err);
  process.exit(1);
});

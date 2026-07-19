#!/usr/bin/env bun
/**
 * translate-backfill — 直接对数据库里已有车辆做中英双语补全,无需重新抓取。
 *
 * 用途:同步曾因超时中断,导致很多系统车源没翻译(description_zh 为空、tag 仍是英文、
 * title_zh 里车型还是英文)。这个脚本直接读库里已有的英文字段,调用翻译补全后回写,
 * 比重新 crawl 快得多。
 *
 * 用法:
 *   bun scripts/translate-backfill.ts                 只补「系统抓取且缺中文」的车
 *   bun scripts/translate-backfill.ts --all-system    重译所有系统抓取的车
 *   bun scripts/translate-backfill.ts --include-user  也补用户发布、缺中文的车
 *   bun scripts/translate-backfill.ts --limit 20      限制数量(默认全部)
 *   bun scripts/translate-backfill.ts --concurrency 8 并发数(默认 8)
 *
 * 需要 .env.local 里的 NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / OPENROUTER_API_KEY
 * (bun 会自动加载 .env.local)。
 */

import { createClient } from "@supabase/supabase-js";
import { localizeListing, isTranslationConfigured } from "../lib/translate";
import { MAKES_ZH } from "../lib/mock-data";

const args = process.argv.slice(2);
const allSystem = args.includes("--all-system");
const includeUser = args.includes("--include-user");
const limitArg = args[args.indexOf("--limit") + 1];
const limit = args.includes("--limit") ? parseInt(limitArg, 10) || undefined : undefined;
const concArg = args[args.indexOf("--concurrency") + 1];
const concurrency = args.includes("--concurrency") ? Math.max(1, parseInt(concArg, 10) || 5) : 5;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("缺少 NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!isTranslationConfigured()) {
  console.error("缺少 OPENROUTER_API_KEY —— 无法翻译。请在 .env.local 里配置后重试。");
  process.exit(1);
}

const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

const CJK = /[一-鿿]/;

interface CarRow {
  id: string;
  title: string | null;
  title_zh: string | null;
  description: string | null;
  description_zh: string | null;
  features: string[] | null;
  source_id: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  trim: string | null;
}

// 从结构化字段重建中文标题(避免用可能被 AI 弄错的旧 title_zh)
function rebuildTitleZh(c: CarRow): string | null {
  if (!c.make || !c.model) return c.title_zh;
  const makeZh = MAKES_ZH[c.make] || c.make;
  return [c.year, makeZh, c.model, c.trim].filter(Boolean).join(" ");
}

// 判断一辆车是否「缺中文」:中文描述为空,或标签里一个中文都没有
function needsTranslation(c: CarRow): boolean {
  const noZhDesc = !c.description_zh || c.description_zh.trim() === "";
  const feats = c.features || [];
  const noZhTag = feats.length > 0 && !feats.some((f) => CJK.test(f));
  return noZhDesc || noZhTag;
}

async function runPool<T>(items: T[], n: number, worker: (item: T, i: number) => Promise<void>): Promise<void> {
  let cursor = 0;
  const run = async () => {
    while (cursor < items.length) {
      const i = cursor++;
      await worker(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(n, items.length)) }, run));
}

async function main() {
  const cols = "id,title,title_zh,description,description_zh,features,source_id,make,model,year,trim";
  const rows: CarRow[] = [];

  // 系统抓取的车
  {
    const { data, error } = await sb.from("cars").select(cols).not("source_id", "is", null);
    if (error) throw new Error(error.message);
    rows.push(...((data as CarRow[]) || []));
  }
  // 可选:用户发布的车
  if (includeUser) {
    const { data, error } = await sb.from("cars").select(cols).is("source_id", null);
    if (error) throw new Error(error.message);
    rows.push(...((data as CarRow[]) || []));
  }

  let candidates = allSystem ? rows : rows.filter(needsTranslation);
  if (limit) candidates = candidates.slice(0, limit);

  console.log(
    `共 ${rows.length} 辆候选车,需翻译 ${candidates.length} 辆(allSystem=${allSystem}, includeUser=${includeUser}),并发 ${concurrency}`,
  );
  if (candidates.length === 0) {
    console.log("没有需要翻译的车。");
    return;
  }

  let done = 0;
  let ok = 0;
  let failed = 0;
  const started = Date.now();

  await runPool(candidates, concurrency, async (c) => {
    try {
      const loc = await localizeListing({
        title: c.title,
        title_zh: rebuildTitleZh(c),
        description: c.description,
        description_zh: c.description_zh,
        features: c.features,
      });
      const { error } = await sb
        .from("cars")
        .update({
          title: loc.title ?? c.title,
          title_zh: loc.title_zh ?? c.title_zh,
          description: loc.description ?? c.description,
          description_zh: loc.description_zh ?? c.description_zh,
          features: loc.features.length ? loc.features : c.features,
        })
        .eq("id", c.id);
      if (error) throw new Error(error.message);
      ok++;
      console.log(`(${++done}/${candidates.length}) ✓ ${loc.title_zh || loc.title}`);
    } catch (err) {
      failed++;
      console.log(`(${++done}/${candidates.length}) ✗ ${c.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  console.log(`\n完成:成功 ${ok},失败 ${failed},用时 ${Math.round((Date.now() - started) / 1000)}s`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

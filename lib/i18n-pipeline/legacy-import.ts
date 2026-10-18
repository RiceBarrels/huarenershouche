// 旧版翻译缓存的一次性导入(spec 2.8 / 10.1 R4):scripts/i18n-backfill.ts --import-legacy 调用。
// 只经 service role 调 RPC;纯模块,不引入 server-only(Bun 脚本共用)。
//
// i18n-v2-data.sql 第 0 步在任何改写之前把旧兼容列与惰性翻译缓存快照进 i18n.legacy_text
// (车源 {description, description_zh, other_i18n};帖子 / 评论 {other_i18n}),快照不受 enforce 切换与
// cleanup 影响。只导入可信转载车源(i18n.sources.trusted:同步写入,且卖家就是该源站的系统账号)的旧译文:
// 帖子 / 评论 / 用户车源的 other_i18n 迁移前用户可写(B08),旧的惰性翻译也可能被提示注入带偏(B09),
// 而导入不经内容审核 —— 这些一律不导入,由管线从原文重新翻译(带输出审核)。
// 按 entity_id 键集分页读 i18n_legacy_page(每页 200 行),只处理当前公开且可信的车源,把旧文本当作
// 「当前原文」的候选译文,用 validateUnmasked 校验,通过的条目(车源 × 语言)才导入:
//   zh = 旧 description_zh(原文不是中文且二者不同)· en = 旧 description(原文不是英文且二者不同)·
//   ko / ja / es / fr = other_i18n[L].description;当前原文必须仍等于快照里的 description 或
//   description_zh,否则说明快照之后改过,旧译文对应的是旧版本,整辆车跳过(stale)
// 只有原文语言 ∉ {L, und} 时才需要 L 的译文。
// 原文语言优先用库里已存的检测结果(field_langs),当前版本还没检测时用 lib/i18n/detect.ts 现算(同时随导入写回)。
// 导入走 i18n_import_legacy:按原文 hash CAS,只改 pending / failed / hold 行,refresh = true
// (先用旧译文顶上,管线随后重新生成)。可重复执行;dryRun 只校验统计、不写库。

import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { LOCALES, type Locale } from "@/lib/i18n";
import { detectLang } from "@/lib/i18n/detect";
import { validateUnmasked } from "@/lib/i18n-pipeline/validate";
import { createServiceClient } from "@/lib/sources/service-client";
import { isMissingFunctionError } from "@/lib/supabase-compat";

/** 导入旧译文的实体:只有车源(帖子 / 评论的旧缓存用户可写,交给管线重新翻译) */
export type LegacyEntity = "car";
export const LEGACY_ENTITIES: readonly LegacyEntity[] = ["car"];

export interface ImportLegacyOptions {
  /** true:只校验、统计,不写库 */
  dryRun: boolean;
  /** 只处理这些实体(默认全部) */
  entities?: readonly LegacyEntity[];
  log?: (m: string) => void;
}

/** 一种实体 × 一种语言的统计 */
export interface LegacyLocaleCounts {
  /** 有旧译文可候选的条目 */
  candidates: number;
  /** 校验通过 */
  valid: number;
  /** 已导入(dryRun 时为 0) */
  imported: number;
  /** i18n_import_legacy 没有落库:该语言已有结果(ok / skipped),或原文在此期间又被改过 */
  notApplied: number;
  /** RPC 出错的条目(重跑即可重试) */
  errors: number;
  /** 拒绝原因(validate.ts 的 Reject)→ 条目数 */
  rejected: Record<string, number>;
}

export interface LegacyEntityReport {
  /** 快照行数 */
  rows: number;
  /** 当前不公开(下架 / 隐藏 / 屏蔽),跳过 */
  hidden: number;
  /** 当前原文不是可信转载写入的(用户车源、认领后改过的转载车源):旧缓存用户可写,跳过(skipped_untrusted) */
  skippedUntrusted: number;
  /** 原文已不等于快照里的 description / description_zh(快照之后改过),跳过 */
  stale: number;
  locales: Partial<Record<Locale, LegacyLocaleCounts>>;
}

export interface ImportLegacyResult {
  dryRun: boolean;
  entities: Partial<Record<LegacyEntity, LegacyEntityReport>>;
}

/** i18n_legacy_page 的一行(payload = 当前原文,已按 SQL i18n.norm_text 规整) */
export interface LegacyRow {
  entity_id: string;
  src_hash: string;
  payload: Record<string, unknown> | null;
  /** 当前版本已检测时为 {字段: 语言},否则 null */
  field_langs: Record<string, unknown> | null;
  primary_lang: string | null;
  is_public: boolean;
  legacy: Record<string, unknown> | null;
  /** i18n.sources.trusted:当前原文由可信转载写入 */
  trusted: boolean;
}

/** 一个条目(车源 × 语言)的校验结论 */
export type LegacyVerdict = { ok: true; fields: Record<string, string> } | { ok: false; reason: string };

/** 一行快照的导入计划:跳过原因,或各语言的结论(没有候选旧译文的语言不出现) */
export interface LegacyRowPlan {
  skip: "hidden" | "untrusted" | "stale" | null;
  fieldLangs: Record<string, string>;
  primary: string;
  entries: Map<Locale, LegacyVerdict>;
}

const PAGE_SIZE = 200;
const IMPORT_PARALLEL = 6;
/** 死锁(40P01)/ 拿不到锁(55P03,authenticator 的 lock_timeout):重试一次 */
const RETRYABLE_SQLSTATE = new Set(["40P01", "55P03"]);

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** 与 SQL i18n.norm_text 完全一致:CRLF → LF、NFC、去掉行尾空格 / 制表符、btrim(只去首尾空格)、空串 → null */
function normText(text: unknown): string | null {
  if (typeof text !== "string") return null;
  const s = text
    .replace(/\r\n/g, "\n")
    .normalize("NFC")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/^ +| +$/g, "");
  return s === "" ? null : s;
}

/** 候选译文本身的清理:统一换行、去首尾空白 */
function cleanText(text: unknown): string | null {
  if (typeof text !== "string") return null;
  const s = text.replace(/\r\n?/g, "\n").trim();
  return s === "" ? null : s;
}

interface RpcResult<T> {
  data: T | null;
  error: PostgrestError | null;
}

async function rpc<T>(svc: SupabaseClient, fn: string, args: Record<string, unknown>): Promise<RpcResult<T>> {
  let res = await svc.rpc(fn, args);
  if (res.error && RETRYABLE_SQLSTATE.has(res.error.code)) {
    await sleep(200 + Math.random() * 300);
    res = await svc.rpc(fn, args);
  }
  return { data: (res.data ?? null) as T | null, error: res.error };
}

/** 同时最多 n 个任务在途 */
function limiter(n: number): <T>(task: () => Promise<T>) => Promise<T> {
  let active = 0;
  const waiting: (() => void)[] = [];
  return async <T>(task: () => Promise<T>): Promise<T> => {
    while (active >= n) await new Promise<void>((resolve) => waiting.push(resolve));
    active++;
    try {
      return await task();
    } finally {
      active--;
      waiting.shift()?.();
    }
  };
}

/** 旧缓存里 locale 的候选译文:zh / en 来自旧兼容列(兼容列就是原文本身时不算),其余语言来自 other_i18n */
function candidateText(locale: Locale, legacy: Record<string, unknown>, original: string): string | null {
  if (locale === "zh" || locale === "en") {
    const column = locale === "zh" ? legacy.description_zh : legacy.description;
    return normText(column) === original ? null : cleanText(column);
  }
  const cache = isRecord(legacy.other_i18n) ? legacy.other_i18n : {};
  const cached = isRecord(cache[locale]) ? cache[locale] : {};
  return cleanText(cached.description);
}

/** 一行车源快照 → 各语言的导入结论(纯计算,不碰数据库) */
export function planLegacyRow(row: LegacyRow): LegacyRowPlan {
  const plan: LegacyRowPlan = { skip: null, fieldLangs: {}, primary: "und", entries: new Map() };
  if (!row.is_public) {
    plan.skip = "hidden";
    return plan;
  }
  // 只认 trusted === true:用户车源、认领后改过的转载车源,旧缓存都可能是用户写的
  if (row.trusted !== true) {
    plan.skip = "untrusted";
    return plan;
  }
  const original = row.payload?.description;
  if (typeof original !== "string" || original === "") return plan;
  const legacy = isRecord(row.legacy) ? row.legacy : {};
  if (original !== normText(legacy.description) && original !== normText(legacy.description_zh)) {
    plan.skip = "stale";
    return plan;
  }

  const stored = isRecord(row.field_langs) ? row.field_langs.description : undefined;
  if (typeof stored === "string" && row.primary_lang) {
    plan.fieldLangs = { description: stored };
    plan.primary = row.primary_lang;
  } else {
    const lang = detectLang(original).lang;
    plan.fieldLangs = { description: lang };
    plan.primary = lang;
  }
  const lang = plan.fieldLangs.description;

  for (const locale of LOCALES) {
    if (lang === locale || lang === "und") continue;
    const text = candidateText(locale, legacy, original);
    if (!text) continue;
    const v = validateUnmasked(original, text, lang, locale);
    plan.entries.set(locale, v.ok ? { ok: true, fields: { description: v.text } } : { ok: false, reason: v.reason });
  }
  return plan;
}

const emptyCounts = (): LegacyLocaleCounts => ({
  candidates: 0,
  valid: 0,
  imported: 0,
  notApplied: 0,
  errors: 0,
  rejected: {},
});

function summarize(entity: LegacyEntity, report: LegacyEntityReport, dryRun: boolean): string[] {
  const lines = [
    `[i18n:legacy] ${entity}: ${report.rows} rows · hidden ${report.hidden} · ` +
      `skipped_untrusted ${report.skippedUntrusted} · stale ${report.stale}`,
  ];
  for (const locale of LOCALES) {
    const c = report.locales[locale];
    if (!c) continue;
    const reasons = Object.entries(c.rejected)
      .sort((a, b) => b[1] - a[1])
      .map(([reason, n]) => `${reason} ${n}`)
      .join(", ");
    lines.push(
      `[i18n:legacy]   ${locale}  candidates ${c.candidates} · valid ${c.valid} · ` +
        (dryRun
          ? "dry run (nothing written)"
          : `imported ${c.imported} · not applied ${c.notApplied} · errors ${c.errors}`) +
        ` · rejected ${reasons || "0"}`,
    );
  }
  return lines;
}

/** 导入迁移前快照的可信转载车源旧译文;SQL 未执行(或是不返回 trusted 的旧版)时抛错,单条 RPC 出错只计数(重跑即可) */
export async function importLegacy(o: ImportLegacyOptions): Promise<ImportLegacyResult> {
  const log = o.log ?? ((m: string) => console.log(m));
  const svc = createServiceClient();
  const gate = limiter(IMPORT_PARALLEL);
  const result: ImportLegacyResult = { dryRun: o.dryRun, entities: {} };

  for (const entity of o.entities ?? LEGACY_ENTITIES) {
    const report: LegacyEntityReport = { rows: 0, hidden: 0, skippedUntrusted: 0, stale: 0, locales: {} };
    result.entities[entity] = report;
    const countsFor = (locale: Locale) => (report.locales[locale] ??= emptyCounts());

    let after: string | null = null;
    for (;;) {
      const page: RpcResult<LegacyRow[]> = await rpc<LegacyRow[]>(svc, "i18n_legacy_page", {
        p_entity: entity,
        p_after: after,
        p_limit: PAGE_SIZE,
      });
      if (page.error) {
        throw new Error(
          isMissingFunctionError(page.error)
            ? "i18n_legacy_page is missing: apply supabase/i18n-v2.sql and i18n-v2-data.sql first"
            : `i18n_legacy_page(${entity}): ${page.error.code} ${page.error.message}`,
        );
      }
      const rows: LegacyRow[] = page.data ?? [];
      // 旧版 i18n_legacy_page 不返回 trusted:分不出哪些车可信,整批不导入
      if (rows.some((row) => typeof row.trusted !== "boolean")) {
        throw new Error("i18n_legacy_page returns no trusted column: re-apply supabase/i18n-v2.sql first");
      }
      report.rows += rows.length;

      const imports: Promise<void>[] = [];
      for (const row of rows) {
        const plan = planLegacyRow(row);
        if (plan.skip === "hidden") report.hidden++;
        if (plan.skip === "untrusted") report.skippedUntrusted++;
        if (plan.skip === "stale") report.stale++;
        for (const [locale, verdict] of plan.entries) {
          const counts = countsFor(locale);
          counts.candidates++;
          if (!verdict.ok) {
            counts.rejected[verdict.reason] = (counts.rejected[verdict.reason] ?? 0) + 1;
            continue;
          }
          counts.valid++;
          if (o.dryRun) continue;
          imports.push(
            gate(async () => {
              const res = await rpc<boolean>(svc, "i18n_import_legacy", {
                p_entity: entity,
                p_entity_id: row.entity_id,
                p_locale: locale,
                p_src_hash: row.src_hash,
                p_fields: verdict.fields,
                p_source_lang: plan.primary,
                p_field_langs: plan.fieldLangs,
                p_refresh: true,
              });
              if (res.error) {
                counts.errors++;
                log(`[i18n:legacy] ${entity} ${row.entity_id} ${locale}: ${res.error.code} ${res.error.message}`);
              } else if (res.data === true) {
                counts.imported++;
              } else {
                counts.notApplied++;
              }
            }),
          );
        }
      }
      await Promise.all(imports);
      if (rows.length > 0) log(`[i18n:legacy] ${entity}: ${report.rows} rows scanned`);
      if (rows.length < PAGE_SIZE) break;
      after = rows[rows.length - 1].entity_id;
    }
    for (const line of summarize(entity, report, o.dryRun)) log(line);
  }
  return result;
}

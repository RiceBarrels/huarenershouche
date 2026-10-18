#!/usr/bin/env bun
/**
 * i18n-backfill — 内容翻译 v2 的回填 / 运维 CLI(spec 2.8、10.1 R4 / R7)。
 * 所有状态都在数据库里(租约、attempts、退避),随时可以中断、重跑。
 *
 * Usage:
 *   bun scripts/i18n-backfill.ts --seed
 *       标题映射(MAKES_ZH + MODEL_ZH_BY_MAKE)+ 品牌 / 车型 / 词典话题与配置的种子词条
 *   bun scripts/i18n-backfill.ts --requeue-terms [--states failed,dead,rejected] [--kind topic|feature]
 *       把这些状态(默认 failed,dead)的话题 / 配置写法重置为待解析(attempts 清零、立即可领);
 *       模型服务长时间故障(超时、5xx)会把写法耗成 dead,修好后用它救回,再跑 --terms;
 *       rejected(模型判无意义 / 标签审核违规)只在明确指定时重置
 *   bun scripts/i18n-backfill.ts --terms [--concurrency N] [--max-minutes M]
 *       循环解析待定的话题 / 配置标签(每轮最多 N 组,上限 20),直到一轮没有可做的组;
 *       key 被拒 / 额度用完时立即停下(词表调用被拒的写法按 retry 退回、不扣重试次数,SQL 未升级时记 failed;
 *       词表调用已成功、标签审核才被拒的写法记 failed);连续两轮领到了组却一条写法都没落定(限流、服务故障、
 *       写回出错、租约丢失)时也停下,免得空转(服务故障、回复不合格还会消耗重试次数)
 *   bun scripts/i18n-backfill.ts --detect [--no-llm] [--max-minutes M]
 *       给当前版本还没检测语言(或只有本地猜测)的原文做检测;判不准的拉丁文问模型。--no-llm:只用本地规则、
 *       不调模型,判不准的拉丁文不再一律记 en,而是记本地猜测并标 provisional(sitemap / hreflang 按已检测算),
 *       之后由不带 --no-llm 的 --detect 或 drain 改正;SQL 还没升级(检测队列只有 p_limit)时这些行不记,
 *       留给模型检测。结束后检测队列仍不为空(限流 / 模型拒绝 / RPC 出错提前返回)算未完成,--max-minutes 到点不算
 *   bun scripts/i18n-backfill.ts --import-legacy [--dry-run] [--entity car]
 *       导入迁移前快照的旧译文,只导入可信转载车源的(逐条校验;--dry-run 只统计、不写库);
 *       帖子 / 评论 / 用户车源的旧缓存迁移前用户可写,不导入,由管线从原文重新翻译
 *   bun scripts/i18n-backfill.ts --drain [--locales zh,en] [--entity E] [--concurrency 8] [--max-calls N] [--max-minutes M]
 *       每轮 drain 50 s,直到队列为空、--max-calls(约数)/ --max-minutes 用完或模型服务拒绝;
 *       每轮打印 DrainResult,每 30 s 打印一次 i18n_stats
 *   bun scripts/i18n-backfill.ts --stats
 *       打印 i18n_stats:各实体 × 语言的队列状态、审核、检测、词表
 *
 *   队列状态里 refresh = 待重新生成的 ok 行;parked = 不公开内容(下架 / 隐藏)的 refresh 行,重新公开前不会被
 *   领取,不算待做(R7 的 refresh = 0 只看 refresh)。
 *   多个步骤可一次给出,按 seed → requeue-terms → terms → detect → import-legacy → drain → stats 的顺序执行;
 *   --max-minutes 是整次运行的总时限(terms、detect 与 drain 共用),--concurrency 默认 8。
 *   上线顺序(spec 10.1 R4):--seed → --terms → --detect → --import-legacy --dry-run(人工过目)→ --import-legacy
 *   → SQL 里把 daily_call_cap 调到 40000 → --drain --locales zh,en --concurrency 8,直到 zh / en 的 pending 为 0。
 *
 *   需要 NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY;--terms、--detect(不带 --no-llm)、--drain 另需
 *   OPENROUTER_API_KEY。bun 会从当前目录自动加载 .env.local;从别的目录运行时脚本自己读仓库根目录的 .env.local。
 *   退出码:请求的工作完成(或到达 --max-calls / --max-minutes)为 0;未配置、SQL 未执行、模型服务拒绝、
 *   额度用完、步骤没做完、出错为 1;
 *   Ctrl-C 中断为 130(第一次 Ctrl-C 等当前这一轮结束再停,第二次立即退出,未完成的租约到期后自动释放)。
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isAiConfigured } from "@/lib/ai/openrouter";
import { LOCALES, type Locale } from "@/lib/i18n";
import { ENTITY_FIELDS, type ContentEntity } from "@/lib/i18n/content/types";
import { importLegacy, LEGACY_ENTITIES, type LegacyEntity } from "@/lib/i18n-pipeline/legacy-import";
import { seedGlossary, seedTitleMaps } from "@/lib/i18n-pipeline/seed";
import { resolveTerms } from "@/lib/i18n-pipeline/terms";
import { detectPass, drain, type DrainResult } from "@/lib/i18n-pipeline/worker";
import { createServiceClient } from "@/lib/sources/service-client";
import { isMissingFunctionError } from "@/lib/supabase-compat";

const ROOT = join(import.meta.dir, "..");

const HELP = `
  i18n-backfill — content translation v2 backfill / operations

  Usage:  bun scripts/i18n-backfill.ts <steps> [options]

  Steps (run in this order when combined):
    --seed            seed title maps + brand / model / dictionary glossary terms
    --requeue-terms   reset failed / dead glossary aliases to pending (e.g. after a model outage)
    --terms           resolve pending topic / feature tags until a round finds no group
    --detect          detect source languages of undetected (or only provisionally detected) originals
    --import-legacy   import the pre-migration translations of trusted syndicated cars (validated)
    --drain           drain the translation queue in 50 s rounds
    --stats           print i18n_stats (parked = refresh rows of hidden content, not due)

  Options:
    --dry-run           with --import-legacy: validate and count only, write nothing
    --no-llm            with --detect: local rules only, no model calls. Ambiguous Latin text is no longer
                        forced to en: it is recorded as a provisional local guess (counts as detected for
                        sitemaps / hreflang) that --detect without --no-llm or the drain refines later;
                        on SQL without provisional detection it stays undetected for the model
    --entity E          with --drain (any entity) or --import-legacy (car)
    --states S,...      with --requeue-terms: alias states to reset (failed, dead, rejected; default failed,dead)
    --kind K            with --requeue-terms: topic or feature only (default both)
    --locales zh,en     with --drain: only these locales
    --concurrency N     entities per drain claim / glossary groups per round (default 8)
    --max-calls N       with --drain: stop after about N model calls
    --max-minutes M     wall-clock limit for --terms, --detect and --drain together
    --help              show this help
`;

type Step = "seed" | "requeue-terms" | "terms" | "detect" | "import-legacy" | "drain" | "stats";
const STEPS: readonly Step[] = ["seed", "requeue-terms", "terms", "detect", "import-legacy", "drain", "stats"];
const BOOL_FLAGS = new Set(["--dry-run", "--no-llm", "--help", ...STEPS.map((s) => `--${s}`)]);
const VALUE_FLAGS = new Set([
  "--entity", "--states", "--kind", "--locales", "--concurrency", "--max-calls", "--max-minutes",
]);
const ENTITIES = Object.keys(ENTITY_FIELDS) as ContentEntity[];
// --requeue-terms 可重置的写法状态;ok 不行:重置后已解析的标签在重新解析前都会失效
const REQUEUE_TERM_STATES = ["failed", "dead", "rejected"] as const;
type RequeueTermState = (typeof REQUEUE_TERM_STATES)[number];
/** 与 SQL i18n_admin_requeue_terms 的默认值一致 */
const DEFAULT_REQUEUE_TERM_STATES: readonly RequeueTermState[] = ["failed", "dead"];
const TERM_KINDS = ["topic", "feature"] as const;
type TermKind = (typeof TERM_KINDS)[number];

const DEFAULT_CONCURRENCY = 8;
const MAX_TERM_GROUPS = 20; // i18n_claim_terms 的上限
const DRAIN_ROUND_MS = 50_000;
const MIN_DRAIN_ROUND_MS = 20_000; // 剩余不足一轮有效时间(drain 在截止前 15 s 停止领取)就收工
const TERMS_ROUND_MS = 60_000;
const MIN_TERMS_ROUND_MS = 20_000;
// 401 / 402 / 未配置由 resolveTerms 的 halt 直接停;其余情况(限流、服务故障、写回出错、租约丢失)连续这么多轮
// 领到了组却一条都没落定(resolved + rejected 为 0)就收手
const TERMS_STALLED_ROUNDS_STOP = 2;
// --detect 结束时离 --max-minutes 截止不足它:队列里剩下的算到点(detectPass 在截止前 10 s 就不再发模型调用)
const MIN_DETECT_LEFT_MS = 20_000;
const RATE_LIMIT_PAUSE_MS = 60_000;
const STATS_EVERY_MS = 30_000;

interface Options {
  steps: Set<Step>;
  dryRun: boolean;
  noLlm: boolean;
  entity?: ContentEntity;
  /** --requeue-terms 要重置的写法状态 */
  termStates: readonly RequeueTermState[];
  /** --requeue-terms 只重置这一类写法(默认话题与配置都重置) */
  termKind?: TermKind;
  locales?: Locale[];
  concurrency: number;
  maxCalls?: number;
  /** 整次运行的截止时刻(ms);没给 --max-minutes 时为 Infinity */
  endAt: number;
}

/** i18n_stats 的一行:entity × locale × state(另有 locale = _moderation / _detected、entity = term:* 的汇总行) */
interface StatRow {
  entity: string;
  locale: string;
  state: string;
  n: number;
}

type Outcome = "done" | "limit" | "interrupted" | "failed";

const log = (m: string) => console.log(m);
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const errText = (err: unknown) => (err instanceof Error ? err.message : String(err));

let stopRequested = false;

function usage(message: string): never {
  console.error(`[i18n:backfill] ${message}`);
  console.error(HELP);
  process.exit(1);
}

function fail(message: string): never {
  console.error(`[i18n:backfill] ${message}`);
  process.exit(1);
}

// Bun 会从当前目录自动加载 .env.local;从别的目录运行时手动读仓库根目录的
// (已存在的变量一律不覆盖,空值也算:`OPENROUTER_API_KEY= bun …` 可以显式去掉 key)
function loadEnvLocal(): void {
  const envPath = join(ROOT, ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const value = m[2].replace(/^["']|["']$/g, "");
    if (process.env[m[1]] === undefined) process.env[m[1]] = value;
  }
}

function positiveInt(flag: string, value: string): number {
  const n = /^\d+$/.test(value) ? Number(value) : Number.NaN;
  if (!Number.isSafeInteger(n) || n <= 0) usage(`${flag} must be a positive integer (got "${value}")`);
  return n;
}

function parseOptions(argv: readonly string[]): Options {
  const flags = new Set<string>();
  const values = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const eq = arg.indexOf("=");
    const key = eq > 0 ? arg.slice(0, eq) : arg;
    if (VALUE_FLAGS.has(key)) {
      const value = eq > 0 ? arg.slice(eq + 1) : argv[++i];
      if (value === undefined || value === "" || value.startsWith("--")) usage(`${key} needs a value`);
      values.set(key, value);
    } else if (BOOL_FLAGS.has(key) && eq < 0) {
      flags.add(key);
    } else {
      usage(`unknown argument "${arg}"`);
    }
  }
  if (flags.has("--help")) {
    console.log(HELP);
    process.exit(0);
  }

  const steps = new Set(STEPS.filter((s) => flags.has(`--${s}`)));
  if (steps.size === 0) usage("no step given");
  const requires = (flag: string, allowed: Step[]) => {
    if ((flags.has(flag) || values.has(flag)) && !allowed.some((s) => steps.has(s))) {
      usage(`${flag} only applies to ${allowed.map((s) => `--${s}`).join(" / ")}`);
    }
  };
  requires("--dry-run", ["import-legacy"]);
  requires("--no-llm", ["detect"]);
  requires("--entity", ["drain", "import-legacy"]);
  requires("--states", ["requeue-terms"]);
  requires("--kind", ["requeue-terms"]);
  requires("--locales", ["drain"]);
  requires("--max-calls", ["drain"]);
  requires("--concurrency", ["drain", "terms"]);
  requires("--max-minutes", ["drain", "terms", "detect"]);

  const opts: Options = {
    steps,
    dryRun: flags.has("--dry-run"),
    noLlm: flags.has("--no-llm"),
    termStates: DEFAULT_REQUEUE_TERM_STATES,
    concurrency: DEFAULT_CONCURRENCY,
    endAt: Number.POSITIVE_INFINITY,
  };
  const entity = values.get("--entity");
  if (entity !== undefined) {
    if (!(ENTITIES as string[]).includes(entity)) usage(`--entity must be one of ${ENTITIES.join(", ")}`);
    if (steps.has("import-legacy") && !(LEGACY_ENTITIES as readonly string[]).includes(entity)) {
      usage(`--import-legacy only imports ${LEGACY_ENTITIES.join(", ")} (trusted syndicated cars)`);
    }
    opts.entity = entity as ContentEntity;
  }
  const states = values.get("--states");
  if (states !== undefined) {
    const list = [...new Set(states.split(",").map((s) => s.trim()).filter(Boolean))];
    const bad = list.filter((s) => !(REQUEUE_TERM_STATES as readonly string[]).includes(s));
    if (list.length === 0 || bad.length > 0) usage(`--states takes a comma list of ${REQUEUE_TERM_STATES.join(", ")}`);
    opts.termStates = list as RequeueTermState[];
  }
  const kind = values.get("--kind");
  if (kind !== undefined) {
    if (!(TERM_KINDS as readonly string[]).includes(kind)) usage(`--kind must be one of ${TERM_KINDS.join(", ")}`);
    opts.termKind = kind as TermKind;
  }
  const locales = values.get("--locales");
  if (locales !== undefined) {
    const list = [...new Set(locales.split(",").map((l) => l.trim()).filter(Boolean))];
    const bad = list.filter((l) => !(LOCALES as string[]).includes(l));
    if (list.length === 0 || bad.length > 0) usage(`--locales takes a comma list of ${LOCALES.join(", ")}`);
    opts.locales = list as Locale[];
  }
  const concurrency = values.get("--concurrency");
  if (concurrency !== undefined) opts.concurrency = positiveInt("--concurrency", concurrency);
  const maxCalls = values.get("--max-calls");
  if (maxCalls !== undefined) opts.maxCalls = positiveInt("--max-calls", maxCalls);
  const maxMinutes = values.get("--max-minutes");
  if (maxMinutes !== undefined) opts.endAt = Date.now() + positiveInt("--max-minutes", maxMinutes) * 60_000;
  return opts;
}

// ---------- i18n_stats ----------

async function fetchStats(svc: SupabaseClient): Promise<StatRow[]> {
  const { data, error } = await svc.rpc("i18n_stats");
  if (error) throw new Error(`i18n_stats: ${error.code} ${error.message}`);
  // _detected 行的 state 是 (detected_hash = src_hash)::text,从未检测过的为 NULL
  return ((data ?? []) as { entity: string; locale: string; state: string | null; n: number | string }[]).map((r) => ({
    entity: r.entity,
    locale: r.locale,
    state: r.state ?? "null",
    n: Number(r.n) || 0,
  }));
}

const QUEUE_STATES = [
  "ok", "ok+refresh", "ok+refresh(parked)", "pending", "failed", "dead", "rejected", "hold", "skipped",
] as const;
const STATE_LABELS: Partial<Record<(typeof QUEUE_STATES)[number], string>> = {
  "ok+refresh": "refresh",
  "ok+refresh(parked)": "parked",
};
// 还要 drain 的行。ok+refresh(parked) 是不公开内容(下架 / 隐藏)的 refresh 行,重新公开前不会被领取,不算
const DUE_STATES: ReadonlySet<string> = new Set(["pending", "failed", "ok+refresh"]);

function sumStates(rows: readonly StatRow[]): Record<string, number> {
  const sums: Record<string, number> = {};
  for (const r of rows) sums[r.state] = (sums[r.state] ?? 0) + r.n;
  return sums;
}

function queueLine(sums: Record<string, number>): string {
  return QUEUE_STATES.map((s) => `${STATE_LABELS[s] ?? s} ${sums[s] ?? 0}`).join(" · ");
}

/** --stats:每个实体一段(各语言队列状态 + 审核 + 检测),最后是词表 */
function printStats(rows: readonly StatRow[]): void {
  for (const entity of ENTITIES) {
    const own = rows.filter((r) => r.entity === entity);
    if (own.length === 0) continue;
    log(entity);
    for (const locale of LOCALES) {
      const sums = sumStates(own.filter((r) => r.locale === locale));
      if (Object.keys(sums).length > 0) log(`  ${locale}  ${queueLine(sums)}`);
    }
    const moderation = sumStates(own.filter((r) => r.locale === "_moderation"));
    log(`  moderation  ${Object.entries(moderation).map(([s, n]) => `${s} ${n}`).join(" · ") || "-"}`);
    const detected = sumStates(own.filter((r) => r.locale === "_detected"));
    const sources = Object.values(detected).reduce((n, v) => n + v, 0);
    log(`  detected  ${detected.true ?? 0} / ${sources}`);
  }
  log("glossary");
  for (const kind of ["topic", "feature"]) {
    const sums = sumStates(rows.filter((r) => r.entity === `term:${kind}`));
    log(`  ${kind}  ${Object.entries(sums).map(([s, n]) => `${s} ${n}`).join(" · ") || "-"}`);
  }
}

/** drain 进度:请求范围内每个语言一行(所有实体合计) */
function progressLines(rows: readonly StatRow[], o: Options): string[] {
  const locales = o.locales ?? LOCALES;
  return locales.map((locale) => {
    const sums = sumStates(rows.filter((r) => r.locale === locale && (!o.entity || r.entity === o.entity)));
    return `  ${locale}  ${queueLine(sums)}`;
  });
}

// ---------- steps ----------

async function runSeed(): Promise<Outcome> {
  const maps = await seedTitleMaps();
  log(`[i18n:backfill] title maps: ${maps.makes} makes, ${maps.models} models`);
  const g = await seedGlossary();
  log(
    `[i18n:backfill] glossary seeds: ${g.brands} brands, ${g.models} models, ${g.topics} topics, ${g.features} features`,
  );
  return "done";
}

async function runTerms(o: Options, svc: SupabaseClient): Promise<Outcome> {
  const maxGroups = Math.min(MAX_TERM_GROUPS, o.concurrency);
  const total = { rounds: 0, groups: 0, resolved: 0, rejected: 0, failed: 0, retried: 0, calls: 0 };
  let outcome: Outcome = "done";
  let stalledRounds = 0;
  for (;;) {
    if (stopRequested) {
      outcome = "interrupted";
      break;
    }
    if (o.endAt - Date.now() < MIN_TERMS_ROUND_MS) {
      log("[i18n:backfill] terms: --max-minutes reached");
      outcome = "limit";
      break;
    }
    const r = await resolveTerms({ deadlineAt: Math.min(Date.now() + TERMS_ROUND_MS, o.endAt), maxGroups, log });
    total.rounds++;
    total.groups += r.groups;
    total.resolved += r.resolved;
    total.rejected += r.rejected;
    total.failed += r.failed;
    total.retried += r.retried;
    total.calls += r.calls;
    // 401 / 402 / 未配置:再领也只会白跑。词表调用本身被拒的写法已按 retry 退回(不扣 attempts,SQL 未升级时记
    // failed);词表调用成功后标签审核才被拒的,通过校验的写法记 failed(各扣一次 attempts,按退避重试)
    if (r.halt) {
      log(
        r.halt.stop === "budget"
          ? "[i18n:backfill] terms: the model provider reports insufficient credits (HTTP 402); top up and re-run"
          : "[i18n:backfill] terms: OPENROUTER_API_KEY is missing or rejected (HTTP 401); fix it and re-run",
      );
      outcome = "failed";
      break;
    }
    if (r.groups === 0) break;
    // 领到了组却没有一条写法落定:限流(retry)、模型调用全失败,或写回全部出错 / 租约丢失
    stalledRounds = r.resolved + r.rejected === 0 ? stalledRounds + 1 : 0;
    if (stalledRounds >= TERMS_STALLED_ROUNDS_STOP) {
      log(
        `[i18n:backfill] terms: the last ${stalledRounds} rounds settled no alias (${r.failed} failed, ` +
          `${r.retried} retried in the last one; see the [i18n:terms] log above): check OPENROUTER_API_KEY, ` +
          "credits, the provider status and i18n_complete_term errors, then re-run; aliases that went dead " +
          "meanwhile come back with --requeue-terms (e.g. --requeue-terms --terms)",
      );
      outcome = "failed";
      break;
    }
  }
  log(
    `[i18n:backfill] terms: ${total.rounds} rounds · groups ${total.groups} · resolved ${total.resolved} · ` +
      `rejected ${total.rejected} · failed ${total.failed} · retried ${total.retried} · calls ${total.calls}`,
  );
  if (outcome === "done") {
    // 一轮领不到组也可能是:写法在退避中、所在内容未公开 / 未过审,或当天 daily_call_cap 已用完
    try {
      const sums = sumStates((await fetchStats(svc)).filter((r) => r.entity.startsWith("term:")));
      const waiting = (sums.pending ?? 0) + (sums.failed ?? 0);
      if (waiting > 0) {
        log(
          `[i18n:backfill] ${waiting} aliases still pending / failed (backing off, in hidden or unmoderated content, ` +
            "or daily_call_cap reached): re-run later",
        );
      }
      // dead 的写法不会再被领取(例如模型服务故障期间耗尽了重试次数)
      if ((sums.dead ?? 0) > 0) {
        log(
          `[i18n:backfill] ${sums.dead} aliases are dead (out of attempts): once the cause is fixed, ` +
            "--requeue-terms resets them",
        );
      }
    } catch (err) {
      log(`[i18n:backfill] ${errText(err)}`);
    }
  }
  return outcome;
}

async function runRequeueTerms(o: Options, svc: SupabaseClient): Promise<Outcome> {
  const scope = `${o.termStates.join(", ")} · ${o.termKind ?? "topic + feature"}`;
  const { data, error } = await svc.rpc("i18n_admin_requeue_terms", {
    p_kind: o.termKind ?? null,
    p_states: o.termStates,
  });
  if (error) {
    log(
      isMissingFunctionError(error)
        ? "[i18n:backfill] requeue-terms: i18n_admin_requeue_terms is missing: re-apply supabase/i18n-v2.sql"
        : `[i18n:backfill] requeue-terms: ${error.code} ${error.message}`,
    );
    return "failed";
  }
  log(`[i18n:backfill] requeue-terms: ${Number(data) || 0} aliases (${scope}) reset to pending`);
  return "done";
}

async function runDetect(o: Options, svc: SupabaseClient): Promise<Outcome> {
  const r = await detectPass({ noLlm: o.noLlm, deadlineAt: o.endAt, log });
  log(`[i18n:backfill] detect: ${r.detected} sources detected, ${r.calls} model calls`);
  // detectPass 遇到限流 / 模型拒绝 / RPC 出错 / --max-minutes 到点会提前返回(只记日志):检测队列里还有就算没做完。
  // --no-llm 把判不准的记成 provisional(算已检测,之后由模型细化),只看完全没检测的;库里还是旧版单参数函数时
  // 没有 provisional 之分,--no-llm 跳过的判不准的行留在队列里等模型检测
  let legacyQueue = false;
  let left = await svc.rpc("i18n_detection_queue", { p_limit: 1, p_include_provisional: !o.noLlm });
  if (left.error && isMissingFunctionError(left.error)) {
    legacyQueue = true;
    left = await svc.rpc("i18n_detection_queue", { p_limit: 1 });
  }
  if (left.error) {
    log(`[i18n:backfill] i18n_detection_queue: ${left.error.code} ${left.error.message}`);
    return "failed";
  }
  if (!Array.isArray(left.data) || left.data.length === 0) return "done";
  if (o.endAt - Date.now() < MIN_DETECT_LEFT_MS) {
    log("[i18n:backfill] detect: --max-minutes reached");
    return "limit";
  }
  log(
    o.noLlm && legacyQueue
      ? "[i18n:backfill] detect: sources are still undetected (see the [i18n:detect] log above); this database's " +
          "SQL predates provisional detection, so --no-llm leaves ambiguous Latin text to the model: run --detect " +
          "without --no-llm (or re-apply supabase/i18n-v2.sql)"
      : `[i18n:backfill] detect: sources are still ${o.noLlm ? "undetected" : "undetected or only provisionally detected"} ` +
          "(see the [i18n:detect] log above): re-run --detect",
  );
  return "failed";
}

async function runImportLegacy(o: Options): Promise<Outcome> {
  const entities = o.entity ? [o.entity as LegacyEntity] : undefined;
  const r = await importLegacy({ dryRun: o.dryRun, entities, log });
  let imported = 0;
  let valid = 0;
  let errors = 0;
  for (const report of Object.values(r.entities)) {
    for (const counts of Object.values(report?.locales ?? {})) {
      imported += counts?.imported ?? 0;
      valid += counts?.valid ?? 0;
      errors += counts?.errors ?? 0;
    }
  }
  log(
    r.dryRun
      ? `[i18n:backfill] import-legacy (dry run): ${valid} valid entries, nothing written`
      : `[i18n:backfill] import-legacy: ${imported} of ${valid} valid entries imported`,
  );
  if (errors > 0) {
    // 导入按原文 hash CAS、只改 pending / failed / hold 行:重跑只会补上出错的条目
    log(`[i18n:backfill] import-legacy: ${errors} entries hit RPC errors (logged above): re-run --import-legacy`);
    return "failed";
  }
  return "done";
}

function formatDrain(r: Omit<DrainResult, "stoppedBy">): string {
  return (
    `entities ${r.entities} · ok ${r.ok} · skipped ${r.skipped} · failed ${r.failed} · rejected ${r.rejected} · ` +
    `stale ${r.stale} · hidden ${r.hidden} · moderated ${r.moderated} · terms ${r.terms} · calls ${r.calls}`
  );
}

async function runDrain(o: Options, svc: SupabaseClient): Promise<Outcome> {
  const scope = [o.entity ?? "all entities", o.locales ? o.locales.join(",") : "all locales"].join(" · ");
  log(`[i18n:backfill] drain: ${scope} · concurrency ${o.concurrency}${o.maxCalls ? ` · max calls ${o.maxCalls}` : ""}`);
  const total: Omit<DrainResult, "stoppedBy"> = {
    entities: 0,
    ok: 0,
    skipped: 0,
    failed: 0,
    rejected: 0,
    stale: 0,
    hidden: 0,
    moderated: 0,
    terms: 0,
    calls: 0,
  };

  let statsBusy = false;
  const printProgress = async () => {
    if (statsBusy) return;
    statsBusy = true;
    try {
      const rows = await fetchStats(svc);
      log(`[i18n:backfill] i18n_stats ${new Date().toISOString().slice(11, 19)}`);
      for (const line of progressLines(rows, o)) log(line);
    } catch (err) {
      log(`[i18n:backfill] ${errText(err)}`);
    } finally {
      statsBusy = false;
    }
  };
  const timer = setInterval(() => void printProgress(), STATS_EVERY_MS);

  let outcome: Outcome;
  try {
    for (let round = 1; ; round++) {
      if (stopRequested) {
        outcome = "interrupted";
        break;
      }
      const left = o.endAt - Date.now();
      if (left < MIN_DRAIN_ROUND_MS) {
        log("[i18n:backfill] drain: --max-minutes reached");
        outcome = "limit";
        break;
      }
      const callsLeft = o.maxCalls === undefined ? undefined : o.maxCalls - total.calls;
      if (callsLeft !== undefined && callsLeft <= 0) {
        log(`[i18n:backfill] drain: --max-calls ${o.maxCalls} reached`);
        outcome = "limit";
        break;
      }
      const started = Date.now();
      const r = await drain({
        deadlineAt: Math.min(started + DRAIN_ROUND_MS, o.endAt),
        concurrency: o.concurrency,
        entity: o.entity,
        locales: o.locales,
        maxCalls: callsLeft,
        log,
      });
      for (const key of Object.keys(total) as (keyof typeof total)[]) total[key] += r[key];
      log(
        `[i18n:backfill] round ${round} (${((Date.now() - started) / 1000).toFixed(1)} s): ${formatDrain(r)} · ` +
          `stoppedBy ${r.stoppedBy}`,
      );
      if (r.stoppedBy === "empty") {
        outcome = "done";
        break;
      }
      if (r.stoppedBy === "max_calls") {
        log(`[i18n:backfill] drain: --max-calls ${o.maxCalls} reached`);
        outcome = "limit";
        break;
      }
      if (r.stoppedBy === "budget") {
        log("[i18n:backfill] drain: the model provider reports insufficient credits (HTTP 402); top up and re-run");
        outcome = "failed";
        break;
      }
      if (r.stoppedBy === "not_configured") {
        log(
          "[i18n:backfill] drain: not configured (OPENROUTER_API_KEY missing or rejected with HTTP 401, " +
            "or the i18n SQL is not applied)",
        );
        outcome = "failed";
        break;
      }
      if (r.stoppedBy === "rate_limited") {
        const pause = Math.min(RATE_LIMIT_PAUSE_MS, o.endAt - Date.now());
        log(`[i18n:backfill] rate limited: pausing ${Math.round(pause / 1000)} s`);
        if (pause > 0) await sleep(pause);
      }
    }
  } finally {
    clearInterval(timer);
  }

  log(`[i18n:backfill] drain total: ${formatDrain(total)}`);
  try {
    const rows = await fetchStats(svc);
    for (const line of progressLines(rows, o)) log(line);
    const waiting = rows
      .filter((r) => (o.locales ?? LOCALES).includes(r.locale as Locale) && (!o.entity || r.entity === o.entity))
      .filter((r) => DUE_STATES.has(r.state))
      .reduce((n, r) => n + r.n, 0);
    if (waiting > 0) {
      log(
        `[i18n:backfill] ${waiting} rows still pending / failed / refresh (not due yet, leased elsewhere or ` +
          "daily_call_cap reached): re-run later",
      );
    }
  } catch (err) {
    log(`[i18n:backfill] ${errText(err)}`);
  }
  return outcome;
}

// ---------- main ----------

async function main(): Promise<number> {
  const opts = parseOptions(process.argv.slice(2));
  loadEnvLocal();

  let svc: SupabaseClient;
  try {
    svc = createServiceClient();
  } catch (err) {
    fail(errText(err));
  }
  const needsModel = opts.steps.has("terms") || opts.steps.has("drain") || (opts.steps.has("detect") && !opts.noLlm);
  if (needsModel && !isAiConfigured()) {
    fail("OPENROUTER_API_KEY is not set (needed by --terms, --detect without --no-llm and --drain)");
  }
  // 预检:SQL 是否已执行(i18n_stats 只对 service / admin 返回数据)
  const pre = await svc.rpc("i18n_stats");
  if (pre.error) {
    fail(
      isMissingFunctionError(pre.error)
        ? "supabase/i18n-v2.sql has not been applied to this database"
        : `i18n_stats: ${pre.error.code} ${pre.error.message}`,
    );
  }

  process.on("SIGINT", () => {
    if (stopRequested) process.exit(130);
    stopRequested = true;
    log("\n[i18n:backfill] stopping after the current step / round (Ctrl-C again to quit now)");
  });

  for (const step of STEPS) {
    if (!opts.steps.has(step)) continue;
    if (stopRequested) return 130;
    log(`\n[i18n:backfill] --${step}`);
    let outcome: Outcome;
    switch (step) {
      case "seed":
        outcome = await runSeed();
        break;
      case "requeue-terms":
        outcome = await runRequeueTerms(opts, svc);
        break;
      case "terms":
        outcome = await runTerms(opts, svc);
        break;
      case "detect":
        outcome = await runDetect(opts, svc);
        break;
      case "import-legacy":
        outcome = await runImportLegacy(opts);
        break;
      case "drain":
        outcome = await runDrain(opts, svc);
        break;
      case "stats":
        printStats(await fetchStats(svc));
        outcome = "done";
        break;
    }
    if (outcome === "failed") return 1;
    if (outcome === "interrupted") return 130;
  }
  return 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(`[i18n:backfill] ${errText(err)}`);
    process.exit(1);
  },
);

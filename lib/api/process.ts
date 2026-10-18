// Public API 上传车辆的异步处理链(docs/public-api-v0.md §4.3 第 7 步),由 after() 在响应返回后执行:
// VIN 解码核对 → 图片转存 → AI 审核(i18n 管线 moderateEntity)→ 翻译(drainEntity / drain)。
// 审核结论与译文都由 i18n 管线写进 i18n.* / ai_moderation,这里只负责趁热跑一轮:截止 start + 55 s
// (路由 maxDuration 60),没做完的由 /api/i18n/drain cron(每 2 分钟)接着做。被拦下、或审核因与内容无关的
// 原因没做成(没配 key、审核预算用完、限流、上游故障…)的车这次不翻译:翻译前要先审,cron 稍后一并重试。
// I18N_DRAIN_DISABLED=1(与 cron、/api/sync、/api/moderate 共用的紧急开关)时只跳过翻译,译文留在队列,审核照常。
// 每一步独立 try/catch,失败只记日志、绝不影响已写入的记录。Server-only(service role)。

import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/sources/service-client";
import { mirrorCarImages, deleteMirroredImages, isMirroredUrl } from "@/lib/sources/images";
import { decodeVin, verifyVinMatch } from "@/lib/vin";
import { moderateEntity } from "@/lib/i18n-pipeline/moderation";
import { drain, drainEntity, type DrainResult } from "@/lib/i18n-pipeline/worker";

export interface ProcessOptions {
  moderate: boolean;
  /** 跑一轮 i18n 管线翻译(drain) */
  translate: boolean;
  mirrorImages: boolean;
  verifyVin: boolean;
}

/** 处理链会把哪些步骤排进后台(响应体 processing 字段用) */
export function processingSteps(opts: ProcessOptions): string[] {
  const steps: string[] = [];
  if (opts.verifyVin) steps.push("vin");
  if (opts.moderate) steps.push("moderation");
  if (opts.translate) steps.push("translation");
  if (opts.mirrorImages) steps.push("images");
  return steps;
}

/** 一辆车的后台任务(batch 整批收集后交给 processListingBatch) */
export interface ListingTask {
  carId: string;
  opts: ProcessOptions;
  /** 换图:先删掉旧的转存文件再转存(新列表可能更短,避免孤儿文件) */
  clearMirrors: boolean;
}

/** 后台截止:start + 55 s(路由 maxDuration 60) */
const DEADLINE_MS = 55_000;
/**
 * 剩余不足 15 s 不再开始新的转存 / 审核(与 drain 的停止线一致),余下交给 cron。时间不够的审核不记 strike
 * (moderateEntity 剩余不足 6 s 时不送审、什么都不记),这里提前停还省掉那次 RPC
 */
const MIN_STEP_MS = 15_000;
const PREP_CONCURRENCY = 4;
const MODERATION_CONCURRENCY = 4;

interface ProcessCar {
  id: string;
  vin: string | null;
  year: number;
  make: string;
  model: string;
  images: string[] | null;
}

const PROCESS_CAR_COLS = "id, vin, year, make, model, images";

const log = (carId: string, msg: string) => console.log(`[api/v1:process] ${carId} ${msg}`);
const errMsg = (err: unknown) => (err instanceof Error ? err.message : String(err));

/** 有界并发:同时最多 concurrency 个 worker,全部完成后返回 */
async function runPool<T>(items: readonly T[], concurrency: number, worker: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  const run = async () => {
    while (next < items.length) await worker(items[next++]);
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, run));
}

function serviceClient(scope: string): SupabaseClient | null {
  try {
    return createServiceClient();
  } catch (err) {
    console.error(`[api/v1:process] ${scope} service client: ${errMsg(err)}`);
    return null;
  }
}

/** 转存 / VIN 要用的车源字段;查询失败记日志返回 null */
async function loadCars(supabase: SupabaseClient, ids: string[]): Promise<Map<string, ProcessCar> | null> {
  const { data, error } = await supabase.from("cars").select(PROCESS_CAR_COLS).in("id", ids);
  if (error) {
    console.error(`[api/v1:process] load ${ids.length === 1 ? ids[0] : `${ids.length} cars`} failed: ${error.message}`);
    return null;
  }
  return new Map(((data ?? []) as ProcessCar[]).map((c) => [c.id, c]));
}

function needsPrep(task: ListingTask): boolean {
  return task.clearMirrors || task.opts.verifyVin || task.opts.mirrorImages;
}

/** 截止前还来得及开始新的一步转存 / 审核 */
function hasStepTime(deadlineAt: number): boolean {
  return deadlineAt - Date.now() >= MIN_STEP_MS;
}

/** VIN 解码核对:v0 只记日志、不落库(不因车行填错年款就拦车) */
async function checkVin(car: ProcessCar, vin: string): Promise<void> {
  try {
    const decoded = await decodeVin(vin);
    if (!decoded) {
      log(car.id, `vin ${vin}: decode returned nothing`);
      return;
    }
    const { matched, mismatches } = verifyVinMatch(decoded, { make: car.make, year: car.year, model: car.model });
    if (matched) log(car.id, `vin ${vin}: ok`);
    else log(car.id, `vin ${vin}: MISMATCH ${mismatches.join("; ")}`);
    // 品牌或年份都对不上 → 大概率 VIN 填错/贴错车,单独提醒一行方便排查
    const makeOff =
      !!decoded.make &&
      !decoded.make.toLowerCase().includes(car.make.toLowerCase()) &&
      !car.make.toLowerCase().includes(decoded.make.toLowerCase());
    const yearOff = !!decoded.year && Math.abs(decoded.year - car.year) > 1;
    if (makeOff && yearOff) {
      console.warn(
        `[api/v1:process] ${car.id} vin ${vin} decodes to ${decoded.year} ${decoded.make} ${decoded.model} ` +
          `but listing says ${car.year} ${car.make} ${car.model} — likely wrong VIN`,
      );
    }
  } catch (err) {
    console.error(`[api/v1:process] ${car.id} vin step failed: ${errMsg(err)}`);
  }
}

/** 图片转存:压缩进我方 Storage,source_images 保留原始外链用于换图检测 */
async function mirrorImages(supabase: SupabaseClient, car: ProcessCar): Promise<void> {
  try {
    const sources = (car.images ?? []).filter(Boolean);
    if (sources.length === 0) {
      log(car.id, "images: none");
    } else if (sources.every(isMirroredUrl)) {
      log(car.id, "images: already mirrored");
    } else {
      const t0 = Date.now();
      const m = await mirrorCarImages(supabase, car.id, sources);
      const { error } = await supabase
        .from("cars")
        .update({ images: m.images, image_url: m.image_url, source_images: sources })
        .eq("id", car.id);
      if (error) throw new Error(error.message);
      log(car.id, `images: mirrored=${m.mirrored} failed=${m.failed} in ${Date.now() - t0}ms`);
    }
  } catch (err) {
    console.error(`[api/v1:process] ${car.id} images step failed: ${errMsg(err)}`);
  }
}

/** 换图清理 → VIN 核对 → 图片转存 */
async function prepareCar(supabase: SupabaseClient, car: ProcessCar, task: ListingTask): Promise<void> {
  if (task.clearMirrors) {
    try {
      await deleteMirroredImages(supabase, car.id);
    } catch (err) {
      console.error(`[api/v1:process] ${car.id} clear old mirrors: ${errMsg(err)}`);
    }
  }
  if (task.opts.verifyVin && car.vin) await checkVin(car, car.vin);
  if (task.opts.mirrorImages) await mirrorImages(supabase, car);
}

/**
 * 审核一步对翻译的影响。ok:有了结论(含内容相关的失败,已记 strike)或不必审,照常翻译;
 * blocked:被拦下(enforce 模式下管线已把车下架),不必再翻译;
 * unavailable:因与内容无关的原因没审成(没配 key、审核预算用完、限流、上游 / 数据库故障、剩余不足 6 s),
 * 没记 strike —— 翻译前还得先审,这次接着翻只会再撞上同一个失败,审核与翻译都交给 cron 重试
 */
type ModerationStep = "ok" | "blocked" | "unavailable";

/** i18n 管线审核这辆车(moderateEntity 不抛错;万一抛了同样按 unavailable 处理) */
async function moderate(carId: string, deadlineAt: number): Promise<ModerationStep> {
  try {
    const r = await moderateEntity("car", carId, deadlineAt);
    const f = r.failure;
    const unavailable = r.verdict === "error" && f?.systemic === true;
    const why = f ? ` (${f.systemic ? "systemic" : "content"} ${f.error}${f.status ? ` ${f.status}` : ""})` : "";
    const next = unavailable ? " — deferred to cron" : "";
    log(carId, `moderation: ${r.verdict}${r.cached ? " (cached)" : ""}${why}${next}`);
    if (r.verdict === "blocked") return "blocked";
    return unavailable ? "unavailable" : "ok";
  } catch (err) {
    console.error(`[api/v1:process] ${carId} moderation step failed: ${errMsg(err)} — deferred to cron`);
    return "unavailable";
  }
}

function drainSummary(r: DrainResult): string {
  return (
    `entities=${r.entities} ok=${r.ok} skipped=${r.skipped} failed=${r.failed} rejected=${r.rejected} ` +
    `calls=${r.calls} stoppedBy=${r.stoppedBy}`
  );
}

/** 翻译一步:紧急开关 I18N_DRAIN_DISABLED=1 时不跑(译文留在队列,开关撤掉后由 cron 接着做);失败只记日志 */
async function runTranslation(scope: string, run: () => Promise<DrainResult>): Promise<void> {
  if (process.env.I18N_DRAIN_DISABLED === "1") {
    console.log(`[api/v1:process] ${scope} translation: skipped (I18N_DRAIN_DISABLED=1)`);
    return;
  }
  try {
    console.log(`[api/v1:process] ${scope} translation: ${drainSummary(await run())}`);
  } catch (err) {
    console.error(`[api/v1:process] ${scope} translation step failed: ${errMsg(err)}`);
  }
}

/**
 * 单车处理链(PUT、换图端点):换图清理 / VIN / 转存 → moderateEntity → drainEntity。
 * startedAt = 请求开始时间(截止 startedAt + 55 s,缺省为调用时刻);转存拖到剩余不足 15 s 时
 * 审核与 batch 一样交给 cron;被拦下或审核因与内容无关的原因没做成时不翻译(见 ModerationStep)。
 */
export async function processListingAsync(
  carId: string,
  opts: ProcessOptions,
  extra: { startedAt?: number; clearMirrors?: boolean } = {},
): Promise<void> {
  const deadlineAt = (extra.startedAt ?? Date.now()) + DEADLINE_MS;
  const task: ListingTask = { carId, opts, clearMirrors: extra.clearMirrors ?? false };
  const supabase = serviceClient(carId);
  if (!supabase) return;
  log(carId, `start steps=${processingSteps(opts).join(",") || "none"}`);

  if (needsPrep(task)) {
    const car = (await loadCars(supabase, [carId]))?.get(carId);
    if (car) await prepareCar(supabase, car, task);
    else log(carId, "load failed or not found — skipped vin/images");
  }

  let moderation: ModerationStep = "ok";
  if (opts.moderate) {
    if (!hasStepTime(deadlineAt)) log(carId, "moderation: deferred to cron");
    else moderation = await moderate(carId, deadlineAt);
  }
  if (opts.translate && moderation === "ok") {
    await runTranslation(carId, () => drainEntity("car", carId, deadlineAt));
  }
  log(carId, "done");
}

/**
 * batch 处理链(整批一个 after()):逐车换图清理 / VIN / 转存(有界并发)→ 有界审核 →
 * 一次 drain({ entity: 'car', entityIds })。剩余不足 15 s 时不再开始新的转存 / 审核,交给 cron;
 * 审核碰到与内容无关的失败后其余车不再送审,被拦下与没审成的车不进这次 drain。
 */
export async function processListingBatch(tasks: readonly ListingTask[], startedAt: number): Promise<void> {
  const deadlineAt = startedAt + DEADLINE_MS;
  const scope = `batch(${tasks.length})`;
  const supabase = serviceClient(scope);
  if (!supabase) return;
  console.log(`[api/v1:process] ${scope} start`);

  // 1. 换图清理 / VIN / 转存
  const prep = tasks.filter(needsPrep);
  if (prep.length > 0) {
    const cars = await loadCars(supabase, prep.map((t) => t.carId));
    if (cars) {
      await runPool(prep, PREP_CONCURRENCY, async (task) => {
        const car = cars.get(task.carId);
        if (!car) log(task.carId, "not found — skipped vin/images");
        else if (!hasStepTime(deadlineAt)) log(task.carId, "vin/images: out of time");
        else await prepareCar(supabase, car, task);
      });
    }
  }

  // 2. 审核(有界):被拦下的车不再翻译。审核因与内容无关的原因没做成(unavailable)后,还没开始审的车也不再
  //    送审(多半撞上同一个失败:限流、预算用完、上游故障…);没审成的车这次都不翻译(翻译前要先审),交给 cron
  const skipTranslation = new Set<string>();
  let unavailable = false;
  await runPool(
    tasks.filter((t) => t.opts.moderate),
    MODERATION_CONCURRENCY,
    async (task) => {
      if (unavailable) {
        log(task.carId, "moderation: deferred to cron (moderation unavailable)");
        skipTranslation.add(task.carId);
      } else if (!hasStepTime(deadlineAt)) {
        log(task.carId, "moderation: deferred to cron");
      } else {
        const step = await moderate(task.carId, deadlineAt);
        if (step === "unavailable") unavailable = true;
        if (step !== "ok") skipTranslation.add(task.carId);
      }
    },
  );

  // 3. 翻译:整批一次 drain
  const ids = tasks.filter((t) => t.opts.translate && !skipTranslation.has(t.carId)).map((t) => t.carId);
  if (ids.length > 0) {
    await runTranslation(scope, () =>
      drain({ entity: "car", entityIds: ids, deadlineAt, log: (m) => console.log(`[api/v1:process] ${scope} ${m}`) }),
    );
  }
  console.log(`[api/v1:process] ${scope} done`);
}

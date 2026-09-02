// Public API 上传车辆的异步处理链(docs/public-api-v0.md §4.3 第 7 步):
// VIN 解码核对 → AI 审核(违规则 removed + ai_moderation)→ 双语翻译 → 图片转存。
// 由 after() 在响应返回后执行;每一步独立 try/catch,失败只记日志、绝不影响已写入的记录。
// Server-only(service role)。

import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/sources/service-client";
import { mirrorCarImages, isMirroredUrl } from "@/lib/sources/images";
import { localizeListing } from "@/lib/translate";
import { moderateContent, isModerationConfigured, MODERATION_MODEL } from "@/lib/moderate";
import { decodeVin, verifyVinMatch } from "@/lib/vin";

export interface ProcessOptions {
  moderate: boolean;
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

interface ProcessCar {
  id: string;
  seller_id: string;
  status: string;
  title: string | null;
  title_zh: string | null;
  year: number;
  make: string;
  model: string;
  vin: string | null;
  description: string | null;
  description_zh: string | null;
  features: string[] | null;
  images: string[] | null;
  image_url: string | null;
}

const log = (carId: string, msg: string) => console.log(`[api/v1:process] ${carId} ${msg}`);
const errMsg = (err: unknown) => (err instanceof Error ? err.message : String(err));

/** 与 app/api/moderate/route.ts 同一套送审文本拼法 */
function moderationText(car: ProcessCar): string {
  return [car.title_zh || car.title, car.description_zh, car.description, car.features?.join(" · ")]
    .filter(Boolean)
    .join("\n\n");
}

/**
 * AI 审核一辆车:违规则先 upsert ai_moderation(管理后台复核依据),成功后才改 removed。
 * 记录写不进去(如 SQL 未执行)则不屏蔽 —— 与 /api/moderate 同一规则。
 * 返回是否被拦截。
 */
export async function moderateCar(supabase: SupabaseClient, car: ProcessCar): Promise<boolean> {
  if (!isModerationConfigured()) return false;
  const text = moderationText(car);
  const images = [car.image_url, ...(car.images ?? [])].filter((u): u is string => Boolean(u));
  const verdict = await moderateContent("car", text, images);
  if (!verdict || !verdict.violation) return false;

  const { error: flagError } = await supabase.from("ai_moderation").upsert(
    {
      target_type: "car",
      target_id: car.id,
      user_id: car.seller_id,
      content: text.slice(0, 4000),
      categories: verdict.categories,
      reason: verdict.reason,
      model: MODERATION_MODEL,
      status: "pending",
    },
    { onConflict: "target_type,target_id" },
  );
  if (flagError) {
    console.error(`[api/v1:process] ${car.id} moderation flag insert failed: ${flagError.message}`);
    return false;
  }
  const { error } = await supabase.from("cars").update({ status: "removed" }).eq("id", car.id);
  if (error) throw new Error(error.message);
  return true;
}

export async function processListingAsync(carId: string, opts: ProcessOptions): Promise<void> {
  let supabase: SupabaseClient;
  try {
    supabase = createServiceClient();
  } catch (err) {
    console.error(`[api/v1:process] ${carId} service client: ${errMsg(err)}`);
    return;
  }

  // (a) 取车
  const { data, error } = await supabase
    .from("cars")
    .select(
      "id, seller_id, status, title, title_zh, year, make, model, vin, description, description_zh, features, images, image_url",
    )
    .eq("id", carId)
    .maybeSingle();
  if (error || !data) {
    console.error(`[api/v1:process] ${carId} load failed: ${error?.message ?? "not found"}`);
    return;
  }
  const car = data as ProcessCar;
  log(carId, `start steps=${processingSteps(opts).join(",") || "none"}`);

  // (b) VIN 解码核对:v0 只记日志、不落库(不因车行填错年款就拦车)
  if (opts.verifyVin && car.vin) {
    try {
      const decoded = await decodeVin(car.vin);
      if (!decoded) {
        log(carId, `vin ${car.vin}: decode returned nothing`);
      } else {
        const { matched, mismatches } = verifyVinMatch(decoded, {
          make: car.make,
          year: car.year,
          model: car.model,
        });
        if (matched) log(carId, `vin ${car.vin}: ok`);
        else log(carId, `vin ${car.vin}: MISMATCH ${mismatches.join("; ")}`);
        // 品牌或年份都对不上 → 大概率 VIN 填错/贴错车,单独提醒一行方便排查
        const makeOff =
          !!decoded.make &&
          !decoded.make.toLowerCase().includes(car.make.toLowerCase()) &&
          !car.make.toLowerCase().includes(decoded.make.toLowerCase());
        const yearOff = !!decoded.year && Math.abs(decoded.year - car.year) > 1;
        if (makeOff && yearOff) {
          console.warn(
            `[api/v1:process] ${carId} vin ${car.vin} decodes to ${decoded.year} ${decoded.make} ${decoded.model} ` +
              `but listing says ${car.year} ${car.make} ${car.model} — likely wrong VIN`,
          );
        }
      }
    } catch (err) {
      console.error(`[api/v1:process] ${carId} vin step failed: ${errMsg(err)}`);
    }
  }

  // (c) AI 审核:拦截后不再翻译/转存(车已 removed)
  if (opts.moderate) {
    try {
      const blocked = await moderateCar(supabase, car);
      if (blocked) {
        log(carId, "moderation: BLOCKED (status=removed, ai_moderation pending)");
        return;
      }
      log(carId, "moderation: pass");
    } catch (err) {
      console.error(`[api/v1:process] ${carId} moderation step failed: ${errMsg(err)}`);
    }
  }

  // (d) 双语补全:标题确定性,描述/标签交给模型
  if (opts.translate) {
    try {
      const t0 = Date.now();
      const loc = await localizeListing({
        title: car.title,
        title_zh: car.title_zh,
        description: car.description,
        description_zh: car.description_zh,
        features: car.features ?? [],
      });
      const patch: Record<string, unknown> = {};
      if (loc.title && loc.title !== car.title) patch.title = loc.title;
      if (loc.title_zh && loc.title_zh !== car.title_zh) patch.title_zh = loc.title_zh;
      if (loc.description && loc.description !== car.description) patch.description = loc.description;
      if (loc.description_zh && loc.description_zh !== car.description_zh) patch.description_zh = loc.description_zh;
      if (loc.features.length && loc.features.join("") !== (car.features ?? []).join(""))
        patch.features = loc.features;
      if (Object.keys(patch).length > 0) {
        const { error: upErr } = await supabase.from("cars").update(patch).eq("id", carId);
        if (upErr) throw new Error(upErr.message);
      }
      log(carId, `translation: ${Object.keys(patch).join(",") || "no change"} in ${Date.now() - t0}ms`);
    } catch (err) {
      console.error(`[api/v1:process] ${carId} translation step failed: ${errMsg(err)}`);
    }
  }

  // (e) 图片转存:压缩进我方 Storage,source_images 保留原始外链用于换图检测
  if (opts.mirrorImages) {
    try {
      const sources = (car.images ?? []).filter(Boolean);
      if (sources.length === 0) {
        log(carId, "images: none");
      } else if (sources.every(isMirroredUrl)) {
        log(carId, "images: already mirrored");
      } else {
        const t0 = Date.now();
        const m = await mirrorCarImages(supabase, carId, sources);
        const { error: imgErr } = await supabase
          .from("cars")
          .update({ images: m.images, image_url: m.image_url, source_images: sources })
          .eq("id", carId);
        if (imgErr) throw new Error(imgErr.message);
        log(carId, `images: mirrored=${m.mirrored} failed=${m.failed} in ${Date.now() - t0}ms`);
      }
    } catch (err) {
      console.error(`[api/v1:process] ${carId} images step failed: ${errMsg(err)}`);
    }
  }

  log(carId, "done");
}

/** 响应返回后在后台跑处理链(Next.js after()) */
export function scheduleProcessing(carId: string, opts: ProcessOptions): void {
  after(() => processListingAsync(carId, opts));
}

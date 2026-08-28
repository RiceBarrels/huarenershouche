// 系统检索车源图片转存:下载源站照片 → sharp 压缩(WebP)→ 存入 Supabase
// Storage 的 car-images/syndicated/<carId>/ 下,不再外链车行 CDN。
// 下架(源站删除/过期)后由 cleanupRemovedMirrors 删除文件并回退外链。
// Server-only(service role,storage RLS 直接绕过)。

import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "car-images";
const PREFIX = "syndicated";
/** 压缩目标:最长边 1280px、WebP q75(车图约 60-100KB/张) */
const MAX_DIM = 1280;
const WEBP_QUALITY = 75;
/** 每辆车最多转存的图片数(源站常有 40-60 张,靠后的多为重复角度) */
const MAX_IMAGES_PER_CAR = 24;
const DOWNLOAD_TIMEOUT_MS = 20_000;
/** 车内下载/压缩/上传并发 */
const PER_CAR_CONCURRENCY = 4;

/** 该 URL 是否已是我们转存的图片 */
export function isMirroredUrl(url: string): boolean {
  return url.includes(`/${BUCKET}/${PREFIX}/`);
}

async function downloadImage(url: string): Promise<Buffer> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
  try {
    const res = await fetch(url, { redirect: "follow", signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  } finally {
    clearTimeout(timer);
  }
}

export interface MirrorResult {
  /** 与源图一一对应:成功 = 我方 Storage 公网 URL,失败 = 保留源站外链 */
  images: string[];
  image_url: string | null;
  mirrored: number;
  failed: number;
}

/**
 * 转存一辆车的图片。任一张失败不影响其余(该张回退源站外链)。
 * 路径固定为 syndicated/<carId>/<序号>.webp,重跑覆盖(upsert)。
 */
export async function mirrorCarImages(
  supabase: SupabaseClient,
  carId: string,
  sourceUrls: string[],
): Promise<MirrorResult> {
  const targets = sourceUrls.slice(0, MAX_IMAGES_PER_CAR);
  const out: string[] = [...targets];
  let mirrored = 0;

  let cursor = 0;
  const worker = async () => {
    while (cursor < targets.length) {
      const i = cursor++;
      const src = targets[i];
      if (isMirroredUrl(src)) {
        mirrored++;
        continue;
      }
      try {
        const raw = await downloadImage(src);
        const compressed = await sharp(raw)
          .rotate()
          .resize({ width: MAX_DIM, height: MAX_DIM, fit: "inside", withoutEnlargement: true })
          .webp({ quality: WEBP_QUALITY })
          .toBuffer();
        const path = `${PREFIX}/${carId}/${i}.webp`;
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(path, compressed, { contentType: "image/webp", upsert: true });
        if (error) throw new Error(error.message);
        out[i] = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
        mirrored++;
      } catch {
        // 保留源站外链,下次同步会再试
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(PER_CAR_CONCURRENCY, targets.length)) }, worker),
  );

  return { images: out, image_url: out[0] ?? null, mirrored, failed: targets.length - mirrored };
}

/** 删除一辆车在 Storage 里的全部转存图片 */
export async function deleteMirroredImages(
  supabase: SupabaseClient,
  carId: string,
): Promise<void> {
  const dir = `${PREFIX}/${carId}`;
  const { data } = await supabase.storage.from(BUCKET).list(dir, { limit: 1000 });
  const files = (data ?? []).map((f) => `${dir}/${f.name}`);
  if (files.length > 0) await supabase.storage.from(BUCKET).remove(files);
}

/**
 * 清理已下架(status='removed')系统车源的转存图片:删除 Storage 文件,
 * images 回退为源站外链(source_images),这样管理后台仍能看图,
 * 且若源站重新上架、同步会因图片不再指向我方 Storage 而自动重新转存。
 * 覆盖两条下架路径:源站消失(sync delist)与 30 天过期(pg_cron)。
 */
export async function cleanupRemovedMirrors(
  supabase: SupabaseClient,
  limit = 100,
): Promise<{ cleaned: number; errors: string[] }> {
  const errors: string[] = [];
  const { data, error } = await supabase
    .from("cars")
    .select("id, images, source_images")
    .not("source_id", "is", null)
    .eq("status", "removed");
  if (error) return { cleaned: 0, errors: [`cleanup query: ${error.message}`] };

  const rows = ((data ?? []) as { id: string; images: string[] | null; source_images: string[] | null }[])
    .filter((r) => (r.images ?? []).some(isMirroredUrl))
    .slice(0, limit);

  let cleaned = 0;
  for (const row of rows) {
    try {
      await deleteMirroredImages(supabase, row.id);
      const fallback = row.source_images ?? [];
      const { error: upErr } = await supabase
        .from("cars")
        .update({ images: fallback, image_url: fallback[0] ?? null })
        .eq("id", row.id);
      if (upErr) throw new Error(upErr.message);
      cleaned++;
    } catch (err) {
      errors.push(`cleanup ${row.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return { cleaned, errors };
}

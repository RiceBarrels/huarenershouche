// POST /api/v1/inventory/{external_id}/images — 整体替换图片:body { images: https URL[] }。
// 同步写入原始外链(立即可见)并扣一次 update 配额,after() 里压缩转存到我方 Storage。
// 需 write:images。multipart 上传是 P1,v0 只收 URL。

import type { NextRequest } from "next/server";
import { after } from "next/server";
import { z } from "zod";
import { authenticateApi } from "@/lib/api/auth";
import { consumeQuota, quotaExceededResponse, quotaHeaders } from "@/lib/api/quota";
import { apiError, apiInternalError, apiJson, handleOptions } from "@/lib/api/response";
import { LISTING_MAX_IMAGES, type ApiContext } from "@/lib/api/types";
import { finalize, formatZodError, readJsonBody } from "@/lib/api/listing";
import { processListingAsync } from "@/lib/api/process";
import { deleteMirroredImages, isMirroredUrl } from "@/lib/sources/images";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const OPTIONS = handleOptions;

const imagesSchema = z.object({
  images: z
    .array(
      z
        .string()
        .trim()
        .max(2048)
        .url({ message: "must be a valid URL" })
        .refine((u) => u.startsWith("https://"), { message: "must be an https URL" }),
    )
    .max(LISTING_MAX_IMAGES),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ external_id: string }> }) {
  let ctx: ApiContext | null = null;
  try {
    const auth = await authenticateApi(req, { scope: "write:images" });
    if (!auth.ok) return auth.response;
    ctx = auth.ctx;
    const { external_id } = await params;

    const body = await readJsonBody(req);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return finalize(ctx, apiError(400, "bad_request", "Body must be a JSON object"));
    }
    const parsed = imagesSchema.safeParse(body);
    if (!parsed.success) {
      return finalize(ctx, apiError(400, "validation_failed", "Invalid images", formatZodError(parsed.error)));
    }
    const images = parsed.data.images;

    const { supabase } = ctx;
    const { data, error } = await supabase
      .from("cars")
      .select("id, images")
      .eq("seller_id", ctx.owner!.id)
      .eq("external_id", external_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return finalize(ctx, apiError(404, "not_found", `No listing with external_id "${external_id}"`));
    const car = data as { id: string; images: string[] | null };

    const q = await consumeQuota(ctx, "update");
    if (!q.ok) return finalize(ctx, quotaExceededResponse(q.quota));

    const { error: upErr } = await supabase
      .from("cars")
      .update({ images, image_url: images[0] ?? null, source_images: images })
      .eq("id", car.id);
    if (upErr) throw new Error(upErr.message);

    const hadMirrored = (car.images ?? []).some(isMirroredUrl);
    const processing: string[] = [];
    if (images.length > 0 || hadMirrored) {
      if (images.length > 0) processing.push("images");
      after(async () => {
        // 旧转存文件先清掉(新列表可能更短,避免孤儿文件)
        if (hadMirrored) {
          try {
            await deleteMirroredImages(supabase, car.id);
          } catch (err) {
            console.error(`[api/v1:process] ${car.id} clear old mirrors: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
        if (images.length > 0) {
          await processListingAsync(car.id, { moderate: false, translate: false, verifyVin: false, mirrorImages: true });
        }
      });
    }

    return apiJson({ id: car.id, external_id, images, processing, quota: q.quota }, { headers: quotaHeaders(q.quota) });
  } catch (err) {
    return finalize(ctx, apiInternalError(err, "inventory.images"));
  }
}

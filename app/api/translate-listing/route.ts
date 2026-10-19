// /api/translate-listing — 旧版原生 App 的兼容接口(只读,绝不调用模型)。
// 旧版本在车源详情页按需请求某个语种的标题 / 描述。现在译文由翻译管线提前生成(supabase/i18n-v2.sql),
// 这里只读 i18n_bundle:该语种已有校验过的译文(ok)或原文就是该语种(source)时返回 { title, description },
// 否则返回 translation_pending,旧客户端随即回退显示原文。标题是确定性标题(carTitle),不需要翻译。

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { carTitle, dbLocale } from "@/lib/i18n";
import { isSiteLocale } from "@/lib/i18n/content-langs";
import type { BundleRow } from "@/lib/i18n/content/types";

export const dynamic = "force-dynamic";

// Capacitor 原生壳的 origin 与站点不同源,需要放开 CORS
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

const pending = () => NextResponse.json({ ok: false, error: "translation_pending" }, { headers: CORS_HEADERS });

export async function POST(req: NextRequest) {
  let body: { carId?: string; locale?: string } = {};
  try {
    body = await req.json();
  } catch {
    // fallthrough
  }
  const carId = typeof body.carId === "string" && UUID_RE.test(body.carId) ? body.carId : null;
  const locale = isSiteLocale(body.locale) ? body.locale : null;
  if (!carId || !locale) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400, headers: CORS_HEADERS });
  }

  // i18n_bundle 只返回公开车源;SQL 未执行(函数不存在)时同样按「还没有译文」处理
  const { data: rows, error } = await supabase.rpc("i18n_bundle", { p_entity: "car", p_ids: [carId], p_locale: dbLocale(locale) });
  const row = error ? undefined : (rows as BundleRow[] | null)?.[0];
  if (!row || (row.s !== "ok" && row.s !== "source")) return pending();

  const { data: car } = await supabase
    .from("cars")
    .select("title, title_zh, description_original")
    .eq("id", carId)
    .maybeSingle();
  if (!car) return pending();
  const translated = row.s === "ok" ? row.f?.description : undefined;
  return NextResponse.json(
    { ok: true, i18n: { title: carTitle(car, locale), description: translated || car.description_original || null } },
    { headers: CORS_HEADERS },
  );
}

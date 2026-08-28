// /api/translate-listing — 小语种车源内容按需翻译。
// 首次有人用该语言(如 ko)打开车源详情时调用:命中 cars.other_i18n 缓存
// 直接返回;未命中则经 OpenRouter 翻译并写回缓存(service role,绕过 RLS)。
// 匿名可调:每辆车每语言最多真正翻译一次,之后都是读缓存,滥用面有限。

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/sources/service-client";
import { translateListingInto, isTranslationConfigured } from "@/lib/translate";
import { LAZY_CONTENT_LOCALES } from "@/lib/i18n";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Capacitor 原生壳的 origin 与站点不同源,需要放开 CORS
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  let body: { carId?: string; locale?: string } = {};
  try {
    body = await req.json();
  } catch {
    // fallthrough
  }
  const carId = typeof body.carId === "string" ? body.carId : null;
  const locale = typeof body.locale === "string" ? body.locale : null;
  if (!carId || !locale || !(LAZY_CONTENT_LOCALES as string[]).includes(locale)) {
    return NextResponse.json(
      { ok: false, error: "bad_request" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const supabase = createServiceClient();
  const { data: car, error } = await supabase
    .from("cars")
    .select("id, title, title_zh, description, description_zh, other_i18n")
    .eq("id", carId)
    .maybeSingle();
  if (error || !car) {
    return NextResponse.json(
      { ok: false, error: "not_found" },
      { status: 404, headers: CORS_HEADERS }
    );
  }

  // 缓存命中:直接返回,不再花翻译费
  const cached = (car.other_i18n as Record<string, { title?: string | null }> | null)?.[locale];
  if (cached?.title) {
    return NextResponse.json({ ok: true, i18n: cached, cached: true }, { headers: CORS_HEADERS });
  }

  if (!isTranslationConfigured()) {
    return NextResponse.json(
      { ok: false, error: "translation_not_configured" },
      { status: 200, headers: CORS_HEADERS }
    );
  }

  // 英文优先作源文(小语种译文通常从英文更稳),缺英文再用中文
  const translated = await translateListingInto(locale, {
    title: car.title || car.title_zh || null,
    description: car.description || car.description_zh || null,
  });
  if (!translated?.title) {
    return NextResponse.json(
      { ok: false, error: "translation_failed" },
      { status: 200, headers: CORS_HEADERS }
    );
  }

  const merged = { ...((car.other_i18n as object | null) ?? {}), [locale]: translated };
  // 写缓存失败不影响本次返回(下个用户会再翻一次)
  await supabase.from("cars").update({ other_i18n: merged }).eq("id", carId);

  return NextResponse.json({ ok: true, i18n: translated, cached: false }, { headers: CORS_HEADERS });
}

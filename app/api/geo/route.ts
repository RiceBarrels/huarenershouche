// /api/geo — 访客 IP 粗定位,直接读 Vercel 边缘注入的 x-vercel-ip-* 头(不调第三方)。
// 客户端见 lib/ip-geo.ts;本地开发没有这些头,全部返回 null。

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Capacitor 原生壳与站点不同源,放开 CORS
const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "private, no-store",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: HEADERS });
}

export async function GET(req: NextRequest) {
  const h = req.headers;
  // 城市名是 URL 编码的("San%20Jose")
  let city = h.get("x-vercel-ip-city");
  try {
    city = city ? decodeURIComponent(city) : null;
  } catch {
    /* 保留原值 */
  }
  return NextResponse.json(
    {
      country: h.get("x-vercel-ip-country"),
      region: h.get("x-vercel-ip-country-region"),
      city,
    },
    { headers: HEADERS },
  );
}

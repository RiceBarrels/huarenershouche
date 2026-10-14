// /api/geo — 访客 IP 粗定位,直接读 Vercel 边缘注入的 x-vercel-ip-* 头(不调第三方)。
// 客户端见 lib/ip-geo.ts;本地开发没有这些头,全部返回 null。
// 读头逻辑与访问统计埋点(/api/vt)共用 lib/analytics/server.ts 的 readEdgeGeo。

import { NextRequest, NextResponse } from "next/server";
import { readEdgeGeo } from "@/lib/analytics/server";

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
  return NextResponse.json(readEdgeGeo(req.headers), { headers: HEADERS });
}

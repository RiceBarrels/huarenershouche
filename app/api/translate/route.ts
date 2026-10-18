// /api/translate — 已下线(410 Gone)。
// 车辆描述 / 配置标签现在按卖家原文保存(description_original / features_original),各语言译文由数据库驱动的
// 翻译管线异步生成(lib/i18n-pipeline,/api/i18n/drain)。旧版发布页把非 2xx 当作翻译失败,照常保存原文。

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function POST() {
  return NextResponse.json({ ok: false, error: "gone" }, { status: 410 });
}

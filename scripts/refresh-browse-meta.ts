#!/usr/bin/env bun
/**
 * refresh-browse-meta — 手动重算 /browse 服务端分页用的预计算字段
 * (car_browse_meta:车身类型 / 拼音搜索串 / 好价评级)。平时由 /api/sync 每小时自动跑。
 *
 * Usage:
 *   bun scripts/refresh-browse-meta.ts
 *       Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *       (from .env.local, auto-loaded by bun).
 */

import { createServiceClient } from "@/lib/sources/service-client";
import { refreshBrowseMeta } from "@/lib/browse-meta";

const started = Date.now();
const count = await refreshBrowseMeta(createServiceClient());
console.log(`car_browse_meta: ${count} rows in ${Date.now() - started}ms`);

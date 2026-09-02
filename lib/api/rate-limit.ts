// Public API 限流:Postgres 表 api_rate_buckets 按 (bucket, 分钟) 计数,
// 经 SECURITY DEFINER RPC api_rate_hit 原子 +1(supabase/api-keys.sql)。
// RPC 失败(如 SQL 尚未执行)时放行(fail-open),只打一次日志,不拖垮读接口。

import type { SupabaseClient } from "@supabase/supabase-js";

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** 被限时距下一分钟窗口的秒数;放行时为 0 */
  retryAfterSec: number;
}

const PURGE_PROBABILITY = 0.01;
let warnedOnce = false;

export async function checkRateLimit(
  supabase: SupabaseClient,
  bucket: string,
  limitPerMin: number,
): Promise<RateLimitResult> {
  const limit = Math.max(1, Math.floor(limitPerMin));
  const nowMs = Date.now();
  const minuteMs = Math.floor(nowMs / 60_000) * 60_000;
  const secsToNextWindow = Math.max(1, Math.ceil((minuteMs + 60_000 - nowMs) / 1000));

  const { data, error } = await supabase.rpc("api_rate_hit", {
    p_bucket: bucket,
    p_minute: new Date(minuteMs).toISOString(),
  });

  if (error) {
    if (!warnedOnce) {
      warnedOnce = true;
      console.warn(`[api/v1:rate-limit] api_rate_hit failed, failing open: ${error.message}`);
    }
    return { allowed: true, limit, remaining: limit, retryAfterSec: 0 };
  }

  // 顺手清理 1 小时前的桶(约 1% 的命中触发,不等待结果)
  if (Math.random() < PURGE_PROBABILITY) {
    void supabase
      .rpc("api_rate_purge")
      .then(({ error: purgeErr }) => {
        if (purgeErr) console.warn(`[api/v1:rate-limit] api_rate_purge failed: ${purgeErr.message}`);
      });
  }

  const count = Number(data ?? 0);
  const allowed = count <= limit;
  return {
    allowed,
    limit,
    remaining: Math.max(0, limit - count),
    retryAfterSec: allowed ? 0 : secsToNextWindow,
  };
}

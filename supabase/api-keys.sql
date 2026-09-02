-- =============================================================
-- Public API(/api/v1/*):开发者 API key、每日用量、限流桶、cars 增列
-- 设计见 docs/public-api-v0.md §3 / §5。
--
-- 在 Supabase SQL Editor 中手动执行(与 claim-requests.sql 同方式)。
-- 依赖:admin-expiry.sql 的 public.is_admin()。
-- 可重复执行(幂等)。
-- 服务端:lib/api/auth.ts(鉴权)、lib/api/quota.ts(配额)、lib/api/rate-limit.ts(限流)、
--         app/api/v1/keys/*(门户管理 key)。
-- =============================================================

-- ---------- 1. api_keys ----------
-- 明文只在创建时返回一次;库里只存 sha256 + 前 12 位 prefix(展示定位用)。
CREATE TABLE IF NOT EXISTS public.api_keys (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id            uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name                text NOT NULL,                          -- 用户起的备注名,如 "DealerCenter 同步"
  prefix              text NOT NULL,                          -- 'clc_live_9Xk2' 展示用
  key_hash            text NOT NULL UNIQUE,                   -- sha256(明文) hex
  scopes              text[] NOT NULL DEFAULT '{read:cars,read:dealers}',
  ip_allowlist        cidr[],                                 -- 空/NULL = 不限
  rate_limit_per_min  int NOT NULL DEFAULT 60,
  expires_at          timestamptz,
  revoked_at          timestamptz,
  last_used_at        timestamptz,
  request_count       bigint NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS api_keys_owner_idx
  ON public.api_keys (owner_id, created_at DESC);

-- ---------- 2. api_usage_daily ----------
-- 按 key × 天聚合,不存每条请求(Vercel 日志已有明细)。
-- 配额按 owner 汇总:sum(inserts)/sum(updates) where api_key_id in (owner 的 key) and day = today(UTC)。
CREATE TABLE IF NOT EXISTS public.api_usage_daily (
  api_key_id  uuid NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  day         date NOT NULL,
  requests    int NOT NULL DEFAULT 0,
  errors      int NOT NULL DEFAULT 0,
  inserts     int NOT NULL DEFAULT 0,   -- 新建车辆数(个人档 10/天 依据)
  updates     int NOT NULL DEFAULT 0,   -- 更改次数(个人档 30/天 依据)
  PRIMARY KEY (api_key_id, day)
);

-- ---------- 3. api_rate_buckets(每分钟计数限流) ----------
-- bucket = 'key:<id>' 或 'ip:<addr>';行只保留 1 小时,由 api_rate_purge() 顺手清理。
CREATE TABLE IF NOT EXISTS public.api_rate_buckets (
  bucket  text NOT NULL,
  minute  timestamptz NOT NULL,
  count   int NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, minute)
);

-- ---------- 4. cars 增列 ----------
-- external_id:车行自己的库存编号(stock #),同一卖家内唯一,PUT upsert 依据。
-- api_key_id:写入该条记录的 key(key 删除后置空,车保留)。
-- 与 source_id / source_listing_id(爬虫转载)并列不复用;前台「系统检索」标识只看 source_id。
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS external_id text;
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS api_key_id uuid
  REFERENCES public.api_keys(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS cars_seller_external_uniq
  ON public.cars (seller_id, external_id) WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS cars_api_key_idx
  ON public.cars (api_key_id) WHERE api_key_id IS NOT NULL;

-- ---------- 5. RLS ----------
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_rate_buckets ENABLE ROW LEVEL SECURITY;

-- api_keys:普通登录用户 **没有任何策略**。开发者门户统一走 /api/v1/keys
-- (服务端用 service role 读写,并且响应里剔除 key_hash),key_hash 永远不进浏览器。
-- 管理员可读全部(后台看全站 key / 吊销走服务端)。
DROP POLICY IF EXISTS api_keys_select_admin ON public.api_keys;
CREATE POLICY api_keys_select_admin ON public.api_keys
  FOR SELECT TO authenticated
  USING ((SELECT public.is_admin()));

-- api_usage_daily:同上,用户用量由 /api/v1/keys/usage 汇总返回;管理员可读全部。
DROP POLICY IF EXISTS api_usage_daily_select_admin ON public.api_usage_daily;
CREATE POLICY api_usage_daily_select_admin ON public.api_usage_daily
  FOR SELECT TO authenticated
  USING ((SELECT public.is_admin()));

-- api_rate_buckets:无策略,仅 service role(RPC 内)读写。

-- ---------- 6. api_rate_hit:原子 +1 并返回当前分钟计数 ----------
CREATE OR REPLACE FUNCTION public.api_rate_hit(p_bucket text, p_minute timestamptz)
RETURNS int
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.api_rate_buckets (bucket, minute, count)
  VALUES (p_bucket, p_minute, 1)
  ON CONFLICT (bucket, minute)
    DO UPDATE SET count = public.api_rate_buckets.count + 1
  RETURNING count;
$$;

-- ---------- 7. api_rate_purge:清掉 1 小时前的桶(app 侧约 1% 命中时顺手调用) ----------
CREATE OR REPLACE FUNCTION public.api_rate_purge()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.api_rate_buckets
  WHERE minute < now() - interval '1 hour';
$$;

-- ---------- 8. api_usage_add:按 UTC 当天原子累加用量 ----------
CREATE OR REPLACE FUNCTION public.api_usage_add(
  p_key uuid,
  p_requests int,
  p_errors int,
  p_inserts int,
  p_updates int
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.api_usage_daily (api_key_id, day, requests, errors, inserts, updates)
  VALUES (
    p_key,
    (now() AT TIME ZONE 'utc')::date,
    COALESCE(p_requests, 0),
    COALESCE(p_errors, 0),
    COALESCE(p_inserts, 0),
    COALESCE(p_updates, 0)
  )
  ON CONFLICT (api_key_id, day) DO UPDATE SET
    requests = public.api_usage_daily.requests + EXCLUDED.requests,
    errors   = public.api_usage_daily.errors   + EXCLUDED.errors,
    inserts  = public.api_usage_daily.inserts  + EXCLUDED.inserts,
    updates  = public.api_usage_daily.updates  + EXCLUDED.updates;
$$;

-- ---------- 9. 函数权限:仅 service role 可调(服务端 service client) ----------
REVOKE EXECUTE ON FUNCTION public.api_rate_hit(text, timestamptz) FROM public;
REVOKE EXECUTE ON FUNCTION public.api_rate_hit(text, timestamptz) FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.api_rate_hit(text, timestamptz) TO service_role;

REVOKE EXECUTE ON FUNCTION public.api_rate_purge() FROM public;
REVOKE EXECUTE ON FUNCTION public.api_rate_purge() FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.api_rate_purge() TO service_role;

REVOKE EXECUTE ON FUNCTION public.api_usage_add(uuid, int, int, int, int) FROM public;
REVOKE EXECUTE ON FUNCTION public.api_usage_add(uuid, int, int, int, int) FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.api_usage_add(uuid, int, int, int, int) TO service_role;

-- =============================================================
-- 卖家即时通讯联系方式(contact apps):微信 / KakaoTalk / LINE / WhatsApp
-- 在 Supabase SQL Editor 中手动执行(与其他 .sql 同方式),可重复执行。
--
-- 数据放在独立表 profile_contact_apps,而不是 profiles 的一列:
--   profiles 整表对 anon 可读,放在那里任何人拿公开 anon key 就能一次拉走全站卖家的 WhatsApp / 微信号。
--   这张表开 RLS、不建任何策略、对 anon / authenticated 撤销全部表权限:
--     读:只经 get_contact_apps(target) RPC,必须已登录,一次一个账号(详情页 / 资料页按需取);
--     写:只有 service role —— 由 /api/contact-apps 校验(lib/contact-apps.ts)、鉴权(本人或认领人)、
--         限流、AI 审核(lib/moderate.ts)之后写入。客户端没有任何直写路径,审核绕不过去。
-- 值的规则(contact_apps_valid,与 lib/contact-apps.ts 保持一致):
--   键只能是 wechat / kakao / line / whatsapp,值为字符串;
--   whatsapp = E.164(+ 国家码开头,共 7–15 位数字,如 +16265550123);
--   wechat / kakao / line = [A-Za-z0-9._-]{1,32},且不能像网址 / 域名(www. 开头或带常见顶级域)。
--   短信复用已有电话,没有 sms 键。只由卖家本人(或认领人)主动填写,默认没有行 = 没填。
-- moderated:true = 通过 AI 审核;false = 审核服务不可用时按全站惯例放行写入(fail-open),留作日后补审。
-- profile_contact_apps_moderation_usage + contact_apps_moderation_hit():按 (操作人, 整点小时) 计 AI 审核次数,
--   /api/contact-apps 每人每小时上限内才送审,计数器出错时拒绝保存(fail-closed),不会无限花模型额度。
-- 依赖:claim-accounts.sql(can_act_as 由接口在服务端按 claimed_by 复核,本文件不直接依赖)。
-- 代码先于本文件上线:RPC / 表不存在时前端隐藏填写入口、详情页不显示按钮,API 返回空对象。
-- =============================================================

-- ---------- 1. 校验函数 ----------
-- CHECK 里不能写子查询,包成 immutable 函数
CREATE OR REPLACE FUNCTION public.contact_apps_valid(apps jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT apps IS NOT NULL
    AND jsonb_typeof(apps) = 'object'
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_each(apps) AS e(key, value)
      WHERE e.key NOT IN ('wechat', 'kakao', 'line', 'whatsapp')
         OR jsonb_typeof(e.value) <> 'string'
         OR NOT (
           CASE e.key
             WHEN 'whatsapp' THEN (e.value #>> '{}') ~ '^\+[1-9][0-9]{6,14}$'
             ELSE (e.value #>> '{}') ~ '^[A-Za-z0-9._-]{1,32}$'
               -- 与 lib/contact-apps.ts 的 URL_LIKE_RE 相同:拒绝 www.xxx / bit.ly / xxx.com 一类推广域名
               AND (e.value #>> '{}') !~* '^www\.|\.(com|net|org|me|io|co|cn|ly|link|xyz|app|kr|jp|tw|hk|us|ca|info|biz|site|top|shop|vip)(\.|$)'
           END
         )
    );
$$;

-- ---------- 2. 数据表 ----------
CREATE TABLE IF NOT EXISTS public.profile_contact_apps (
  profile_id uuid        PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  apps       jsonb       NOT NULL DEFAULT '{}'::jsonb,
  moderated  boolean     NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profile_contact_apps_valid' AND conrelid = 'public.profile_contact_apps'::regclass
  ) THEN
    ALTER TABLE public.profile_contact_apps
      ADD CONSTRAINT profile_contact_apps_valid CHECK (public.contact_apps_valid(apps));
  END IF;
END $$;

ALTER TABLE public.profile_contact_apps ENABLE ROW LEVEL SECURITY;
-- 不建任何策略 + 撤销表权限:anon / authenticated 既不能读也不能写,只有 service role 与下面的 RPC
REVOKE ALL ON public.profile_contact_apps FROM public, anon, authenticated;
GRANT ALL ON public.profile_contact_apps TO service_role;

-- ---------- 3. 早期草稿的清理(profiles.contact_apps 列 + set_contact_apps RPC) ----------
-- 早期版本把数据放在 profiles.contact_apps 并开放客户端 RPC 直写(可绕过审核、anon 可读)。
-- 若曾执行过:把合规的非空值搬进新表(标为未审核),再删掉旧列、旧约束与旧 RPC。没执行过则全部跳过。
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'contact_apps'
  ) THEN
    EXECUTE $q$
      INSERT INTO public.profile_contact_apps (profile_id, apps, moderated)
      SELECT id, contact_apps, false
      FROM public.profiles
      WHERE contact_apps IS NOT NULL
        AND contact_apps <> '{}'::jsonb
        AND public.contact_apps_valid(contact_apps)
      ON CONFLICT (profile_id) DO NOTHING
    $q$;
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_contact_apps_valid;
    ALTER TABLE public.profiles DROP COLUMN IF EXISTS contact_apps;
  END IF;
END $$;

DROP FUNCTION IF EXISTS public.set_contact_apps(uuid, jsonb);

-- ---------- 4. get_contact_apps:已登录用户取某个账号的联系方式 ----------
-- 一次只取一个账号(不提供按条件批量拉取);未登录返回 NULL。没填 → '{}'。
CREATE OR REPLACE FUNCTION public.get_contact_apps(target uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN NULL
    ELSE coalesce(
      (SELECT apps FROM public.profile_contact_apps WHERE profile_id = target),
      '{}'::jsonb
    )
  END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_contact_apps(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_contact_apps(uuid) TO authenticated, service_role;

-- ---------- 5. AI 审核次数计数(/api/contact-apps 限流) ----------
CREATE TABLE IF NOT EXISTS public.profile_contact_apps_moderation_usage (
  user_id      uuid        NOT NULL,
  window_start timestamptz NOT NULL,
  hits         int         NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, window_start)
);

ALTER TABLE public.profile_contact_apps_moderation_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.profile_contact_apps_moderation_usage FROM public, anon, authenticated;
GRANT ALL ON public.profile_contact_apps_moderation_usage TO service_role;

-- 原子 +1 并返回该用户当前整点小时窗口的计数(超限的请求也计数);顺手删掉该用户 1 天前的窗口
CREATE OR REPLACE FUNCTION public.contact_apps_moderation_hit(p_user uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window timestamptz := date_trunc('hour', now());
  n int;
BEGIN
  DELETE FROM public.profile_contact_apps_moderation_usage
  WHERE user_id = p_user AND window_start < now() - interval '1 day';

  INSERT INTO public.profile_contact_apps_moderation_usage (user_id, window_start, hits)
  VALUES (p_user, v_window, 1)
  ON CONFLICT (user_id, window_start)
    DO UPDATE SET hits = public.profile_contact_apps_moderation_usage.hits + 1
  RETURNING hits INTO n;
  RETURN n;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.contact_apps_moderation_hit(uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.contact_apps_moderation_hit(uuid) FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.contact_apps_moderation_hit(uuid) TO service_role;

-- 让 PostgREST 立即看到新表与函数
NOTIFY pgrst, 'reload schema';

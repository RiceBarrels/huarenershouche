-- =============================================================
-- 卖家沟通语言(seller languages)
-- 在 Supabase SQL Editor 中手动执行(与其他 .sql 同方式),可重复执行。
--
-- profiles.languages:卖家(车行/个人/系统检索账号)会说的语言代码数组,
--   取值见 lib/i18n/languages.ts(zh / yue / en / ko / ja / es / fr / vi ...)。
--   空数组 = 未声明:排序时按「中文站默认」处理(zh 用户视为匹配,其他语言不匹配)。
-- 用途:浏览/首页推荐把「会说当前界面语言」的卖家排在前面,详情页展示沟通语言。
-- 依赖:claim-accounts.sql(update_claimed_profile RPC 改签名)。
-- =============================================================

-- ---------- 1. 列 ----------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS languages text[] NOT NULL DEFAULT '{}';

-- 数组元素只能是已知语言代码(防脏数据;新增语言时同步改这里和 languages.ts)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_languages_known'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_languages_known
      CHECK (languages <@ ARRAY['zh','yue','en','ko','ja','es','fr','vi','tl','pt','ru','hi','ar','de']::text[]);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS profiles_languages_gin ON public.profiles USING gin (languages);

-- ---------- 2. update_claimed_profile 增加 new_languages ----------
-- 旧签名(6 个参数)先删,避免留下重载歧义。
DROP FUNCTION IF EXISTS public.update_claimed_profile(uuid, text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.update_claimed_profile(
  target uuid,
  new_username text DEFAULT NULL,
  new_avatar_url text DEFAULT NULL,
  new_phone text DEFAULT NULL,
  new_location text DEFAULT NULL,
  new_preferred_language text DEFAULT NULL,
  new_languages text[] DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_act_as(target) THEN
    RAISE EXCEPTION '无权限:仅本人或认领人可编辑该账号';
  END IF;

  UPDATE public.profiles SET
    username           = COALESCE(new_username, username),
    avatar_url         = COALESCE(new_avatar_url, avatar_url),
    phone              = COALESCE(new_phone, phone),
    location           = COALESCE(new_location, location),
    preferred_language = COALESCE(new_preferred_language, preferred_language),
    languages          = COALESCE(new_languages, languages),
    updated_at         = now()
  WHERE id = target;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_claimed_profile(uuid, text, text, text, text, text, text[]) FROM public;
GRANT EXECUTE ON FUNCTION public.update_claimed_profile(uuid, text, text, text, text, text, text[]) TO authenticated;

-- ---------- 3. 系统检索账号回填 ----------
-- 白名单源站均为华人车行(中英双语)。只填空值,管理员在后台改过的不覆盖;
-- 之后每次同步引擎也会按 lib/sources/index.ts 里各源站声明的 languages 补空。
UPDATE public.profiles
SET languages = ARRAY['zh','en']
WHERE is_system = true AND cardinality(languages) = 0;

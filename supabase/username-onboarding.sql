-- ============================================================
-- 新用户强制取名:profiles.username_set_at
-- 为空 = 还没确认过用户名 → 前端 UsernameGate 弹出取名框(默认随机名)。
-- 在 Supabase SQL Editor 整段运行,可重复执行。
-- ============================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username_set_at timestamptz;

-- 1. 现有用户一律视为已取名,不打扰老用户
UPDATE public.profiles
SET username_set_at = created_at
WHERE username_set_at IS NULL;

-- 2. 新用户:邮箱注册在注册页已选好用户名(metadata.username)→ 直接记为已取名;
--    Google/Apple 首次登录没有 username,先用 full_name 占位,留空等前端弹框
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url, username_set_at)
  VALUES (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'username',
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture',
      null
    ),
    CASE WHEN nullif(new.raw_user_meta_data->>'username', '') IS NOT NULL THEN now() END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

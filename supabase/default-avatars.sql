-- ============================================================
-- 默认头像:无头像用户回填 DiceBear + 新注册用户自动生成
-- 在 Supabase SQL Editor 整段运行,可重复执行。
-- 以 profiles.id 作 seed,头像稳定不变。
-- ============================================================

-- 1. 回填现有无头像用户
UPDATE public.profiles
SET avatar_url = 'https://api.dicebear.com/9.x/notionists/svg?seed=' || id::text
WHERE avatar_url IS NULL OR avatar_url = '';

-- 2. 新用户 BEFORE INSERT 触发器(不影响已有 handle_new_user 逻辑)
CREATE OR REPLACE FUNCTION public.set_default_avatar()
RETURNS trigger AS $$
BEGIN
  IF NEW.avatar_url IS NULL OR NEW.avatar_url = '' THEN
    NEW.avatar_url := 'https://api.dicebear.com/9.x/notionists/svg?seed=' || NEW.id::text;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_default_avatar ON public.profiles;
CREATE TRIGGER trg_default_avatar
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_default_avatar();

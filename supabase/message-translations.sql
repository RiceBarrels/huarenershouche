-- =============================================================
-- 私信消息翻译(message translations)
-- 在 Supabase SQL Editor 中手动执行(与其他 .sql 同方式),可重复执行。
--
-- 私信是私密内容,绝不进入公开的 i18n 管线 / i18n_bundle:译文由 /api/translate-message 按需生成
-- (只有收件方能请求,service role 写入),这里只做缓存与每人每小时的调用计数。
--
-- 1. message_translations:每条消息每种界面语言一份译文缓存。
--    读:所属会话的买家或卖家(含认领人,can_act_as 存在时);anon / authenticated 不能写,只有 service role 写。
-- 2. message_translation_usage:按 (用户, 整点小时窗口) 计模型调用次数,经 message_translation_hit() 原子 +1;
--    只有 service role 能读写 / 调用。
--
-- 未执行本文件时站点照常可用:接口跳过缓存,限流退回单实例内存计数(更保守)。
-- 依赖:messages / conversations 表;claim-accounts.sql 的 can_act_as()(可选,没有时只认本人)。
-- =============================================================

-- ---------- 1. 译文缓存 ----------
CREATE TABLE IF NOT EXISTS public.message_translations (
  message_id  uuid        NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  locale      text        NOT NULL CHECK (locale IN ('zh','en','ko','ja','es','fr')),
  text        text        NOT NULL CHECK (length(text) > 0),
  source_lang text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, locale)
);

ALTER TABLE public.message_translations ENABLE ROW LEVEL SECURITY;

-- 表级权限:登录用户只能读(行级再由策略限定),写入只留给 service role
REVOKE ALL ON public.message_translations FROM public, anon, authenticated;
GRANT SELECT ON public.message_translations TO authenticated;
GRANT ALL ON public.message_translations TO service_role;

-- 读策略:消息所属会话的一方。can_act_as() 存在时认领人也能读(与 claimant_read_messages 同口径)
DO $$
BEGIN
  EXECUTE 'DROP POLICY IF EXISTS message_translations_participant_read ON public.message_translations';
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'can_act_as'
  ) THEN
    EXECUTE 'CREATE POLICY message_translations_participant_read ON public.message_translations '
         || 'FOR SELECT TO authenticated '
         || 'USING (EXISTS ( '
         || '  SELECT 1 FROM public.messages m '
         || '  JOIN public.conversations c ON c.id = m.conversation_id '
         || '  WHERE m.id = message_translations.message_id '
         || '    AND (public.can_act_as(c.buyer_id) OR public.can_act_as(c.seller_id)) '
         || '))';
  ELSE
    EXECUTE 'CREATE POLICY message_translations_participant_read ON public.message_translations '
         || 'FOR SELECT TO authenticated '
         || 'USING (EXISTS ( '
         || '  SELECT 1 FROM public.messages m '
         || '  JOIN public.conversations c ON c.id = m.conversation_id '
         || '  WHERE m.id = message_translations.message_id '
         || '    AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid()) '
         || '))';
  END IF;
END $$;

-- ---------- 2. 调用计数(限流) ----------
CREATE TABLE IF NOT EXISTS public.message_translation_usage (
  user_id      uuid        NOT NULL,
  window_start timestamptz NOT NULL,
  hits         int         NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, window_start)
);

ALTER TABLE public.message_translation_usage ENABLE ROW LEVEL SECURITY;
-- 不建任何策略:anon / authenticated 一律不可见
REVOKE ALL ON public.message_translation_usage FROM public, anon, authenticated;
GRANT ALL ON public.message_translation_usage TO service_role;

-- 原子 +1 并返回该窗口的计数(超限的请求也计数);顺手删掉该用户 1 天前的窗口
CREATE OR REPLACE FUNCTION public.message_translation_hit(p_user uuid, p_window timestamptz)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n int;
BEGIN
  DELETE FROM public.message_translation_usage
  WHERE user_id = p_user AND window_start < now() - interval '1 day';

  INSERT INTO public.message_translation_usage (user_id, window_start, hits)
  VALUES (p_user, p_window, 1)
  ON CONFLICT (user_id, window_start)
    DO UPDATE SET hits = public.message_translation_usage.hits + 1
  RETURNING hits INTO n;
  RETURN n;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.message_translation_hit(uuid, timestamptz) FROM public;
REVOKE EXECUTE ON FUNCTION public.message_translation_hit(uuid, timestamptz) FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.message_translation_hit(uuid, timestamptz) TO service_role;

-- 让 PostgREST 立即识别新表 / 函数
NOTIFY pgrst, 'reload schema';

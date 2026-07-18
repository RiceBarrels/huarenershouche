-- ============================================================
-- 评论点赞:post_comment_likes 表 + RLS + 计数触发器
-- (同步 post_comments.likes_count)
-- 在 Supabase SQL Editor 整段运行,可重复执行。
-- ============================================================

CREATE TABLE IF NOT EXISTS public.post_comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.post_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_comment_likes_comment
  ON public.post_comment_likes (comment_id);
CREATE INDEX IF NOT EXISTS idx_post_comment_likes_user
  ON public.post_comment_likes (user_id);

ALTER TABLE public.post_comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comment_likes_select" ON public.post_comment_likes;
CREATE POLICY "comment_likes_select" ON public.post_comment_likes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "comment_likes_insert" ON public.post_comment_likes;
CREATE POLICY "comment_likes_insert" ON public.post_comment_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "comment_likes_delete" ON public.post_comment_likes;
CREATE POLICY "comment_likes_delete" ON public.post_comment_likes
  FOR DELETE USING (auth.uid() = user_id);

-- 计数触发器(与 community-counters.sql 同一风格)
CREATE OR REPLACE FUNCTION public.sync_comment_likes_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.post_comments
    SET likes_count = likes_count + 1
    WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.post_comments
    SET likes_count = GREATEST(0, likes_count - 1)
    WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_comment_likes ON public.post_comment_likes;
CREATE TRIGGER trg_sync_comment_likes
AFTER INSERT OR DELETE ON public.post_comment_likes
FOR EACH ROW EXECUTE FUNCTION public.sync_comment_likes_count();

-- 按现有真实行数校正一次存量计数
UPDATE public.post_comments pc SET
  likes_count = COALESCE(l.n, 0)
FROM public.post_comments p
LEFT JOIN (
  SELECT comment_id, count(*) n
  FROM public.post_comment_likes
  GROUP BY comment_id
) l ON l.comment_id = p.id
WHERE pc.id = p.id;

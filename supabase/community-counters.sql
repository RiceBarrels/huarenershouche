-- ============================================================
-- 社区计数触发器:点赞/评论增删时自动同步
-- community_posts.likes_count / comments_count
-- 在 Supabase SQL Editor 整段运行,可重复执行。
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_post_likes_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts
    SET likes_count = likes_count + 1
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts
    SET likes_count = GREATEST(0, likes_count - 1)
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_post_likes ON public.post_likes;
CREATE TRIGGER trg_sync_post_likes
AFTER INSERT OR DELETE ON public.post_likes
FOR EACH ROW EXECUTE FUNCTION public.sync_post_likes_count();

CREATE OR REPLACE FUNCTION public.sync_post_comments_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts
    SET comments_count = comments_count + 1
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts
    SET comments_count = GREATEST(0, comments_count - 1)
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_post_comments ON public.post_comments;
CREATE TRIGGER trg_sync_post_comments
AFTER INSERT OR DELETE ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.sync_post_comments_count();

-- 按现有真实行数校正一次存量计数
UPDATE public.community_posts cp SET
  likes_count = COALESCE(l.n, 0),
  comments_count = COALESCE(c.n, 0)
FROM public.community_posts p
LEFT JOIN (SELECT post_id, count(*) n FROM public.post_likes GROUP BY post_id) l ON l.post_id = p.id
LEFT JOIN (SELECT post_id, count(*) n FROM public.post_comments GROUP BY post_id) c ON c.post_id = p.id
WHERE cp.id = p.id;

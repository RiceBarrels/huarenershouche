-- =============================================================
-- 清空「种子社区帖子」里的所有照片(只清引用,不删存储桶文件)
-- 种子帖子 = 由假种子用户发布:
--   a0000000-0000-0000-0000-...  (seed-community.sql 的 8 个用户)
--   a1000000-0000-0000-0000-...  (seed-parts/00-users.sql 的 40 个用户)
-- 真实用户为随机 UUID,不会命中上述前缀,故不受影响。
--
-- 在 Supabase SQL Editor 中手动执行(与其它 supabase/*.sql 同惯例)。可重复执行(幂等)。
-- =============================================================

-- 先看会影响多少条(可选,执行前预览):
-- SELECT count(*) FROM public.community_posts
-- WHERE (user_id::text LIKE 'a0000000-0000-0000-0000-%'
--     OR user_id::text LIKE 'a1000000-0000-0000-0000-%')
--   AND cardinality(images) > 0;

UPDATE public.community_posts
SET images = ARRAY[]::text[]
WHERE (
        user_id::text LIKE 'a0000000-0000-0000-0000-%'
     OR user_id::text LIKE 'a1000000-0000-0000-0000-%'
      )
  AND cardinality(images) > 0;

-- ---------- 99. 程序化点赞 + 计数校正 ----------
-- 给 2026 种子帖(d0000000-…)按帖子热度差异化随机点赞:
-- 每帖点赞率 3%~15%(由帖子 id 哈希决定,可重复运行结果一致)
DO $$
DECLARE
  has_created_at boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'post_likes' AND column_name = 'created_at'
  ) INTO has_created_at;

  IF has_created_at THEN
    INSERT INTO public.post_likes (post_id, user_id, created_at)
    SELECT p.id, u.id, p.created_at + random() * (now() - p.created_at)
    FROM public.community_posts p
    CROSS JOIN public.profiles u
    WHERE p.id::text LIKE 'd0000000-%'
      AND (u.id::text LIKE 'a0000000-%' OR u.id::text LIKE 'a1000000-%')
      AND random() < 0.03 + 0.12 * ((abs(hashtext(p.id::text)) % 100) / 100.0)
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.post_likes (post_id, user_id)
    SELECT p.id, u.id
    FROM public.community_posts p
    CROSS JOIN public.profiles u
    WHERE p.id::text LIKE 'd0000000-%'
      AND (u.id::text LIKE 'a0000000-%' OR u.id::text LIKE 'a1000000-%')
      AND random() < 0.03 + 0.12 * ((abs(hashtext(p.id::text)) % 100) / 100.0)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- 按真实行数校正种子帖计数(无论是否已装计数触发器都安全)
UPDATE public.community_posts cp SET
  likes_count = COALESCE(l.n, 0),
  comments_count = COALESCE(c.n, 0)
FROM public.community_posts p
LEFT JOIN (SELECT post_id, count(*) n FROM public.post_likes GROUP BY post_id) l ON l.post_id = p.id
LEFT JOIN (SELECT post_id, count(*) n FROM public.post_comments GROUP BY post_id) c ON c.post_id = p.id
WHERE cp.id = p.id
  AND (cp.id::text LIKE 'd0000000-%' OR cp.id::text LIKE 'b0000000-%');

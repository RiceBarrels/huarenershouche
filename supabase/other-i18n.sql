-- ============================================================
-- 小语种内容惰性翻译缓存:cars.other_i18n
-- 形如 { "ko": { "title": "...", "description": "..." } }
-- zh/en 仍用 title/title_zh、description/description_zh 双列;
-- 其他语言首次被浏览时由 /api/translate-listing(service role)
-- 翻译后写入此列,后续直接读缓存。
-- 在 Supabase SQL Editor 整段运行,可重复执行。
-- ============================================================

ALTER TABLE public.cars
  ADD COLUMN IF NOT EXISTS other_i18n jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.cars.other_i18n IS
  '按需翻译的小语种内容缓存,如 {"ko": {"title": "...", "description": "..."}};由服务端翻译接口写入';

-- 社区帖子同款缓存:帖子只有中文原文(无双语列),
-- 非中文界面(en/ko)首次浏览时翻译并缓存,前端提供「显示原文」切换。
ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS other_i18n jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.community_posts.other_i18n IS
  '按需翻译的帖子内容缓存,如 {"en": {"title": "...", "content": "..."}};由 /api/translate-post 写入';

-- 评论翻译缓存(社区帖评论 + 车源评论),由 /api/translate-comments 批量写入
ALTER TABLE public.post_comments
  ADD COLUMN IF NOT EXISTS other_i18n jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS other_i18n jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ============================================================================
-- 常來車網 — 系统检索车源图片转存(压缩后存 Supabase Storage)
-- 一次性运行(幂等)。在 Supabase 控制台 → SQL Editor 里跑一遍即可。
--   Dashboard: https://supabase.com/dashboard/project/nkboeyveppapmxgfjqqb/sql
--
-- 背景:同步引擎(lib/sources/sync.ts)现在会把源站照片下载、sharp 压缩成
-- WebP(最长边 1280px)后上传到已有的 car-images bucket 的 syndicated/<carId>/
-- 目录,cars.images 存我方公网 URL,不再外链车行 CDN。
-- 下架(源站删除)后自动删除转存文件并把 images 回退为源站外链。
-- ============================================================================

-- cars.source_images:源站原始图片 URL 列表。
-- 用途:① 与本次抓取对比检测源站换图(变了才重新转存);② 下架清理后回退外链。
alter table public.cars add column if not exists source_images text[];

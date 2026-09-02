-- AI 内容审核(手动在 Supabase SQL Editor 执行)
-- 用户发布内容(车辆、社区帖子、评论)后,客户端调用 /api/moderate,
-- 服务端用 Gemini(经 OpenRouter)按社区规范判定;违规内容自动屏蔽
-- (cars→removed / community_posts→hidden / 评论→blocked)并写入
-- ai_moderation 表,管理后台「AI 审核」tab 复核:恢复或确认屏蔽。
-- 依赖:admin-expiry.sql 中的 public.is_admin()。

-- 评论表补 status 列(active / blocked):违规评论屏蔽而非删除,便于管理员恢复
alter table public.comments add column if not exists status text not null default 'active';
alter table public.post_comments add column if not exists status text not null default 'active';

alter table public.comments drop constraint if exists comments_status_check;
alter table public.comments add constraint comments_status_check
  check (status in ('active', 'blocked'));
alter table public.post_comments drop constraint if exists post_comments_status_check;
alter table public.post_comments add constraint post_comments_status_check
  check (status in ('active', 'blocked'));

-- AI 拦截记录:只记违规(通过的不落库);status 跟踪管理员复核进度
create table if not exists public.ai_moderation (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('car', 'post', 'car_comment', 'post_comment')),
  target_id uuid not null,
  user_id uuid,
  content text not null,
  categories text[] not null default '{}',
  reason text,
  model text,
  status text not null default 'pending' check (status in ('pending', 'restored', 'confirmed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  unique (target_type, target_id)
);

-- admin 页按待复核 + 时间倒序拉取
create index if not exists ai_moderation_status_idx
  on public.ai_moderation (status, created_at desc);

alter table public.ai_moderation enable row level security;

-- 写入走服务端 service role(绕过 RLS);管理员可读可改
drop policy if exists ai_moderation_admin on public.ai_moderation;
create policy ai_moderation_admin on public.ai_moderation
  for all using ((select public.is_admin())) with check ((select public.is_admin()));

-- 管理员恢复被屏蔽内容需要对应表的 update 权限
drop policy if exists admin_update_comments on public.comments;
create policy admin_update_comments on public.comments
  for update using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists admin_update_post_comments on public.post_comments;
create policy admin_update_post_comments on public.post_comments
  for update using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists admin_update_community_posts on public.community_posts;
create policy admin_update_community_posts on public.community_posts
  for update using ((select public.is_admin())) with check ((select public.is_admin()));

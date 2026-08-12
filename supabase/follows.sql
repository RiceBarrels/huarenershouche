-- 关注关系表(手动在 Supabase SQL Editor 执行)
-- 前端:用户主页(user-detail)关注/取关按钮 + 关注/粉丝计数。
-- 复合主键天然防重复关注;follower = 关注者,followee = 被关注者。

create table if not exists public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)  -- 不能关注自己
);

-- 主键已覆盖 follower_id 前缀查询(我关注了谁);
-- 反向查询(谁关注了我 / 粉丝数)需要 followee 前缀索引
create index if not exists follows_followee_idx
  on public.follows (followee_id);

alter table public.follows enable row level security;

-- 关注关系公开可读(主页显示关注/粉丝数)
drop policy if exists "follows_public_read" on public.follows;
create policy "follows_public_read"
  on public.follows for select
  using (true);

-- 只能以自己的身份关注((select auth.uid()) 只求值一次,避免逐行调用)
drop policy if exists "follows_insert_own" on public.follows;
create policy "follows_insert_own"
  on public.follows for insert
  with check ((select auth.uid()) = follower_id);

-- 只能取关自己发起的关注
drop policy if exists "follows_delete_own" on public.follows;
create policy "follows_delete_own"
  on public.follows for delete
  using ((select auth.uid()) = follower_id);

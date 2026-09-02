-- 用户屏蔽(拉黑)表(手动在 Supabase SQL Editor 执行)
-- App Store UGC 合规:用户可屏蔽他人,屏蔽后不再看到对方的帖子、评论和会话。
-- 前端:用户主页(user-detail)屏蔽按钮 + 设置 → 屏蔽名单(account/settings/blocked)。
-- 复合主键天然防重复;blocker = 发起屏蔽的人,blocked = 被屏蔽的人。

create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)  -- 不能屏蔽自己
);

alter table public.blocks enable row level security;

-- 屏蔽关系仅本人可见((select auth.uid()) 只求值一次,避免逐行调用)
drop policy if exists "blocks_read_own" on public.blocks;
create policy "blocks_read_own"
  on public.blocks for select
  using ((select auth.uid()) = blocker_id);

-- 只能以自己的身份屏蔽
drop policy if exists "blocks_insert_own" on public.blocks;
create policy "blocks_insert_own"
  on public.blocks for insert
  with check ((select auth.uid()) = blocker_id);

-- 只能解除自己发起的屏蔽
drop policy if exists "blocks_delete_own" on public.blocks;
create policy "blocks_delete_own"
  on public.blocks for delete
  using ((select auth.uid()) = blocker_id);

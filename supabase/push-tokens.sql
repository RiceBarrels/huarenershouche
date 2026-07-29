-- 推送通知设备 token 表
-- 在 Supabase SQL Editor 手动执行

create table if not exists push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  platform text not null default 'unknown', -- 'ios' | 'android'
  updated_at timestamptz not null default now()
);

create index if not exists push_tokens_user_id_idx on push_tokens(user_id);

alter table push_tokens enable row level security;

-- 只允许用户管理自己的 token(发送推送用 service role,不受 RLS 限制)
create policy "Users can insert own push tokens"
  on push_tokens for insert
  with check (auth.uid() = user_id);

create policy "Users can update own push tokens"
  on push_tokens for update
  using (auth.uid() = user_id);

create policy "Users can view own push tokens"
  on push_tokens for select
  using (auth.uid() = user_id);

create policy "Users can delete own push tokens"
  on push_tokens for delete
  using (auth.uid() = user_id);

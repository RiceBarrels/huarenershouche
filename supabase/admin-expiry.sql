-- ============================================================================
-- 常來車網 — 管理员权限 + 删除用户
-- （原 Listing 30 天自动过期已取消，见 remove-listing-expiry.sql）
-- 一次性运行（幂等，可重复执行）。在 Supabase 控制台 → SQL Editor 里跑一遍即可。
--   Dashboard: https://supabase.com/dashboard/project/nkboeyveppapmxgfjqqb/sql
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 2) 管理员判定辅助函数（SECURITY DEFINER 避免 RLS 递归）
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 3) 管理员 RLS：对核心表拥有完整增删改查（叠加在已有的 owner 策略之上）
--    Postgres 的 permissive 策略是 OR 关系，所以这不会削弱现有权限，
--    只是额外让 role='admin' 的用户可以操作任意行。
-- ────────────────────────────────────────────────────────────────────────────
do $$
declare
  t text;
  tables text[] := array[
    'cars', 'profiles', 'dealer_stores', 'reports',
    'support_tickets', 'community_posts', 'comments',
    'post_comments', 'dealer_reviews', 'qa_questions', 'qa_answers'
  ];
begin
  foreach t in array tables loop
    if exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = t
    ) then
      execute format('alter table public.%I enable row level security', t);
      execute format('drop policy if exists admin_manage_%1$s on public.%1$s', t);
      execute format(
        'create policy admin_manage_%1$s on public.%1$s '
        || 'for all to authenticated '
        || 'using (public.is_admin()) with check (public.is_admin())',
        t
      );
    end if;
  end loop;
end $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 4) 删除用户 RPC：清理内容并移除 auth 账号（需服务端权限，故用 SECURITY DEFINER）
--    只有管理员可调用；函数在事务内运行，任一步失败则整体回滚。
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.admin_delete_user(target uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  rec record;
begin
  if not public.is_admin() then
    raise exception '无权限：仅管理员可删除用户';
  end if;
  if target = auth.uid() then
    raise exception '不能删除自己的账号';
  end if;

  -- 逐表清理该用户产生的内容（容忍表/列不存在）
  for rec in
    select * from (values
      ('cars',            'seller_id'),
      ('community_posts', 'user_id'),
      ('post_comments',   'user_id'),
      ('comments',        'user_id'),
      ('qa_answers',      'user_id'),
      ('qa_questions',    'user_id'),
      ('dealer_reviews',  'user_id'),
      ('dealer_reviews',  'dealer_id'),
      ('dealer_stores',   'owner_id'),
      ('platform_reviews','user_id'),
      ('reports',         'user_id'),
      ('support_tickets', 'user_id'),
      ('favorites',       'user_id'),
      ('saved_searches',  'user_id'),
      ('messages',        'sender_id'),
      ('conversations',   'buyer_id'),
      ('conversations',   'seller_id'),
      ('admin_actions',   'admin_id')
    ) as t(tbl, col)
  loop
    begin
      execute format('delete from public.%I where %I = $1', rec.tbl, rec.col) using target;
    exception
      when undefined_table or undefined_column then null;
    end;
  end loop;

  delete from public.profiles where id = target;
  delete from auth.users where id = target;
end;
$$;

revoke execute on function public.admin_delete_user(uuid) from public;
grant execute on function public.admin_delete_user(uuid) to authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 4b) 读取用户 auth 信息（邮箱等）RPC —— auth.users 前端无法直接读取，故用 RPC。
--     仅管理员可调用。
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.admin_get_auth_user(target uuid)
returns table (
  email text,
  email_confirmed_at timestamptz,
  phone text,
  last_sign_in_at timestamptz,
  auth_created_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception '无权限';
  end if;
  return query
    select
      u.email::text,
      u.email_confirmed_at,
      u.phone::text,
      u.last_sign_in_at,
      u.created_at
    from auth.users u
    where u.id = target;
end;
$$;

revoke execute on function public.admin_get_auth_user(uuid) from public;
grant execute on function public.admin_get_auth_user(uuid) to authenticated;

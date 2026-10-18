-- =============================================================
-- 详情页联系按钮点击统计(contact_clicks)
-- 在 Supabase SQL Editor 中手动执行,可重复执行。依赖:admin-expiry.sql 的 public.is_admin()。
--
-- 为什么不复用 analytics_events:它的 type 有 CHECK ('pageview', 'car_view'),后台概览 / 跳出率 / 时间线等
-- RPC 都按这两种事件计数,混进点击事件会改变现有口径。点击单独一张表,后台口径不受影响。
-- 写入只走 service role(/api/vt 收到 type = contact_click 的载荷);表不存在时 /api/vt 静默丢弃。
-- 用途:按界面语言调整 lib/contact-apps.ts 的 CONTACT_APP_ORDER(哪种通讯应用在哪个语言下最常被点)。
-- =============================================================

create table if not exists public.contact_clicks (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  app         text not null check (app in ('wechat', 'kakao', 'line', 'whatsapp', 'sms')),
  car_id      uuid references public.cars(id) on delete cascade,
  locale      text check (char_length(locale) <= 10),
  platform    text not null default 'web' check (platform in ('web', 'ios', 'android')),
  visitor_id  uuid not null,
  session_id  uuid not null,
  user_id     uuid references auth.users(id) on delete set null
);

comment on table public.contact_clicks is
  '车辆详情页联系按钮(微信 / KakaoTalk / LINE / WhatsApp / 短信)点击,由 /api/vt 用 service role 写入;180 天后由 pg_cron 清理';

create index if not exists contact_clicks_created_at_idx on public.contact_clicks (created_at);
create index if not exists contact_clicks_car_idx on public.contact_clicks (car_id, created_at desc) where car_id is not null;

alter table public.contact_clicks enable row level security;
-- 同 analytics_events:API 角色没有任何表权限(防 count=planned 的 EXPLAIN 估算泄露分布),读走下面的 RPC
revoke all on table public.contact_clicks from anon, authenticated;
grant select, insert on table public.contact_clicks to service_role;

-- 管理员:时间范围内按 应用 × 界面语言 汇总(点击数、去重访客)
create or replace function public.admin_contact_click_stats(p_from timestamptz, p_to timestamptz)
returns table (app text, locale text, clicks bigint, visitors bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
    select c.app, c.locale, count(*)::bigint, count(distinct c.visitor_id)::bigint
    from public.contact_clicks c
    where c.created_at >= p_from and c.created_at < p_to
    group by c.app, c.locale
    order by 3 desc;
end;
$$;

revoke execute on function public.admin_contact_click_stats(timestamptz, timestamptz) from public, anon;
grant execute on function public.admin_contact_click_stats(timestamptz, timestamptz) to authenticated;

-- 保留期:每天 04:27(UTC)删除 180 天前的点击(同名 schedule 覆盖,天然幂等;未装 pg_cron 时只提示)
do $$
begin
  perform cron.schedule(
    'contact-clicks-retention',
    '27 4 * * *',
    $job$delete from public.contact_clicks where created_at < now() - interval '180 days'$job$
  );
exception when others then
  raise notice '跳过 pg_cron 定时清理: %', sqlerrm;
end $$;

notify pgrst, 'reload schema';

-- ---------- 示例 ----------
-- 最近 30 天各语言下各应用的点击:
--   select * from public.admin_contact_click_stats(now() - interval '30 days', now());
-- (SQL Editor 以 postgres 身份运行时 is_admin() 不成立,直接查表:)
--   select locale, app, count(*) from public.contact_clicks
--   where created_at > now() - interval '30 days' group by 1, 2 order by 1, 3 desc;

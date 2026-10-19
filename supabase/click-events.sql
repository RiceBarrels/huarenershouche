-- =============================================================
-- 点击统计(click_events):详情页联系按钮 / 车行贷款标签 / 列表筛选开关
-- 在 Supabase SQL Editor 中手动执行,可重复执行。依赖:admin-expiry.sql 的 public.is_admin()。
-- 取代 batch 1 的 analytics-contact-click.sql(contact_clicks,从未在任何库执行过,已删除)。
--
-- 为什么不复用 analytics_events:它的 type 有 CHECK ('pageview', 'car_view'),后台概览 / 跳出率 / 时间线等
-- RPC 都按全部行 / 会话计数,混进点击事件会改变现有口径。点击单独一张表,后台口径不受影响。
-- 写入只走 service role(/api/vt 收到 type = click 的载荷);表不存在时 /api/vt 静默丢弃。
--
-- kind 与字段:
--   contact        详情页联系按钮;app = wechat / kakao / line / whatsapp / sms,car_id 必填。
--                  用途:按界面语言调整 lib/contact-apps.ts 的 CONTACT_APP_ORDER
--   financing_tag  详情页卖家卡片的贷款标签(点开看解释);target = 标签中文值(lib/dealer-financing.ts),car_id 必填
--   filter_chip    /browse 筛选开关被打开;target = 筛选键(如 financing),car_id 为空
--   setup_answer   偏好设置页(/account/setup)的回答;target = 问题:选项(如 ui:simple / country:AU / own:lt1 /
--                  setup:skipped,lib/preferences.ts SETUP_ANSWER_TARGETS),car_id 为空;邮编从不上报
-- 隐私与 analytics_events 一致:不存 IP / UA / 地区;user_id 只在已登录且 token 校验通过时写;
-- 删除账号前删掉该账号及其设备上的点击(click_events_forget_user);180 天后由 pg_cron 清理。
-- =============================================================

create table if not exists public.click_events (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  kind        text not null check (kind in ('contact', 'financing_tag', 'filter_chip', 'setup_answer')),
  app         text check (app is null or app in ('wechat', 'kakao', 'line', 'whatsapp', 'sms')),
  target      text check (char_length(target) <= 32),
  car_id      uuid references public.cars(id) on delete set null,
  locale      text check (char_length(locale) <= 10),
  platform    text not null default 'web' check (platform in ('web', 'ios', 'android')),
  visitor_id  uuid not null,                                       -- 持久匿名访客(同 analytics_events)
  session_id  uuid not null,
  user_id     uuid references auth.users(id) on delete set null,   -- 点击时已登录的用户
  -- 每种 kind 只用自己的字段;car_id 外键 on delete set null,删车后的历史点击照样保留在统计里
  constraint click_events_kind_fields check (
    (kind = 'contact' and app is not null and target is null)
    or (kind = 'financing_tag' and app is null
        and target in ('支持ITIN贷款', '无信用记录可贷', '自营分期', '接受现金'))
    or (kind = 'filter_chip' and app is null and car_id is null
        and target ~ '^[A-Za-z][A-Za-z0-9_]{0,31}$')
    or (kind = 'setup_answer' and app is null and car_id is null
        and target ~ '^(ui|country|own|setup):[A-Za-z0-9]{1,12}$')
  )
);

-- 表已存在(旧版本文件执行过)时,create table if not exists 不会更新约束:这里按当前定义重建,可重复执行
alter table public.click_events drop constraint if exists click_events_kind_check;
alter table public.click_events add constraint click_events_kind_check
  check (kind in ('contact', 'financing_tag', 'filter_chip', 'setup_answer'));
alter table public.click_events drop constraint if exists click_events_kind_fields;
alter table public.click_events add constraint click_events_kind_fields check (
  (kind = 'contact' and app is not null and target is null)
  or (kind = 'financing_tag' and app is null
      and target in ('支持ITIN贷款', '无信用记录可贷', '自营分期', '接受现金'))
  or (kind = 'filter_chip' and app is null and car_id is null
      and target ~ '^[A-Za-z][A-Za-z0-9_]{0,31}$')
  or (kind = 'setup_answer' and app is null and car_id is null
      and target ~ '^(ui|country|own|setup):[A-Za-z0-9]{1,12}$')
);

comment on table public.click_events is
  '点击统计(联系按钮 / 车行贷款标签 / 筛选开关),由 /api/vt 用 service role 写入;180 天后由 pg_cron 清理';

create index if not exists click_events_created_at_idx on public.click_events (created_at);
create index if not exists click_events_kind_idx on public.click_events (kind, created_at desc);
create index if not exists click_events_visitor_idx on public.click_events (visitor_id);
create index if not exists click_events_user_idx on public.click_events (user_id) where user_id is not null;

-- 同 analytics_events:RLS 只允许管理员读(兜底策略),且 API 角色没有任何表权限 ——
-- PostgREST 的 Prefer: count=planned 会以调用者身份跑 EXPLAIN,按列统计泄露分布,所以读一律走下面的 RPC。
-- 没有 insert / update / delete 策略:客户端不能直写,只有 service role(/api/vt)能插入。
alter table public.click_events enable row level security;
drop policy if exists click_events_select_admin on public.click_events;
create policy click_events_select_admin on public.click_events
  for select to authenticated
  using ((select public.is_admin()));

revoke all on table public.click_events from anon, authenticated;
grant select, insert on table public.click_events to service_role;

-- ---------- 删除账号:先删掉该账号的点击(同 analytics.sql 的 analytics_forget_user) ----------
-- 该账号登录时的全部点击,以及它登录过的设备上未登录时的点击;同一设备上别的账号登录时的点击保留。
create or replace function public.click_events_forget_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- 统计表被手动删掉时不能挡住删除账号
  if to_regclass('public.click_events') is null then
    return old;
  end if;
  delete from public.click_events e
  where e.user_id = old.id
     or (e.user_id is null
         and e.visitor_id in (select a.visitor_id from public.click_events a where a.user_id = old.id));
  return old;
end;
$$;

revoke execute on function public.click_events_forget_user() from public, anon, authenticated, service_role;

drop trigger if exists click_events_forget_user on auth.users;
create trigger click_events_forget_user
  before delete on auth.users
  for each row
  execute function public.click_events_forget_user();

-- ---------- 管理员:时间范围内按 kind × 对象(应用 / 标签 / 筛选键)× 界面语言 汇总 ----------
-- p_kind 为 null 时返回全部 kind。对象列 item:contact 为 app,其余为 target。
create or replace function public.admin_click_stats(p_from timestamptz, p_to timestamptz, p_kind text default null)
returns table (kind text, item text, locale text, clicks bigint, visitors bigint)
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
    select c.kind, coalesce(c.app, c.target), c.locale, count(*)::bigint, count(distinct c.visitor_id)::bigint
    from public.click_events c
    where c.created_at >= p_from and c.created_at < p_to
      and (p_kind is null or c.kind = p_kind)
    group by c.kind, coalesce(c.app, c.target), c.locale
    order by 4 desc;
end;
$$;

revoke execute on function public.admin_click_stats(timestamptz, timestamptz, text) from public, anon;
grant execute on function public.admin_click_stats(timestamptz, timestamptz, text) to authenticated;

-- batch 1 旧版(analytics-contact-click.sql)若曾被手动执行过:去掉它的 RPC 与清理任务
-- (contact_clicks 表本身不自动删,确认无用后手动 drop table public.contact_clicks)
drop function if exists public.admin_contact_click_stats(timestamptz, timestamptz);
do $$
begin
  perform cron.unschedule('contact-clicks-retention');
exception when others then
  null; -- 任务不存在 / 未装 pg_cron
end $$;

-- ---------- 保留期:每天 04:27(UTC)删除 180 天前的点击(同 analytics-retention;同名 schedule 覆盖,天然幂等) ----------
do $$
begin
  perform cron.schedule(
    'click-events-retention',
    '27 4 * * *',
    $job$delete from public.click_events where created_at < now() - interval '180 days'$job$
  );
exception when others then
  raise notice '跳过 pg_cron 定时清理: %', sqlerrm;
end $$;

notify pgrst, 'reload schema';

-- ---------- 示例 ----------
-- 最近 30 天各语言下各联系应用的点击:
--   select * from public.admin_click_stats(now() - interval '30 days', now(), 'contact');
-- (SQL Editor 以 postgres 身份运行时 is_admin() 不成立,直接查表:)
--   select kind, coalesce(app, target) as item, locale, count(*) from public.click_events
--   where created_at > now() - interval '30 days' group by 1, 2, 3 order by 1, 4 desc;

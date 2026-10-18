-- =============================================================
-- 第一方访问统计 + 用户 IP 地区
--   · 管理后台「访问统计」tab(admin_analytics_*,类似 Vercel Analytics):
--     全站访客 / 浏览量 / 来源 / 地区 / 设备 / 车辆浏览者 / 访客轨迹 / 实时流
--   · 卖家「数据面板」/account/dashboard(seller_analytics_*):个人卖家、车行、认领后的系统车行
--     只能看到自己名下车辆的浏览,看不到全站与别人的数据
--   · 后台用户列表的 IP 地区(user_ip_geo,登录用户的事件经触发器写入)
-- 埋点链路:客户端 → POST /api/vt(服务端 service role)→ analytics_events。
--   不存 IP,只存国家 / 州省 / 城市;referrer 只存 origin + pathname。
-- 历史用户地区:scripts/backfill-user-geo.ts 调 analytics_user_session_ips()(仅 service role)。
-- 删除账号(auth.users 删行,含 delete_account / admin_delete_user / 控制台删除)时,
--   该账号的访问记录与其设备上未登录时的浏览一并删除(第 3b 节触发器)。
-- 前端类型:lib/analytics/types.ts —— RPC 输出字段改动两边必须同步。
--
-- 在 Supabase SQL Editor 中手动整段执行(与 claim-accounts.sql 同方式)。
-- 依赖:admin-expiry.sql 的 public.is_admin();claim-accounts.sql 的 profiles.claimed_by。
-- 可重复执行(幂等)。
-- 第 0 节顺带补上 profiles 的特权列保护(原先任何登录用户都能把自己的 role 改成 admin、自行解封),
--   统计里「仅管理员」的数据都靠 is_admin() 把关,必须先堵上这个口子。
--
-- 卖家身份开关:analytics_seller_identity_enabled() 默认 select false(浏览者对卖家匿名);
--   改为 select true 并重新执行该函数定义,即向卖家展示「浏览时已登录」用户的用户名 / 头像。
-- =============================================================

-- ---------- 0. 前置:profiles 特权列只允许管理员修改 ----------
-- profiles_update 策略只校验 auth.uid() = id(没有 with check),API 角色对 role / banned / claimed_by 等列
-- 又有 update 权限:任何登录用户都能 update({ role: 'admin' }) 给自己提权(进而读到全站访问轨迹与用户 IP 地区),
-- 被封禁用户也能自行解封。这里加 BEFORE INSERT / UPDATE 触发器:经 PostgREST 直接写(current_user 为 anon /
-- authenticated)时,只有管理员能改这些列;新建行只能用默认值。
-- security definer 函数(handle_new_user、admin_review_claim、admin_set_claim、delete_account 等)里 current_user
-- 是函数属主,外键 on delete set null 以表属主执行,service role 脚本也不是这两个角色 —— 都不受影响。
-- 触发器函数必须保持 security invoker:写成 security definer 后 current_user 恒为属主,检查永远不生效。
create or replace function public.profiles_guard_privileged()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.role = 'user' and not new.banned and new.banned_at is null and new.banned_reason is null
       and new.claimed_by is null and not new.is_system then
      return new;
    end if;
  elsif (new.role, new.banned, new.banned_at, new.banned_reason, new.claimed_by, new.is_system)
        is not distinct from (old.role, old.banned, old.banned_at, old.banned_reason, old.claimed_by, old.is_system) then
    return new;
  end if;
  -- 改动了特权列:只放行管理员(anon 不可能是管理员,不必再查)
  if current_user = 'authenticated' and public.is_admin() then
    return new;
  end if;
  raise exception 'forbidden' using errcode = '42501',
    detail = 'role / banned / banned_at / banned_reason / claimed_by / is_system 只能由管理员修改';
end;
$$;

revoke execute on function public.profiles_guard_privileged() from public, anon, authenticated, service_role;

drop trigger if exists profiles_guard_privileged on public.profiles;
create trigger profiles_guard_privileged
  before insert or update on public.profiles
  for each row
  execute function public.profiles_guard_privileged();

-- ---------- 1. analytics_events:每次页面浏览 / 车辆浏览一行 ----------
-- 写入只走 service role(/api/vt);长度 API 已截断,check 只是兜底。
create table if not exists public.analytics_events (
  id            bigint generated always as identity primary key,
  created_at    timestamptz not null default now(),
  type          text not null check (type in ('pageview', 'car_view')),
  visitor_id    uuid not null,                                       -- 持久匿名访客(localStorage)
  session_id    uuid not null,                                       -- 30 分钟无活动或换外部来源即换新
  user_id       uuid references auth.users(id) on delete set null,   -- 事件发生时已登录的用户
  path          text not null check (char_length(path) between 1 and 512),
  route         text check (char_length(route) <= 200),
  query         text check (char_length(query) <= 500),
  hostname      text check (char_length(hostname) <= 100),
  locale        text check (char_length(locale) <= 10),
  car_id        uuid references public.cars(id) on delete set null,  -- 仅 car_view
  referrer      text check (char_length(referrer) <= 500),           -- 会话来源 origin + pathname
  referrer_host text check (char_length(referrer_host) <= 200),
  utm_source    text check (char_length(utm_source) <= 100),
  utm_medium    text check (char_length(utm_medium) <= 100),
  utm_campaign  text check (char_length(utm_campaign) <= 100),
  country       text check (char_length(country) <= 8),              -- ISO 国家代码(Vercel 边缘头)
  region        text check (char_length(region) <= 16),              -- ISO 3166-2 州省代码(不含国家前缀)
  city          text check (char_length(city) <= 100),
  device        text check (device is null or device in ('desktop', 'mobile', 'tablet')),
  browser       text check (char_length(browser) <= 50),
  os            text check (char_length(os) <= 50),
  platform      text not null default 'web' check (platform in ('web', 'ios', 'android'))
);

comment on table public.analytics_events is
  '第一方访问统计事件(pageview / car_view),由 /api/vt 用 service role 写入;180 天后由 pg_cron 清理';

create index if not exists analytics_events_created_at_idx
  on public.analytics_events (created_at);
create index if not exists analytics_events_visitor_idx
  on public.analytics_events (visitor_id, created_at desc);
create index if not exists analytics_events_user_idx
  on public.analytics_events (user_id, created_at desc) where user_id is not null;
create index if not exists analytics_events_car_idx
  on public.analytics_events (car_id, created_at desc) where car_id is not null;

alter table public.analytics_events enable row level security;

-- API 角色(anon / authenticated)对这张表没有任何权限,管理员也一样:读一律走下面的 security definer RPC。
-- 不能只靠 RLS:PostgREST 的 Prefer: count=planned 会以调用者身份跑 EXPLAIN,返回规划器按列统计
-- (MCV / 直方图)估出的行数 —— RLS 把行全藏起来也照样泄露全站流量、来源、地区、热门页面的近似分布。
-- (该策略只是兜底,没有表权限时不会生效;没有 insert / update / delete 策略。)
-- 先 revoke all 再只给 service role:重复执行时也会收回旧版本授出的 select。
drop policy if exists analytics_events_select_admin on public.analytics_events;
create policy analytics_events_select_admin on public.analytics_events
  for select to authenticated
  using ((select public.is_admin()));

revoke all on table public.analytics_events from anon, authenticated;
grant select, insert on table public.analytics_events to service_role;

-- ---------- 2. user_ip_geo:登录用户最近一次的 IP 地区(仅管理员可读) ----------
-- edge:analytics_events 触发器按 Vercel 边缘头写入;
-- backfill:scripts/backfill-user-geo.ts 按 auth.sessions.ip 用离线 IP 库补全(不覆盖 edge 行)。
create table if not exists public.user_ip_geo (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  country    text,
  region     text,
  city       text,
  source     text not null default 'edge' check (source in ('edge', 'backfill')),
  updated_at timestamptz not null default now()
);

alter table public.user_ip_geo enable row level security;

-- 这张表只按 user_id(主键)查。地区 / 来源 / 时间列不收集统计信息:authenticated 为了让管理员读
-- (fetchUserIpGeo)保留了 select 权限,而 count=planned 的估算行数会按列统计泄露各国家 / 城市的用户数;
-- 不收集后这些列的估算恒为默认值,对按主键的查询没有影响
alter table public.user_ip_geo alter column country set statistics 0;
alter table public.user_ip_geo alter column region set statistics 0;
alter table public.user_ip_geo alter column city set statistics 0;
alter table public.user_ip_geo alter column source set statistics 0;
alter table public.user_ip_geo alter column updated_at set statistics 0;

drop policy if exists user_ip_geo_select_admin on public.user_ip_geo;
create policy user_ip_geo_select_admin on public.user_ip_geo
  for select to authenticated
  using ((select public.is_admin()));

revoke all on table public.user_ip_geo from anon, authenticated;
grant select on table public.user_ip_geo to authenticated;
grant select, insert, update, delete on table public.user_ip_geo to service_role;

-- ---------- 3. 触发器:登录用户的事件 → upsert user_ip_geo ----------
-- 只有事件更新(updated_at 更晚)且「原来是 backfill / 地区变了 / 距上次超 1 小时」才写,
-- 避免每次浏览都更新;晚到的旧事件不覆盖新数据。edge 优先:backfill 行会被之后的 edge 事件覆盖。
create or replace function public.analytics_events_user_geo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- 绝大多数事件无需更新,先只读判断直接返回(on conflict do update 即使条件不满足也会锁行、写 WAL)
  if exists (
    select 1
    from public.user_ip_geo g
    where g.user_id = new.user_id
      and not (
        g.updated_at < new.created_at
        and (
          g.source <> 'edge'
          or (g.country, g.region, g.city) is distinct from (new.country, new.region, new.city)
          or new.created_at - g.updated_at > interval '1 hour'
        )
      )
  ) then
    return null;
  end if;

  -- 并发时以这里的条件为准
  insert into public.user_ip_geo as g (user_id, country, region, city, source, updated_at)
  values (new.user_id, new.country, new.region, new.city, 'edge', new.created_at)
  on conflict (user_id) do update
    set country = excluded.country,
        region = excluded.region,
        city = excluded.city,
        source = 'edge',
        updated_at = excluded.updated_at
    where g.updated_at < excluded.updated_at
      and (
        g.source <> 'edge'
        or (g.country, g.region, g.city) is distinct from (excluded.country, excluded.region, excluded.city)
        or excluded.updated_at - g.updated_at > interval '1 hour'
      );
  return null;
end;
$$;

revoke execute on function public.analytics_events_user_geo() from public, anon, authenticated, service_role;

drop trigger if exists analytics_events_user_geo on public.analytics_events;
create trigger analytics_events_user_geo
  after insert on public.analytics_events
  for each row
  when (new.user_id is not null and new.country is not null)
  execute function public.analytics_events_user_geo();

-- ---------- 3b. 删除账号:先删掉该账号的访问记录 ----------
-- 外键 on delete set null 只会把 user_id 置空:事件仍按设备的 visitor_id(clc_vid,留在浏览器里)挂着,
-- 之后同一浏览器登录的新账号会在后台「浏览记录」里继承这些轨迹(含私信路由、看过的车、城市)。
-- 所以在 auth.users 删行之前(BEFORE:此时 user_id 还在)删掉:该账号登录时的全部事件,
-- 以及它登录过的设备上未登录时的浏览;同一设备上别的账号登录时的事件保留。
-- 覆盖 delete_account()、admin_delete_user() 与 Supabase 控制台 / Admin API 删除(GoTrue 以 supabase_auth_admin
-- 身份删行,所以函数必须 security definer)。user_ip_geo 由外键 on delete cascade 删除。
create or replace function public.analytics_forget_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- 统计表被手动删掉时不能挡住删除账号
  if to_regclass('public.analytics_events') is null then
    return old;
  end if;
  delete from public.analytics_events e
  where e.user_id = old.id
     or (e.user_id is null
         and e.visitor_id in (select a.visitor_id from public.analytics_events a where a.user_id = old.id));
  return old;
end;
$$;

revoke execute on function public.analytics_forget_user() from public, anon, authenticated, service_role;

drop trigger if exists analytics_forget_user on auth.users;
create trigger analytics_forget_user
  before delete on auth.users
  for each row
  execute function public.analytics_forget_user();

-- ---------- 4. 内部辅助(execute 全部收回,只供下面的 security definer RPC 调用) ----------

-- 4a. 筛选条件归一:null → {};不是 JSON 对象 → 22023
create or replace function public.analytics_norm_filters(p_filters jsonb)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_filters is null or jsonb_typeof(p_filters) = 'null' then
    return '{}'::jsonb;
  end if;
  if jsonb_typeof(p_filters) <> 'object' then
    raise exception 'invalid filters' using errcode = '22023';
  end if;
  return p_filters;
end;
$$;

-- 4b. 区间校验:[p_from, p_to) 必须非空、p_to > p_from、跨度不超过 400 天
create or replace function public.analytics_assert_range(p_from timestamptz, p_to timestamptz)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_from is null or p_to is null or p_to <= p_from or p_to - p_from > interval '400 days' then
    raise exception 'invalid range' using errcode = '22023';
  end if;
end;
$$;

-- 4c. 时区校验:非法或空回退 UTC
create or replace function public.analytics_tz(p_tz text)
returns text
language plpgsql
stable
set search_path = ''
as $$
begin
  if p_tz is null or btrim(p_tz) = '' then
    return 'UTC';
  end if;
  perform now() at time zone p_tz;
  return p_tz;
exception when others then
  return 'UTC';
end;
$$;

-- 4d. 区间 [p_from, p_to) 内满足筛选条件的事件。p_filters 必须是对象(调用方先过 analytics_norm_filters)。
-- 筛选语义(键不存在 = 不筛):
--   文本维度:值非空时 列 = 值;"" / null 匹配 NULL 或 ""(「未知 / 直接访问」);
--     route 按 coalesce(route, path) 比较,与排行里 route 的取值一致
--   car_id / user_id:uuid 相等,"" 匹配 NULL;visitor_id:uuid 相等
--   visitor_type:user = 事件时已登录,anonymous = 未登录
--   exclude_admins = true:剔除曾以管理员身份登录过的访客的全部事件(含其登录前的匿名浏览)
-- 刻意不设 security definer / search_path:这样规划器能把它内联进调用它的查询(条件下推、只读用到的列、
-- 按访客取最近一条时走索引)。所有对象都写全 schema,且 execute 已对所有 API 角色收回;
-- Supabase Advisor 对它和 4f 提示 function_search_path_mutable 属预期,不要「修」成 set search_path(会失去内联)。
-- 性能写法(调用方都带 plan_cache_mode = force_custom_plan,p_filters 在规划期是常量,case 会被折叠):
--   · 筛选折叠成「裸列 = 值」/「列 is null or 列 = ''」,规划器才能用列统计估行数;
--     写成 coalesce(列, '') = 值 会被当表达式按 0.5% 估算,严重低估后选出嵌套循环;
--   · 管理员访客集合用 array(子查询) 只算一次(InitPlan),不写成相关 not exists:anti join 会按
--     「每个用户的平均事件数」估管理员事件,带筛选时退化成「命中事件 × 管理员全部事件」的嵌套循环。
--     visitor_id 非空,<> all 不会因 NULL 失效。
create or replace function public.analytics_filtered_events(
  p_from timestamptz,
  p_to timestamptz,
  p_filters jsonb
)
returns setof public.analytics_events
language sql
stable
as $$
  select e.*
  from public.analytics_events e
  where e.created_at >= p_from
    and e.created_at < p_to
    and (not (p_filters ? 'path') or case when coalesce(p_filters ->> 'path', '') = '' then (e.path is null or e.path = '') else e.path = p_filters ->> 'path' end)
    and (not (p_filters ? 'route') or case when coalesce(p_filters ->> 'route', '') = '' then coalesce(e.route, e.path, '') = '' else (e.route = p_filters ->> 'route' or (e.route is null and e.path = p_filters ->> 'route')) end)
    and (not (p_filters ? 'hostname') or case when coalesce(p_filters ->> 'hostname', '') = '' then (e.hostname is null or e.hostname = '') else e.hostname = p_filters ->> 'hostname' end)
    and (not (p_filters ? 'referrer_host') or case when coalesce(p_filters ->> 'referrer_host', '') = '' then (e.referrer_host is null or e.referrer_host = '') else e.referrer_host = p_filters ->> 'referrer_host' end)
    and (not (p_filters ? 'utm_source') or case when coalesce(p_filters ->> 'utm_source', '') = '' then (e.utm_source is null or e.utm_source = '') else e.utm_source = p_filters ->> 'utm_source' end)
    and (not (p_filters ? 'utm_medium') or case when coalesce(p_filters ->> 'utm_medium', '') = '' then (e.utm_medium is null or e.utm_medium = '') else e.utm_medium = p_filters ->> 'utm_medium' end)
    and (not (p_filters ? 'utm_campaign') or case when coalesce(p_filters ->> 'utm_campaign', '') = '' then (e.utm_campaign is null or e.utm_campaign = '') else e.utm_campaign = p_filters ->> 'utm_campaign' end)
    and (not (p_filters ? 'country') or case when coalesce(p_filters ->> 'country', '') = '' then (e.country is null or e.country = '') else e.country = p_filters ->> 'country' end)
    and (not (p_filters ? 'region') or case when coalesce(p_filters ->> 'region', '') = '' then (e.region is null or e.region = '') else e.region = p_filters ->> 'region' end)
    and (not (p_filters ? 'city') or case when coalesce(p_filters ->> 'city', '') = '' then (e.city is null or e.city = '') else e.city = p_filters ->> 'city' end)
    and (not (p_filters ? 'device') or case when coalesce(p_filters ->> 'device', '') = '' then (e.device is null or e.device = '') else e.device = p_filters ->> 'device' end)
    and (not (p_filters ? 'browser') or case when coalesce(p_filters ->> 'browser', '') = '' then (e.browser is null or e.browser = '') else e.browser = p_filters ->> 'browser' end)
    and (not (p_filters ? 'os') or case when coalesce(p_filters ->> 'os', '') = '' then (e.os is null or e.os = '') else e.os = p_filters ->> 'os' end)
    and (not (p_filters ? 'platform') or case when coalesce(p_filters ->> 'platform', '') = '' then (e.platform is null or e.platform = '') else e.platform = p_filters ->> 'platform' end)
    and (not (p_filters ? 'locale') or case when coalesce(p_filters ->> 'locale', '') = '' then (e.locale is null or e.locale = '') else e.locale = p_filters ->> 'locale' end)
    and (not (p_filters ? 'car_id') or case
           when coalesce(p_filters ->> 'car_id', '') = '' then e.car_id is null
           else e.car_id = (p_filters ->> 'car_id')::uuid
         end)
    and (not (p_filters ? 'user_id') or case
           when coalesce(p_filters ->> 'user_id', '') = '' then e.user_id is null
           else e.user_id = (p_filters ->> 'user_id')::uuid
         end)
    and (not (p_filters ? 'visitor_id') or e.visitor_id = (nullif(p_filters ->> 'visitor_id', ''))::uuid)
    and (case p_filters ->> 'visitor_type'
           when 'user' then e.user_id is not null
           when 'anonymous' then e.user_id is null
           else true
         end)
    -- 开关不为 true 时整个条件在规划期折叠成 true,不会去算管理员访客集合
    and (coalesce(p_filters ->> 'exclude_admins', '') <> 'true'
      or e.visitor_id <> all (array(
        select distinct a.visitor_id
        from public.analytics_events a
        join public.profiles p on p.id = a.user_id
        where p.role = 'admin'
      )))
$$;

-- 4e. 卖家可用的筛选键白名单(其余键一律丢弃,不信任前端),并恒定排除管理员
create or replace function public.analytics_seller_filters(p_filters jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(f.key, f.value), '{}'::jsonb) || '{"exclude_admins": true}'::jsonb
  from jsonb_each(public.analytics_norm_filters(p_filters)) as f
  where f.key in (
    'car_id', 'referrer_host', 'utm_source', 'utm_medium', 'utm_campaign',
    'country', 'region', 'city', 'device', 'browser', 'os', 'platform', 'locale', 'visitor_type'
  )
$$;

-- 4f. 某卖家名下车辆的 car_view 事件:只认白名单筛选;恒定剔除管理员访客,
-- 以及卖家自己(曾以该账号或其认领人登录过的访客的全部事件)。同 4d,刻意可内联;
-- 名下车辆与「本人访客」集合同样用 array(子查询) 各算一次(cars.id / visitor_id 非空,= any / <> all 不受 NULL 影响)。
create or replace function public.analytics_seller_events(
  p_seller_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_filters jsonb
)
returns setof public.analytics_events
language sql
stable
as $$
  select e.*
  from public.analytics_filtered_events(p_from, p_to, public.analytics_seller_filters(p_filters)) e
  where e.type = 'car_view'
    and e.car_id = any (array(select c.id from public.cars c where c.seller_id = p_seller_id))
    and e.visitor_id <> all (array(
      select distinct a.visitor_id
      from public.analytics_events a
      where a.user_id = p_seller_id
         or a.user_id = (select s.claimed_by from public.profiles s where s.id = p_seller_id)
    ))
$$;

-- 4g. 车辆摘要(AnalyticsCarInfo);车不存在返回 null
create or replace function public.analytics_car_info(p_car_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', c.id,
    'title', c.title,
    'title_zh', c.title_zh,
    'trim', c.trim,
    'image_url', c.image_url,
    'price', c.price,
    'year', c.year,
    'make', c.make,
    'model', c.model,
    'status', c.status
  )
  from public.cars c
  where c.id = p_car_id
$$;

-- 4h. 单条事件(AnalyticsEventRow:时间线 / 实时流)
create or replace function public.analytics_event_json(e public.analytics_events)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', e.id,
    'created_at', e.created_at,
    'type', e.type,
    'path', e.path,
    'route', e.route,
    'query', e.query,
    'locale', e.locale,
    'car_id', e.car_id,
    'car', public.analytics_car_info(e.car_id),
    'referrer', e.referrer,
    'referrer_host', e.referrer_host,
    'utm_source', e.utm_source,
    'utm_medium', e.utm_medium,
    'utm_campaign', e.utm_campaign,
    'country', e.country,
    'region', e.region,
    'city', e.city,
    'device', e.device,
    'browser', e.browser,
    'os', e.os,
    'platform', e.platform,
    'session_id', e.session_id,
    'visitor_id', e.visitor_id,
    'user_id', e.user_id,
    'username', p.username,
    'avatar_url', p.avatar_url
  )
  from (select 1) as one
  left join public.profiles p on p.id = e.user_id
$$;

-- 4i. 当前登录用户能否查看某卖家的统计:管理员,或该账号本人 / 认领人(不限账号类型);
-- 被封禁的账号不行,认领人自己被封禁也不行。
create or replace function public.analytics_can_view_seller(p_seller_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_seller_id is not null
    and (
      public.is_admin()
      or exists (
        select 1
        from public.profiles p
        where p.id = p_seller_id
          and coalesce(p.banned, false) = false
          and (p.id = auth.uid() or p.claimed_by = auth.uid())
          and not exists (
            select 1 from public.profiles me
            where me.id = auth.uid() and coalesce(me.banned, false)
          )
      )
    )
$$;

-- 4j. 卖家身份开关:改为 select true 即向卖家展示「浏览时已登录」用户的用户名 / 头像
create or replace function public.analytics_seller_identity_enabled()
returns boolean
language sql
immutable
set search_path = ''
as $$
  select false
$$;

-- 4k. 排行(AnalyticsBreakdown),管理员与卖家共用。p_seller_id 为空 = 全站;否则只统计该卖家车辆的浏览。
-- path / route 只算 pageview;car 只算 car_view;region 按 (country, region)、city 按 (country, region, city) 分组。
-- 排序 visitors desc, pageviews desc, key asc nulls last(按字节序,结果与库的排序规则无关)。
create or replace function public.analytics_breakdown_impl(
  p_seller_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_filters jsonb,
  p_dimension text,
  p_limit int,
  p_search text
)
returns jsonb
language plpgsql
stable
set search_path = ''
set plan_cache_mode = force_custom_plan
as $$
declare
  v_limit int := greatest(1, least(coalesce(p_limit, 10), 500));
  v_pat text;
  v_out jsonb;
begin
  if p_dimension is null or p_dimension not in (
    'path', 'route', 'hostname', 'referrer_host', 'utm_source', 'utm_medium', 'utm_campaign',
    'country', 'region', 'city', 'device', 'browser', 'os', 'platform', 'locale', 'car'
  ) then
    raise exception 'invalid dimension' using errcode = '22023';
  end if;
  if nullif(btrim(p_search), '') is not null then
    v_pat := '%' || replace(replace(replace(btrim(p_search), '\', '\\'), '%', '\%'), '_', '\_') || '%';
  end if;

  with ev as (
    select
      case p_dimension
        when 'path' then e.path
        when 'route' then coalesce(e.route, e.path)
        when 'hostname' then e.hostname
        when 'referrer_host' then e.referrer_host
        when 'utm_source' then e.utm_source
        when 'utm_medium' then e.utm_medium
        when 'utm_campaign' then e.utm_campaign
        when 'country' then e.country
        when 'region' then e.region
        when 'city' then e.city
        when 'device' then e.device
        when 'browser' then e.browser
        when 'os' then e.os
        when 'platform' then e.platform
        when 'locale' then e.locale
        when 'car' then e.car_id::text
      end as k,
      case when p_dimension in ('region', 'city') then e.country end as k_country,
      case when p_dimension = 'city' then e.region end as k_region,
      case when p_dimension = 'car' then e.car_id end as k_car,
      e.type,
      e.visitor_id,
      e.user_id
    from (
      select a.* from public.analytics_filtered_events(p_from, p_to, p_filters) a
      where p_seller_id is null
      union all
      select s.* from public.analytics_seller_events(p_seller_id, p_from, p_to, p_filters) s
      where p_seller_id is not null
    ) e
    where (p_dimension not in ('path', 'route') or e.type = 'pageview')
      and (p_dimension <> 'car' or (e.type = 'car_view' and e.car_id is not null))
  ),
  grp as (
    select
      k, k_country, k_region, k_car,
      count(distinct visitor_id) as visitors,
      -- 卖家与 car 维度:浏览次数;其他:该取值下的 pageview 数
      case when p_seller_id is not null or p_dimension = 'car' then count(*)
           else count(*) filter (where type = 'pageview') end as pageviews,
      count(*) as events,
      case when p_dimension = 'car' then count(distinct user_id) end as logged_in_viewers
    from ev
    group by k, k_country, k_region, k_car
  ),
  hit as (
    select g.*
    from grp g
    where v_pat is null
      or case
           when p_dimension = 'car' then exists (
             select 1 from public.cars c
             where c.id = g.k_car
               and (c.title ilike v_pat or c.title_zh ilike v_pat or c.make ilike v_pat or c.model ilike v_pat or c.trim ilike v_pat)
           )
           else g.k ilike v_pat
         end
  ),
  top as (
    select h.*
    from hit h
    order by h.visitors desc, h.pageviews desc,
             h.k collate "C" asc nulls last,
             h.k_country collate "C" asc nulls last,
             h.k_region collate "C" asc nulls last
    limit v_limit
  )
  select jsonb_build_object(
    'rows', coalesce((
      select jsonb_agg(
        jsonb_build_object('key', t.k, 'visitors', t.visitors, 'pageviews', t.pageviews, 'events', t.events)
        || case p_dimension
             when 'region' then jsonb_build_object('country', t.k_country, 'region', t.k)
             when 'city' then jsonb_build_object('country', t.k_country, 'region', t.k_region, 'city', t.k)
             when 'car' then jsonb_build_object(
               'car', public.analytics_car_info(t.k_car),
               'logged_in_viewers', t.logged_in_viewers
             )
             else '{}'::jsonb
           end
        order by t.visitors desc, t.pageviews desc,
                 t.k collate "C" asc nulls last,
                 t.k_country collate "C" asc nulls last,
                 t.k_region collate "C" asc nulls last
      )
      from top t
    ), '[]'::jsonb),
    'total_keys', (select count(*) from hit)
  )
  into v_out;

  return v_out;
end;
$$;

-- 4l. 卖家视角的浏览者(SellerViewerRow),seller_analytics_viewers / car_viewers 共用。
-- 输出 {total, views, logged_in_viewers, rows},由调用方挑出各自的字段。
-- viewer_key 按卖家加盐(不同卖家无法关联同一访客),绝不把 visitor_id 返回给卖家。
create or replace function public.analytics_seller_viewers_impl(
  p_seller_id uuid,
  p_car_id uuid,              -- 非空 = 只看这一辆车
  p_from timestamptz,
  p_to timestamptz,
  p_filters jsonb,
  p_limit int,
  p_offset int
)
returns jsonb
language plpgsql
stable
set search_path = ''
set plan_cache_mode = force_custom_plan
as $$
declare
  v_ident boolean := public.analytics_seller_identity_enabled();
  v_limit int := greatest(1, least(coalesce(p_limit, 50), 500));
  v_offset int := greatest(coalesce(p_offset, 0), 0);
  v_out jsonb;
begin
  with ev as (
    select e.visitor_id, e.car_id, e.user_id, e.created_at
    from public.analytics_seller_events(p_seller_id, p_from, p_to, p_filters) e
    where p_car_id is null or e.car_id = p_car_id
  ),
  v as (
    select
      visitor_id,
      count(*) as views,
      count(distinct car_id) as cars_viewed,
      min(created_at) as first_viewed,
      max(created_at) as last_viewed,
      bool_or(user_id is not null) as logged_in
    from ev
    group by visitor_id
  ),
  page as (
    select v.*
    from v
    order by v.last_viewed desc, v.visitor_id
    limit v_limit offset v_offset
  )
  select jsonb_build_object(
    'total', (select count(*) from v),
    'views', (select count(*) from ev),
    'logged_in_viewers', (select count(distinct user_id) from ev),
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object(
          'viewer_key', substr(md5(pg.visitor_id::text || ':' || p_seller_id::text), 1, 16),
          'logged_in', pg.logged_in,
          'user_id', case when v_ident then u.user_id end,
          'username', case when v_ident then pr.username end,
          'avatar_url', case when v_ident then pr.avatar_url end,
          'views', pg.views,
          'cars_viewed', pg.cars_viewed,
          'first_viewed', pg.first_viewed,
          'last_viewed', pg.last_viewed,
          'country', l.country,
          'region', l.region,
          'city', l.city,
          'device', l.device,
          'browser', l.browser,
          'os', l.os,
          'platform', l.platform,
          'locale', l.locale,
          'referrer_host', f.referrer_host,
          'utm_source', f.utm_source,
          'last_car', public.analytics_car_info(l.car_id)
        ) order by pg.last_viewed desc, pg.visitor_id)
      from page pg
      -- 最近一次浏览:地区 / 设备 / 语言 / 最近看的车
      left join lateral (
        select e.country, e.region, e.city, e.device, e.browser, e.os, e.platform, e.locale, e.car_id
        from public.analytics_seller_events(p_seller_id, p_from, p_to, p_filters) e
        where e.visitor_id = pg.visitor_id
          and (p_car_id is null or e.car_id = p_car_id)
        order by e.created_at desc, e.id desc
        limit 1
      ) l on true
      -- 最早一次浏览:会话来源
      left join lateral (
        select e.referrer_host, e.utm_source
        from public.analytics_seller_events(p_seller_id, p_from, p_to, p_filters) e
        where e.visitor_id = pg.visitor_id
          and (p_car_id is null or e.car_id = p_car_id)
        order by e.created_at, e.id
        limit 1
      ) f on true
      -- 身份开关开启时:浏览该卖家车辆时最近一次的登录用户
      left join lateral (
        select e.user_id
        from public.analytics_seller_events(p_seller_id, p_from, p_to, p_filters) e
        where v_ident
          and e.visitor_id = pg.visitor_id
          and (p_car_id is null or e.car_id = p_car_id)
          and e.user_id is not null
        order by e.created_at desc, e.id desc
        limit 1
      ) u on true
      left join public.profiles pr on pr.id = u.user_id
    ), '[]'::jsonb)
  )
  into v_out;

  return v_out;
end;
$$;

revoke execute on function public.analytics_norm_filters(jsonb) from public, anon, authenticated, service_role;
revoke execute on function public.analytics_assert_range(timestamptz, timestamptz) from public, anon, authenticated, service_role;
revoke execute on function public.analytics_tz(text) from public, anon, authenticated, service_role;
revoke execute on function public.analytics_filtered_events(timestamptz, timestamptz, jsonb) from public, anon, authenticated, service_role;
revoke execute on function public.analytics_seller_filters(jsonb) from public, anon, authenticated, service_role;
revoke execute on function public.analytics_seller_events(uuid, timestamptz, timestamptz, jsonb) from public, anon, authenticated, service_role;
revoke execute on function public.analytics_car_info(uuid) from public, anon, authenticated, service_role;
revoke execute on function public.analytics_event_json(public.analytics_events) from public, anon, authenticated, service_role;
revoke execute on function public.analytics_can_view_seller(uuid) from public, anon, authenticated, service_role;
revoke execute on function public.analytics_seller_identity_enabled() from public, anon, authenticated, service_role;
revoke execute on function public.analytics_breakdown_impl(uuid, timestamptz, timestamptz, jsonb, text, int, text) from public, anon, authenticated, service_role;
revoke execute on function public.analytics_seller_viewers_impl(uuid, uuid, timestamptz, timestamptz, jsonb, int, int) from public, anon, authenticated, service_role;

-- ---------- 5. 管理员 RPC(lib/analytics/admin.ts) ----------
-- 全部 security definer + 开头校验 is_admin();非管理员 42501。区间非法 / 维度非法 22023。

-- 5a. 概览:KPI(含上一个等长周期)、时间序列(按 p_tz 的本地时间分桶)、在线人数
create or replace function public.admin_analytics_overview(
  p_from timestamptz,
  p_to timestamptz,
  p_filters jsonb default '{}'::jsonb,
  p_tz text default 'UTC',
  p_bucket text default 'day'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
set plan_cache_mode = force_custom_plan
as $$
declare
  v_f jsonb;
  -- 会话内可能变化的维度(页面 / 车辆 / 登录状态 / 语言 / 地区):按它们筛选时只命中会话的一部分事件
  v_ev_keys constant text[] := array['path', 'route', 'car_id', 'user_id', 'visitor_type', 'locale', 'country', 'region', 'city'];
  v_partial boolean;
  v_tz text;
  v_bucket text := case when p_bucket = 'hour' then 'hour' else 'day' end;
  v_step interval := case when p_bucket = 'hour' then interval '1 hour' else interval '1 day' end;
  v_prev_from timestamptz;
  v_kp jsonb;
  v_series jsonb;
  v_online bigint;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  perform public.analytics_assert_range(p_from, p_to);
  v_f := public.analytics_norm_filters(p_filters);
  v_partial := v_f ?| v_ev_keys;
  v_tz := public.analytics_tz(p_tz);
  -- 按秒数回推,上一周期长度与会话时区无关
  v_prev_from := p_from - extract(epoch from (p_to - p_from)) * interval '1 second';

  -- KPI:当前周期与上一周期一次扫完。
  -- 跳出 = 会话在该周期内的互动 ≤ 1 次:pageview、浮层里的 car_view 各算一次;车辆详情页自己的 car_view
  --   (与该页 pageview 成对出现)不另算,落地车辆详情页即离开也是跳出。车被删后 car_id 为空,按路由判断。
  -- v_partial 时命中哪些会话仍由全部筛选决定,互动数改按该会话在周期内的全部事件计(只保留会话内不变的筛选:
  --   来源 / 设备 / 平台 / 域名 / 访客 / 排除管理员),否则「看过 /browse 的会话」只数到 /browse 那一条,被误算成跳出。
  with ev as (
    select
      e.created_at >= p_from as cur, e.type, e.visitor_id, e.session_id, e.user_id,
      coalesce(e.type = 'car_view' and case when e.car_id is null then e.route = '/car/[id]'
                                            else lower(e.path) = '/car/' || e.car_id::text end, false) as detail_cv
    from public.analytics_filtered_events(v_prev_from, p_to, v_f) e
  ),
  agg as (
    select
      cur,
      count(distinct visitor_id) as visitors,
      count(*) filter (where type = 'pageview') as pageviews,
      count(*) filter (where type = 'car_view') as car_views,
      count(distinct visitor_id) filter (where type = 'car_view') as car_viewers,
      count(distinct user_id) as users
    from ev
    group by cur
  ),
  -- 每个(周期, 会话)的互动数
  sn as (
    select cur, session_id, count(*) filter (where not detail_cv) as n
    from ev
    where not v_partial
    group by cur, session_id
    union all
    -- 判断详情页 car_view 的写法与 ev 相同
    select s.cur, s.session_id,
      count(*) filter (where not coalesce(x.type = 'car_view' and case when x.car_id is null then x.route = '/car/[id]'
                                                                    else lower(x.path) = '/car/' || x.car_id::text end, false))
    from (select distinct cur, visitor_id, session_id from ev where v_partial) s
    join public.analytics_filtered_events(v_prev_from, p_to, v_f - v_ev_keys) x
      on x.visitor_id = s.visitor_id
     and x.session_id = s.session_id
     and (x.created_at >= p_from) = s.cur
    group by s.cur, s.session_id
  ),
  sess as (
    select cur, count(*) as sessions, count(*) filter (where n <= 1) as bounced
    from sn
    group by cur
  )
  select jsonb_object_agg(
    case when p.cur then 'kpis' else 'prev' end,
    jsonb_build_object(
      'visitors', coalesce(a.visitors, 0),
      'pageviews', coalesce(a.pageviews, 0),
      'car_views', coalesce(a.car_views, 0),
      'car_viewers', coalesce(a.car_viewers, 0),
      'sessions', coalesce(s.sessions, 0),
      'users', coalesce(a.users, 0),
      'bounced', coalesce(s.bounced, 0),
      'bounce_rate', case when coalesce(s.sessions, 0) = 0 then null
                          else round(s.bounced::numeric / s.sessions, 4) end
    )
  )
  into v_kp
  from (values (true), (false)) as p(cur)
  left join agg a on a.cur = p.cur
  left join sess s on s.cur = p.cur;

  -- 时间序列:桶 = p_tz 下的本地 wall time;补齐空桶(只补 < p_to 的),有事件的桶一律保留
  with a as (
    select
      date_trunc(v_bucket, e.created_at at time zone v_tz) as t,
      count(distinct e.visitor_id) as visitors,
      count(*) filter (where e.type = 'pageview') as pageviews,
      count(*) filter (where e.type = 'car_view') as car_views
    from public.analytics_filtered_events(p_from, p_to, v_f) e
    group by 1
  ),
  b as (
    select gs as t
    from generate_series(date_trunc(v_bucket, p_from at time zone v_tz), p_to at time zone v_tz, v_step) as gs
    where gs < p_to at time zone v_tz
    union
    select a.t from a
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      't', to_char(b.t, 'YYYY-MM-DD"T"HH24:MI:SS'),
      'visitors', coalesce(a.visitors, 0),
      'pageviews', coalesce(a.pageviews, 0),
      'car_views', coalesce(a.car_views, 0)
    ) order by b.t), '[]'::jsonb)
  into v_series
  from b
  left join a on a.t = b.t;

  -- 在线:最近 5 分钟的去重访客(同样的筛选)
  select count(distinct e.visitor_id)
  into v_online
  from public.analytics_filtered_events(now() - interval '5 minutes', 'infinity'::timestamptz, v_f) e;

  return jsonb_build_object(
    'kpis', v_kp -> 'kpis',
    'prev', v_kp -> 'prev',
    'series', v_series,
    'online', v_online,
    'bucket', v_bucket,
    'tz', v_tz,
    -- 开始采集的时间(全站最早一条事件,走 created_at 索引端点):上一周期早于它时环比不完整,界面不显示
    'data_since', (select min(x.created_at) from public.analytics_events x)
  );
end;
$$;

-- 5b. 维度排行
create or replace function public.admin_analytics_breakdown(
  p_from timestamptz,
  p_to timestamptz,
  p_filters jsonb default '{}'::jsonb,
  p_dimension text default 'path',
  p_limit int default 10,
  p_search text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  perform public.analytics_assert_range(p_from, p_to);
  return public.analytics_breakdown_impl(
    null, p_from, p_to, public.analytics_norm_filters(p_filters), p_dimension, p_limit, p_search
  );
end;
$$;

-- 5c. 访客列表:按 visitor_id 聚合,last_seen desc 分页;先分页再按访客取最近 / 最早一条事件。
-- user_id:范围内(同筛选)有登录态的事件时取其中最近一次的登录用户;范围内都没登录时,
--   退回该设备在全表最近一次登录的用户(界面标「未登录浏览」)。共用设备上不会把别人登录时的浏览算到最近那个账号头上
create or replace function public.admin_analytics_visitors(
  p_from timestamptz,
  p_to timestamptz,
  p_filters jsonb default '{}'::jsonb,
  p_limit int default 50,
  p_offset int default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
set plan_cache_mode = force_custom_plan
as $$
declare
  v_f jsonb;
  v_limit int := greatest(1, least(coalesce(p_limit, 50), 500));
  v_offset int := greatest(coalesce(p_offset, 0), 0);
  v_out jsonb;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  perform public.analytics_assert_range(p_from, p_to);
  v_f := public.analytics_norm_filters(p_filters);

  with s as (
    -- 先按 (访客, 会话) 聚合,再按访客汇总,避免 count(distinct) 排序
    select
      e.visitor_id,
      e.session_id,
      min(e.created_at) as first_seen,
      max(e.created_at) as last_seen,
      count(*) filter (where e.type = 'pageview') as pageviews,
      count(*) filter (where e.type = 'car_view') as car_views,
      bool_or(e.user_id is not null) as logged_in
    from public.analytics_filtered_events(p_from, p_to, v_f) e
    group by e.visitor_id, e.session_id
  ),
  v as (
    select
      visitor_id,
      min(first_seen) as first_seen,
      max(last_seen) as last_seen,
      sum(pageviews)::bigint as pageviews,
      sum(car_views)::bigint as car_views,
      count(*) as sessions,
      bool_or(logged_in) as logged_in
    from s
    group by visitor_id
  ),
  page as (
    select v.*
    from v
    order by v.last_seen desc, v.visitor_id
    limit v_limit offset v_offset
  )
  select jsonb_build_object(
    'total', (select count(*) from v),
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object(
          'visitor_id', pg.visitor_id,
          'user_id', coalesce(ru.user_id, u.user_id),
          'username', pr.username,
          'avatar_url', pr.avatar_url,
          'role', pr.role,
          'logged_in', pg.logged_in,
          'first_seen', pg.first_seen,
          'last_seen', pg.last_seen,
          'pageviews', pg.pageviews,
          'car_views', pg.car_views,
          'sessions', pg.sessions,
          'country', l.country,
          'region', l.region,
          'city', l.city,
          'device', l.device,
          'browser', l.browser,
          'os', l.os,
          'platform', l.platform,
          'locale', l.locale,
          'referrer_host', f.referrer_host,
          'utm_source', f.utm_source,
          'landing_path', f.path
        ) order by pg.last_seen desc, pg.visitor_id)
      from page pg
      left join lateral (
        select e.country, e.region, e.city, e.device, e.browser, e.os, e.platform, e.locale
        from public.analytics_filtered_events(p_from, p_to, v_f) e
        where e.visitor_id = pg.visitor_id
        order by e.created_at desc, e.id desc
        limit 1
      ) l on true
      left join lateral (
        select e.referrer_host, e.utm_source, e.path
        from public.analytics_filtered_events(p_from, p_to, v_f) e
        where e.visitor_id = pg.visitor_id
        order by e.created_at, e.id
        limit 1
      ) f on true
      -- 范围内(同筛选)最近一次登录态事件的用户:只对有登录态的访客多查一次(按访客索引)
      left join lateral (
        select e.user_id
        from public.analytics_filtered_events(p_from, p_to, v_f) e
        where pg.logged_in
          and e.visitor_id = pg.visitor_id
          and e.user_id is not null
        order by e.created_at desc, e.id desc
        limit 1
      ) ru on true
      -- 范围内没登录过:该设备在全表最近一次登录的用户(不限时间范围与筛选)
      left join lateral (
        select a.user_id
        from public.analytics_events a
        where ru.user_id is null
          and a.visitor_id = pg.visitor_id
          and a.user_id is not null
        order by a.created_at desc, a.id desc
        limit 1
      ) u on true
      left join public.profiles pr on pr.id = coalesce(ru.user_id, u.user_id)
    ), '[]'::jsonb)
  )
  into v_out;

  return v_out;
end;
$$;

-- 5d. 浏览轨迹,created_at desc 分页:
--   按访客 = 该设备的全部事件(共用设备上别的账号登录时的事件也在内,时间线按会话标出是谁);
--   按用户 = 他本人登录时的事件 + 他登录过的设备上未登录时的浏览;不含同一设备上别的账号登录时的事件
--   (否则家庭共用 iPad 上另一个人看过的车会算到他头上)。两者都传时取并集。
create or replace function public.admin_analytics_timeline(
  p_visitor_id uuid default null,
  p_user_id uuid default null,
  p_before timestamptz default null,
  p_limit int default 100
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
set plan_cache_mode = force_custom_plan
as $$
declare
  v_limit int := greatest(1, least(coalesce(p_limit, 100), 500));
  v_vids uuid[] := '{}';
  v_rows jsonb;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_visitor_id is null and p_user_id is null then
    raise exception 'visitor_id or user_id required' using errcode = '22023';
  end if;

  if p_user_id is not null then
    -- 该用户登录过的全部设备,最近用过的在前
    select coalesce(array_agg(x.visitor_id order by x.last_at desc, x.visitor_id), '{}')
    into v_vids
    from (
      select a.visitor_id, max(a.created_at) as last_at
      from public.analytics_events a
      where a.user_id = p_user_id
      group by a.visitor_id
    ) x;
  end if;
  if p_visitor_id is not null and not (p_visitor_id = any (v_vids)) then
    v_vids := array_prepend(p_visitor_id, v_vids);
  end if;

  select coalesce(jsonb_agg(public.analytics_event_json(ae) order by ae.created_at desc, ae.id desc), '[]'::jsonb)
  into v_rows
  from public.analytics_events ae
  where ae.id in (
    select e.id
    from public.analytics_events e
    where (e.visitor_id = p_visitor_id
           or e.user_id = p_user_id
           or (e.user_id is null and e.visitor_id = any (v_vids)))
      and (p_before is null or e.created_at < p_before)
    order by e.created_at desc, e.id desc
    limit v_limit
  );

  return jsonb_build_object('visitor_ids', to_jsonb(v_vids), 'rows', v_rows);
end;
$$;

-- 5e. 某辆车的浏览者:按访客聚合,last_viewed desc。
-- user_id:看这辆车时登录着的用户(取最近一次);看车时都没登录,才退回该设备在全表最近一次登录的用户
--   (界面标「未登录浏览」)。共用设备上别人登录时看的车不会算到最近那个账号头上
create or replace function public.admin_analytics_car_viewers(
  p_car_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_filters jsonb default '{}'::jsonb,
  p_limit int default 100
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
set plan_cache_mode = force_custom_plan
as $$
declare
  v_f jsonb;
  v_limit int := greatest(1, least(coalesce(p_limit, 100), 500));
  v_out jsonb;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_car_id is null then
    raise exception 'car_id required' using errcode = '22023';
  end if;
  perform public.analytics_assert_range(p_from, p_to);
  v_f := public.analytics_norm_filters(p_filters);

  with ev as (
    select e.id, e.visitor_id, e.user_id, e.created_at
    from public.analytics_filtered_events(p_from, p_to, v_f) e
    where e.type = 'car_view'
      and e.car_id = p_car_id
  ),
  v as (
    select
      visitor_id,
      count(*) as views,
      min(created_at) as first_viewed,
      max(created_at) as last_viewed,
      bool_or(user_id is not null) as logged_in,
      -- 看车时最近一次的登录用户(在聚合里取:ev 是物化的 CTE,逐行 lateral 回扫它没有索引)
      (array_agg(user_id order by created_at desc, id desc) filter (where user_id is not null))[1] as ev_user_id
    from ev
    group by visitor_id
  ),
  top as (
    select v.*
    from v
    order by v.last_viewed desc, v.visitor_id
    limit v_limit
  )
  select jsonb_build_object(
    'views', (select count(*) from ev),
    'viewers', (select count(*) from v),
    'logged_in_viewers', (select count(distinct user_id) from ev),
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object(
          'visitor_id', t.visitor_id,
          'user_id', coalesce(t.ev_user_id, u.user_id),
          'username', pr.username,
          'avatar_url', pr.avatar_url,
          'logged_in', t.logged_in,
          'views', t.views,
          'first_viewed', t.first_viewed,
          'last_viewed', t.last_viewed,
          'country', l.country,
          'region', l.region,
          'city', l.city,
          'device', l.device,
          'browser', l.browser,
          'os', l.os,
          'platform', l.platform,
          'referrer_host', f.referrer_host,
          'utm_source', f.utm_source
        ) order by t.last_viewed desc, t.visitor_id)
      from top t
      left join lateral (
        select e.country, e.region, e.city, e.device, e.browser, e.os, e.platform
        from public.analytics_filtered_events(p_from, p_to, v_f) e
        where e.visitor_id = t.visitor_id
          and e.type = 'car_view'
          and e.car_id = p_car_id
        order by e.created_at desc, e.id desc
        limit 1
      ) l on true
      left join lateral (
        select e.referrer_host, e.utm_source
        from public.analytics_filtered_events(p_from, p_to, v_f) e
        where e.visitor_id = t.visitor_id
          and e.type = 'car_view'
          and e.car_id = p_car_id
        order by e.created_at, e.id
        limit 1
      ) f on true
      -- 看车时都没登录:该设备在全表最近一次登录的用户
      left join lateral (
        select a.user_id
        from public.analytics_events a
        where t.ev_user_id is null
          and a.visitor_id = t.visitor_id
          and a.user_id is not null
        order by a.created_at desc, a.id desc
        limit 1
      ) u on true
      left join public.profiles pr on pr.id = coalesce(t.ev_user_id, u.user_id)
    ), '[]'::jsonb)
  )
  into v_out;

  return v_out;
end;
$$;

-- 5f. 实时:最近 5 分钟在线人数 + 最近 24 小时内最新的 p_limit 条事件
create or replace function public.admin_analytics_live(
  p_filters jsonb default '{}'::jsonb,
  p_limit int default 30
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
set plan_cache_mode = force_custom_plan
as $$
declare
  v_f jsonb;
  v_limit int := greatest(1, least(coalesce(p_limit, 30), 500));
  v_online bigint;
  v_rows jsonb;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  v_f := public.analytics_norm_filters(p_filters);

  select count(distinct e.visitor_id)
  into v_online
  from public.analytics_filtered_events(now() - interval '5 minutes', 'infinity'::timestamptz, v_f) e;

  select coalesce(jsonb_agg(public.analytics_event_json(ae) order by ae.created_at desc, ae.id desc), '[]'::jsonb)
  into v_rows
  from public.analytics_events ae
  where ae.id in (
    select e.id
    from public.analytics_filtered_events(now() - interval '24 hours', 'infinity'::timestamptz, v_f) e
    order by e.created_at desc, e.id desc
    limit v_limit
  );

  return jsonb_build_object('online', v_online, 'rows', v_rows);
end;
$$;

revoke execute on function public.admin_analytics_overview(timestamptz, timestamptz, jsonb, text, text) from public, anon;
revoke execute on function public.admin_analytics_breakdown(timestamptz, timestamptz, jsonb, text, int, text) from public, anon;
revoke execute on function public.admin_analytics_visitors(timestamptz, timestamptz, jsonb, int, int) from public, anon;
revoke execute on function public.admin_analytics_timeline(uuid, uuid, timestamptz, int) from public, anon;
revoke execute on function public.admin_analytics_car_viewers(uuid, timestamptz, timestamptz, jsonb, int) from public, anon;
revoke execute on function public.admin_analytics_live(jsonb, int) from public, anon;
grant execute on function public.admin_analytics_overview(timestamptz, timestamptz, jsonb, text, text) to authenticated;
grant execute on function public.admin_analytics_breakdown(timestamptz, timestamptz, jsonb, text, int, text) to authenticated;
grant execute on function public.admin_analytics_visitors(timestamptz, timestamptz, jsonb, int, int) to authenticated;
grant execute on function public.admin_analytics_timeline(uuid, uuid, timestamptz, int) to authenticated;
grant execute on function public.admin_analytics_car_viewers(uuid, timestamptz, timestamptz, jsonb, int) to authenticated;
grant execute on function public.admin_analytics_live(jsonb, int) to authenticated;

-- ---------- 6. 卖家 RPC(lib/analytics/seller.ts) ----------
-- 车行与个人卖家通用,只统计 p_seller_id 名下车辆的 car_view;库内校验 analytics_can_view_seller(),无权 42501。
-- 只认 SellerAnalyticsFilters 白名单里的筛选键;管理员与卖家自己(含认领人)的浏览恒定剔除。

-- 6a. 概览:KPI(含上一周期)、时间序列、名下车辆数
create or replace function public.seller_analytics_overview(
  p_seller_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_filters jsonb default '{}'::jsonb,
  p_tz text default 'UTC',
  p_bucket text default 'day'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
set plan_cache_mode = force_custom_plan
as $$
declare
  v_f jsonb;
  v_tz text;
  v_bucket text := case when p_bucket = 'hour' then 'hour' else 'day' end;
  v_step interval := case when p_bucket = 'hour' then interval '1 hour' else interval '1 day' end;
  v_prev_from timestamptz;
  v_kp jsonb;
  v_series jsonb;
  v_cars_total bigint;
  v_cars_active bigint;
begin
  if not public.analytics_can_view_seller(p_seller_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  perform public.analytics_assert_range(p_from, p_to);
  v_f := public.analytics_norm_filters(p_filters);
  v_tz := public.analytics_tz(p_tz);
  v_prev_from := p_from - extract(epoch from (p_to - p_from)) * interval '1 second';

  with ev as (
    select e.created_at >= p_from as cur, e.visitor_id, e.user_id, e.car_id
    from public.analytics_seller_events(p_seller_id, v_prev_from, p_to, v_f) e
  ),
  agg as (
    select
      cur,
      count(*) as views,
      count(distinct visitor_id) as viewers,
      count(distinct user_id) as logged_in_viewers,
      count(distinct car_id) as cars_viewed
    from ev
    group by cur
  )
  select jsonb_object_agg(
    case when p.cur then 'kpis' else 'prev' end,
    jsonb_build_object(
      'views', coalesce(a.views, 0),
      'viewers', coalesce(a.viewers, 0),
      'logged_in_viewers', coalesce(a.logged_in_viewers, 0),
      'cars_viewed', coalesce(a.cars_viewed, 0)
    )
  )
  into v_kp
  from (values (true), (false)) as p(cur)
  left join agg a on a.cur = p.cur;

  with a as (
    select
      date_trunc(v_bucket, e.created_at at time zone v_tz) as t,
      count(*) as views,
      count(distinct e.visitor_id) as viewers
    from public.analytics_seller_events(p_seller_id, p_from, p_to, v_f) e
    group by 1
  ),
  b as (
    select gs as t
    from generate_series(date_trunc(v_bucket, p_from at time zone v_tz), p_to at time zone v_tz, v_step) as gs
    where gs < p_to at time zone v_tz
    union
    select a.t from a
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      't', to_char(b.t, 'YYYY-MM-DD"T"HH24:MI:SS'),
      'views', coalesce(a.views, 0),
      'viewers', coalesce(a.viewers, 0)
    ) order by b.t), '[]'::jsonb)
  into v_series
  from b
  left join a on a.t = b.t;

  select count(*), count(*) filter (where c.status = 'active')
  into v_cars_total, v_cars_active
  from public.cars c
  where c.seller_id = p_seller_id;

  return jsonb_build_object(
    'kpis', v_kp -> 'kpis',
    'prev', v_kp -> 'prev',
    'series', v_series,
    'bucket', v_bucket,
    'tz', v_tz,
    'cars_total', v_cars_total,
    'cars_active', v_cars_active,
    'identity_enabled', public.analytics_seller_identity_enabled(),
    -- 同 admin_analytics_overview:全站开始采集的时间(不是该卖家的第一次浏览),只用于判断环比是否完整
    'data_since', (select min(x.created_at) from public.analytics_events x)
  );
end;
$$;

-- 6b. 维度排行(不含 path / route / hostname 等全站维度)。筛选在入口就按卖家白名单清洗:
-- breakdown_impl 的全站分支虽然恒被剪掉,但规划期仍会折叠其中的 uuid 转换,未清洗的 user_id / visitor_id 会报 22P02。
create or replace function public.seller_analytics_breakdown(
  p_seller_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_filters jsonb default '{}'::jsonb,
  p_dimension text default 'car',
  p_limit int default 10,
  p_search text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.analytics_can_view_seller(p_seller_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  perform public.analytics_assert_range(p_from, p_to);
  if p_dimension is null or p_dimension not in (
    'car', 'referrer_host', 'utm_source', 'utm_medium', 'utm_campaign',
    'country', 'region', 'city', 'device', 'browser', 'os', 'platform', 'locale'
  ) then
    raise exception 'invalid dimension' using errcode = '22023';
  end if;
  return public.analytics_breakdown_impl(
    p_seller_id, p_from, p_to, public.analytics_seller_filters(p_filters), p_dimension, p_limit, p_search
  );
end;
$$;

-- 6c. 浏览者列表(SellerViewers)
create or replace function public.seller_analytics_viewers(
  p_seller_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_filters jsonb default '{}'::jsonb,
  p_limit int default 50,
  p_offset int default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_r jsonb;
begin
  if not public.analytics_can_view_seller(p_seller_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  perform public.analytics_assert_range(p_from, p_to);
  v_r := public.analytics_seller_viewers_impl(
    p_seller_id, null, p_from, p_to, public.analytics_norm_filters(p_filters), p_limit, p_offset
  );
  return jsonb_build_object('total', v_r -> 'total', 'rows', v_r -> 'rows');
end;
$$;

-- 6d. 某辆车的浏览者(SellerCarViewers);车必须属于该卖家,否则 42501
create or replace function public.seller_analytics_car_viewers(
  p_seller_id uuid,
  p_car_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_filters jsonb default '{}'::jsonb,
  p_limit int default 100
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_r jsonb;
begin
  if not public.analytics_can_view_seller(p_seller_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_car_id is null or not exists (
    select 1 from public.cars c where c.id = p_car_id and c.seller_id = p_seller_id
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  perform public.analytics_assert_range(p_from, p_to);
  v_r := public.analytics_seller_viewers_impl(
    p_seller_id, p_car_id, p_from, p_to, public.analytics_norm_filters(p_filters), coalesce(p_limit, 100), 0
  );
  return jsonb_build_object(
    'views', v_r -> 'views',
    'viewers', v_r -> 'total',
    'logged_in_viewers', v_r -> 'logged_in_viewers',
    'rows', v_r -> 'rows'
  );
end;
$$;

-- 6e. 某浏览者(viewer_key)在该卖家车辆上的全部浏览(不限区间,受 180 天保留期限制),created_at desc
create or replace function public.seller_analytics_viewer_timeline(
  p_seller_id uuid,
  p_viewer_key text,
  p_limit int default 100
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
set plan_cache_mode = force_custom_plan
as $$
declare
  v_limit int := greatest(1, least(coalesce(p_limit, 100), 500));
  v_vids uuid[];
  v_rows jsonb;
begin
  if not public.analytics_can_view_seller(p_seller_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_viewer_key is null or btrim(p_viewer_key) = '' then
    raise exception 'viewer_key required' using errcode = '22023';
  end if;

  select coalesce(array_agg(x.visitor_id), '{}')
  into v_vids
  from (
    select distinct e.visitor_id
    from public.analytics_seller_events(p_seller_id, '-infinity'::timestamptz, 'infinity'::timestamptz, '{}'::jsonb) e
  ) x
  where substr(md5(x.visitor_id::text || ':' || p_seller_id::text), 1, 16) = lower(btrim(p_viewer_key));

  select coalesce(jsonb_agg(jsonb_build_object(
      'created_at', e.created_at,
      'car_id', e.car_id,
      'car', public.analytics_car_info(e.car_id),
      'logged_in', e.user_id is not null,
      'country', e.country,
      'region', e.region,
      'city', e.city,
      'device', e.device,
      'browser', e.browser,
      'os', e.os,
      'platform', e.platform,
      'referrer_host', e.referrer_host,
      'utm_source', e.utm_source
    ) order by e.created_at desc, e.id desc), '[]'::jsonb)
  into v_rows
  from (
    select s.*
    from public.analytics_seller_events(p_seller_id, '-infinity'::timestamptz, 'infinity'::timestamptz, '{}'::jsonb) s
    where s.visitor_id = any (v_vids)
    order by s.created_at desc, s.id desc
    limit v_limit
  ) e;

  return jsonb_build_object('rows', v_rows);
end;
$$;

revoke execute on function public.seller_analytics_overview(uuid, timestamptz, timestamptz, jsonb, text, text) from public, anon;
revoke execute on function public.seller_analytics_breakdown(uuid, timestamptz, timestamptz, jsonb, text, int, text) from public, anon;
revoke execute on function public.seller_analytics_viewers(uuid, timestamptz, timestamptz, jsonb, int, int) from public, anon;
revoke execute on function public.seller_analytics_car_viewers(uuid, uuid, timestamptz, timestamptz, jsonb, int) from public, anon;
revoke execute on function public.seller_analytics_viewer_timeline(uuid, text, int) from public, anon;
grant execute on function public.seller_analytics_overview(uuid, timestamptz, timestamptz, jsonb, text, text) to authenticated;
grant execute on function public.seller_analytics_breakdown(uuid, timestamptz, timestamptz, jsonb, text, int, text) to authenticated;
grant execute on function public.seller_analytics_viewers(uuid, timestamptz, timestamptz, jsonb, int, int) to authenticated;
grant execute on function public.seller_analytics_car_viewers(uuid, uuid, timestamptz, timestamptz, jsonb, int) to authenticated;
grant execute on function public.seller_analytics_viewer_timeline(uuid, text, int) to authenticated;

-- ---------- 7. 回填用:每个用户最近一条带 IP 的登录会话(仅 service role) ----------
-- auth.sessions.refreshed_at 是不带时区的 UTC 时间,按 UTC 转换后再比较。
create or replace function public.analytics_user_session_ips()
returns table (user_id uuid, ip text, seen_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct on (s.user_id)
    s.user_id,
    host(s.ip),
    coalesce(s.refreshed_at at time zone 'UTC', s.updated_at, s.created_at)
  from auth.sessions s
  where s.ip is not null
  order by s.user_id, coalesce(s.refreshed_at at time zone 'UTC', s.updated_at, s.created_at) desc nulls last
$$;

revoke execute on function public.analytics_user_session_ips() from public, anon, authenticated;
grant execute on function public.analytics_user_session_ips() to service_role;

-- ---------- 8. 保留期:每天 04:17(UTC)删除 180 天前的事件 ----------
-- 同名 schedule 会覆盖,天然幂等;未装 pg_cron 时只提示不报错。user_ip_geo 不清理。
do $$
begin
  perform cron.schedule(
    'analytics-retention',
    '17 4 * * *',
    $job$delete from public.analytics_events where created_at < now() - interval '180 days'$job$
  );
exception when others then
  raise notice '跳过 pg_cron 定时清理: %', sqlerrm;
end $$;

-- 让 PostgREST 立即看到新函数
notify pgrst, 'reload schema';

-- ---------- 示例(在 SQL Editor 里手动排查) ----------
-- 某辆车最近 30 天的浏览记录:
--   select e.created_at, e.visitor_id, p.username, e.country, e.region, e.city, e.device, e.referrer_host
--   from public.analytics_events e
--   left join public.profiles p on p.id = e.user_id
--   where e.car_id = '<car uuid>' and e.type = 'car_view' and e.created_at > now() - interval '30 days'
--   order by e.created_at desc;
-- 今天(UTC)各来源的访客数:
--   select coalesce(referrer_host, '(直接访问)') as source, count(distinct visitor_id) as visitors
--   from public.analytics_events
--   where created_at >= date_trunc('day', now())
--   group by 1 order by 2 desc;
-- 某用户的 IP 地区:select * from public.user_ip_geo where user_id = '<user uuid>';

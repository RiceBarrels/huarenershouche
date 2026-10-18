-- /browse 服务端分页:筛选 + 排序 + 分页都在数据库做,前端只拿「总数 + 一页」,
-- 滑到底再要下一页。逻辑与 lib/car-filters.ts 的 applyCarFilters / sortCars 一一对应,
-- 改筛选规则时两边一起改(地图找车 /browse/map 仍走前端那套)。
-- 在 Supabase SQL Editor 执行;可重复执行。
--
-- 依赖前端词库/全量比价、SQL 里不好算的三样,由 /api/sync 每小时预算好写进
-- car_browse_meta(lib/browse-meta.ts):
--   body_style     车身类型(lib/body-style.ts 车型映射)
--   search_pinyin  中文字段的全拼 + 首字母(拼音搜索,如 kaimeirui / kmr)
--   deal           好价评级(lib/price-insight.ts,与同类车源比价)
-- 新发布的车源在下一次计算前没有这三项:车身类型/好价筛选暂不命中、拼音搜不到。
--
-- 「仅清白产权」筛选读 cars.title_status(supabase/title-status.sql 负责列 + CHECK)。
-- 函数体在创建时就要校验列存在,这里先 add column if not exists 兜底,两个文件谁先执行都行。
--
-- 价格 / 里程筛选与排序、月供预算按折合美元 / 英里比较(cars.currency / cars.mileage_unit,
-- supabase/car-currency.sql 负责 CHECK;同样先 add column 兜底,定义与该文件一致)。
-- 换算见 browse_price_usd / browse_mileage_mi,常量与 lib/currency.ts 的 CAD_PER_USD / KM_PER_MI 一致。
--
-- 「可贷款(无信用/ITIN)」筛选读 dealer_stores.financing(supabase/dealer-financing.sql 负责 CHECK + 索引;
-- 同样先 add column 兜底,定义与该文件一致):卖家名下任一门店含「支持ITIN贷款」或「无信用记录可贷」即命中,
-- 标签与 lib/dealer-financing.ts 的 LOAN_FILTER_TAGS 一致。

alter table public.cars add column if not exists title_status text;
alter table public.cars add column if not exists currency text not null default 'USD';
alter table public.cars add column if not exists mileage_unit text not null default 'mi';
alter table public.dealer_stores add column if not exists financing text[] not null default '{}';

create table if not exists public.car_browse_meta (
  car_id uuid primary key references public.cars(id) on delete cascade,
  body_style text,
  search_pinyin text,
  -- { level: great|good|fair|high, delta, marketAvg, sampleSize, sameModel }
  -- 比价时同类车源先折合美元 / 英里(不拿加元和美元直接比);delta / marketAvg 存的是该车自己的币种
  deal jsonb,
  updated_at timestamptz not null default now()
);

alter table public.car_browse_meta enable row level security;
drop policy if exists "car_browse_meta_read" on public.car_browse_meta;
create policy "car_browse_meta_read" on public.car_browse_meta
  for select to anon, authenticated using (true);

-- 安全的数字解析:非数字(用户手改 URL)按「没填」处理,与前端 Number() 得 NaN 时不过滤一致
create or replace function public.browse_num(v text)
returns numeric
language sql
immutable
as $$
  select case when v ~ '^\s*\d+(\.\d+)?\s*$' then btrim(v)::numeric end
$$;

-- 车价折合美元:加元按固定近似汇率 1 USD = 1.38 CAD(lib/currency.ts CAD_PER_USD,改了两边一起改)
create or replace function public.browse_price_usd(p_price numeric, p_currency text)
returns numeric
language sql
immutable
as $$
  select case when p_currency = 'CAD' then p_price / 1.38 else p_price end
$$;

-- 里程折合英里:1 mi = 1.609344 km(lib/currency.ts KM_PER_MI)
create or replace function public.browse_mileage_mi(p_mileage numeric, p_unit text)
returns numeric
language sql
immutable
as $$
  select case when p_unit = 'km' then p_mileage / 1.609344 else p_mileage end
$$;

-- 逗号分隔的多选值 → 数组(空串 → null,表示不过滤)
create or replace function public.browse_list(v text)
returns text[]
language sql
immutable
as $$
  select case when coalesce(v, '') = '' then null else string_to_array(v, ',') end
$$;

-- 命中筛选的车源 id + 距离(英里,无用户坐标或车无经纬度时为 null)。
-- p 的结构见 lib/browse-cars.ts 的 BrowseQuery。
-- use_location:是否应用「城市名」位置筛选;use_distance:是否应用最大距离
create or replace function public.browse_filtered(p jsonb, use_location boolean, use_distance boolean)
returns table (id uuid, dist double precision)
language sql
stable
set search_path = public
as $$
  with params as (
    select
      p->'filters' as f,
      (p->>'lat')::double precision as ulat,
      (p->>'lng')::double precision as ulng
  ),
  scored as (
    select
      c.*,
      pr.account_type,
      m.body_style,
      m.search_pinyin,
      m.deal,
      -- 价格 / 里程筛选的统一口径(美元 / 英里),与 lib/car-filters.ts 的 carPriceUsd / carMileageMi 一致
      browse_price_usd(c.price, c.currency) as price_usd,
      browse_mileage_mi(c.mileage, c.mileage_unit) as mileage_mi,
      case
        when params.ulat is not null and params.ulng is not null
             and coalesce(c.lat, 0) <> 0 and coalesce(c.lng, 0) <> 0
        then 3958.8 * 2 * asin(sqrt(
               power(sin(radians(c.lat - params.ulat) / 2), 2)
               + cos(radians(params.ulat)) * cos(radians(c.lat))
                 * power(sin(radians(c.lng - params.ulng) / 2), 2)))
      end as dist,
      params.f
    from public.cars c
    cross join params
    left join public.profiles pr on pr.id = c.seller_id
    left join public.car_browse_meta m on m.car_id = c.id
    where c.status = 'active' and not c.owner_hidden
  )
  select s.id, s.dist
  from scored s
  where
    -- 关键词:每个词都要在某个字段里出现(与 carMatchesKeyword 同一组字段);
    -- 中文品牌名由前端换成 makes,纯字母词另查拼音
    not exists (
      select 1 from jsonb_array_elements(coalesce(p->'tokens', '[]'::jsonb)) tk
      where not (
        strpos(lower(concat_ws(' ',
          s.title, s.title_zh, s.make, s.model, s.trim, s.year::text,
          s.description_original, s.description, s.description_zh, array_to_string(s.features, ' '),
          s.fuel_type, s.transmission, s.drivetrain, s.exterior_color, s.interior_color,
          s.location, s.location_zh, s.seller_name, s.vin)), tk->>'t') > 0
        or s.make in (select jsonb_array_elements_text(coalesce(tk->'makes', '[]'::jsonb)))
        or ((tk->>'t') ~ '^[a-z]+$' and strpos(coalesce(s.search_pinyin, ''), tk->>'t') > 0)
      )
    )
    and (browse_list(s.f->>'make') is null or s.make = any(browse_list(s.f->>'make')))
    and (
      browse_list(s.f->>'model') is null
      or lower(btrim(s.model)) in (
        select lower(btrim(x)) from unnest(browse_list(s.f->>'model')) x where btrim(x) <> ''
      )
      or not exists (select 1 from unnest(browse_list(s.f->>'model')) x where btrim(x) <> '')
    )
    -- 价格区间是美元:加元车源折合美元后比较
    and (browse_num(s.f->>'minPrice') is null or s.price_usd >= browse_num(s.f->>'minPrice'))
    and (browse_num(s.f->>'maxPrice') is null or s.price_usd <= browse_num(s.f->>'maxPrice'))
    and (browse_num(s.f->>'minYear') is null or s.year >= browse_num(s.f->>'minYear'))
    and (browse_num(s.f->>'maxYear') is null or s.year <= browse_num(s.f->>'maxYear'))
    and (coalesce(s.f->>'sellerType', '') = '' or s.account_type = s.f->>'sellerType')
    and (browse_list(s.f->>'fuelType') is null or s.fuel_type = any(browse_list(s.f->>'fuelType')))
    and (browse_list(s.f->>'transmission') is null or s.transmission = any(browse_list(s.f->>'transmission')))
    and (browse_list(s.f->>'drivetrain') is null or s.drivetrain = any(browse_list(s.f->>'drivetrain')))
    -- 里程上限是英里:公里车源折合英里后比较
    and (browse_num(s.f->>'maxMileage') is null or s.mileage_mi <= browse_num(s.f->>'maxMileage'))
    and (browse_list(s.f->>'exteriorColor') is null
         or exists (select 1 from unnest(browse_list(s.f->>'exteriorColor')) col where strpos(s.exterior_color, col) > 0))
    and (browse_list(s.f->>'interiorColor') is null
         or exists (select 1 from unnest(browse_list(s.f->>'interiorColor')) col where strpos(s.interior_color, col) > 0))
    and (browse_list(s.f->>'bodyStyle') is null or s.body_style = any(browse_list(s.f->>'bodyStyle')))
    -- 月供预算:前端把月供换算成价格上限(美元)传入;电议(price<=0)无法估算,排除
    and ((p->>'paymentPriceCap') is null
         or (s.price > 0 and s.price_usd <= (p->>'paymentPriceCap')::numeric))
    and (coalesce(s.f->>'dealRating', '') = ''
         or (s.f->>'dealRating' = 'great' and s.deal->>'level' = 'great')
         or (s.f->>'dealRating' = 'good' and s.deal->>'level' in ('great', 'good')))
    and (coalesce(s.f->>'priceDropped', '') <> 'true'
         or (s.original_price is not null and s.original_price > s.price))
    and (browse_num(s.f->>'listedWithin') is null
         or s.created_at >= now() - browse_num(s.f->>'listedWithin') * interval '1 day')
    -- 配置:AND 语义,需包含全部所选
    and (browse_list(s.f->>'features') is null
         or not exists (
           select 1 from unnest(browse_list(s.f->>'features')) x
           where btrim(x) <> ''
             and not exists (select 1 from unnest(coalesce(s.features, '{}')) f where lower(btrim(f)) = lower(btrim(x)))))
    and (coalesce(s.f->>'noAccident', '') <> 'true' or strpos(s.carfax_summary, '无事故') > 0)
    and (coalesce(s.f->>'oneOwner', '') <> 'true' or s.carfax_summary ~ '(^|\D)1 任车主')
    and (coalesce(s.f->>'hasCarfax', '') <> 'true' or coalesce(s.carfax_url, '') <> '')
    -- 产权:只认明确的清白产权,未填(null)不命中
    and (coalesce(s.f->>'cleanTitle', '') <> 'true' or s.title_status = '清白产权')
    -- 可贷款(无信用/ITIN):卖家名下任一门店带这两个标签之一(同 lib/car-filters.ts 的 LOAN_FILTER_TAGS)
    and (coalesce(s.f->>'financing', '') <> 'true' or exists (
          select 1 from public.dealer_stores ds
          where ds.owner_id = s.seller_id
            and ds.financing && array['支持ITIN贷款', '无信用记录可贷']::text[]))
    and (coalesce(s.f->>'hasVideo', '') <> 'true' or exists (
          select 1 from unnest(coalesce(s.images, '{}') || s.image_url) u
          where u ~* '\.(mp4|mov|webm|avi|mkv)(\?|$)'))
    and (coalesce(s.f->>'hasPrice', '') <> 'true' or s.price > 0)
    -- 位置:5 位 zip 不硬过滤(交给距离);城市名做子串匹配
    and (not use_location
         or coalesce(s.f->>'location', '') = ''
         or s.f->>'location' ~ '^\d{5}$'
         or strpos(lower(coalesce(s.location, '')), lower(s.f->>'location')) > 0
         or strpos(coalesce(s.location_zh, ''), s.f->>'location') > 0)
    -- 最大距离:有用户坐标才生效
    and (not use_distance
         or (p->>'lat') is null
         or coalesce(browse_num(s.f->>'maxDistance'), 0) <= 0
         or (s.dist is not null and s.dist <= browse_num(s.f->>'maxDistance')))
$$;

-- 一页车源:{ total, forcedDistanceSort, financingApplied, items: [车源(不含整组图片/描述) + profiles + distance + deal] }
create or replace function public.browse_cars(p jsonb)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  v_sort text := coalesce(p->>'sort', 'newest');
  v_offset int := greatest(coalesce((p->>'offset')::int, 0), 0);
  v_limit int := least(greatest(coalesce((p->>'limit')::int, 24), 1), 100);
  v_langs text[] := array(select jsonb_array_elements_text(coalesce(p->'langs', '[]'::jsonb)));
  v_empty_langs_match boolean := coalesce((p->>'emptyLangsMatch')::boolean, false);
  v_loc text := coalesce(p->'filters'->>'location', '');
  v_use_location boolean := v_loc <> '' and v_loc !~ '^\d{5}$';
  v_forced boolean := false;
  v_total bigint;
  v_items jsonb;
begin
  if v_sort not in ('price-asc', 'price-desc', 'mileage', 'year', 'distance') then
    v_sort := 'newest';
  end if;

  -- 城市名筛不出车时退回「不按城市」,有坐标则强制按距离排(同 applyCarFilters)
  if v_use_location and not exists (select 1 from browse_filtered(p, true, false)) then
    v_use_location := false;
    if (p->>'lat') is not null then
      v_forced := true;
      v_sort := 'distance';
    end if;
  end if;

  select count(*) into v_total from browse_filtered(p, v_use_location, true);

  with page as (
    select c, fl.dist, pr, m.deal,
      row_number() over (
        order by
          -- 价格 / 里程排序按折合美元 / 英里(混着加元 / 公里车源时才有可比性)
          case when v_sort = 'price-asc' then browse_price_usd(c.price, c.currency) end asc,
          case when v_sort = 'price-desc' then browse_price_usd(c.price, c.currency) end desc,
          case when v_sort = 'mileage' then browse_mileage_mi(c.mileage, c.mileage_unit) end asc,
          case when v_sort = 'year' then c.year end desc,
          case when v_sort = 'distance' then fl.dist end asc nulls last,
          -- 默认:卖家会说当前界面语言的优先,再个人/车行直发先于转载,最后按最新
          case when v_sort = 'newest' then
            case when coalesce(cardinality(pr.languages), 0) = 0 then v_empty_langs_match
                 else pr.languages && v_langs end
          end desc,
          case when v_sort = 'newest' then c.source_id is null end desc,
          c.created_at desc,
          c.id desc
      ) as ord
    from browse_filtered(p, v_use_location, true) fl
    join public.cars c on c.id = fl.id
    left join public.profiles pr on pr.id = c.seller_id
    left join public.car_browse_meta m on m.car_id = c.id
  )
  select coalesce(jsonb_agg(
           (to_jsonb(page.c) - 'images' - 'source_images' - 'description' - 'description_zh'
              - 'description_original' - 'features_original' - 'other_i18n' - 'removal_reason' - 'original_uncertain'
              - 'source_url' - 'source_listing_id' - 'api_key_id' - 'external_id' - 'last_seen_at')
           || jsonb_build_object(
                'profiles', case when page.pr is null then null else jsonb_build_object(
                  'account_type', (page.pr).account_type,
                  'avatar_url', (page.pr).avatar_url,
                  'languages', (page.pr).languages) end,
                'distance', page.dist,
                'deal', page.deal)
           order by page.ord), '[]'::jsonb)
    into v_items
  from page
  where page.ord > v_offset and page.ord <= v_offset + v_limit;

  -- financingApplied:告诉前端本版已按 financing 筛选(旧版没有这个键,前端才做兜底过滤,见 lib/browse-cars.ts)
  return jsonb_build_object('total', v_total, 'forcedDistanceSort', v_forced, 'items', v_items,
                            'financingApplied', true);
end;
$$;

-- 筛选面板的选项统计(基于全部在售车源,不随其他筛选变化):
-- models:选中单一品牌时该品牌下各车型及数量;
-- features:出现最多的 12 个配置,按 i18n 词表(supabase/i18n-v2.sql)归并语言孪生词,label 为 p_locale 文案。
-- name 仍是筛选值:已归并词条用英文标签(enforce 模式下必然在 cars.features 投影里),未归并的用原始标签。
-- 观察模式(i18n.settings.enforce = false)还没有投影:沿用 v2 之前的分组,只统计筛选所读的 cars.features
-- (不区分大小写归并,name / label 都是原始写法),计数与按 name 筛出的车数一致。
-- SECURITY DEFINER:要读私有 schema i18n(anon 无权限)。
drop function if exists public.browse_facets(text);
create or replace function public.browse_facets(p_make text, p_locale text default 'zh')
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'models', coalesce((
      select jsonb_agg(jsonb_build_object('name', name, 'count', n) order by n desc, newest desc)
      from (
        select (array_agg(btrim(c.model) order by c.created_at desc))[1] as name,
               count(*) as n, max(c.created_at) as newest
        from public.cars c
        where c.status = 'active' and not c.owner_hidden
          and p_make is not null and c.make = p_make and btrim(coalesce(c.model, '')) <> ''
        group by lower(btrim(c.model))
      ) mm
    ), '[]'::jsonb),
    'features', coalesce((
      select jsonb_agg(jsonb_build_object('name', name, 'label', label, 'count', n) order by n desc, newest desc)
      from (
        (select coalesce(max(tm.labels ->> 'en'), (array_agg(btrim(tag) order by c.created_at desc))[1]) as name,
                coalesce(max(tm.labels ->> p_locale), max(tm.labels ->> 'en'),
                         (array_agg(btrim(tag) order by c.created_at desc))[1]) as label,
                count(distinct c.id) as n, max(c.created_at) as newest
         from public.cars c
         cross join lateral unnest(coalesce(nullif(c.features_original, '{}'), c.features)) as tag
         left join i18n.term_aliases a on a.kind = 'feature' and a.alias_norm = i18n.norm_tag(tag) and a.state = 'ok'
         left join i18n.terms t0 on t0.id = a.term_id
         left join i18n.terms tm on tm.id = coalesce(t0.merged_into, t0.id)
         where i18n.setting_bool('enforce') and c.status = 'active' and not c.owner_hidden and btrim(tag) <> ''
         group by coalesce('t:' || tm.slug, 'r:' || lower(btrim(tag)))
         order by n desc, newest desc
         limit 12)
        union all
        (select (array_agg(btrim(tag) order by c.created_at desc))[1] as name,
                (array_agg(btrim(tag) order by c.created_at desc))[1] as label,
                count(distinct c.id) as n, max(c.created_at) as newest
         from public.cars c
         cross join lateral unnest(coalesce(c.features, '{}')) as tag
         where not i18n.setting_bool('enforce') and c.status = 'active' and not c.owner_hidden and btrim(tag) <> ''
         group by lower(btrim(tag))
         order by n desc, newest desc
         limit 12)
      ) ff
    ), '[]'::jsonb)
  )
$$;

grant execute on function public.browse_num(text) to anon, authenticated;
grant execute on function public.browse_list(text) to anon, authenticated;
grant execute on function public.browse_price_usd(numeric, text) to anon, authenticated;
grant execute on function public.browse_mileage_mi(numeric, text) to anon, authenticated;
grant execute on function public.browse_filtered(jsonb, boolean, boolean) to anon, authenticated;
grant execute on function public.browse_cars(jsonb) to anon, authenticated;
grant execute on function public.browse_facets(text, text) to anon, authenticated;

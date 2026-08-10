-- 开屏广告配置表(手动在 Supabase SQL Editor 执行)
-- 前端:components/splash-ad.tsx 拉取 active 且在投放期内的广告,
-- 按 weight 加权随机选一条缓存到本地,下次冷启动瞬时展示。

create table if not exists public.splash_ads (
  id uuid primary key default gen_random_uuid(),
  title text,                                -- 备注/无障碍文本
  image_url text not null,                   -- 全屏竖图(建议 1170x2532 或同比例)
  link_url text,                             -- 点击跳转:站内以 / 开头,站外完整 URL;可空
  duration_seconds int not null default 5,   -- 展示秒数(倒计时)
  weight int not null default 1,             -- 多条同时投放时的加权随机权重
  active boolean not null default true,
  starts_at timestamptz,                     -- 投放开始(空 = 不限)
  ends_at timestamptz,                       -- 投放结束(空 = 不限)
  created_at timestamptz not null default now()
);

alter table public.splash_ads enable row level security;

-- 公开只读(仅 active);增删改走 service role / 后台
drop policy if exists "splash_ads_public_read" on public.splash_ads;
create policy "splash_ads_public_read"
  on public.splash_ads for select
  using (active);

-- 示例(执行时按需修改/删除):
-- insert into public.splash_ads (title, image_url, link_url, duration_seconds)
-- values ('新春优惠', 'https://xxx.supabase.co/storage/v1/object/public/ads/spring.jpg', '/browse?priceDropped=true', 5);

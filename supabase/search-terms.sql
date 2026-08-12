-- 全站搜索词统计(手动在 Supabase SQL Editor 执行)
-- 前端:社区搜索在 input 失焦 / 点击推荐词时调用 log_search_term 记一次;
-- 「猜你想搜」聚合最近 30 天全站搜索词按热度推荐(lib/search-suggestions.ts)。
-- 按天分桶便于做时间衰减;只存词频、不存 user_id,无隐私暴露。

create table if not exists public.community_search_terms (
  term text not null,
  day date not null default current_date,
  count int not null default 1,
  primary key (term, day),
  check (char_length(term) between 1 and 20)
);

-- 「最近 N 天」范围查询走这个索引(主键前缀是 term,扫不动日期范围)
create index if not exists community_search_terms_day_idx
  on public.community_search_terms (day desc);

alter table public.community_search_terms enable row level security;

-- 聚合词频公开可读(纯计数,无用户信息)
drop policy if exists "search_terms_public_read" on public.community_search_terms;
create policy "search_terms_public_read"
  on public.community_search_terms for select
  using (true);

-- 不开放直接 insert/update:写入只走下面的 security definer RPC,
-- 保证只能 +1 计数、不能伪造任意行

create or replace function public.log_search_term(p_term text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t text := btrim(p_term);
begin
  if t is null or char_length(t) < 1 or char_length(t) > 20 then
    return;
  end if;
  insert into public.community_search_terms as s (term, day, count)
  values (t, current_date, 1)
  on conflict (term, day)
  do update set count = s.count + 1;
end;
$$;

revoke all on function public.log_search_term(text) from public;
grant execute on function public.log_search_term(text) to anon, authenticated;

-- 种子词:上线初期没有真实搜索数据时「猜你想搜」的打底热度
-- (带梯度计数;真实搜索累积后会自然盖过种子)
insert into public.community_search_terms (term, day, count) values
  ('特斯拉', current_date, 30),
  ('新手买车', current_date, 26),
  ('二手车避坑', current_date, 24),
  ('保养', current_date, 20),
  ('验车', current_date, 18),
  ('Camry', current_date, 16),
  ('汉兰达', current_date, 14),
  ('事故车', current_date, 12),
  ('贷款', current_date, 10),
  ('保险', current_date, 9),
  ('油电混动', current_date, 8),
  ('留学生买车', current_date, 7)
on conflict (term, day) do nothing;

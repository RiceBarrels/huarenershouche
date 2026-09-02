-- 举报泛化(手动在 Supabase SQL Editor 执行)
-- App Store UGC 合规:reports 表原先只支持车辆(car_id),
-- 扩展 target_type / target_id 后可举报帖子、评论、用户。
-- 前端:components/report-dialog.tsx(车辆详情、帖子详情、评论行、用户主页)。
-- 车辆举报同时写 car_id(兼容 admin 页的 cars join)与 target_id。

alter table public.reports
  add column if not exists target_type text not null default 'car';

alter table public.reports
  add column if not exists target_id uuid;

-- 旧数据只有 car_id:补齐 target_id
update public.reports set target_id = car_id where target_id is null;

-- 非车辆举报没有 car_id
alter table public.reports alter column car_id drop not null;

alter table public.reports drop constraint if exists reports_target_type_check;
alter table public.reports add constraint reports_target_type_check
  check (target_type in ('car', 'post', 'post_comment', 'car_comment', 'user'));

-- admin 页按类型筛选未处理举报
create index if not exists reports_target_idx
  on public.reports (target_type, target_id);

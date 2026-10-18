-- ============================================================================
-- 常來車網 — 取消 Listing 30 天自动过期，车源永久保存
-- 撤销 admin-expiry.sql 第 1 / 5 节：停掉 pg_cron 定时下架、去掉 expires_at 默认值并清空。
-- 一次性运行（幂等，可重复执行）。expires_at 列保留（公开 API 仍返回该字段，恒为 null）。
-- ============================================================================

-- 停掉每 30 分钟把过期车源置为 removed 的定时任务
do $$
begin
  if exists (select 1 from cron.job where jobname = 'expire-old-listings') then
    perform cron.unschedule('expire-old-listings');
  end if;
exception when others then
  raise notice '跳过 pg_cron 清理: %', sqlerrm;
end $$;

-- 新发布的车源不再带过期时间
alter table public.cars alter column expires_at drop default;

-- 存量车源清空过期时间（前台不再显示「N 天后过期 / 已过期」）
update public.cars set expires_at = null where expires_at is not null;

drop index if exists public.cars_expires_at_idx;

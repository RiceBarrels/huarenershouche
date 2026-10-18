-- =============================================================
-- 车行贷款 / 付款方式标签:dealer_stores.financing
-- 在 Supabase SQL Editor 中手动执行(与其他 .sql 同方式),可重复执行。
--
-- dealer_stores.financing text[] not null default '{}',取值 ⊆ lib/dealer-financing.ts 的 FINANCING_TAGS:
--   支持ITIN贷款    没有 SSN 也可用 ITIN 申请车贷(ITIN 是美国报税号,仅美国车行适用)
--   无信用记录可贷  没有本地信用记录也可申请车贷(美国 / 加拿大通用,不写死国家)
--   自营分期        车行自己提供分期付款(Buy Here Pay Here)
--   接受现金        可用现金付款
--   和 fuel_type 等枚举一样存中文,前端 t() 渲染。车行在「设置 · 门店与车行认证」里自己勾选,
--   沿用门店表现有的 RLS(公开可读;owner / 认领人 can_act_as 可改),不新增策略。
-- 详情页卖家卡片展示卖家名下门店标签的并集,下方固定提示「具体条件以车行为准，本站不提供贷款」。
-- /browse「可贷款(无信用/ITIN)」筛选(browse-cars.sql 的 browse_filtered 与 lib/car-filters.ts 两份同步):
--   卖家名下任一门店的 financing 含「支持ITIN贷款」或「无信用记录可贷」即命中。
-- 执行顺序:本文件在 browse-cars.sql 之前或之后都可以(browse-cars.sql 自带 add column if not exists,
--   本文件负责 CHECK 与索引)。代码先于本文件上线:列不存在时详情页不显示标签、门店设置页不显示勾选区,
--   该筛选在服务端 RPC 未升级前由前端兜底(一辆也不命中)。
-- =============================================================

-- ---------- 1. 列 ----------
-- 常量默认值:PG 11+ 加列只改元数据,不重写全表
ALTER TABLE public.dealer_stores
  ADD COLUMN IF NOT EXISTS financing text[] NOT NULL DEFAULT '{}';

-- browse-cars.sql 先执行时列已按同样的定义建好;这里再补一次默认值 / 非空,两边谁先执行结果都一样
ALTER TABLE public.dealer_stores ALTER COLUMN financing SET DEFAULT '{}';
UPDATE public.dealer_stores SET financing = '{}' WHERE financing IS NULL;
ALTER TABLE public.dealer_stores ALTER COLUMN financing SET NOT NULL;

-- ---------- 2. CHECK:只收 4 个中文枚举值(数组里有 null 时 <@ 不成立,一并拒绝) ----------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'dealer_stores_financing_check' AND conrelid = 'public.dealer_stores'::regclass
  ) THEN
    -- NOT VALID:加约束时不扫全表(下面再补一次校验)
    ALTER TABLE public.dealer_stores
      ADD CONSTRAINT dealer_stores_financing_check
      CHECK (financing <@ ARRAY['支持ITIN贷款', '无信用记录可贷', '自营分期', '接受现金']::text[]) NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'dealer_stores_financing_check' AND conrelid = 'public.dealer_stores'::regclass
      AND NOT convalidated
  ) THEN
    ALTER TABLE public.dealer_stores VALIDATE CONSTRAINT dealer_stores_financing_check;
  END IF;
END $$;

COMMENT ON COLUMN public.dealer_stores.financing IS
  '贷款 / 付款方式标签:支持ITIN贷款 / 无信用记录可贷 / 自营分期 / 接受现金;车行自填,本站不提供贷款';

-- ---------- 3. 索引:筛选 / 前端兜底都按 financing && 标签数组 找门店(GIN 支持 && 运算) ----------
CREATE INDEX IF NOT EXISTS dealer_stores_financing_idx
  ON public.dealer_stores USING gin (financing);

-- 让 PostgREST 立即识别新列(否则写入可能报 PGRST204,直到 schema cache 自动刷新)
NOTIFY pgrst, 'reload schema';

-- ---------- 示例 ----------
-- 设置过标签的门店:
--   select name, owner_id, financing from public.dealer_stores where financing <> '{}';

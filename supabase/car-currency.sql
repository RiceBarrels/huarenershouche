-- =============================================================
-- 加拿大车源:币种(USD / CAD)+ 里程单位(mi / km)
-- 在 Supabase SQL Editor 中手动执行(与其他 .sql 同方式),可重复执行。
--
-- cars.currency      text not null default 'USD',ISO 4217 三位代码(价格 price / original_price 的币种);库里只校验格式,当前支持 USD / CAD,支持列表在 lib/currency.ts
-- cars.mileage_unit  text not null default 'mi',取值 mi / km(mileage 的单位)
--   既有车源一律按默认值(美元 + 英里),不改数据。取值与 lib/currency.ts 的 CURRENCIES / MILEAGE_UNITS 保持一致。
-- 库里存车源自己的原值,不做换算;需要跨币种比较的地方(比价池 lib/price-insight.ts、
--   /browse 价格 / 里程筛选与排序 browse-cars.sql 的 browse_price_usd / browse_mileage_mi)统一折成美元 / 英里,
--   换算常量 CAD_PER_USD / KM_PER_MI 见 lib/currency.ts(固定近似值,不是实时汇率)。
-- 不敏感:进公开列集(PUBLIC_CAR_COLUMNS / 卡片列)与 SSR 载荷;JSON-LD 的 priceCurrency / mileageFromOdometer.unitCode 用它。
-- 执行顺序:本文件在 browse-cars.sql 之前或之后都可以(browse-cars.sql 自带 add column if not exists,
--   本文件负责 CHECK)。代码先于本文件上线:列不存在时一律按 USD / mi 显示,查询按缺列错误退回不带这两列的列集,
--   发布 / 编辑 / API v1 写入去掉这两列重试(加元 / 公里车源在 SQL 执行前会按美元 / 英里存)。
-- =============================================================

-- ---------- 1. 列 ----------
-- 常量默认值:PG 11+ 加列只改元数据,不重写全表
ALTER TABLE public.cars
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD';
ALTER TABLE public.cars
  ADD COLUMN IF NOT EXISTS mileage_unit text NOT NULL DEFAULT 'mi';

-- browse-cars.sql 先执行时列已按同样的定义建好;这里再补一次默认值 / 非空,两边谁先执行结果都一样
ALTER TABLE public.cars ALTER COLUMN currency SET DEFAULT 'USD';
ALTER TABLE public.cars ALTER COLUMN mileage_unit SET DEFAULT 'mi';
UPDATE public.cars SET currency = 'USD' WHERE currency IS NULL;
UPDATE public.cars SET mileage_unit = 'mi' WHERE mileage_unit IS NULL;
ALTER TABLE public.cars ALTER COLUMN currency SET NOT NULL;
ALTER TABLE public.cars ALTER COLUMN mileage_unit SET NOT NULL;

-- ---------- 2. CHECK ----------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cars_currency_check' AND conrelid = 'public.cars'::regclass
  ) THEN
    -- NOT VALID:加约束时不扫全表(下面再补一次校验)。
    -- 库里只校验 ISO 4217 三位大写代码,具体支持哪些币种由写入端按 lib/currency.ts 的 CURRENCIES 校验
    -- (发布 / 编辑 / API v1),新增市场的币种不必再改这里的约束。
    ALTER TABLE public.cars
      ADD CONSTRAINT cars_currency_check CHECK (currency ~ '^[A-Z]{3}$') NOT VALID;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cars_mileage_unit_check' AND conrelid = 'public.cars'::regclass
  ) THEN
    ALTER TABLE public.cars
      ADD CONSTRAINT cars_mileage_unit_check CHECK (mileage_unit IN ('mi', 'km')) NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cars_currency_check' AND conrelid = 'public.cars'::regclass AND NOT convalidated
  ) THEN
    ALTER TABLE public.cars VALIDATE CONSTRAINT cars_currency_check;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cars_mileage_unit_check' AND conrelid = 'public.cars'::regclass AND NOT convalidated
  ) THEN
    ALTER TABLE public.cars VALIDATE CONSTRAINT cars_mileage_unit_check;
  END IF;
END $$;

COMMENT ON COLUMN public.cars.currency IS
  '价格币种:USD / CAD(price、original_price 都按此币种);跨币种比较时按 lib/currency.ts 的固定近似汇率折成美元';
COMMENT ON COLUMN public.cars.mileage_unit IS
  '里程单位:mi / km;跨单位比较时折成英里(1 mi = 1.609344 km)';

-- 让 PostgREST 立即识别新列(否则写入可能报 PGRST204,直到 schema cache 自动刷新)
NOTIFY pgrst, 'reload schema';

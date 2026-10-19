-- =============================================================
-- 车辆产权状态(title status):清白产权 / 重建产权 / 残值产权 / 柠檬回购(美 / 加);
--   无欠款(PPSR 已查) / 曾报废(written-off)(澳 / 新)
-- 在 Supabase SQL Editor 中手动执行(与其他 .sql 同方式),可重复执行。
--
-- cars.title_status text,可空:null = 卖家没填 / 转载源没有明确写(不猜)。
--   取值与 lib/title-status.ts 的 TITLE_STATUSES 保持一致(和 fuel_type 等枚举一样存中文,前端 t() 渲染;
--   Public API 对外是 clean / rebuilt / salvage / lemon_buyback / ppsr_clear / written_off,见 lib/api/enums.ts)。
--   清白产权  Clean          没有品牌标记
--   重建产权  Rebuilt        曾被保险公司判定全损,修复并重新检验后上路
--   残值产权  Salvage        保险公司判定全损,修复检验前通常不能上牌上路
--   柠檬回购  Lemon buyback  厂家按柠檬法回购后再出售
--   澳大利亚 / 新西兰没有美式产权品牌,另用两项(发布 / 编辑页按车所在国家只列出对应那一套;库里没有国家列,
--   国家由坐标 / location 读时推断,见 lib/postal.ts —— 所以这里的 CHECK 不按国家区分,六个值都允许):
--   无欠款(PPSR 已查)    PPSR clear   卖家已在官方 PPSR 查过,没有未结清的贷款 / 融资担保
--   曾报废(written-off)  Written-off  曾被保险公司判定报废
-- 不敏感:进公开列集(PUBLIC_CAR_COLUMNS)与 SSR 载荷;JSON-LD 不输出。
-- /browse「仅清白产权」筛选(browse-cars.sql 的 browse_filtered 与 lib/car-filters.ts 两份同步):
--   只命中 title_status in ('清白产权', '无欠款(PPSR 已查)'),null 不算。
-- 执行顺序:本文件在 browse-cars.sql 之前或之后都可以(browse-cars.sql 自带 add column if not exists,
--   本文件负责 CHECK)。代码先于本文件上线:列不存在时发布 / 编辑页隐藏产权选择,详情页不显示,
--   查询按缺列错误退回不带该列的列集;「仅清白产权」筛选在服务端 RPC 未升级前不生效、地图找车上筛不出车。
-- =============================================================

-- ---------- 1. 列 ----------
ALTER TABLE public.cars
  ADD COLUMN IF NOT EXISTS title_status text;

-- ---------- 2. CHECK ----------
-- 早先版本的约束只有前四个值(不含澳新两项):定义里没有「曾报废」就删掉重建,已是新版则不动(可重复执行)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cars_title_status_check' AND conrelid = 'public.cars'::regclass
      AND pg_get_constraintdef(oid) NOT LIKE '%曾报废(written-off)%'
  ) THEN
    ALTER TABLE public.cars DROP CONSTRAINT cars_title_status_check;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cars_title_status_check' AND conrelid = 'public.cars'::regclass
  ) THEN
    -- NOT VALID:加约束时不扫全表(新列全是 null,下面再补一次校验)
    ALTER TABLE public.cars
      ADD CONSTRAINT cars_title_status_check
      CHECK (title_status IS NULL OR title_status IN (
        '清白产权', '重建产权', '残值产权', '柠檬回购',
        '无欠款(PPSR 已查)', '曾报废(written-off)'
      )) NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cars_title_status_check' AND conrelid = 'public.cars'::regclass AND NOT convalidated
  ) THEN
    ALTER TABLE public.cars VALIDATE CONSTRAINT cars_title_status_check;
  END IF;
END $$;

COMMENT ON COLUMN public.cars.title_status IS
  '产权状态:清白产权 / 重建产权 / 残值产权 / 柠檬回购(美 / 加);无欠款(PPSR 已查) / 曾报废(written-off)(澳 / 新);null = 未填(转载源无明确关键词时也为 null)';

-- 让 PostgREST 立即识别新列(否则写入可能报 PGRST204,直到 schema cache 自动刷新)
NOTIFY pgrst, 'reload schema';

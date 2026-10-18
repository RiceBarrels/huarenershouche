-- =============================================================
-- 结构化车况清单(cars.condition jsonb)
-- 在 Supabase SQL Editor 中手动执行(与其他 .sql 同方式),可重复执行。
--
-- cars.condition jsonb not null default '{}':没填的项不存键,{} = 整张清单没填(详情页不显示)。
--   service_records  boolean          有保养记录
--   one_owner        boolean          一手车
--   smoker           boolean          车内吸烟
--   keys_count       整数 0..5        钥匙数量
--   tires_condition  '新' / '良好' / '一般' / '需更换'
--   known_issues     数组,元素 ⊆ '发动机','变速箱','空调','电子系统','漏油','车身锈蚀','事故修复','悬挂'
--                    [] = 卖家明确表示「无已知问题」(和没填不同)
--   键与取值和 lib/car-condition.ts 保持一致(scripts/car-condition-selftest.ts 比对本文件);和 fuel_type 等枚举一样
--   存中文,前端 t() 渲染;Public API 对外是英文 slug(lib/api/enums.ts 的 tires_condition / known_issue)。
-- 没有自由文本(定案):自由文本会绕开翻译管线和 AI 审核(两者只覆盖 description_original),细节写在描述里。
-- 不敏感:进公开列集(PUBLIC_CAR_COLUMNS)与 SSR 载荷;JSON-LD 不输出。不进内容时钟(content_updated_at)。
-- 代码先于本文件上线:列不存在时发布 / 编辑页不显示清单,详情页不显示,查询按缺列错误退回不带该列的列集,
--   写入(发布 / 编辑 / API v1)去掉该列重试。
-- =============================================================

-- ---------- 1. 列 ----------
-- 常量默认值:PG 11+ 加列只改元数据,不重写全表
ALTER TABLE public.cars
  ADD COLUMN IF NOT EXISTS "condition" jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ---------- 2. CHECK ----------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cars_condition_check' AND conrelid = 'public.cars'::regclass
  ) THEN
    -- NOT VALID:加约束时不扫全表(新列全是 {},下面再补一次校验)
    ALTER TABLE public.cars
      ADD CONSTRAINT cars_condition_check CHECK (
        jsonb_typeof("condition") = 'object'
        -- 只允许这 6 个键
        AND ("condition" - ARRAY['service_records', 'one_owner', 'smoker', 'keys_count', 'tires_condition', 'known_issues'])
            = '{}'::jsonb
        AND (NOT "condition" ? 'service_records' OR jsonb_typeof("condition" -> 'service_records') = 'boolean')
        AND (NOT "condition" ? 'one_owner' OR jsonb_typeof("condition" -> 'one_owner') = 'boolean')
        AND (NOT "condition" ? 'smoker' OR jsonb_typeof("condition" -> 'smoker') = 'boolean')
        -- 整数 0..5(2.0 / "2" / 6 都不行)
        AND (NOT "condition" ? 'keys_count' OR (
          jsonb_typeof("condition" -> 'keys_count') = 'number'
          AND ("condition" ->> 'keys_count') ~ '^[0-5]$'
        ))
        AND (NOT "condition" ? 'tires_condition' OR (
          jsonb_typeof("condition" -> 'tires_condition') = 'string'
          AND ("condition" ->> 'tires_condition') IN ('新', '良好', '一般', '需更换')
        ))
        -- 字符串数组,元素都在固定清单里(<@ 包含判断;非字符串元素不会被包含),长度不超过清单长度
        AND (NOT "condition" ? 'known_issues' OR (
          jsonb_typeof("condition" -> 'known_issues') = 'array'
          AND jsonb_array_length("condition" -> 'known_issues') <= 8
          AND ("condition" -> 'known_issues')
              <@ '["发动机", "变速箱", "空调", "电子系统", "漏油", "车身锈蚀", "事故修复", "悬挂"]'::jsonb
        ))
      ) NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cars_condition_check' AND conrelid = 'public.cars'::regclass AND NOT convalidated
  ) THEN
    ALTER TABLE public.cars VALIDATE CONSTRAINT cars_condition_check;
  END IF;
END $$;

COMMENT ON COLUMN public.cars."condition" IS
  '车况清单:service_records / one_owner / smoker(bool)、keys_count(0..5)、tires_condition(新/良好/一般/需更换)、'
  'known_issues(固定清单多选,[] = 无已知问题);没填的项不存键,{} = 没填。无自由文本';

-- 让 PostgREST 立即识别新列(否则写入可能报 PGRST204,直到 schema cache 自动刷新)
NOTIFY pgrst, 'reload schema';

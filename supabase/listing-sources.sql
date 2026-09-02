-- =============================================================
-- 白名单车行网站自动转载（listing sources / syndication）
-- 在 Supabase SQL Editor 中手动执行（与 admin-expiry.sql 同方式）。
-- 依赖：admin-expiry.sql 中的 public.is_admin()。
-- 可重复执行（幂等）。
-- =============================================================

-- ---------- 1. profiles.is_system：标记系统账号 ----------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false;

-- ---------- 2. listing_sources：白名单数据源 ----------
CREATE TABLE IF NOT EXISTS public.listing_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,              -- 适配器标识，如 'ideal-bayside'
  name text NOT NULL,
  base_url text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  system_account_id uuid NOT NULL REFERENCES public.profiles(id),
  last_sync_at timestamptz,
  last_sync_status text,                 -- 'success' | 'partial' | 'error' | 'running'
  last_sync_detail jsonb,                -- { found, inserted, updated, delisted, errors[], duration_ms }
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.listing_sources ENABLE ROW LEVEL SECURITY;

-- 仅管理员可读写（同步引擎走 service role，天然绕过 RLS）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'listing_sources' AND policyname = 'admin_manage_listing_sources'
  ) THEN
    CREATE POLICY admin_manage_listing_sources ON public.listing_sources
      FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
END $$;

-- ---------- 3. cars 增加来源追踪字段 ----------
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS source_id uuid REFERENCES public.listing_sources(id);
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS source_listing_id text;
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS source_url text;
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

-- 同一数据源内 stock id 唯一（upsert 依据）
CREATE UNIQUE INDEX IF NOT EXISTS cars_source_listing_uniq
  ON public.cars (source_id, source_listing_id)
  WHERE source_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS cars_source_id_idx ON public.cars (source_id) WHERE source_id IS NOT NULL;

-- ---------- 4. 系统账号 + 数据源 + 门店（每个白名单站点一组） ----------
-- 字段: 序号 | key | 名称 | base_url | 电话 | 地址 | 邮编 | lat | lng | location | location_zh
DO $$
DECLARE
  rows text[] := ARRAY[
    '1|ideal-bayside|iDeal Auto Sales Bayside|https://idealautosalesbayside.com|(718) 313-9239|196-33 Northern Blvd, Flushing, NY 11358|11358|40.7615|-73.7864|Flushing, NY|纽约法拉盛',
    '2|ideal-bensonhurst|iDeal Auto Sales Bensonhurst|https://idealautosalesbensonhurst.com|(718) 888-8188|8635 18th Ave, Brooklyn, NY 11214|11214|40.6034|-73.9995|Brooklyn, NY|纽约布鲁克林',
    '3|ideal-statenisland|iDeal Auto Sales Staten Island|https://idealautosalesstatenisland.com|(718) 898-8618|2083 Hylan Blvd, Staten Island, NY 10306|10306|40.5797|-74.1012|Staten Island, NY|纽约史泰登岛',
    '4|ideal-nj|iDeal Auto Sales NJ|https://idealautosalesnj.com|(201) 991-0047|154 Belgrove Dr, Kearny, NJ 07032|07032|40.7676|-74.1454|Kearny, NJ|新泽西卡尼',
    '5|ideal-rosemead|iDeal Auto Sales Rosemead|https://idealautosalesrosemead.com|(626) 929-0008|9510 Valley Blvd, Rosemead, CA 91770|91770|34.0686|-118.0834|Rosemead, CA|洛杉矶罗斯米德',
    -- 6: DealerSync 模板站(westcoastauto.com/pre-owned-cars),适配器 lib/sources/dealersync.ts
    '6|westcoastauto|Westcoast Auto Sales|https://www.westcoastauto.com|(909) 900-0000|5180 Holt Blvd, Montclair, CA 91763|91763|34.0723|-117.6905|Montclair, CA|加州蒙特克莱尔'
  ];
  r text;
  f text[];
  sys_uid uuid;
BEGIN
  FOREACH r IN ARRAY rows LOOP
    f := string_to_array(r, '|');
    sys_uid := ('c0000000-0000-0000-0000-' || lpad(f[1], 12, '0'))::uuid;

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', sys_uid, 'authenticated', 'authenticated',
      'system.' || f[2] || '@clcauto.com',
      crypt(gen_random_uuid()::text, gen_salt('bf')),  -- 随机密码，无人登录
      now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('username', f[3]),
      now(), now(), '', '', '', ''
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.profiles (id, username, phone, location, account_type, is_system, avatar_url)
    VALUES (
      sys_uid, f[3], f[5], f[10], 'dealer', true,
      'https://api.dicebear.com/9.x/initials/svg?seed=' || f[2]
    )
    ON CONFLICT (id) DO UPDATE SET
      is_system = true,
      account_type = 'dealer',
      phone = EXCLUDED.phone;

    INSERT INTO public.listing_sources (id, key, name, base_url, enabled, system_account_id)
    VALUES (
      ('d0000000-0000-0000-0000-' || lpad(f[1], 12, '0'))::uuid,
      f[2], f[3], f[4], true, sys_uid
    ) ON CONFLICT (key) DO NOTHING;

    -- 车行门店（已认证，可上车行地图）。同步引擎会让车辆定位跟随此门店地址：
    -- 管理员改门店地址后，下次同步所有转载车辆的 location/坐标自动更新。
    INSERT INTO public.dealer_stores (
      id, owner_id, name, address, zipcode, lat, lng, phone,
      store_photos, verification_status, verification_reviewed_at
    ) VALUES (
      ('e0000000-0000-0000-0000-' || lpad(f[1], 12, '0'))::uuid,
      sys_uid, f[3], f[6], f[7], f[8]::numeric, f[9]::numeric, f[5],
      '{}', 'verified', now()
    ) ON CONFLICT (id) DO NOTHING;
  END LOOP;
END $$;

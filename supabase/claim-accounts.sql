-- =============================================================
-- 系统车行账号「认领 + 身份切换」
-- 管理员把一个系统账号(is_system=true)链接给一个真实用户,
-- 认领人即可切换成该车行身份:管理发布、发额外新车、编辑门店、收发私信。
-- 自动检索来的车源不可编辑/删除,只能「停用」(owner_hidden)。
--
-- 在 Supabase SQL Editor 中手动执行(与 admin-expiry.sql / listing-sources.sql 同方式)。
-- 依赖:admin-expiry.sql 中的 public.is_admin()。可重复执行(幂等)。
-- =============================================================

-- ---------- 1. profiles.claimed_by:标记「已被认领」+ 认领人 ----------
-- 仅对 is_system=true 的行有意义;非空即已被某真实用户认领。
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS claimed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS profiles_claimed_by_idx
  ON public.profiles (claimed_by) WHERE claimed_by IS NOT NULL;

-- ---------- 2. cars.owner_hidden:车行主人对「自动检索车源」的停用开关 ----------
-- 独立于 status:同步引擎从不读写此列,公开查询排除此列为 true 的行。
ALTER TABLE public.cars
  ADD COLUMN IF NOT EXISTS owner_hidden boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS cars_owner_hidden_idx
  ON public.cars (owner_hidden) WHERE owner_hidden = true;

-- ---------- 3. can_act_as():当前登录用户是否可以「以某账号身份」操作 ----------
-- 本人 或 该账号已被本人认领。SECURITY DEFINER 以读 claimed_by(避免 RLS 递归)。
CREATE OR REPLACE FUNCTION public.can_act_as(pid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pid = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = pid AND claimed_by = auth.uid()
    );
$$;

REVOKE EXECUTE ON FUNCTION public.can_act_as(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.can_act_as(uuid) TO authenticated;

-- ---------- 4. 新增 permissive RLS 策略(OR 叠加,不削弱现有 owner/admin 策略) ----------
-- 让认领人可以操作「被认领账号」名下的行。
DO $$
BEGIN
  -- cars:认领人可增删改查被认领账号名下的车
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='cars') THEN
    EXECUTE 'ALTER TABLE public.cars ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS claimant_manage_cars ON public.cars';
    EXECUTE 'CREATE POLICY claimant_manage_cars ON public.cars '
         || 'FOR ALL TO authenticated '
         || 'USING (public.can_act_as(seller_id)) '
         || 'WITH CHECK (public.can_act_as(seller_id))';
  END IF;

  -- conversations:认领人可读写「买家或卖家是被认领账号」的会话
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='conversations') THEN
    EXECUTE 'ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS claimant_manage_conversations ON public.conversations';
    EXECUTE 'CREATE POLICY claimant_manage_conversations ON public.conversations '
         || 'FOR ALL TO authenticated '
         || 'USING (public.can_act_as(seller_id) OR public.can_act_as(buyer_id)) '
         || 'WITH CHECK (public.can_act_as(seller_id) OR public.can_act_as(buyer_id))';
  END IF;

  -- dealer_stores:认领人可管理被认领账号的门店
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='dealer_stores') THEN
    EXECUTE 'ALTER TABLE public.dealer_stores ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS claimant_manage_dealer_stores ON public.dealer_stores';
    EXECUTE 'CREATE POLICY claimant_manage_dealer_stores ON public.dealer_stores '
         || 'FOR ALL TO authenticated '
         || 'USING (public.can_act_as(owner_id)) '
         || 'WITH CHECK (public.can_act_as(owner_id))';
  END IF;
END $$;

-- messages:分开处理(需引用所属会话的 buyer/seller)。
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='messages') THEN
    EXECUTE 'ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY';

    -- 读:所属会话的买家或卖家可被本人 act_as
    EXECUTE 'DROP POLICY IF EXISTS claimant_read_messages ON public.messages';
    EXECUTE 'CREATE POLICY claimant_read_messages ON public.messages '
         || 'FOR SELECT TO authenticated '
         || 'USING (EXISTS ( '
         || '  SELECT 1 FROM public.conversations c '
         || '  WHERE c.id = messages.conversation_id '
         || '    AND (public.can_act_as(c.buyer_id) OR public.can_act_as(c.seller_id)) '
         || '))';

    -- 发:sender 必须可被本人 act_as,且属于该会话的一方
    EXECUTE 'DROP POLICY IF EXISTS claimant_send_messages ON public.messages';
    EXECUTE 'CREATE POLICY claimant_send_messages ON public.messages '
         || 'FOR INSERT TO authenticated '
         || 'WITH CHECK ( '
         || '  public.can_act_as(sender_id) '
         || '  AND EXISTS ( '
         || '    SELECT 1 FROM public.conversations c '
         || '    WHERE c.id = messages.conversation_id '
         || '      AND (c.buyer_id = messages.sender_id OR c.seller_id = messages.sender_id) '
         || '  ) '
         || ')';

    -- 改(标记已读):所属会话的一方可被本人 act_as
    EXECUTE 'DROP POLICY IF EXISTS claimant_update_messages ON public.messages';
    EXECUTE 'CREATE POLICY claimant_update_messages ON public.messages '
         || 'FOR UPDATE TO authenticated '
         || 'USING (EXISTS ( '
         || '  SELECT 1 FROM public.conversations c '
         || '  WHERE c.id = messages.conversation_id '
         || '    AND (public.can_act_as(c.buyer_id) OR public.can_act_as(c.seller_id)) '
         || '))';
  END IF;
END $$;

-- ---------- 5. update_claimed_profile:认领人编辑被认领账号的安全列 ----------
-- 只允许改 username/avatar_url/phone/location/preferred_language/languages,
-- 绝不碰 is_system/role/claimed_by/banned。传 null 表示保持原值。
-- (languages 列由 seller-languages.sql 增加;两处定义保持一致)
DROP FUNCTION IF EXISTS public.update_claimed_profile(uuid, text, text, text, text, text);
CREATE OR REPLACE FUNCTION public.update_claimed_profile(
  target uuid,
  new_username text DEFAULT NULL,
  new_avatar_url text DEFAULT NULL,
  new_phone text DEFAULT NULL,
  new_location text DEFAULT NULL,
  new_preferred_language text DEFAULT NULL,
  new_languages text[] DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_act_as(target) THEN
    RAISE EXCEPTION '无权限:仅本人或认领人可编辑该账号';
  END IF;

  UPDATE public.profiles SET
    username           = COALESCE(new_username, username),
    avatar_url         = COALESCE(new_avatar_url, avatar_url),
    phone              = COALESCE(new_phone, phone),
    location           = COALESCE(new_location, location),
    preferred_language = COALESCE(new_preferred_language, preferred_language),
    languages          = COALESCE(new_languages, languages),
    updated_at         = now()
  WHERE id = target;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_claimed_profile(uuid, text, text, text, text, text, text[]) FROM public;
GRANT EXECUTE ON FUNCTION public.update_claimed_profile(uuid, text, text, text, text, text, text[]) TO authenticated;

-- ---------- 6. get_unread_count_for:某身份(本人或被认领账号)的未读私信数 ----------
-- 现有无参 get_unread_count 只认 auth.uid();切换身份后需按 target 计数。
CREATE OR REPLACE FUNCTION public.get_unread_count_for(target uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cnt integer;
BEGIN
  IF NOT public.can_act_as(target) THEN
    RETURN 0;
  END IF;

  SELECT count(*)::int INTO cnt
  FROM public.messages m
  JOIN public.conversations c ON c.id = m.conversation_id
  WHERE (c.buyer_id = target OR c.seller_id = target)
    AND m.sender_id <> target
    AND m.read = false;

  RETURN COALESCE(cnt, 0);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_unread_count_for(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_unread_count_for(uuid) TO authenticated;

-- ---------- 7. 管理员链接(认领分配) ----------
-- 7a) 按邮箱找用户 profile(auth.users 前端不可直读,故用 RPC)。仅管理员。
CREATE OR REPLACE FUNCTION public.admin_find_profile_by_email(lookup_email text)
RETURNS TABLE (id uuid, username text, email text, is_system boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION '无权限';
  END IF;
  RETURN QUERY
    SELECT p.id, p.username, u.email::text, p.is_system
    FROM auth.users u
    JOIN public.profiles p ON p.id = u.id
    WHERE lower(u.email) = lower(trim(lookup_email))
    LIMIT 1;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_find_profile_by_email(text) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_find_profile_by_email(text) TO authenticated;

-- 7b) 设置/解除认领(owner 为 null 即解除)。仅管理员。
--     target_system 必须是系统账号;owner 必须是非系统真实用户。
CREATE OR REPLACE FUNCTION public.admin_set_claim(target_system uuid, owner uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sys_is_system boolean;
  owner_is_system boolean;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION '无权限:仅管理员可分配认领';
  END IF;

  SELECT is_system INTO sys_is_system FROM public.profiles WHERE id = target_system;
  IF sys_is_system IS NULL THEN
    RAISE EXCEPTION '目标账号不存在';
  END IF;
  IF NOT sys_is_system THEN
    RAISE EXCEPTION '目标必须是系统账号(is_system=true)';
  END IF;

  IF owner IS NOT NULL THEN
    SELECT is_system INTO owner_is_system FROM public.profiles WHERE id = owner;
    IF owner_is_system IS NULL THEN
      RAISE EXCEPTION '认领人不存在';
    END IF;
    IF owner_is_system THEN
      RAISE EXCEPTION '认领人不能是系统账号';
    END IF;
    IF owner = target_system THEN
      RAISE EXCEPTION '不能认领自己';
    END IF;
  END IF;

  UPDATE public.profiles SET claimed_by = owner, updated_at = now()
  WHERE id = target_system;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_set_claim(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_set_claim(uuid, uuid) TO authenticated;

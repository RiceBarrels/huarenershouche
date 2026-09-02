-- =============================================================
-- 系统车行账号「自助申请认领」
-- 任何真实登录用户都可以对未被认领的系统账号(profiles.is_system=true 且
-- claimed_by IS NULL)提交认领申请;管理员在后台「认领申请」板块通过/拒绝,
-- 通过即写入 profiles.claimed_by(与 claim-accounts.sql 的管理员直接链接等价)。
--
-- 在 Supabase SQL Editor 中手动执行(与 claim-accounts.sql 同方式)。
-- 依赖:admin-expiry.sql 的 public.is_admin();claim-accounts.sql 的 profiles.claimed_by。
-- 可重复执行(幂等)。
-- 前端:app/[locale]/(backnav)/user/user-detail.tsx(申请入口)、
--       app/[locale]/(backnav)/admin/page.tsx(审核板块)。
-- =============================================================

-- ---------- 1. 表 ----------
CREATE TABLE IF NOT EXISTS public.claim_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requester_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message       text,
  contact       text,
  status        text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note    text,
  reviewed_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 同一人对同一账号只能有一条待审申请
CREATE UNIQUE INDEX IF NOT EXISTS claim_requests_pending_uniq
  ON public.claim_requests (system_id, requester_id) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS claim_requests_status_idx
  ON public.claim_requests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS claim_requests_requester_idx
  ON public.claim_requests (requester_id, created_at DESC);

-- ---------- 2. RLS ----------
ALTER TABLE public.claim_requests ENABLE ROW LEVEL SECURITY;

-- 申请人只能看自己的申请
DROP POLICY IF EXISTS claim_requests_select_own ON public.claim_requests;
CREATE POLICY claim_requests_select_own ON public.claim_requests
  FOR SELECT TO authenticated
  USING (requester_id = auth.uid());

-- 申请人可撤回自己的待审申请
DROP POLICY IF EXISTS claim_requests_delete_own_pending ON public.claim_requests;
CREATE POLICY claim_requests_delete_own_pending ON public.claim_requests
  FOR DELETE TO authenticated
  USING (requester_id = auth.uid() AND status = 'pending');

-- 管理员可读全部(审核走 admin_review_claim RPC,不开放直接 UPDATE)
DROP POLICY IF EXISTS claim_requests_select_admin ON public.claim_requests;
CREATE POLICY claim_requests_select_admin ON public.claim_requests
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- 写入统一走 request_claim RPC(要校验目标是未认领系统账号),不开放直接 INSERT。

-- ---------- 3. request_claim:用户提交认领申请 ----------
CREATE OR REPLACE FUNCTION public.request_claim(
  target uuid,
  note text DEFAULT NULL,
  contact_info text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  me_is_system boolean;
  me_banned boolean;
  target_is_system boolean;
  target_claimed uuid;
  new_id uuid;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION '请先登录';
  END IF;

  SELECT is_system, banned INTO me_is_system, me_banned
  FROM public.profiles WHERE id = me;
  IF me_is_system IS NULL THEN
    RAISE EXCEPTION '用户资料不存在';
  END IF;
  IF me_is_system THEN
    RAISE EXCEPTION '系统账号不能申请认领';
  END IF;
  IF COALESCE(me_banned, false) THEN
    RAISE EXCEPTION '账号已被封禁';
  END IF;

  SELECT is_system, claimed_by INTO target_is_system, target_claimed
  FROM public.profiles WHERE id = target;
  IF target_is_system IS NULL THEN
    RAISE EXCEPTION '目标账号不存在';
  END IF;
  IF NOT target_is_system THEN
    RAISE EXCEPTION '只能认领系统检索账号';
  END IF;
  IF target_claimed IS NOT NULL THEN
    RAISE EXCEPTION '该账号已被认领';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.claim_requests
    WHERE system_id = target AND requester_id = me AND status = 'pending'
  ) THEN
    RAISE EXCEPTION '已有待审核的申请';
  END IF;

  INSERT INTO public.claim_requests (system_id, requester_id, message, contact)
  VALUES (target, me, NULLIF(trim(note), ''), NULLIF(trim(contact_info), ''))
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.request_claim(uuid, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.request_claim(uuid, text, text) TO authenticated;

-- ---------- 4. admin_review_claim:管理员通过 / 拒绝 ----------
-- 通过:写 profiles.claimed_by = 申请人,并自动拒绝同一账号的其他待审申请。
CREATE OR REPLACE FUNCTION public.admin_review_claim(
  request_id uuid,
  approve boolean,
  note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req public.claim_requests%ROWTYPE;
  target_claimed uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION '无权限:仅管理员可审核认领申请';
  END IF;

  SELECT * INTO req FROM public.claim_requests WHERE id = request_id FOR UPDATE;
  IF req.id IS NULL THEN
    RAISE EXCEPTION '申请不存在';
  END IF;
  IF req.status <> 'pending' THEN
    RAISE EXCEPTION '该申请已处理';
  END IF;

  IF approve THEN
    SELECT claimed_by INTO target_claimed FROM public.profiles WHERE id = req.system_id;
    IF target_claimed IS NOT NULL AND target_claimed <> req.requester_id THEN
      RAISE EXCEPTION '该账号已被其他用户认领';
    END IF;

    UPDATE public.profiles
    SET claimed_by = req.requester_id, updated_at = now()
    WHERE id = req.system_id;

    -- 同一账号的其他待审申请自动作废
    UPDATE public.claim_requests
    SET status = 'rejected',
        admin_note = COALESCE(admin_note, '该账号已由其他用户认领'),
        reviewed_by = auth.uid(),
        reviewed_at = now()
    WHERE system_id = req.system_id AND status = 'pending' AND id <> request_id;
  END IF;

  UPDATE public.claim_requests
  SET status = CASE WHEN approve THEN 'approved' ELSE 'rejected' END,
      admin_note = NULLIF(trim(note), ''),
      reviewed_by = auth.uid(),
      reviewed_at = now()
  WHERE id = request_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_review_claim(uuid, boolean, text) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_review_claim(uuid, boolean, text) TO authenticated;

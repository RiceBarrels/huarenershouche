"use client";

// 身份上下文:真实登录用户 + 「正在以谁的身份操作」(actingId)。
// 管理员把系统车行账号链接给某用户后,该用户可切换成车行身份(仅经营相关页面接入)。
// 社区/问答/评论等仍直接用 supabase.auth.getUser()(即本人),不经过此上下文。

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import type { DbProfile } from "@/lib/types";
import type { User as SupaUser } from "@supabase/supabase-js";

export const ACTING_KEY = "clc_acting_id";

interface IdentityValue {
  /** 真实登录用户(始终是本人)。 */
  authUser: SupaUser | null;
  /** 本人真实 id(便捷取值)。 */
  authId: string | null;
  /** 当前操作身份 id:默认 = 本人,可切到已认领的系统车行账号。 */
  actingId: string | null;
  /** 当前操作身份的 profile(切换成车行时为车行 profile)。 */
  actingProfile: DbProfile | null;
  /** 本人已认领的系统车行账号列表。 */
  claimedAccounts: DbProfile[];
  /** 是否正在以「被认领账号」身份操作(非本人)。 */
  isActingAsClaimed: boolean;
  /** 鉴权/加载中。 */
  loading: boolean;
  switchTo: (id: string) => void;
  switchToSelf: () => void;
  /** 刷新已认领账号列表(如管理员新分配后)。 */
  refresh: () => Promise<void>;
}

const IdentityContext = createContext<IdentityValue | null>(null);

export function IdentityProvider({ children }: { children: React.ReactNode }) {
  const [authUser, setAuthUser] = useState<SupaUser | null>(null);
  const [claimedAccounts, setClaimedAccounts] = useState<DbProfile[]>([]);
  const [actingId, setActingId] = useState<string | null>(null);
  const [actingProfile, setActingProfile] = useState<DbProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const persist = useCallback((id: string | null) => {
    try {
      if (id) localStorage.setItem(ACTING_KEY, id);
      else localStorage.removeItem(ACTING_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  // 拉取本人已认领的系统账号,并解析出合法的 actingId + actingProfile。
  const loadForUser = useCallback(
    async (user: SupaUser | null) => {
      if (!user) {
        setClaimedAccounts([]);
        setActingId(null);
        setActingProfile(null);
        return;
      }

      const { data: claimed } = await supabase
        .from("profiles")
        .select("*")
        .eq("claimed_by", user.id)
        .eq("is_system", true);
      const accounts = (claimed as DbProfile[]) || [];
      setClaimedAccounts(accounts);

      // 校验持久化的 actingId:必须是本人或在已认领列表内,否则回退本人。
      let stored: string | null = null;
      try {
        stored = localStorage.getItem(ACTING_KEY);
      } catch {
        /* ignore */
      }
      const valid =
        stored && (stored === user.id || accounts.some((a) => a.id === stored));
      const resolved = valid ? (stored as string) : user.id;
      if (resolved !== stored) persist(resolved === user.id ? null : resolved);
      setActingId(resolved);

      if (resolved === user.id) {
        const { data: self } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();
        setActingProfile((self as DbProfile) || null);
      } else {
        setActingProfile(accounts.find((a) => a.id === resolved) || null);
      }
    },
    [persist],
  );

  useEffect(() => {
    let cancelled = false;
    // getSession 读本地存储的会话,不走网络,让依赖身份的页面能立即用缓存渲染
    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;
      const user = data.session?.user ?? null;
      setAuthUser(user);
      await loadForUser(user);
      if (!cancelled) setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      setAuthUser(user);
      if (!user) persist(null);
      // 回调执行期间 supabase-js 持有 auth 锁,在回调里 await 任何
      // supabase 查询会死锁(全站请求永久挂起,只有清 localStorage 里的
      // session 才能恢复)。用 setTimeout 把查询推出回调再执行。
      setTimeout(() => {
        loadForUser(user);
      }, 0);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [loadForUser, persist]);

  const switchTo = useCallback(
    (id: string) => {
      if (!authUser) return;
      const allowed = id === authUser.id || claimedAccounts.some((a) => a.id === id);
      if (!allowed) return;
      persist(id === authUser.id ? null : id);
      setActingId(id);
      setActingProfile(
        id === authUser.id
          ? actingProfile && actingProfile.id === authUser.id
            ? actingProfile
            : null
          : claimedAccounts.find((a) => a.id === id) || null,
      );
      // 切回本人但没缓存到本人 profile 时补拉一次
      if (id === authUser.id) {
        supabase
          .from("profiles")
          .select("*")
          .eq("id", authUser.id)
          .maybeSingle()
          .then(({ data }) => setActingProfile((data as DbProfile) || null));
      }
    },
    [authUser, claimedAccounts, actingProfile, persist],
  );

  const switchToSelf = useCallback(() => {
    if (authUser) switchTo(authUser.id);
  }, [authUser, switchTo]);

  const refresh = useCallback(() => loadForUser(authUser), [authUser, loadForUser]);

  const value = useMemo<IdentityValue>(
    () => ({
      authUser,
      authId: authUser?.id ?? null,
      actingId,
      actingProfile,
      claimedAccounts,
      isActingAsClaimed: !!authUser && !!actingId && actingId !== authUser.id,
      loading,
      switchTo,
      switchToSelf,
      refresh,
    }),
    [
      authUser,
      actingId,
      actingProfile,
      claimedAccounts,
      loading,
      switchTo,
      switchToSelf,
      refresh,
    ],
  );

  return (
    <IdentityContext.Provider value={value}>{children}</IdentityContext.Provider>
  );
}

export function useIdentity(): IdentityValue {
  const ctx = useContext(IdentityContext);
  if (!ctx) {
    throw new Error("useIdentity must be used within an IdentityProvider");
  }
  return ctx;
}

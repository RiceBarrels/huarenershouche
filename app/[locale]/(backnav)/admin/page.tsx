"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "@/components/localized-navigation";
import Link from "@/components/localized-navigation";
import {
  ShieldCheck, Users, Car, Flag, Store, Ban, Eye, Trash2, Check, X,
  Loader2, ChevronRight, AlertTriangle, Clock, XCircle, MessageSquare,
  Headset, Handshake, Pencil, Settings2, DatabaseZap, RefreshCw, ExternalLink, Bot,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/components/i18n-provider";
import { carTitle } from "@/lib/i18n";
import { carEditLink, adminUserLink } from "@/lib/static-link";
import { avatarUrl } from "@/lib/avatar";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { DbProfile, DbCar, DbDealerStore, DbListingSource, DbAiModeration, DbClaimRequest } from "@/lib/types";

type Tab = "verifications" | "claims" | "users" | "cars" | "reports" | "aimod" | "tickets" | "sources";

// AI 审核拦截目标 → 展示标签 + 恢复时写回的表/状态(supabase/ai-moderation.sql)
const AIMOD_TARGETS: Record<
  DbAiModeration["target_type"],
  { label: string; table: string; restore: Record<string, string>; link?: (id: string) => string }
> = {
  car: { label: "车辆", table: "cars", restore: { status: "active" }, link: (id) => `/car/${id}` },
  post: { label: "帖子", table: "community_posts", restore: { status: "active" }, link: (id) => `/community/${id}` },
  car_comment: { label: "评论", table: "comments", restore: { status: "active" } },
  post_comment: { label: "评论", table: "post_comments", restore: { status: "active" } },
};

// 用户群体筛选:与搜索独立,可单独按群体过滤用户列表
type UserSegment = "all" | "personal" | "dealer" | "system" | "admin" | "banned";

const USER_SEGMENTS: { key: UserSegment; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "personal", label: "个人" },
  { key: "dealer", label: "车行" },
  { key: "system", label: "系统" },
  { key: "admin", label: "管理员" },
  { key: "banned", label: "已封禁" },
];

function matchSegment(u: DbProfile, seg: UserSegment): boolean {
  switch (seg) {
    case "personal": return !u.is_system && u.account_type !== "dealer";
    case "dealer": return !u.is_system && u.account_type === "dealer";
    case "system": return !!u.is_system;
    case "admin": return u.role === "admin";
    case "banned": return !!u.banned;
    default: return true;
  }
}

interface SyncResult {
  key: string;
  status: "success" | "partial" | "error" | "skipped";
  found: number;
  inserted: number;
  updated: number;
  delisted: number;
  errors: string[];
  duration_ms: number;
}

function relativeTime(iso: string, t: (text: string, vars?: Record<string, string | number>) => string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return t("刚刚");
  if (min < 60) return t("{n} 分钟前", { n: min });
  const hr = Math.floor(min / 60);
  if (hr < 24) return t("{n} 小时前", { n: hr });
  return new Date(iso).toLocaleString("zh-CN");
}

interface Report {
  id: string;
  car_id: string | null;
  // 举报泛化(supabase/content-reports.sql):car / post / post_comment / car_comment / user
  target_type?: string;
  target_id?: string | null;
  user_id: string | null;
  reason: string;
  detail: string | null;
  created_at: string;
  cars?: { id: string; title_zh: string; image_url: string | null; seller_id: string };
}

const REPORT_TYPE_LABELS: Record<string, string> = {
  post: "帖子举报",
  post_comment: "评论举报",
  car_comment: "评论举报",
  user: "用户举报",
};

interface Ticket {
  id: string;
  user_id: string | null;
  type: "contact" | "business";
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  cooperation_type: string | null;
  message: string;
  status: "open" | "closed";
  created_at: string;
  profiles?: { username: string; avatar_url: string | null };
}

// 认领申请 + 手动 join 的申请人/目标系统账号(supabase/claim-requests.sql)
interface ClaimRequestRow extends DbClaimRequest {
  requester?: { username: string; avatar_url: string | null };
  system?: { username: string; avatar_url: string | null; claimed_by: string | null };
}

interface StoreWithOwner extends DbDealerStore {
  profiles?: { username: string; avatar_url: string | null; account_type: string };
}

export default function AdminPage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState<Tab>("verifications");

  // Data
  const [pendingStores, setPendingStores] = useState<StoreWithOwner[]>([]);
  const [users, setUsers] = useState<DbProfile[]>([]);
  const [cars, setCars] = useState<DbCar[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [aiFlags, setAiFlags] = useState<DbAiModeration[]>([]);
  const [claims, setClaims] = useState<ClaimRequestRow[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [sources, setSources] = useState<DbListingSource[]>([]);
  const [sourcesLoaded, setSourcesLoaded] = useState(false);
  const [sourceCounts, setSourceCounts] = useState<Record<string, number>>({});
  const [syncingKey, setSyncingKey] = useState<string | null>(null);
  const [syncResults, setSyncResults] = useState<Record<string, { ok: boolean; text: string }>>({});
  const [expandedErrors, setExpandedErrors] = useState<Record<string, boolean>>({});

  // Search
  const [userSearch, setUserSearch] = useState("");
  const [carSearch, setCarSearch] = useState("");
  // 用户群体(与关键词搜索叠加过滤)
  const [userSegment, setUserSegment] = useState<UserSegment>("all");

  // Action loading
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Verification note input
  const [rejectNote, setRejectNote] = useState<Record<string, string>>({});

  // Counts
  const [counts, setCounts] = useState({ verifications: 0, claims: 0, reports: 0, aimod: 0, tickets: 0 });

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!profile || profile.role !== "admin") {
        router.push("/");
        return;
      }

      setIsAdmin(true);
      await loadAll();
      setLoading(false);
    }
    init();
  }, [router]);

  const loadAll = useCallback(async () => {
    const [storesRes, reportsRes, ticketsRes, aiRes, claimsRes] = await Promise.all([
      supabase
        .from("dealer_stores")
        .select("*")
        .eq("verification_status", "pending")
        .order("verification_submitted_at", { ascending: true }),
      supabase
        .from("reports")
        .select("*, cars(id, title_zh, image_url, seller_id)")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("support_tickets")
        .select("*, profiles:user_id(username, avatar_url)")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(50),
      // AI 拦截待复核(表可能还没建,error 时静默为空)
      supabase
        .from("ai_moderation")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(50),
      // 认领申请待审(表可能还没建,error 时静默为空)
      supabase
        .from("claim_requests")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(50),
    ]);

    // 认领申请:手动 join 申请人与目标系统账号(两列都指向 profiles,避免 FK 歧义)
    const claimRows = (claimsRes.data || []) as ClaimRequestRow[];
    if (claimRows.length > 0) {
      const ids = [...new Set(claimRows.flatMap((c) => [c.requester_id, c.system_id]))];
      const { data: claimProfiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, claimed_by")
        .in("id", ids);
      if (claimProfiles) {
        const pm = new Map(claimProfiles.map((p) => [p.id, p]));
        claimRows.forEach((c) => {
          const r = pm.get(c.requester_id);
          const sys = pm.get(c.system_id);
          if (r) c.requester = { username: r.username, avatar_url: r.avatar_url };
          if (sys) c.system = { username: sys.username, avatar_url: sys.avatar_url, claimed_by: sys.claimed_by };
        });
      }
    }
    setClaims(claimRows);

    // Manually join profiles for stores (owner_id FK points to auth.users, not profiles)
    const stores = (storesRes.data || []) as StoreWithOwner[];
    if (stores.length > 0) {
      const ownerIds = [...new Set(stores.map((s) => s.owner_id))];
      const { data: ownerProfiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, account_type")
        .in("id", ownerIds);
      if (ownerProfiles) {
        const profileMap = new Map(ownerProfiles.map((p) => [p.id, p]));
        stores.forEach((s) => {
          const p = profileMap.get(s.owner_id);
          if (p) s.profiles = { username: p.username, avatar_url: p.avatar_url, account_type: p.account_type };
        });
      }
    }
    setPendingStores(stores);
    setReports((reportsRes.data as Report[]) || []);
    setTickets((ticketsRes.data as Ticket[]) || []);
    setAiFlags((aiRes.data as DbAiModeration[]) || []);
    setCounts({
      verifications: storesRes.data?.length || 0,
      claims: claimRows.length,
      reports: reportsRes.data?.length || 0,
      aimod: aiRes.data?.length || 0,
      tickets: ticketsRes.data?.length || 0,
    });
  }, []);

  async function loadUsers() {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setUsers((data as DbProfile[]) || []);
  }

  async function loadCars() {
    const { data } = await supabase
      .from("cars")
      .select("*, profiles:seller_id(account_type)")
      .order("created_at", { ascending: false })
      .limit(100);
    setCars((data as DbCar[]) || []);
  }

  async function loadSources() {
    const { data } = await supabase
      .from("listing_sources")
      .select("*")
      .order("created_at", { ascending: true });
    const list = (data as DbListingSource[]) || [];
    setSources(list);
    setSourcesLoaded(true);
    if (list.length > 0) {
      const counts: Record<string, number> = {};
      await Promise.all(
        list.map(async (s) => {
          const { count } = await supabase
            .from("cars")
            .select("*", { count: "exact", head: true })
            .eq("source_id", s.id);
          counts[s.id] = count || 0;
        })
      );
      setSourceCounts(counts);
    }
  }

  async function handleTabChange(t: Tab) {
    setTab(t);
    if (t === "users" && users.length === 0) await loadUsers();
    if (t === "cars" && cars.length === 0) await loadCars();
    if (t === "sources" && !sourcesLoaded) await loadSources();
  }

  // === Admin Actions ===

  // 认领申请:通过 → profiles.claimed_by = 申请人;拒绝可附原因(可选)
  async function reviewClaim(req: ClaimRequestRow, approve: boolean) {
    setActionLoading(req.id);
    const note = (rejectNote[req.id] || "").trim();
    const { error } = await supabase.rpc("admin_review_claim", {
      request_id: req.id,
      approve,
      note: approve ? null : note || null,
    });
    if (error) {
      setActionLoading(null);
      alert(error.message);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("admin_actions").insert({
        admin_id: user.id,
        action: approve ? "approve_claim" : "reject_claim",
        target_type: "user",
        target_id: req.system_id,
        detail: approve ? req.requester_id : note || req.requester_id,
      });
    }
    setActionLoading(null);
    await loadAll();
  }

  async function approveStore(storeId: string) {
    setActionLoading(storeId);
    const { data: { user } } = await supabase.auth.getUser();
    const store = pendingStores.find((s) => s.id === storeId);
    await supabase
      .from("dealer_stores")
      .update({
        verification_status: "verified",
        verification_reviewed_at: new Date().toISOString(),
        verification_note: null,
      })
      .eq("id", storeId);
    // Auto-upgrade owner to dealer account
    if (store) {
      await supabase
        .from("profiles")
        .update({ account_type: "dealer" })
        .eq("id", store.owner_id);
    }
    if (user) {
      await supabase.from("admin_actions").insert({
        admin_id: user.id,
        action: "approve_store",
        target_type: "store",
        target_id: storeId,
        detail: null,
      });
    }
    setPendingStores((prev) => prev.filter((s) => s.id !== storeId));
    setCounts((c) => ({ ...c, verifications: c.verifications - 1 }));
    setActionLoading(null);
  }

  async function rejectStore(storeId: string) {
    const note = rejectNote[storeId] || "";
    if (!note.trim()) { alert(t("请填写拒绝原因")); return; }
    setActionLoading(storeId);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase
      .from("dealer_stores")
      .update({
        verification_status: "rejected",
        verification_reviewed_at: new Date().toISOString(),
        verification_note: note,
      })
      .eq("id", storeId);
    if (user) {
      await supabase.from("admin_actions").insert({
        admin_id: user.id,
        action: "reject_store",
        target_type: "store",
        target_id: storeId,
        detail: note,
      });
    }
    setPendingStores((prev) => prev.filter((s) => s.id !== storeId));
    setCounts((c) => ({ ...c, verifications: c.verifications - 1 }));
    setActionLoading(null);
  }

  async function banUser(userId: string, reason: string) {
    if (!reason.trim()) return;
    setActionLoading(userId);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase
      .from("profiles")
      .update({ banned: true, banned_at: new Date().toISOString(), banned_reason: reason })
      .eq("id", userId);
    // Also remove all active listings
    await supabase
      .from("cars")
      .update({ status: "removed" })
      .eq("seller_id", userId)
      .eq("status", "active");
    if (user) {
      await supabase.from("admin_actions").insert({
        admin_id: user.id,
        action: "ban_user",
        target_type: "user",
        target_id: userId,
        detail: reason,
      });
    }
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, banned: true, banned_reason: reason } : u));
    setActionLoading(null);
  }

  async function unbanUser(userId: string) {
    setActionLoading(userId);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase
      .from("profiles")
      .update({ banned: false, banned_at: null, banned_reason: null })
      .eq("id", userId);
    if (user) {
      await supabase.from("admin_actions").insert({
        admin_id: user.id,
        action: "unban_user",
        target_type: "user",
        target_id: userId,
        detail: null,
      });
    }
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, banned: false, banned_reason: null } : u));
    setActionLoading(null);
  }

  async function removeCar(carId: string) {
    setActionLoading(carId);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("cars").update({ status: "removed" }).eq("id", carId);
    if (user) {
      await supabase.from("admin_actions").insert({
        admin_id: user.id,
        action: "remove_car",
        target_type: "car",
        target_id: carId,
        detail: null,
      });
    }
    setCars((prev) => prev.map((c) => c.id === carId ? { ...c, status: "removed" as const } : c));
    setActionLoading(null);
  }

  async function restoreCar(carId: string) {
    setActionLoading(carId);
    // 重新上架同时续期 30 天
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from("cars").update({ status: "active", expires_at: expiresAt }).eq("id", carId);
    setCars((prev) => prev.map((c) => c.id === carId ? { ...c, status: "active" as const, expires_at: expiresAt } : c));
    setActionLoading(null);
  }

  async function deleteCarPermanent(carId: string) {
    if (!confirm(t("永久删除这辆车？此操作不可恢复。"))) return;
    setActionLoading(carId);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("cars").delete().eq("id", carId);
    if (error) { alert(t("删除失败: {msg}", { msg: error.message })); setActionLoading(null); return; }
    if (user) {
      await supabase.from("admin_actions").insert({
        admin_id: user.id,
        action: "delete_car",
        target_type: "car",
        target_id: carId,
        detail: null,
      });
    }
    setCars((prev) => prev.filter((c) => c.id !== carId));
    setActionLoading(null);
  }

  async function dismissReport(reportId: string) {
    setActionLoading(reportId);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("reports").delete().eq("id", reportId);
    if (user) {
      await supabase.from("admin_actions").insert({
        admin_id: user.id,
        action: "dismiss_report",
        target_type: "report",
        target_id: reportId,
        detail: null,
      });
    }
    setReports((prev) => prev.filter((r) => r.id !== reportId));
    setCounts((c) => ({ ...c, reports: c.reports - 1 }));
    setActionLoading(null);
  }

  async function removeCarFromReport(reportId: string, carId: string) {
    setActionLoading(reportId);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("cars").update({ status: "removed" }).eq("id", carId);
    await supabase.from("reports").delete().eq("id", reportId);
    if (user) {
      await supabase.from("admin_actions").insert({
        admin_id: user.id,
        action: "remove_car_from_report",
        target_type: "car",
        target_id: carId,
        detail: `Report: ${reportId}`,
      });
    }
    setReports((prev) => prev.filter((r) => r.id !== reportId));
    setCounts((c) => ({ ...c, reports: c.reports - 1 }));
    setActionLoading(null);
  }

  // AI 拦截复核:恢复(误杀)—— 内容状态写回 active,记录标记 restored
  async function restoreAiFlag(flag: DbAiModeration) {
    setActionLoading(flag.id);
    const { data: { user } } = await supabase.auth.getUser();
    const target = AIMOD_TARGETS[flag.target_type];
    // 车辆恢复上架同时续期 30 天(与 restoreCar 一致)
    const restore = flag.target_type === "car"
      ? { ...target.restore, expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() }
      : target.restore;
    await supabase.from(target.table).update(restore).eq("id", flag.target_id);
    await supabase
      .from("ai_moderation")
      .update({ status: "restored", reviewed_at: new Date().toISOString(), reviewed_by: user?.id ?? null })
      .eq("id", flag.id);
    if (user) {
      await supabase.from("admin_actions").insert({
        admin_id: user.id,
        action: "restore_ai_flag",
        target_type: flag.target_type,
        target_id: flag.target_id,
        detail: flag.reason,
      });
    }
    setAiFlags((prev) => prev.filter((f) => f.id !== flag.id));
    setCounts((c) => ({ ...c, aimod: c.aimod - 1 }));
    setActionLoading(null);
  }

  // AI 拦截复核:确认违规 —— 内容保持屏蔽,记录标记 confirmed
  async function confirmAiFlag(flag: DbAiModeration) {
    setActionLoading(flag.id);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase
      .from("ai_moderation")
      .update({ status: "confirmed", reviewed_at: new Date().toISOString(), reviewed_by: user?.id ?? null })
      .eq("id", flag.id);
    if (user) {
      await supabase.from("admin_actions").insert({
        admin_id: user.id,
        action: "confirm_ai_flag",
        target_type: flag.target_type,
        target_id: flag.target_id,
        detail: flag.reason,
      });
    }
    setAiFlags((prev) => prev.filter((f) => f.id !== flag.id));
    setCounts((c) => ({ ...c, aimod: c.aimod - 1 }));
    setActionLoading(null);
  }

  async function closeTicket(ticketId: string) {
    setActionLoading(ticketId);
    await supabase.from("support_tickets").update({ status: "closed" }).eq("id", ticketId);
    setTickets((prev) => prev.filter((t) => t.id !== ticketId));
    setCounts((c) => ({ ...c, tickets: c.tickets - 1 }));
    setActionLoading(null);
  }

  async function setAdmin(userId: string, makeAdmin: boolean) {
    setActionLoading(userId);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase
      .from("profiles")
      .update({ role: makeAdmin ? "admin" : "user" })
      .eq("id", userId);
    if (user) {
      await supabase.from("admin_actions").insert({
        admin_id: user.id,
        action: makeAdmin ? "grant_admin" : "revoke_admin",
        target_type: "user",
        target_id: userId,
        detail: null,
      });
    }
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: makeAdmin ? "admin" as const : "user" as const } : u));
    setActionLoading(null);
  }

  async function toggleSource(sourceId: string, enabled: boolean) {
    setActionLoading(sourceId);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("listing_sources").update({ enabled }).eq("id", sourceId);
    if (user) {
      await supabase.from("admin_actions").insert({
        admin_id: user.id,
        action: "toggle_source",
        target_type: "source",
        target_id: sourceId,
        detail: enabled ? "enabled" : "disabled",
      });
    }
    setSources((prev) => prev.map((s) => s.id === sourceId ? { ...s, enabled } : s));
    setActionLoading(null);
  }

  async function syncSource(source: DbListingSource) {
    setSyncingKey(source.key);
    setSyncResults((prev) => {
      const next = { ...prev };
      delete next[source.id];
      return next;
    });
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) throw new Error(t("未登录或会话已过期"));
      // 同步约 65 辆车需 1-2 分钟，fetch 会长时间挂起
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ key: source.key, force: true }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || t("同步失败 (HTTP {status})", { status: res.status }));
      const results = (json.results || []) as SyncResult[];
      const r = results.find((x) => x.key === source.key) || results[0];
      if (!r) throw new Error(t("同步未返回结果"));
      const text = r.status === "skipped"
        ? t("已跳过（数据源未启用或正在同步）")
        : `${t("新增 {inserted} · 更新 {updated} · 下架 {delisted}", { inserted: r.inserted ?? 0, updated: r.updated ?? 0, delisted: r.delisted ?? 0 })}${r.errors?.length ? ` · ${t("错误 {n}", { n: r.errors.length })}` : ""}`;
      setSyncResults((prev) => ({ ...prev, [source.id]: { ok: r.status !== "error", text } }));
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("admin_actions").insert({
          admin_id: user.id,
          action: "sync_source",
          target_type: "source",
          target_id: source.id,
          detail: `${r.status}: ${text}`,
        });
      }
    } catch (e) {
      setSyncResults((prev) => ({
        ...prev,
        [source.id]: { ok: false, text: e instanceof Error ? e.message : t("同步失败") },
      }));
    } finally {
      setSyncingKey(null);
      await loadSources();
    }
  }

  // === Filtered lists ===

  const segmentUsers = users.filter((u) => matchSegment(u, userSegment));
  const filteredUsers = userSearch
    ? segmentUsers.filter((u) =>
        u.username?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.id.includes(userSearch)
      )
    : segmentUsers;

  const carExpired = (car: DbCar) =>
    car.status === "removed" && !!car.expires_at && new Date(car.expires_at).getTime() < Date.now();

  const filteredCars = carSearch
    ? cars.filter((c) =>
        c.title_zh?.toLowerCase().includes(carSearch.toLowerCase()) ||
        c.title?.toLowerCase().includes(carSearch.toLowerCase()) ||
        c.make?.toLowerCase().includes(carSearch.toLowerCase())
      )
    : cars;

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-background px-4 py-4 font-mono">
        <Skeleton className="h-6 w-32" />
        <div className="mt-4 flex gap-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-9 w-20" />)}
        </div>
        <div className="mt-4 space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: "verifications", label: t("认证"), icon: <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.5} />, count: counts.verifications },
    { key: "claims", label: t("认领"), icon: <Handshake className="h-3.5 w-3.5" strokeWidth={1.5} />, count: counts.claims },
    { key: "users", label: t("用户"), icon: <Users className="h-3.5 w-3.5" strokeWidth={1.5} /> },
    { key: "cars", label: t("车辆"), icon: <Car className="h-3.5 w-3.5" strokeWidth={1.5} /> },
    { key: "reports", label: t("举报"), icon: <Flag className="h-3.5 w-3.5" strokeWidth={1.5} />, count: counts.reports },
    { key: "aimod", label: t("AI 审核"), icon: <Bot className="h-3.5 w-3.5" strokeWidth={1.5} />, count: counts.aimod },
    { key: "tickets", label: t("工单"), icon: <Headset className="h-3.5 w-3.5" strokeWidth={1.5} />, count: counts.tickets },
    { key: "sources", label: t("数据源"), icon: <DatabaseZap className="h-3.5 w-3.5" strokeWidth={1.5} /> },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      {/* 桌面加宽为面板布局:左侧竖向导航 + 右侧内容区;手机保持窄列 + 横向 tab 不变 */}
      <div className="mx-auto w-full max-w-2xl px-4 py-4 md:max-w-6xl md:py-8 2xl:max-w-[88rem]">
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          <ShieldCheck className="h-5 w-5" strokeWidth={1.5} />
          {t("管理后台")}
          <span className="hidden font-mono text-[10px] font-normal uppercase tracking-[0.25em] text-muted-foreground/60 md:inline">
            Admin Console
          </span>
        </h1>

        {/* Tabs(手机:横向胶囊) */}
        <div className="mt-4 flex gap-1.5 overflow-x-auto md:hidden">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => handleTabChange(t.key)}
              className={`relative flex shrink-0 items-center gap-1 rounded-full px-3 py-2 text-xs transition-colors ${
                tab === t.key
                  ? "bg-primary/30 text-brand-ink"
                  : "bg-muted hover:bg-muted/70"
              }`}
            >
              {t.icon}
              {t.label}
              {t.count ? (
                <span className={`ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] ${
                  tab === t.key ? "bg-background text-foreground" : "bg-foreground text-background"
                }`}>
                  {t.count}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <div className="md:mt-6 md:flex md:items-start md:gap-6">
          {/* 桌面:左侧竖向导航(sticky 于双行 Header 下方) */}
          <aside className="sticky top-[117px] hidden w-44 shrink-0 md:block">
            <p className="px-3 pb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Sections
            </p>
            <nav className="space-y-1">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => handleTabChange(t.key)}
                  className={`flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-xs transition-colors ${
                    tab === t.key
                      ? "border-border bg-card font-medium"
                      : "border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                >
                  {t.icon}
                  {t.label}
                  {t.count ? (
                    <span className={`ml-auto flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] ${
                      tab === t.key ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
                    }`}>
                      {t.count}
                    </span>
                  ) : null}
                </button>
              ))}
            </nav>
          </aside>

          <div className="min-w-0 flex-1">
          {/* 桌面:待办统计卡,点击直达对应板块 */}
          <div className="hidden grid-cols-5 gap-3 md:grid">
            {([
              { key: "verifications" as Tab, label: t("待审核认证"), value: counts.verifications },
              { key: "claims" as Tab, label: t("待审核认领"), value: counts.claims },
              { key: "reports" as Tab, label: t("未处理举报"), value: counts.reports },
              { key: "aimod" as Tab, label: t("AI 拦截待复核"), value: counts.aimod },
              { key: "tickets" as Tab, label: t("开放工单"), value: counts.tickets },
            ]).map((stat) => (
              <button
                key={stat.key}
                onClick={() => handleTabChange(stat.key)}
                className={`rounded-lg border p-4 text-left transition-colors ${
                  tab === stat.key ? "border-border bg-card" : "border-border/60 bg-card/60 hover:border-border hover:bg-card"
                }`}
              >
                <p className={`font-mono text-2xl font-bold tabular-nums ${stat.value > 0 ? "text-foreground" : "text-muted-foreground/50"}`}>
                  {stat.value}
                </p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                  {stat.label}
                </p>
              </button>
            ))}
          </div>

        {/* === Verifications Tab === */}
        {tab === "verifications" && (
          <div className="mt-4 space-y-3">
            {pendingStores.length === 0 ? (
              <p className="py-12 text-center text-xs text-muted-foreground">{t("暂无待审核的认证申请")}</p>
            ) : (
              pendingStores.map((store) => (
                <div key={store.id} className="rounded-xl bg-card p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium">{store.name}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {t("车主:")} {store.profiles?.username || t("未知")} · {store.address}
                      </p>
                      {store.phone && <p className="text-[11px] text-muted-foreground">{t("电话:")} {store.phone}</p>}
                      {store.wechat && <p className="text-[11px] text-muted-foreground">{t("微信:")} {store.wechat}</p>}
                      <p className="text-[11px] text-muted-foreground">
                        {t("提交时间:")} {store.verification_submitted_at ? new Date(store.verification_submitted_at).toLocaleString("zh-CN") : "-"}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-600">
                      <Clock className="h-3 w-3" strokeWidth={1.5} />{t("待审")}
                    </span>
                  </div>

                  {/* Store photos */}
                  {store.store_photos.length > 0 && (
                    <div className="mt-2 flex gap-2 overflow-x-auto">
                      {store.store_photos.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-muted">
                          <img src={url} alt="" className="h-full w-full object-cover" />
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-3 space-y-2">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="gap-1 text-xs"
                        onClick={() => approveStore(store.id)}
                        disabled={actionLoading === store.id}
                      >
                        {actionLoading === store.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" strokeWidth={2} />}
                        {t("通过")}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="gap-1 text-xs text-red-600 dark:text-red-400 hover:text-red-700"
                        onClick={() => rejectStore(store.id)}
                        disabled={actionLoading === store.id || !rejectNote[store.id]?.trim()}
                      >
                        <X className="h-3 w-3" strokeWidth={2} />
                        {t("拒绝")}
                      </Button>
                    </div>
                    <Input
                      className="h-8 text-xs"
                      placeholder={t("拒绝原因（拒绝时必填）")}
                      value={rejectNote[store.id] || ""}
                      onChange={(e) => setRejectNote((prev) => ({ ...prev, [store.id]: e.target.value }))}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* === Claims Tab(系统账号自助认领申请) === */}
        {tab === "claims" && (
          <div className="mt-4 space-y-3">
            {claims.length === 0 ? (
              <p className="py-12 text-center text-xs text-muted-foreground">{t("暂无待审核的认领申请")}</p>
            ) : (
              claims.map((cr) => {
                const takenByOther = !!cr.system?.claimed_by && cr.system.claimed_by !== cr.requester_id;
                return (
                  <div key={cr.id} className="rounded-xl bg-card p-3">
                    <div className="flex items-start gap-3">
                      <img
                        src={avatarUrl(cr.system?.avatar_url ?? null, cr.system?.username || "?")}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-full object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <Link href={adminUserLink(cr.system_id)} className="text-sm font-medium hover:underline">
                            {cr.system?.username || cr.system_id.slice(0, 8)}
                          </Link>
                          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            {t("系统账号")}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {relativeTime(cr.created_at, t)}
                          </span>
                        </div>
                        <div className="mt-1.5 space-y-0.5">
                          <p className="text-[11px]">
                            <span className="text-muted-foreground">{t("申请人:")}</span>{" "}
                            <Link href={adminUserLink(cr.requester_id)} className="hover:underline">
                              {cr.requester?.username || cr.requester_id.slice(0, 8)}
                            </Link>
                          </p>
                          {cr.contact && (
                            <p className="text-[11px]">
                              <span className="text-muted-foreground">{t("联系方式:")}</span> {cr.contact}
                            </p>
                          )}
                        </div>
                        {cr.message && (
                          <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed">{cr.message}</p>
                        )}
                        {takenByOther && (
                          <p className="mt-1.5 flex items-center gap-1 text-[11px] text-amber-600">
                            <AlertTriangle className="h-3 w-3" strokeWidth={1.5} />
                            {t("该账号已被其他用户认领")}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Input
                        value={rejectNote[cr.id] || ""}
                        onChange={(e) => setRejectNote((prev) => ({ ...prev, [cr.id]: e.target.value }))}
                        placeholder={t("拒绝原因（可选）")}
                        className="h-7 flex-1 text-[11px]"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 gap-1 px-2 text-[11px] text-destructive"
                        onClick={() => reviewClaim(cr, false)}
                        disabled={actionLoading === cr.id}
                      >
                        <X className="h-3 w-3" strokeWidth={2} />
                        {t("拒绝")}
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 gap-1 px-2 text-[11px]"
                        onClick={() => reviewClaim(cr, true)}
                        disabled={actionLoading === cr.id || takenByOther}
                      >
                        {actionLoading === cr.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" strokeWidth={2} />}
                        {t("通过")}
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* === Users Tab === */}
        {tab === "users" && (
          <div className="mt-4">
            {/* 用户群体筛选:独立于关键词搜索,两者叠加过滤 */}
            <div className="mb-3 flex flex-wrap gap-1.5">
              {USER_SEGMENTS.map((s) => {
                const n = s.key === "all" ? users.length : users.filter((u) => matchSegment(u, s.key)).length;
                return (
                  <button
                    key={s.key}
                    onClick={() => setUserSegment(s.key)}
                    className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] transition-colors ${
                      userSegment === s.key
                        ? "bg-primary/30 font-medium text-brand-ink"
                        : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                    }`}
                  >
                    {t(s.label)}
                    <span className="tabular-nums opacity-70">{n}</span>
                  </button>
                );
              })}
            </div>
            <Input
              className="h-9 text-xs"
              placeholder={t("搜索用户名或ID...")}
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
            <div className="mt-3 space-y-2">
              {filteredUsers.length === 0 ? (
                <p className="py-12 text-center text-xs text-muted-foreground">{t("无匹配用户")}</p>
              ) : (
                filteredUsers.map((u) => (
                  <div key={u.id} className={`flex items-center justify-between rounded-xl p-3 ${u.banned ? "bg-red-50 dark:bg-red-950/20" : "bg-card"}`}>
                    <div className="min-w-0 flex-1">
                      <Link href={adminUserLink(u.id)} className="flex items-center gap-2 hover:opacity-80">
                        <img src={avatarUrl(u.avatar_url, u.username)} alt="" className="h-8 w-8 shrink-0 rounded-full bg-muted object-cover" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-xs font-medium hover:underline">{u.username || t("未设置")}</p>
                            {u.is_system ? (
                              <span className="shrink-0 rounded-full bg-foreground/80 px-1 py-0.5 text-[10px] text-background">{t("系统")}</span>
                            ) : u.account_type === "dealer" && (
                              <span className="shrink-0 rounded-full bg-muted px-1 py-0.5 text-[10px]">{t("车行")}</span>
                            )}
                            {u.role === "admin" && (
                              <span className="shrink-0 rounded-full bg-foreground px-1 py-0.5 text-[10px] text-background">{t("管理员")}</span>
                            )}
                            {u.banned && (
                              <span className="shrink-0 rounded-full bg-red-500/10 px-1 py-0.5 text-[10px] text-red-600 dark:text-red-400">{t("已封禁")}</span>
                            )}
                          </div>
                          <p className="truncate text-[10px] text-muted-foreground">
                            {u.id.slice(0, 8)}... · {u.location || t("未知地区")} · {new Date(u.created_at).toLocaleDateString("zh-CN")}
                          </p>
                        </div>
                      </Link>
                      {u.banned && u.banned_reason && (
                        <p className="mt-1 text-[10px] text-red-600 dark:text-red-400">{t("封禁原因:")} {u.banned_reason}</p>
                      )}
                    </div>
                    <div className="ml-2 flex shrink-0 gap-1">
                      <Link href={adminUserLink(u.id)}>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 gap-1 px-2 text-[11px]"
                        >
                          <Settings2 className="h-3 w-3" strokeWidth={1.5} />
                          {t("管理")}
                        </Button>
                      </Link>
                      {u.role === "admin" ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 gap-1 px-2 text-[11px]"
                          onClick={() => setAdmin(u.id, false)}
                          disabled={actionLoading === u.id}
                        >
                          {actionLoading === u.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />}
                          {t("取消管理")}
                        </Button>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-7 gap-1 px-2 text-[11px]"
                            onClick={() => setAdmin(u.id, true)}
                            disabled={actionLoading === u.id}
                          >
                            {actionLoading === u.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />}
                            {t("设为管理")}
                          </Button>
                          {u.banned ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-7 gap-1 px-2 text-[11px]"
                              onClick={() => unbanUser(u.id)}
                              disabled={actionLoading === u.id}
                            >
                              {actionLoading === u.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                              {t("解封")}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-7 gap-1 px-2 text-[11px] text-red-600 dark:text-red-400 hover:text-red-700"
                              onClick={() => {
                                const reason = prompt(t("封禁原因:"));
                                if (reason) banUser(u.id, reason);
                              }}
                              disabled={actionLoading === u.id}
                            >
                              {actionLoading === u.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Ban className="h-3 w-3" />}
                              {t("封禁")}
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* === Cars Tab === */}
        {tab === "cars" && (
          <div className="mt-4">
            <Input
              className="h-9 text-xs"
              placeholder={t("搜索车辆...")}
              value={carSearch}
              onChange={(e) => setCarSearch(e.target.value)}
            />
            <div className="mt-3 space-y-2">
              {filteredCars.length === 0 ? (
                <p className="py-12 text-center text-xs text-muted-foreground">{t("无匹配车辆")}</p>
              ) : (
                filteredCars.map((car) => (
                  <div key={car.id} className={`flex items-center gap-3 rounded-xl p-2 ${car.status === "removed" ? "bg-red-500/10 opacity-60" : "bg-card"}`}>
                    <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {car.image_url ? (
                        <img src={car.image_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">{t("无图")}</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-xs font-medium">{carTitle(car, locale)}</p>
                        <span className={`shrink-0 rounded-full px-1 py-0.5 text-[10px] ${
                          car.status === "active" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : car.status === "sold" ? "bg-blue-500/10 text-blue-600"
                            : carExpired(car) ? "bg-orange-500/10 text-orange-600"
                            : car.status === "removed" ? "bg-red-500/10 text-red-600 dark:text-red-400"
                            : "bg-amber-500/10 text-amber-600"
                        }`}>
                          {car.status === "active" ? t("在售") : car.status === "sold" ? t("已售") : carExpired(car) ? t("已过期") : car.status === "removed" ? t("已下架") : t("待审")}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        ${car.price?.toLocaleString()} · {car.mileage?.toLocaleString()}mi · {car.location}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => window.open(`/car/${car.id}`, "_blank")}
                        title={t("查看")}
                      >
                        <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => window.open(carEditLink(car.id), "_blank")}
                        title={t("编辑")}
                      >
                        <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </Button>
                      {car.status === "active" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-amber-600 hover:text-amber-700"
                          onClick={() => removeCar(car.id)}
                          disabled={actionLoading === car.id}
                          title={t("下架")}
                        >
                          {actionLoading === car.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3.5 w-3.5" strokeWidth={1.5} />}
                        </Button>
                      ) : car.status === "removed" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700"
                          onClick={() => restoreCar(car.id)}
                          disabled={actionLoading === car.id}
                          title={t("重新上架")}
                        >
                          {actionLoading === car.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3.5 w-3.5" strokeWidth={2} />}
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-red-600 dark:text-red-400 hover:text-red-700"
                        onClick={() => deleteCarPermanent(car.id)}
                        disabled={actionLoading === car.id}
                        title={t("永久删除")}
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* === Reports Tab === */}
        {tab === "reports" && (
          <div className="mt-4 space-y-3">
            {reports.length === 0 ? (
              <p className="py-12 text-center text-xs text-muted-foreground">{t("暂无举报")}</p>
            ) : (
              reports.map((r) => (
                <div key={r.id} className="rounded-xl bg-card p-3">
                  <div className="flex items-start gap-3">
                    {r.cars?.image_url && (
                      <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                        <img src={r.cars.image_url} alt="" className="h-full w-full object-cover" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">
                        {(r.target_type ?? "car") === "car"
                          ? r.cars?.title_zh || t("未知车辆")
                          : t(REPORT_TYPE_LABELS[r.target_type!] || r.target_type!)}
                      </p>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-red-500/10 px-1 py-0.5 text-[10px] text-red-600 dark:text-red-400">
                          <AlertTriangle className="h-2.5 w-2.5" strokeWidth={2} />
                          {r.reason}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString("zh-CN")}
                        </span>
                      </div>
                      {r.detail && <p className="mt-1 text-[11px] text-muted-foreground">{r.detail}</p>}
                    </div>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-7 gap-1 px-2 text-[11px] text-red-600 dark:text-red-400 hover:text-red-700"
                      onClick={() => r.cars && removeCarFromReport(r.id, r.cars.id)}
                      disabled={actionLoading === r.id || !r.cars}
                    >
                      {actionLoading === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                      {t("下架车辆")}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1 px-2 text-[11px]"
                      onClick={() => dismissReport(r.id)}
                      disabled={actionLoading === r.id}
                    >
                      <X className="h-3 w-3" strokeWidth={2} />
                      {t("忽略")}
                    </Button>
                    {r.cars && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 gap-1 px-2 text-[11px]"
                        onClick={() => window.open(`/car/${r.cars!.id}`, "_blank")}
                      >
                        <Eye className="h-3 w-3" strokeWidth={1.5} />
                        {t("查看")}
                      </Button>
                    )}
                    {!r.cars && r.target_id && (r.target_type === "post" || r.target_type === "user") && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 gap-1 px-2 text-[11px]"
                        onClick={() =>
                          window.open(
                            r.target_type === "post"
                              ? `/community/${r.target_id}`
                              : `/user/${r.target_id}`,
                            "_blank",
                          )
                        }
                      >
                        <Eye className="h-3 w-3" strokeWidth={1.5} />
                        {t("查看")}
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* === AI Moderation Tab === */}
        {tab === "aimod" && (
          <div className="mt-4 space-y-3">
            {aiFlags.length === 0 ? (
              <p className="py-12 text-center text-xs text-muted-foreground">{t("暂无 AI 拦截内容")}</p>
            ) : (
              aiFlags.map((f) => {
                const target = AIMOD_TARGETS[f.target_type];
                return (
                  <div key={f.id} className="rounded-xl bg-card p-3">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        <Bot className="h-2.5 w-2.5" strokeWidth={1.5} />
                        {t(target.label)}
                      </span>
                      {f.categories.map((c) => (
                        <span key={c} className="rounded-full bg-red-500/10 px-1.5 py-0.5 text-[10px] text-red-600 dark:text-red-400">
                          {c}
                        </span>
                      ))}
                      <span className="ml-auto text-[10px] text-muted-foreground">
                        {new Date(f.created_at).toLocaleString("zh-CN")}
                      </span>
                    </div>
                    {f.reason && (
                      <p className="mt-1.5 flex items-start gap-1 text-[11px] text-red-600 dark:text-red-400">
                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" strokeWidth={1.5} />
                        {f.reason}
                      </p>
                    )}
                    {/* 被拦内容快照(拦截时的原文,恢复前唯一可读处) */}
                    <p className="mt-1.5 line-clamp-4 whitespace-pre-wrap rounded-lg bg-muted/50 p-2 text-[11px] leading-relaxed text-muted-foreground">
                      {f.content}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 gap-1 px-2 text-[11px] text-emerald-600 dark:text-emerald-400 hover:text-emerald-700"
                        onClick={() => restoreAiFlag(f)}
                        disabled={actionLoading === f.id}
                      >
                        {actionLoading === f.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" strokeWidth={2} />}
                        {t("恢复")}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 gap-1 px-2 text-[11px] text-red-600 dark:text-red-400 hover:text-red-700"
                        onClick={() => confirmAiFlag(f)}
                        disabled={actionLoading === f.id}
                      >
                        <Ban className="h-3 w-3" strokeWidth={1.5} />
                        {t("确认屏蔽")}
                      </Button>
                      {target.link && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 gap-1 px-2 text-[11px]"
                          onClick={() => window.open(target.link!(f.target_id), "_blank")}
                        >
                          <Eye className="h-3 w-3" strokeWidth={1.5} />
                          {t("查看")}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* === Tickets Tab === */}
        {tab === "tickets" && (
          <div className="mt-4 space-y-3">
            {tickets.length === 0 ? (
              <p className="py-12 text-center text-xs text-muted-foreground">{t("暂无工单")}</p>
            ) : (
              tickets.map((tk) => (
                <div key={tk.id} className="rounded-xl bg-card p-3">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] ${
                          tk.type === "contact" ? "bg-blue-500/10 text-blue-600" : "bg-purple-500/10 text-purple-600"
                        }`}>
                          {tk.type === "contact" ? (
                            <><Headset className="h-2.5 w-2.5" strokeWidth={2} />{t("客服咨询")}</>
                          ) : (
                            <><Handshake className="h-2.5 w-2.5" strokeWidth={2} />{t("商业合作")}</>
                          )}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(tk.created_at).toLocaleString("zh-CN")}
                        </span>
                      </div>
                      <div className="mt-1.5 space-y-0.5">
                        {tk.profiles?.username && (
                          <p className="text-[11px]"><span className="text-muted-foreground">{t("用户:")}</span> {tk.profiles.username}</p>
                        )}
                        {tk.name && (
                          <p className="text-[11px]"><span className="text-muted-foreground">{t("姓名:")}</span> {tk.name}</p>
                        )}
                        {tk.company && (
                          <p className="text-[11px]"><span className="text-muted-foreground">{t("公司:")}</span> {tk.company}</p>
                        )}
                        {tk.email && (
                          <p className="text-[11px]"><span className="text-muted-foreground">{t("邮箱:")}</span> {tk.email}</p>
                        )}
                        {tk.phone && (
                          <p className="text-[11px]"><span className="text-muted-foreground">{t("电话:")}</span> {tk.phone}</p>
                        )}
                        {tk.cooperation_type && (
                          <p className="text-[11px]"><span className="text-muted-foreground">{t("类型:")}</span> {tk.cooperation_type}</p>
                        )}
                      </div>
                      <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed">{tk.message}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-2">
                    {tk.email && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 gap-1 px-2 text-[11px]"
                        onClick={() => window.open(`mailto:${tk.email}`)}
                      >
                        <MessageSquare className="h-3 w-3" strokeWidth={1.5} />
                        {t("回复邮件")}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1 px-2 text-[11px]"
                      onClick={() => closeTicket(tk.id)}
                      disabled={actionLoading === tk.id}
                    >
                      {actionLoading === tk.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" strokeWidth={2} />}
                      {t("关闭工单")}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* === Sources Tab === */}
        {tab === "sources" && (
          <div className="mt-4 space-y-3">
            {!sourcesLoaded ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : sources.length === 0 ? (
              <p className="py-12 text-center text-xs text-muted-foreground">{t("暂无数据源")}</p>
            ) : (
              sources.map((s) => {
                const d = s.last_sync_detail;
                const syncing = syncingKey === s.key;
                const result = syncResults[s.id];
                return (
                  <div key={s.id} className={`rounded-xl bg-card p-3 ${s.enabled ? "" : "opacity-60"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-xs font-medium">{s.name}</p>
                          <span className="shrink-0 rounded-full bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">{s.key}</span>
                          {!s.enabled && (
                            <span className="shrink-0 rounded-full bg-red-500/10 px-1 py-0.5 text-[10px] text-red-600 dark:text-red-400">{t("已停用")}</span>
                          )}
                        </div>
                        <a
                          href={s.base_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-0.5 inline-flex items-center gap-0.5 text-[10px] text-muted-foreground hover:underline"
                        >
                          {s.base_url}
                          <ExternalLink className="h-2.5 w-2.5" strokeWidth={1.5} />
                        </a>
                        <p className="text-[10px] text-muted-foreground">
                          {t("系统账号:")}{" "}
                          <Link href={adminUserLink(s.system_account_id)} className="hover:underline">
                            {s.system_account_id.slice(0, 8)}...
                            <ChevronRight className="inline h-2.5 w-2.5" strokeWidth={1.5} />
                          </Link>
                          {" "}· {t("在库 {n} 辆", { n: sourceCounts[s.id] ?? 0 })}
                        </p>
                      </div>
                      {syncing || s.last_sync_status === "running" ? (
                        <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          <Loader2 className="h-2.5 w-2.5 animate-spin" />{t("同步中")}
                        </span>
                      ) : s.last_sync_status === "success" ? (
                        <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-600 dark:text-emerald-400">
                          <Check className="h-2.5 w-2.5" strokeWidth={2} />{t("成功")}
                        </span>
                      ) : s.last_sync_status === "partial" ? (
                        <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-600">
                          <AlertTriangle className="h-2.5 w-2.5" strokeWidth={2} />{t("部分成功")}
                        </span>
                      ) : s.last_sync_status === "error" ? (
                        <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-red-500/10 px-1.5 py-0.5 text-[10px] text-red-600 dark:text-red-400">
                          <XCircle className="h-2.5 w-2.5" strokeWidth={2} />{t("失败")}
                        </span>
                      ) : (
                        <span className="shrink-0 text-[10px] text-muted-foreground">—</span>
                      )}
                    </div>

                    {/* Last sync */}
                    <div className="mt-2 border-t border-border pt-2">
                      <p className="text-[10px] text-muted-foreground">
                        {t("上次同步:")}{" "}
                        {s.last_sync_at ? (
                          <span title={new Date(s.last_sync_at).toLocaleString("zh-CN")}>
                            {relativeTime(s.last_sync_at, t)}
                          </span>
                        ) : t("从未同步")}
                      </p>
                      {d && (
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          {t("发现 {found} · 新增 {inserted} · 更新 {updated} · 下架 {delisted} · 耗时 {sec}s", { found: d.found ?? 0, inserted: d.inserted ?? 0, updated: d.updated ?? 0, delisted: d.delisted ?? 0, sec: ((d.duration_ms ?? 0) / 1000).toFixed(1) })}
                          {d.mirrored != null ? ` · ${t("图片转存 {n}", { n: d.mirrored })}` : ""}
                        </p>
                      )}
                      {d?.errors && d.errors.length > 0 && (
                        <>
                          <button
                            className="mt-0.5 text-left text-[10px] text-red-600 dark:text-red-400 hover:underline"
                            title={d.errors.slice(0, 3).join("\n")}
                            onClick={() => setExpandedErrors((prev) => ({ ...prev, [s.id]: !prev[s.id] }))}
                          >
                            {t("错误 {n} 条", { n: d.errors.length })} {expandedErrors[s.id] ? t("收起") : t("展开")}
                          </button>
                          {expandedErrors[s.id] && (
                            <div className="mt-1 max-h-32 space-y-0.5 overflow-y-auto rounded-xl bg-red-50 p-2 dark:bg-red-950/20">
                              {d.errors.map((err, i) => (
                                <p key={i} className="break-all text-[10px] text-red-600 dark:text-red-400">{err}</p>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="mt-2 flex items-center gap-2">
                      <Button
                        size="sm"
                        className="h-7 gap-1 px-2 text-[11px]"
                        onClick={() => syncSource(s)}
                        disabled={syncingKey !== null || !s.enabled}
                      >
                        {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" strokeWidth={1.5} />}
                        {syncing ? t("同步中...") : t("立即同步")}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className={`h-7 gap-1 px-2 text-[11px] ${s.enabled ? "text-red-600 dark:text-red-400 hover:text-red-700" : "text-emerald-600 dark:text-emerald-400 hover:text-emerald-700"}`}
                        onClick={() => toggleSource(s.id, !s.enabled)}
                        disabled={actionLoading === s.id || syncing}
                      >
                        {actionLoading === s.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : s.enabled ? (
                          <XCircle className="h-3 w-3" strokeWidth={1.5} />
                        ) : (
                          <Check className="h-3 w-3" strokeWidth={2} />
                        )}
                        {s.enabled ? t("停用") : t("启用")}
                      </Button>
                    </div>
                    {result && (
                      <p className={`mt-1.5 text-[10px] ${result.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                        {result.text}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
          </div>
        </div>
      </div>
    </div>
  );
}

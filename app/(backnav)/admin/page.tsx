"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck, Users, Car, Flag, Store, Ban, Eye, Trash2, Check, X,
  Loader2, ChevronRight, AlertTriangle, Clock, XCircle, MessageSquare,
  Headset, Handshake, Pencil, Settings2, DatabaseZap, RefreshCw, ExternalLink,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { carEditLink, adminUserLink } from "@/lib/static-link";
import { avatarUrl } from "@/lib/avatar";
import { Header } from "@/components/header";
import { DesktopBack } from "@/components/desktop-back";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { DbProfile, DbCar, DbDealerStore, DbListingSource } from "@/lib/types";

type Tab = "verifications" | "users" | "cars" | "reports" | "tickets" | "sources";

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

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "刚刚";
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小时前`;
  return new Date(iso).toLocaleString("zh-CN");
}

interface Report {
  id: string;
  car_id: string;
  user_id: string | null;
  reason: string;
  detail: string | null;
  created_at: string;
  cars?: { id: string; title_zh: string; image_url: string | null; seller_id: string };
}

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

interface StoreWithOwner extends DbDealerStore {
  profiles?: { username: string; avatar_url: string | null; account_type: string };
}

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState<Tab>("verifications");

  // Data
  const [pendingStores, setPendingStores] = useState<StoreWithOwner[]>([]);
  const [users, setUsers] = useState<DbProfile[]>([]);
  const [cars, setCars] = useState<DbCar[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
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

  // Action loading
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Verification note input
  const [rejectNote, setRejectNote] = useState<Record<string, string>>({});

  // Counts
  const [counts, setCounts] = useState({ verifications: 0, reports: 0, tickets: 0 });

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
    const [storesRes, reportsRes, ticketsRes] = await Promise.all([
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
    ]);

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
    setCounts({
      verifications: storesRes.data?.length || 0,
      reports: reportsRes.data?.length || 0,
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
    if (!note.trim()) { alert("请填写拒绝原因"); return; }
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
    if (!confirm("永久删除这辆车？此操作不可恢复。")) return;
    setActionLoading(carId);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("cars").delete().eq("id", carId);
    if (error) { alert(`删除失败: ${error.message}`); setActionLoading(null); return; }
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
      if (!token) throw new Error("未登录或会话已过期");
      // 同步约 65 辆车需 1-2 分钟，fetch 会长时间挂起
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ key: source.key, force: true }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || `同步失败 (HTTP ${res.status})`);
      const results = (json.results || []) as SyncResult[];
      const r = results.find((x) => x.key === source.key) || results[0];
      if (!r) throw new Error("同步未返回结果");
      const text = r.status === "skipped"
        ? "已跳过（数据源未启用或正在同步）"
        : `新增 ${r.inserted ?? 0} · 更新 ${r.updated ?? 0} · 下架 ${r.delisted ?? 0}${r.errors?.length ? ` · 错误 ${r.errors.length}` : ""}`;
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
        [source.id]: { ok: false, text: e instanceof Error ? e.message : "同步失败" },
      }));
    } finally {
      setSyncingKey(null);
      await loadSources();
    }
  }

  // === Filtered lists ===

  const filteredUsers = userSearch
    ? users.filter((u) =>
        u.username?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.id.includes(userSearch)
      )
    : users;

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
    { key: "verifications", label: "认证", icon: <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.5} />, count: counts.verifications },
    { key: "users", label: "用户", icon: <Users className="h-3.5 w-3.5" strokeWidth={1.5} /> },
    { key: "cars", label: "车辆", icon: <Car className="h-3.5 w-3.5" strokeWidth={1.5} /> },
    { key: "reports", label: "举报", icon: <Flag className="h-3.5 w-3.5" strokeWidth={1.5} />, count: counts.reports },
    { key: "tickets", label: "工单", icon: <Headset className="h-3.5 w-3.5" strokeWidth={1.5} />, count: counts.tickets },
    { key: "sources", label: "数据源", icon: <DatabaseZap className="h-3.5 w-3.5" strokeWidth={1.5} /> },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      <div className="mx-auto w-full max-w-2xl px-4 py-4 md:py-8">
        <DesktopBack />
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          <ShieldCheck className="h-5 w-5" strokeWidth={1.5} />
          管理后台
        </h1>

        {/* Tabs */}
        <div className="mt-4 flex gap-1.5 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => handleTabChange(t.key)}
              className={`relative flex shrink-0 items-center gap-1 border px-3 py-2 text-xs transition-colors ${
                tab === t.key
                  ? "border-foreground bg-foreground text-background"
                  : "border-border hover:border-foreground/30"
              }`}
            >
              {t.icon}
              {t.label}
              {t.count ? (
                <span className={`ml-0.5 flex h-4 min-w-4 items-center justify-center px-1 text-[10px] ${
                  tab === t.key ? "bg-background text-foreground" : "bg-foreground text-background"
                }`}>
                  {t.count}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {/* === Verifications Tab === */}
        {tab === "verifications" && (
          <div className="mt-4 space-y-3">
            {pendingStores.length === 0 ? (
              <p className="py-12 text-center text-xs text-muted-foreground">暂无待审核的认证申请</p>
            ) : (
              pendingStores.map((store) => (
                <div key={store.id} className="border border-border p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium">{store.name}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        车主: {store.profiles?.username || "未知"} · {store.address}
                      </p>
                      {store.phone && <p className="text-[11px] text-muted-foreground">电话: {store.phone}</p>}
                      {store.wechat && <p className="text-[11px] text-muted-foreground">微信: {store.wechat}</p>}
                      <p className="text-[11px] text-muted-foreground">
                        提交时间: {store.verification_submitted_at ? new Date(store.verification_submitted_at).toLocaleString("zh-CN") : "-"}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-0.5 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-600">
                      <Clock className="h-3 w-3" strokeWidth={1.5} />待审
                    </span>
                  </div>

                  {/* Store photos */}
                  {store.store_photos.length > 0 && (
                    <div className="mt-2 flex gap-2 overflow-x-auto">
                      {store.store_photos.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block h-20 w-28 shrink-0 overflow-hidden border border-border bg-muted">
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
                        通过
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-xs text-red-600 hover:text-red-700"
                        onClick={() => rejectStore(store.id)}
                        disabled={actionLoading === store.id || !rejectNote[store.id]?.trim()}
                      >
                        <X className="h-3 w-3" strokeWidth={2} />
                        拒绝
                      </Button>
                    </div>
                    <Input
                      className="h-8 text-xs"
                      placeholder="拒绝原因（拒绝时必填）"
                      value={rejectNote[store.id] || ""}
                      onChange={(e) => setRejectNote((prev) => ({ ...prev, [store.id]: e.target.value }))}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* === Users Tab === */}
        {tab === "users" && (
          <div className="mt-4">
            <Input
              className="h-9 text-xs"
              placeholder="搜索用户名或ID..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
            <div className="mt-3 space-y-2">
              {filteredUsers.length === 0 ? (
                <p className="py-12 text-center text-xs text-muted-foreground">无匹配用户</p>
              ) : (
                filteredUsers.map((u) => (
                  <div key={u.id} className={`flex items-center justify-between border p-3 ${u.banned ? "border-red-300 bg-red-50 dark:bg-red-950/20" : "border-border"}`}>
                    <div className="min-w-0 flex-1">
                      <Link href={adminUserLink(u.id)} className="flex items-center gap-2 hover:opacity-80">
                        <img src={avatarUrl(u.avatar_url, u.username)} alt="" className="h-8 w-8 shrink-0 rounded-full border border-border object-cover" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-xs font-medium hover:underline">{u.username || "未设置"}</p>
                            {u.account_type === "dealer" && (
                              <span className="shrink-0 bg-muted px-1 py-0.5 text-[10px]">车行</span>
                            )}
                            {u.role === "admin" && (
                              <span className="shrink-0 bg-foreground px-1 py-0.5 text-[10px] text-background">管理员</span>
                            )}
                            {u.banned && (
                              <span className="shrink-0 bg-red-500/10 px-1 py-0.5 text-[10px] text-red-600">已封禁</span>
                            )}
                          </div>
                          <p className="truncate text-[10px] text-muted-foreground">
                            {u.id.slice(0, 8)}... · {u.location || "未知地区"} · {new Date(u.created_at).toLocaleDateString("zh-CN")}
                          </p>
                        </div>
                      </Link>
                      {u.banned && u.banned_reason && (
                        <p className="mt-1 text-[10px] text-red-600">封禁原因: {u.banned_reason}</p>
                      )}
                    </div>
                    <div className="ml-2 flex shrink-0 gap-1">
                      <Link href={adminUserLink(u.id)}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 px-2 text-[11px]"
                        >
                          <Settings2 className="h-3 w-3" strokeWidth={1.5} />
                          管理
                        </Button>
                      </Link>
                      {u.role === "admin" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 px-2 text-[11px]"
                          onClick={() => setAdmin(u.id, false)}
                          disabled={actionLoading === u.id}
                        >
                          {actionLoading === u.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />}
                          取消管理
                        </Button>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1 px-2 text-[11px]"
                            onClick={() => setAdmin(u.id, true)}
                            disabled={actionLoading === u.id}
                          >
                            {actionLoading === u.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />}
                            设为管理
                          </Button>
                          {u.banned ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 gap-1 px-2 text-[11px]"
                              onClick={() => unbanUser(u.id)}
                              disabled={actionLoading === u.id}
                            >
                              {actionLoading === u.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                              解封
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 gap-1 px-2 text-[11px] text-red-600 hover:text-red-700"
                              onClick={() => {
                                const reason = prompt("封禁原因:");
                                if (reason) banUser(u.id, reason);
                              }}
                              disabled={actionLoading === u.id}
                            >
                              {actionLoading === u.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Ban className="h-3 w-3" />}
                              封禁
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
              placeholder="搜索车辆..."
              value={carSearch}
              onChange={(e) => setCarSearch(e.target.value)}
            />
            <div className="mt-3 space-y-2">
              {filteredCars.length === 0 ? (
                <p className="py-12 text-center text-xs text-muted-foreground">无匹配车辆</p>
              ) : (
                filteredCars.map((car) => (
                  <div key={car.id} className={`flex items-center gap-3 border p-2 ${car.status === "removed" ? "border-red-300 opacity-60" : "border-border"}`}>
                    <div className="h-14 w-20 shrink-0 overflow-hidden border border-border bg-muted">
                      {car.image_url ? (
                        <img src={car.image_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">无图</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-xs font-medium">{car.title_zh || car.title}</p>
                        <span className={`shrink-0 px-1 py-0.5 text-[10px] ${
                          car.status === "active" ? "bg-emerald-500/10 text-emerald-600"
                            : car.status === "sold" ? "bg-blue-500/10 text-blue-600"
                            : carExpired(car) ? "bg-orange-500/10 text-orange-600"
                            : car.status === "removed" ? "bg-red-500/10 text-red-600"
                            : "bg-amber-500/10 text-amber-600"
                        }`}>
                          {car.status === "active" ? "在售" : car.status === "sold" ? "已售" : carExpired(car) ? "已过期" : car.status === "removed" ? "已下架" : "待审"}
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
                        title="查看"
                      >
                        <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => window.open(carEditLink(car.id), "_blank")}
                        title="编辑"
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
                          title="下架"
                        >
                          {actionLoading === car.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3.5 w-3.5" strokeWidth={1.5} />}
                        </Button>
                      ) : car.status === "removed" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700"
                          onClick={() => restoreCar(car.id)}
                          disabled={actionLoading === car.id}
                          title="重新上架"
                        >
                          {actionLoading === car.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3.5 w-3.5" strokeWidth={2} />}
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                        onClick={() => deleteCarPermanent(car.id)}
                        disabled={actionLoading === car.id}
                        title="永久删除"
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
              <p className="py-12 text-center text-xs text-muted-foreground">暂无举报</p>
            ) : (
              reports.map((r) => (
                <div key={r.id} className="border border-border p-3">
                  <div className="flex items-start gap-3">
                    {r.cars?.image_url && (
                      <div className="h-14 w-20 shrink-0 overflow-hidden border border-border bg-muted">
                        <img src={r.cars.image_url} alt="" className="h-full w-full object-cover" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{r.cars?.title_zh || "未知车辆"}</p>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-0.5 bg-red-500/10 px-1 py-0.5 text-[10px] text-red-600">
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
                      variant="outline"
                      className="h-7 gap-1 px-2 text-[11px] text-red-600 hover:text-red-700"
                      onClick={() => r.cars && removeCarFromReport(r.id, r.cars.id)}
                      disabled={actionLoading === r.id || !r.cars}
                    >
                      {actionLoading === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                      下架车辆
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1 px-2 text-[11px]"
                      onClick={() => dismissReport(r.id)}
                      disabled={actionLoading === r.id}
                    >
                      <X className="h-3 w-3" strokeWidth={2} />
                      忽略
                    </Button>
                    {r.cars && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 gap-1 px-2 text-[11px]"
                        onClick={() => window.open(`/car/${r.cars!.id}`, "_blank")}
                      >
                        <Eye className="h-3 w-3" strokeWidth={1.5} />
                        查看
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* === Tickets Tab === */}
        {tab === "tickets" && (
          <div className="mt-4 space-y-3">
            {tickets.length === 0 ? (
              <p className="py-12 text-center text-xs text-muted-foreground">暂无工单</p>
            ) : (
              tickets.map((t) => (
                <div key={t.id} className="border border-border p-3">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] ${
                          t.type === "contact" ? "bg-blue-500/10 text-blue-600" : "bg-purple-500/10 text-purple-600"
                        }`}>
                          {t.type === "contact" ? (
                            <><Headset className="h-2.5 w-2.5" strokeWidth={2} />客服咨询</>
                          ) : (
                            <><Handshake className="h-2.5 w-2.5" strokeWidth={2} />商业合作</>
                          )}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(t.created_at).toLocaleString("zh-CN")}
                        </span>
                      </div>
                      <div className="mt-1.5 space-y-0.5">
                        {t.profiles?.username && (
                          <p className="text-[11px]"><span className="text-muted-foreground">用户:</span> {t.profiles.username}</p>
                        )}
                        {t.name && (
                          <p className="text-[11px]"><span className="text-muted-foreground">姓名:</span> {t.name}</p>
                        )}
                        {t.company && (
                          <p className="text-[11px]"><span className="text-muted-foreground">公司:</span> {t.company}</p>
                        )}
                        {t.email && (
                          <p className="text-[11px]"><span className="text-muted-foreground">邮箱:</span> {t.email}</p>
                        )}
                        {t.phone && (
                          <p className="text-[11px]"><span className="text-muted-foreground">电话:</span> {t.phone}</p>
                        )}
                        {t.cooperation_type && (
                          <p className="text-[11px]"><span className="text-muted-foreground">类型:</span> {t.cooperation_type}</p>
                        )}
                      </div>
                      <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed">{t.message}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-2">
                    {t.email && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1 px-2 text-[11px]"
                        onClick={() => window.open(`mailto:${t.email}`)}
                      >
                        <MessageSquare className="h-3 w-3" strokeWidth={1.5} />
                        回复邮件
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1 px-2 text-[11px]"
                      onClick={() => closeTicket(t.id)}
                      disabled={actionLoading === t.id}
                    >
                      {actionLoading === t.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" strokeWidth={2} />}
                      关闭工单
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
              <p className="py-12 text-center text-xs text-muted-foreground">暂无数据源</p>
            ) : (
              sources.map((s) => {
                const d = s.last_sync_detail;
                const syncing = syncingKey === s.key;
                const result = syncResults[s.id];
                return (
                  <div key={s.id} className={`border border-border p-3 ${s.enabled ? "" : "opacity-60"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-xs font-medium">{s.name}</p>
                          <span className="shrink-0 bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">{s.key}</span>
                          {!s.enabled && (
                            <span className="shrink-0 bg-red-500/10 px-1 py-0.5 text-[10px] text-red-600">已停用</span>
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
                          系统账号:{" "}
                          <Link href={adminUserLink(s.system_account_id)} className="hover:underline">
                            {s.system_account_id.slice(0, 8)}...
                            <ChevronRight className="inline h-2.5 w-2.5" strokeWidth={1.5} />
                          </Link>
                          {" "}· 在库 {sourceCounts[s.id] ?? 0} 辆
                        </p>
                      </div>
                      {syncing || s.last_sync_status === "running" ? (
                        <span className="inline-flex shrink-0 items-center gap-0.5 bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          <Loader2 className="h-2.5 w-2.5 animate-spin" />同步中
                        </span>
                      ) : s.last_sync_status === "success" ? (
                        <span className="inline-flex shrink-0 items-center gap-0.5 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-600">
                          <Check className="h-2.5 w-2.5" strokeWidth={2} />成功
                        </span>
                      ) : s.last_sync_status === "partial" ? (
                        <span className="inline-flex shrink-0 items-center gap-0.5 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-600">
                          <AlertTriangle className="h-2.5 w-2.5" strokeWidth={2} />部分成功
                        </span>
                      ) : s.last_sync_status === "error" ? (
                        <span className="inline-flex shrink-0 items-center gap-0.5 bg-red-500/10 px-1.5 py-0.5 text-[10px] text-red-600">
                          <XCircle className="h-2.5 w-2.5" strokeWidth={2} />失败
                        </span>
                      ) : (
                        <span className="shrink-0 text-[10px] text-muted-foreground">—</span>
                      )}
                    </div>

                    {/* Last sync */}
                    <div className="mt-2 border-t border-border pt-2">
                      <p className="text-[10px] text-muted-foreground">
                        上次同步:{" "}
                        {s.last_sync_at ? (
                          <span title={new Date(s.last_sync_at).toLocaleString("zh-CN")}>
                            {relativeTime(s.last_sync_at)}
                          </span>
                        ) : "从未同步"}
                      </p>
                      {d && (
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          发现 {d.found ?? 0} · 新增 {d.inserted ?? 0} · 更新 {d.updated ?? 0} · 下架 {d.delisted ?? 0} · 耗时 {((d.duration_ms ?? 0) / 1000).toFixed(1)}s
                        </p>
                      )}
                      {d?.errors && d.errors.length > 0 && (
                        <>
                          <button
                            className="mt-0.5 text-left text-[10px] text-red-600 hover:underline"
                            title={d.errors.slice(0, 3).join("\n")}
                            onClick={() => setExpandedErrors((prev) => ({ ...prev, [s.id]: !prev[s.id] }))}
                          >
                            错误 {d.errors.length} 条 {expandedErrors[s.id] ? "收起" : "展开"}
                          </button>
                          {expandedErrors[s.id] && (
                            <div className="mt-1 max-h-32 space-y-0.5 overflow-y-auto border border-red-300 bg-red-50 p-2 dark:bg-red-950/20">
                              {d.errors.map((err, i) => (
                                <p key={i} className="break-all text-[10px] text-red-600">{err}</p>
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
                        {syncing ? "同步中..." : "立即同步"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className={`h-7 gap-1 px-2 text-[11px] ${s.enabled ? "text-red-600 hover:text-red-700" : "text-emerald-600 hover:text-emerald-700"}`}
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
                        {s.enabled ? "停用" : "启用"}
                      </Button>
                    </div>
                    {result && (
                      <p className={`mt-1.5 text-[10px] ${result.ok ? "text-emerald-600" : "text-red-600"}`}>
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
  );
}

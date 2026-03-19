"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck, Users, Car, Flag, Store, Ban, Eye, Trash2, Check, X,
  Loader2, ChevronRight, AlertTriangle, Clock, XCircle, MessageSquare,
  Headset, Handshake,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { DbProfile, DbCar, DbDealerStore } from "@/lib/types";

type Tab = "verifications" | "users" | "cars" | "reports" | "tickets";

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

  async function handleTabChange(t: Tab) {
    setTab(t);
    if (t === "users" && users.length === 0) await loadUsers();
    if (t === "cars" && cars.length === 0) await loadCars();
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
    await supabase.from("cars").update({ status: "active" }).eq("id", carId);
    setCars((prev) => prev.map((c) => c.id === carId ? { ...c, status: "active" as const } : c));
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

  // === Filtered lists ===

  const filteredUsers = userSearch
    ? users.filter((u) =>
        u.username?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.id.includes(userSearch)
      )
    : users;

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
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <div className="mx-auto w-full max-w-2xl px-4 py-4">
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
                      <div className="flex items-center gap-2">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" className="h-8 w-8 shrink-0 rounded-full border border-border object-cover" />
                        ) : (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground">无</div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-xs font-medium">{u.username || "未设置"}</p>
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
                      </div>
                      {u.banned && u.banned_reason && (
                        <p className="mt-1 text-[10px] text-red-600">封禁原因: {u.banned_reason}</p>
                      )}
                    </div>
                    <div className="ml-2 flex shrink-0 gap-1">
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
                            : car.status === "removed" ? "bg-red-500/10 text-red-600"
                            : "bg-amber-500/10 text-amber-600"
                        }`}>
                          {car.status === "active" ? "在售" : car.status === "sold" ? "已售" : car.status === "removed" ? "已下架" : "待审"}
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
                      >
                        <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </Button>
                      {car.status === "active" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                          onClick={() => removeCar(car.id)}
                          disabled={actionLoading === car.id}
                        >
                          {actionLoading === car.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />}
                        </Button>
                      ) : car.status === "removed" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700"
                          onClick={() => restoreCar(car.id)}
                          disabled={actionLoading === car.id}
                        >
                          {actionLoading === car.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3.5 w-3.5" strokeWidth={2} />}
                        </Button>
                      ) : null}
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
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useRouteParams } from "@/lib/use-route-params";
import {
  Ban, Check, Loader2, Trash2, Eye, Pencil, Store,
  MessageSquare, Car, AlertTriangle, Save, Mail, Phone, Clock,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { avatarUrl } from "@/lib/avatar";
import { carLink, carEditLink } from "@/lib/static-link";
import { Header } from "@/components/header";
import { DesktopBack } from "@/components/desktop-back";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import type { DbProfile, DbCar, DbDealerStore } from "@/lib/types";

interface EditForm {
  username: string;
  phone: string;
  location: string;
  preferred_language: string;
  account_type: "private" | "dealer";
  role: "user" | "admin";
  banned: boolean;
  banned_reason: string;
}

const STATUS_LABEL: Record<string, string> = {
  active: "在售", sold: "已售", pending: "待审", removed: "已下架",
};

function carStatusLabel(c: DbCar): string {
  if (c.status === "removed" && c.expires_at && new Date(c.expires_at).getTime() < Date.now()) return "已过期";
  return STATUS_LABEL[c.status] || c.status;
}

export default function AdminUserManagePage() {
  const router = useRouter();
  const params = useRouteParams<{ id: string }>();
  const userId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selfId, setSelfId] = useState<string | null>(null);

  const [profile, setProfile] = useState<DbProfile | null>(null);
  const [cars, setCars] = useState<DbCar[]>([]);
  const [stores, setStores] = useState<DbDealerStore[]>([]);
  const [postCount, setPostCount] = useState(0);
  const [convCount, setConvCount] = useState(0);
  const [authInfo, setAuthInfo] = useState<{
    email: string | null;
    email_confirmed_at: string | null;
    phone: string | null;
    last_sign_in_at: string | null;
    auth_created_at: string | null;
  } | null>(null);

  const [form, setForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!userId) return;
    const [profRes, carsRes, storesRes, postRes, convBuyerRes, convSellerRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("cars").select("*").eq("seller_id", userId).order("created_at", { ascending: false }),
      supabase.from("dealer_stores").select("*").eq("owner_id", userId).order("created_at", { ascending: false }),
      supabase.from("community_posts").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("conversations").select("id", { count: "exact", head: true }).eq("buyer_id", userId),
      supabase.from("conversations").select("id", { count: "exact", head: true }).eq("seller_id", userId),
    ]);

    const p = profRes.data as DbProfile | null;
    setProfile(p);
    setCars((carsRes.data as DbCar[]) || []);
    setStores((storesRes.data as DbDealerStore[]) || []);
    setPostCount(postRes.count ?? 0);
    setConvCount((convBuyerRes.count ?? 0) + (convSellerRes.count ?? 0));

    // 邮箱等 auth 信息（auth.users 需经 RPC 读取）
    const { data: authRows } = await supabase.rpc("admin_get_auth_user", { target: userId });
    setAuthInfo(Array.isArray(authRows) && authRows.length > 0 ? authRows[0] : null);

    if (p) {
      setForm({
        username: p.username || "",
        phone: p.phone || "",
        location: p.location || "",
        preferred_language: p.preferred_language || "zh",
        account_type: p.account_type || "private",
        role: p.role || "user",
        banned: !!p.banned,
        banned_reason: p.banned_reason || "",
      });
    }
  }, [userId]);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setSelfId(user.id);

      const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (!me || me.role !== "admin") { router.push("/"); return; }
      setIsAdmin(true);

      await load();
      setLoading(false);
    }
    init();
  }, [router, load]);

  function upd<K extends keyof EditForm>(key: K, value: EditForm[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
    setSavedAt(false);
  }

  async function handleSave() {
    if (!form || !profile || !selfId) return;
    setError("");
    if (form.banned && !form.banned_reason.trim()) {
      setError("封禁需要填写原因");
      return;
    }
    setSaving(true);

    const wasBannedBefore = profile.banned;
    const { error: updErr } = await supabase
      .from("profiles")
      .update({
        username: form.username || null,
        phone: form.phone || null,
        location: form.location || null,
        preferred_language: form.preferred_language,
        account_type: form.account_type,
        role: form.role,
        banned: form.banned,
        banned_at: form.banned ? (profile.banned_at || new Date().toISOString()) : null,
        banned_reason: form.banned ? form.banned_reason : null,
      })
      .eq("id", userId);

    if (updErr) {
      setError(`保存失败: ${updErr.message}`);
      setSaving(false);
      return;
    }

    // 新封禁：连带下架其在售车源
    if (form.banned && !wasBannedBefore) {
      await supabase.from("cars").update({ status: "removed" }).eq("seller_id", userId).eq("status", "active");
    }

    await supabase.from("admin_actions").insert({
      admin_id: selfId,
      action: "edit_user",
      target_type: "user",
      target_id: userId,
      detail: form.banned && !wasBannedBefore ? `ban: ${form.banned_reason}` : "update_profile",
    });

    setSaving(false);
    setSavedAt(true);
    await load();
  }

  async function handleDeleteUser() {
    if (!profile) return;
    const confirmName = profile.username || userId.slice(0, 8);
    if (!confirm(`确定永久删除用户「${confirmName}」？\n\n将同时删除该用户的全部车源、帖子、评论、车行、对话等数据，操作不可恢复。`)) return;
    setError("");
    setDeleting(true);

    const { error: rpcErr } = await supabase.rpc("admin_delete_user", { target: userId });
    if (rpcErr) {
      setError(`删除失败: ${rpcErr.message}`);
      setDeleting(false);
      return;
    }
    if (selfId) {
      await supabase.from("admin_actions").insert({
        admin_id: selfId,
        action: "delete_user",
        target_type: "user",
        target_id: userId,
        detail: confirmName,
      });
    }
    router.push("/admin");
  }

  async function removeCar(carId: string) {
    setActionId(carId);
    await supabase.from("cars").update({ status: "removed" }).eq("id", carId);
    setCars((prev) => prev.map((c) => (c.id === carId ? { ...c, status: "removed" as const } : c)));
    setActionId(null);
  }

  async function restoreCar(carId: string) {
    setActionId(carId);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from("cars").update({ status: "active", expires_at: expiresAt }).eq("id", carId);
    setCars((prev) => prev.map((c) => (c.id === carId ? { ...c, status: "active" as const, expires_at: expiresAt } : c)));
    setActionId(null);
  }

  async function deleteCar(carId: string) {
    if (!confirm("永久删除这辆车？")) return;
    setActionId(carId);
    const { error: e } = await supabase.from("cars").delete().eq("id", carId);
    if (e) { alert(`删除失败: ${e.message}`); setActionId(null); return; }
    setCars((prev) => prev.filter((c) => c.id !== carId));
    setActionId(null);
  }

  if (loading || !form) {
    return (
      <div className="flex min-h-screen flex-col bg-background font-mono">
        <Header />
        <div className="mx-auto w-full max-w-2xl px-4 py-4 md:py-8">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-4 h-24 w-full" />
          <div className="mt-4 space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col bg-background font-mono">
        <Header />
        <div className="mx-auto w-full max-w-2xl px-4 py-8">
          <DesktopBack />
          <p className="py-12 text-center text-xs text-muted-foreground">找不到该用户</p>
          <div className="text-center">
            <Link href="/admin"><Button variant="outline" size="sm" className="text-xs">返回管理后台</Button></Link>
          </div>
        </div>
      </div>
    );
  }

  const activeCount = cars.filter((c) => c.status === "active").length;

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      <div className="mx-auto w-full max-w-2xl px-4 py-4 md:py-8">
        <DesktopBack />

        {/* Identity header */}
        <div className="flex items-start gap-3 border border-border p-3">
          <img src={avatarUrl(profile.avatar_url, profile.username)} alt="" className="h-14 w-14 shrink-0 rounded-full border border-border object-cover" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h1 className="truncate text-base font-semibold">{profile.username || "未设置昵称"}</h1>
              {profile.account_type === "dealer" && <span className="bg-muted px-1 py-0.5 text-[10px]">车行</span>}
              {profile.role === "admin" && <span className="bg-foreground px-1 py-0.5 text-[10px] text-background">管理员</span>}
              {profile.banned && <span className="bg-red-500/10 px-1 py-0.5 text-[10px] text-red-600">已封禁</span>}
            </div>
            <p className="mt-1 flex items-center gap-1 text-[11px]">
              <Mail className="h-3 w-3 shrink-0 text-muted-foreground" strokeWidth={1.5} />
              {authInfo === null ? (
                <span className="text-muted-foreground">邮箱读取中…</span>
              ) : authInfo.email ? (
                <>
                  <a href={`mailto:${authInfo.email}`} className="break-all font-medium hover:underline">{authInfo.email}</a>
                  {authInfo.email_confirmed_at ? (
                    <span className="shrink-0 text-[9px] text-emerald-600">已验证</span>
                  ) : (
                    <span className="shrink-0 text-[9px] text-amber-600">未验证</span>
                  )}
                </>
              ) : (
                <span className="text-muted-foreground">无邮箱</span>
              )}
            </p>
            {authInfo?.phone && (
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                <Phone className="h-3 w-3 shrink-0" strokeWidth={1.5} />
                {authInfo.phone}
              </p>
            )}
            <p className="mt-0.5 break-all text-[10px] text-muted-foreground">{profile.id}</p>
            <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="h-3 w-3 shrink-0" strokeWidth={1.5} />
              注册于 {new Date(profile.created_at).toLocaleString("zh-CN")}
              {authInfo?.last_sign_in_at && <> · 最近登录 {new Date(authInfo.last_sign_in_at).toLocaleString("zh-CN")}</>}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-3 grid grid-cols-4 gap-2">
          {[
            { icon: <Car className="h-3.5 w-3.5" strokeWidth={1.5} />, label: "车源", value: `${activeCount}/${cars.length}` },
            { icon: <Store className="h-3.5 w-3.5" strokeWidth={1.5} />, label: "车行", value: stores.length },
            { icon: <MessageSquare className="h-3.5 w-3.5" strokeWidth={1.5} />, label: "帖子", value: postCount },
            { icon: <MessageSquare className="h-3.5 w-3.5" strokeWidth={1.5} />, label: "对话", value: convCount },
          ].map((s, i) => (
            <div key={i} className="flex flex-col items-center gap-1 border border-border py-2">
              <span className="text-muted-foreground">{s.icon}</span>
              <span className="text-sm font-semibold">{s.value}</span>
              <span className="text-[10px] text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Edit form */}
        <div className="mt-5">
          <h2 className="flex items-center gap-1.5 text-xs font-semibold">
            <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
            编辑资料
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] text-muted-foreground">昵称</Label>
              <Input className="mt-1 h-9 text-xs" value={form.username} onChange={(e) => upd("username", e.target.value)} />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">电话</Label>
              <Input className="mt-1 h-9 text-xs" value={form.phone} onChange={(e) => upd("phone", e.target.value)} />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">地区</Label>
              <Input className="mt-1 h-9 text-xs" value={form.location} onChange={(e) => upd("location", e.target.value)} />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">语言</Label>
              <select
                className="mt-1 h-9 w-full border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                value={form.preferred_language}
                onChange={(e) => upd("preferred_language", e.target.value)}
              >
                <option value="zh">中文</option>
                <option value="en">English</option>
              </select>
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">账号类型</Label>
              <select
                className="mt-1 h-9 w-full border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                value={form.account_type}
                onChange={(e) => upd("account_type", e.target.value as EditForm["account_type"])}
              >
                <option value="private">个人</option>
                <option value="dealer">车行</option>
              </select>
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">角色权限</Label>
              <select
                className="mt-1 h-9 w-full border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                value={form.role}
                onChange={(e) => upd("role", e.target.value as EditForm["role"])}
              >
                <option value="user">普通用户</option>
                <option value="admin">管理员</option>
              </select>
            </div>
          </div>

          {/* Ban control */}
          <div className="mt-3 border border-border p-3">
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={form.banned}
                onChange={(e) => upd("banned", e.target.checked)}
                className="h-3.5 w-3.5 accent-red-600"
              />
              <Ban className="h-3.5 w-3.5 text-red-600" strokeWidth={1.5} />
              封禁该用户
            </label>
            {form.banned && (
              <Input
                className="mt-2 h-8 text-xs"
                placeholder="封禁原因（必填）"
                value={form.banned_reason}
                onChange={(e) => upd("banned_reason", e.target.value)}
              />
            )}
            <p className="mt-1.5 text-[10px] text-muted-foreground">首次封禁会自动下架该用户所有在售车源。</p>
          </div>

          {error && <p className="mt-3 text-[11px] text-destructive">{error}</p>}

          <div className="mt-3 flex items-center gap-2">
            <Button className="gap-1.5 text-xs" disabled={saving} onClick={handleSave}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" strokeWidth={1.5} />}
              保存修改
            </Button>
            {savedAt && <span className="flex items-center gap-1 text-[11px] text-emerald-600"><Check className="h-3 w-3" strokeWidth={2} />已保存</span>}
          </div>
        </div>

        {/* Listings */}
        {cars.length > 0 && (
          <div className="mt-6">
            <h2 className="flex items-center gap-1.5 text-xs font-semibold">
              <Car className="h-3.5 w-3.5" strokeWidth={1.5} />
              该用户的车源 ({cars.length})
            </h2>
            <div className="mt-3 space-y-2">
              {cars.map((car) => (
                <div key={car.id} className={`flex items-center gap-3 border p-2 ${car.status === "removed" ? "border-red-300 opacity-70" : "border-border"}`}>
                  <div className="h-12 w-16 shrink-0 overflow-hidden border border-border bg-muted">
                    {car.image_url ? <img src={car.image_url} alt="" className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-xs font-medium">{car.title_zh || car.title}</p>
                      <span className="shrink-0 bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">{carStatusLabel(car)}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">${car.price?.toLocaleString()} · {car.location_zh}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => window.open(carLink(car.id), "_blank")} title="查看">
                      <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => window.open(carEditLink(car.id), "_blank")} title="编辑">
                      <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </Button>
                    {car.status === "active" ? (
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-amber-600" onClick={() => removeCar(car.id)} disabled={actionId === car.id} title="下架">
                        {actionId === car.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Ban className="h-3.5 w-3.5" strokeWidth={1.5} />}
                      </Button>
                    ) : car.status === "removed" ? (
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-emerald-600" onClick={() => restoreCar(car.id)} disabled={actionId === car.id} title="重新上架">
                        {actionId === car.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3.5 w-3.5" strokeWidth={2} />}
                      </Button>
                    ) : null}
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-600" onClick={() => deleteCar(car.id)} disabled={actionId === car.id} title="永久删除">
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stores */}
        {stores.length > 0 && (
          <div className="mt-6">
            <h2 className="flex items-center gap-1.5 text-xs font-semibold">
              <Store className="h-3.5 w-3.5" strokeWidth={1.5} />
              车行 ({stores.length})
            </h2>
            <div className="mt-3 space-y-2">
              {stores.map((s) => (
                <div key={s.id} className="border border-border p-3">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-medium">{s.name}</p>
                    <span className={`px-1 py-0.5 text-[10px] ${
                      s.verification_status === "verified" ? "bg-emerald-500/10 text-emerald-600"
                        : s.verification_status === "pending" ? "bg-amber-500/10 text-amber-600"
                        : s.verification_status === "rejected" ? "bg-red-500/10 text-red-600"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {s.verification_status === "verified" ? "已认证" : s.verification_status === "pending" ? "待审核" : s.verification_status === "rejected" ? "已拒绝" : "未认证"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{s.address}</p>
                  {s.phone && <p className="text-[11px] text-muted-foreground">电话: {s.phone}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Danger zone */}
        <div className="mt-8 border border-red-300 bg-red-50/50 p-3 dark:bg-red-950/10">
          <h2 className="flex items-center gap-1.5 text-xs font-semibold text-red-600">
            <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.5} />
            危险操作
          </h2>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            永久删除该用户，同时清除其全部车源、帖子、评论、车行、对话等数据。此操作不可恢复。
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2.5 gap-1.5 border-red-300 text-xs text-red-600 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-950/30"
            onClick={handleDeleteUser}
            disabled={deleting || profile.id === selfId}
          >
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />}
            {profile.id === selfId ? "不能删除自己" : "永久删除此用户"}
          </Button>
        </div>
      </div>
    </div>
  );
}

"use client";

// 开发者门户:API key 管理。顶部显示当前档位与今日配额余量;
// 列表支持行内改名、吊销(确认弹窗);创建后明文只展示一次。

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "@/components/localized-navigation";
import {
  Plus, KeyRound, Trash2, Pencil, Check, X, Loader2, Store, BookOpen, BarChart3, AlertTriangle,
} from "lucide-react";
import { useIdentity } from "@/components/identity-provider";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LargeTitle, SettingsGroup, SettingsRow, GroupFooter } from "@/components/ios-settings";
import { useI18n } from "@/components/i18n-provider";
import { API_SCOPES, MAX_KEYS_PER_OWNER, type ApiScope, type QuotaInfo } from "@/lib/api/types";
import type { DbApiKey } from "@/lib/types";
import { portalFetch, portalErrorText, type KeysResponse, type CreatedKey } from "../portal-client";
import { CopyButton } from "../code-block";

const SCOPE_LABELS: Record<ApiScope, string> = {
  "read:cars": "读取车源",
  "read:dealers": "读取车行",
  "write:inventory": "写入库存",
  "write:images": "上传图片",
};

const EXPIRY_OPTIONS: { value: string; label: string }[] = [
  { value: "never", label: "永不过期" },
  { value: "30", label: "30 天" },
  { value: "90", label: "90 天" },
  { value: "365", label: "365 天" },
];

function fmtDate(iso: string | null | undefined, locale: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(locale === "zh" ? "zh-CN" : locale, { year: "numeric", month: "short", day: "numeric" });
}

/** nowMs 在加载时取一次(避免渲染期读时钟),0 = 尚未加载 */
function isKeyExpired(k: DbApiKey, nowMs: number): boolean {
  return nowMs > 0 && !!k.expires_at && new Date(k.expires_at).getTime() < nowMs;
}

export default function KeysPage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const { authId, loading: identityLoading } = useIdentity();

  const [data, setData] = useState<KeysResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(0);

  // 创建
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<ApiScope[]>([...API_SCOPES]);
  const [expiry, setExpiry] = useState("never");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedKey | null>(null);

  // 吊销
  const [revokeTarget, setRevokeTarget] = useState<DbApiKey | null>(null);
  const [revoking, setRevoking] = useState(false);

  // 改名
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);

  useEffect(() => {
    if (!identityLoading && !authId) router.push("/login");
  }, [identityLoading, authId, router]);

  const load = useCallback(async () => {
    try {
      const res = await portalFetch<KeysResponse>("/keys");
      setData(res);
      setNowMs(Date.now());
      setError(null);
    } catch (e) {
      setError(portalErrorText(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authId) void load();
  }, [authId, load]);

  const keys = data?.keys ?? [];
  const activeKeys = keys.filter((k) => !k.revoked_at);
  const revokedKeys = keys.filter((k) => !!k.revoked_at);
  const tier = data?.tier;
  const quota = data?.quota;

  function openCreate() {
    setName("");
    setScopes([...API_SCOPES]);
    setExpiry("never");
    setCreateError(null);
    setCreated(null);
    setCreateOpen(true);
  }

  function toggleScope(s: ApiScope) {
    setScopes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  async function handleCreate() {
    if (!name.trim() || scopes.length === 0 || creating) return;
    setCreating(true);
    setCreateError(null);
    try {
      const body: Record<string, unknown> = { name: name.trim(), scopes };
      if (expiry !== "never") body.expires_in_days = Number(expiry);
      const res = await portalFetch<CreatedKey>("/keys", { method: "POST", body: JSON.stringify(body) });
      setCreated(res);
      await load();
    } catch (e) {
      setCreateError(portalErrorText(e));
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke() {
    if (!revokeTarget || revoking) return;
    setRevoking(true);
    try {
      await portalFetch(`/keys/${revokeTarget.id}`, { method: "DELETE" });
      setRevokeTarget(null);
      await load();
    } catch (e) {
      setRowError(portalErrorText(e));
      setRevokeTarget(null);
    } finally {
      setRevoking(false);
    }
  }

  function startRename(k: DbApiKey) {
    setEditingId(k.id);
    setEditName(k.name);
    setRowError(null);
  }

  async function saveRename() {
    if (!editingId || !editName.trim() || savingName) return;
    setSavingName(true);
    try {
      await portalFetch(`/keys/${editingId}`, { method: "PATCH", body: JSON.stringify({ name: editName.trim() }) });
      setData((prev) =>
        prev ? { ...prev, keys: prev.keys.map((k) => (k.id === editingId ? { ...k, name: editName.trim() } : k)) } : prev,
      );
      setEditingId(null);
    } catch (e) {
      setRowError(portalErrorText(e));
    } finally {
      setSavingName(false);
    }
  }

  const atLimit = activeKeys.length >= MAX_KEYS_PER_OWNER;

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      <main className="relative mx-auto w-full max-w-4xl flex-1 px-4 py-4 md:px-6 md:py-8">
        <LargeTitle
          title={t("API Key")}
          subtitle={t("最多 {n} 个有效 key,所有 key 共享同一份配额", { n: MAX_KEYS_PER_OWNER })}
          trailing={
            <Button size="sm" className="h-9 gap-1.5 px-4 font-mono text-xs font-medium" onClick={openCreate} disabled={loading || atLimit}>
              <Plus className="h-4 w-4" strokeWidth={2} />
              {t("创建 Key")}
            </Button>
          }
        />

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-3 font-mono text-xs text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            <span className="flex-1">{t(error)}</span>
            <Button variant="secondary" size="sm" className="h-7 px-3 font-mono text-[11px]" onClick={() => { setLoading(true); void load(); }}>
              {t("重试")}
            </Button>
          </div>
        )}

        {/* 档位 + 今日配额 */}
        {loading ? (
          <SettingsGroup className="mt-4 p-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-3 h-3 w-64" />
          </SettingsGroup>
        ) : quota && tier ? (
          <>
            <SettingsGroup className="mt-4 p-4 md:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{t("当前档位")}</span>
                <Badge variant={tier === "dealer" ? "default" : "secondary"} className="gap-1 font-mono text-[10px]">
                  {tier === "dealer" && <Store className="h-3 w-3" strokeWidth={2} />}
                  {tier === "dealer" ? t("车行") : t("个人")}
                </Badge>
              </div>
              <QuotaBars quota={quota} />
              <p className="mt-3 font-mono text-[11px] text-muted-foreground">
                {t("{time} 重置(UTC 0 点)", { time: new Date(quota.resets_at).toLocaleString(locale === "zh" ? "zh-CN" : locale, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) })}
              </p>
            </SettingsGroup>
            {tier === "personal" && (
              <div className="mt-3">
                <SettingsGroup capsule>
                  <SettingsRow
                    icon={<Store className="h-5 w-5 text-amber-500" strokeWidth={1.5} />}
                    label={t("认证门店后解锁车行配额")}
                    href="/account/settings/stores"
                  />
                </SettingsGroup>
                <GroupFooter>{t("车行档每天 2000 次写入、在售 500 辆;门店认证通过后自动生效,key 不需要重建。")}</GroupFooter>
              </div>
            )}
          </>
        ) : null}

        {rowError && (
          <p className="mt-3 px-1 font-mono text-xs text-destructive">{t(rowError)}</p>
        )}

        {/* key 列表 */}
        <h2 className="mt-6 px-1 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {t("我的 Key")}{!loading && ` · ${activeKeys.length}/${MAX_KEYS_PER_OWNER}`}
        </h2>
        {loading ? (
          <SettingsGroup className="mt-2">
            {[1, 2].map((i) => (
              <div key={i} className="space-y-2 border-b border-border/50 p-4 last:border-0">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
            ))}
          </SettingsGroup>
        ) : activeKeys.length === 0 ? (
          <SettingsGroup className="mt-2">
            <div className="flex flex-col items-center py-12">
              <KeyRound className="h-9 w-9 text-muted-foreground" strokeWidth={1.5} />
              <p className="mt-3 font-mono text-sm text-muted-foreground">{t("还没有 API key")}</p>
              <Button size="sm" className="mt-4 h-9 px-5 font-mono text-xs" onClick={openCreate} disabled={!!error}>
                {t("创建第一个 key")}
              </Button>
            </div>
          </SettingsGroup>
        ) : (
          <SettingsGroup className="mt-2">
            {activeKeys.map((k) => (
              <div key={k.id} className="border-b border-border/50 p-4 last:border-0 md:px-5">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    {editingId === k.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          autoFocus
                          value={editName}
                          maxLength={60}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") void saveRename(); if (e.key === "Escape") setEditingId(null); }}
                          className="h-8 max-w-xs font-mono text-sm"
                        />
                        <Button size="sm" variant="secondary" className="h-8 w-8 p-0" onClick={saveRename} disabled={savingName || !editName.trim()} aria-label={t("保存")}>
                          {savingName ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} /> : <Check className="h-3.5 w-3.5" strokeWidth={1.5} />}
                        </Button>
                        <Button size="sm" variant="secondary" className="h-8 w-8 p-0" onClick={() => setEditingId(null)} aria-label={t("取消")}>
                          <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </Button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => startRename(k)} className="group flex max-w-full items-center gap-1.5 text-left">
                        <span className="truncate font-mono text-sm font-semibold">{k.name}</span>
                        <Pencil className="h-3 w-3 shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground" strokeWidth={1.5} />
                      </button>
                    )}
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      <span className="text-foreground/80">{k.prefix}…</span>
                      {isKeyExpired(k, nowMs) &&<span className="ml-2 text-destructive">{t("已过期")}</span>}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {k.scopes.map((s) => (
                        <Badge key={s} variant={s.startsWith("write") ? "default" : "secondary"} className="font-mono text-[10px] font-normal">
                          {s}
                          <span className="ml-1 opacity-70">{SCOPE_LABELS[s as ApiScope] ? t(SCOPE_LABELS[s as ApiScope]) : ""}</span>
                        </Badge>
                      ))}
                    </div>
                    <p className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[11px] text-muted-foreground">
                      <span>{t("创建于 {d}", { d: fmtDate(k.created_at, locale) })}</span>
                      <span>{k.last_used_at ? t("最近使用 {d}", { d: fmtDate(k.last_used_at, locale) }) : t("从未使用")}</span>
                      <span>{k.expires_at ? t("{d} 过期", { d: fmtDate(k.expires_at, locale) }) : t("永不过期")}</span>
                      {k.request_count > 0 && <span>{t("{n} 次请求", { n: k.request_count })}</span>}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-8 shrink-0 gap-1 px-3 font-mono text-[11px] text-destructive"
                    onClick={() => setRevokeTarget(k)}
                  >
                    <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                    {t("吊销")}
                  </Button>
                </div>
              </div>
            ))}
          </SettingsGroup>
        )}

        {revokedKeys.length > 0 && (
          <>
            <h2 className="mt-6 px-1 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{t("已吊销")}</h2>
            <SettingsGroup className="mt-2">
              {revokedKeys.map((k) => (
                <div key={k.id} className="flex items-center gap-3 border-b border-border/50 px-4 py-3 last:border-0 opacity-60 md:px-5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-sm line-through">{k.name}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {k.prefix}… · {t("{d} 吊销", { d: fmtDate(k.revoked_at, locale) })}
                    </p>
                  </div>
                </div>
              ))}
            </SettingsGroup>
          </>
        )}

        <div className="mt-6">
          <SettingsGroup>
            <SettingsRow icon={<BookOpen className="h-5 w-5 text-sky-500" strokeWidth={1.5} />} label={t("查看文档")} href="/developers" />
            <SettingsRow icon={<BarChart3 className="h-5 w-5 text-emerald-500" strokeWidth={1.5} />} label={t("用量统计")} href="/developers/usage" />
          </SettingsGroup>
        </div>
      </main>
      <Footer />

      {/* 创建 key */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (!open && creating) return;
          setCreateOpen(open);
          if (!open) setCreated(null);
        }}
      >
        <DialogContent className="font-mono">
          {created ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-sm">{t("key 已创建")}</DialogTitle>
                <DialogDescription className="text-xs">
                  {t("请立即复制保存。关闭后将无法再次查看明文,只能重新创建。")}
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-xl border border-brand bg-brand/10 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-muted-foreground">{created.name}</span>
                  <CopyButton text={created.key} />
                </div>
                <p className="mt-2 break-all font-mono text-[13px] font-semibold tracking-tight">{created.key}</p>
              </div>
              <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                <span>{t("这串 key 等同于你的账号密码:不要提交到代码仓库或前端页面,泄露后请立即吊销。")}</span>
              </div>
              <DialogFooter>
                <Button size="sm" className="text-xs" onClick={() => { setCreateOpen(false); setCreated(null); }}>
                  {t("我已保存")}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-sm">{t("创建 API Key")}</DialogTitle>
                <DialogDescription className="text-xs">
                  {t("给 key 起个备注名,勾选用途;明文只在创建成功后展示一次。")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[11px] text-muted-foreground" htmlFor="key-name">{t("备注名")}</label>
                  <Input
                    id="key-name"
                    value={name}
                    maxLength={60}
                    placeholder={t("例如:DealerCenter 同步")}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") void handleCreate(); }}
                    className="h-10 font-mono text-sm"
                  />
                </div>
                <div>
                  <p className="mb-1.5 text-[11px] text-muted-foreground">{t("权限 (scopes)")}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {API_SCOPES.map((s) => {
                      const on = scopes.includes(s);
                      return (
                        <button
                          key={s}
                          type="button"
                          role="checkbox"
                          aria-checked={on}
                          onClick={() => toggleScope(s)}
                          className={`flex items-center gap-2 rounded-xl px-3 py-2 text-left transition-colors ${on ? "bg-brand/15 ring-1 ring-brand" : "bg-muted/50 hover:bg-muted"}`}
                        >
                          <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border ${on ? "border-brand-ink bg-brand-ink text-primary-foreground" : "border-muted-foreground/40"}`}>
                            {on && <Check className="h-3 w-3" strokeWidth={2.5} />}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-semibold">{s}</span>
                            <span className="block text-[11px] text-muted-foreground">{t(SCOPE_LABELS[s])}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 text-[11px] text-muted-foreground">{t("有效期")}</p>
                  <Select value={expiry} onValueChange={setExpiry}>
                    <SelectTrigger className="h-10 w-full font-mono text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPIRY_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value} className="font-mono text-xs">{t(o.label)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {createError && <p className="text-xs text-destructive">{t(createError)}</p>}
              </div>
              <DialogFooter className="gap-2">
                <Button variant="secondary" size="sm" className="text-xs" onClick={() => setCreateOpen(false)} disabled={creating}>
                  {t("取消")}
                </Button>
                <Button size="sm" className="text-xs" onClick={handleCreate} disabled={creating || !name.trim() || scopes.length === 0}>
                  {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />}
                  {t("创建")}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 吊销确认 */}
      <Dialog open={!!revokeTarget} onOpenChange={(open) => { if (!open && !revoking) setRevokeTarget(null); }}>
        <DialogContent className="font-mono">
          <DialogHeader>
            <DialogTitle className="text-sm">{t("吊销这个 key?")}</DialogTitle>
            <DialogDescription className="text-xs">
              {t("「{name}」({prefix}…)吊销后立即失效,正在使用它的脚本会收到 401。此操作不可撤销。", { name: revokeTarget?.name ?? "", prefix: revokeTarget?.prefix ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="secondary" size="sm" className="text-xs" onClick={() => setRevokeTarget(null)} disabled={revoking}>
              {t("取消")}
            </Button>
            <Button variant="destructive" size="sm" className="text-xs" onClick={handleRevoke} disabled={revoking}>
              {revoking && <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />}
              {t("确认吊销")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* 今日配额条:个人档分「新上传 / 更改」两条;车行档一条合计写入 + 在售数 */
function QuotaBars({ quota }: { quota: QuotaInfo }) {
  const { t } = useI18n();
  const rows: { label: string; used: number; limit: number | null }[] =
    quota.tier === "dealer"
      ? [
          { label: "今日写入", used: quota.inserts_used + quota.updates_used, limit: quota.writes_limit ?? quota.inserts_limit },
          { label: "在售车辆", used: quota.active_used, limit: quota.active_limit },
        ]
      : [
          { label: "今日新上传", used: quota.inserts_used, limit: quota.inserts_limit },
          { label: "今日更改", used: quota.updates_used, limit: quota.updates_limit },
        ];
  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      {rows.map((r) => {
        const limit = r.limit ?? 0;
        const pct = limit > 0 ? Math.min(100, Math.round((r.used / limit) * 100)) : 0;
        const remaining = Math.max(0, limit - r.used);
        return (
          <div key={r.label}>
            <div className="flex items-baseline justify-between font-mono text-xs">
              <span className="text-muted-foreground">{t(r.label)}</span>
              <span className="tabular-nums">
                <span className="font-semibold">{r.used}</span>
                <span className="text-muted-foreground"> / {r.limit ?? "∞"}</span>
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-destructive" : pct >= 80 ? "bg-amber-500" : "bg-brand-ink"}`} style={{ width: `${pct}%` }} />
            </div>
            {r.limit !== null && (
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">{t("剩余 {n}", { n: remaining })}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

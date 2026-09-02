"use client";

// 开发者门户:近 30 天用量(请求 / 错误 / 新上传 / 更改)。
// 纯 CSS 横条,不引图表库;缺数据的日期补 0,日期按 UTC 切与配额一致。

import { useEffect, useState } from "react";
import { useRouter } from "@/components/localized-navigation";
import { BarChart3, KeyRound, BookOpen, AlertTriangle } from "lucide-react";
import { useIdentity } from "@/components/identity-provider";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Skeleton } from "@/components/ui/skeleton";
import { LargeTitle, SettingsGroup, SettingsRow, GroupFooter } from "@/components/ios-settings";
import { useI18n } from "@/components/i18n-provider";
import { portalFetch, portalErrorText, type UsageResponse, type UsageDay } from "../portal-client";

const DAYS = 30;

/** 把接口返回的稀疏天数补齐成连续 30 天(UTC),旧到新 */
function fillDays(rows: UsageDay[]): UsageDay[] {
  const byDay = new Map(rows.map((r) => [r.day.slice(0, 10), r]));
  const out: UsageDay[] = [];
  const today = new Date();
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i));
    const key = d.toISOString().slice(0, 10);
    const hit = byDay.get(key);
    out.push({ day: key, requests: hit?.requests ?? 0, errors: hit?.errors ?? 0, inserts: hit?.inserts ?? 0, updates: hit?.updates ?? 0 });
  }
  return out;
}

export default function UsagePage() {
  const router = useRouter();
  const { t } = useI18n();
  const { authId, loading: identityLoading } = useIdentity();
  const [days, setDays] = useState<UsageDay[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!identityLoading && !authId) router.push("/login");
  }, [identityLoading, authId, router]);

  useEffect(() => {
    if (!authId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await portalFetch<UsageResponse>(`/keys/usage?days=${DAYS}`);
        if (!cancelled) setDays(fillDays(res.days ?? []));
      } catch (e) {
        if (!cancelled) setError(portalErrorText(e));
      }
    })();
    return () => { cancelled = true; };
  }, [authId]);

  const totals = (days ?? []).reduce(
    (acc, d) => ({ requests: acc.requests + d.requests, errors: acc.errors + d.errors, inserts: acc.inserts + d.inserts, updates: acc.updates + d.updates }),
    { requests: 0, errors: 0, inserts: 0, updates: 0 },
  );
  const maxRequests = Math.max(1, ...(days ?? []).map((d) => d.requests));
  const maxWrites = Math.max(1, ...(days ?? []).map((d) => d.inserts + d.updates));

  const TILES: { label: string; value: number; cls?: string }[] = [
    { label: "请求", value: totals.requests },
    { label: "错误", value: totals.errors, cls: totals.errors > 0 ? "text-destructive" : "" },
    { label: "新上传", value: totals.inserts },
    { label: "更改次数", value: totals.updates },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      <main className="relative mx-auto w-full max-w-4xl flex-1 px-4 py-4 md:px-6 md:py-8">
        <LargeTitle title={t("用量统计")} subtitle={t("近 {n} 天,所有 key 合计,按 UTC 日切", { n: DAYS })} />

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-3 font-mono text-xs text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            <span>{t(error)}</span>
          </div>
        )}

        {/* 汇总 */}
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {TILES.map((tile) => (
            <SettingsGroup key={tile.label} className="p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">{t(tile.label)}</p>
              {days ? (
                <p className={`mt-1 font-mono text-2xl font-bold tabular-nums tracking-tight ${tile.cls ?? ""}`}>{tile.value.toLocaleString()}</p>
              ) : (
                <Skeleton className="mt-2 h-7 w-16" />
              )}
            </SettingsGroup>
          ))}
        </div>

        {/* 逐日 */}
        <h2 className="mt-6 px-1 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{t("逐日明细")}</h2>
        <SettingsGroup className="mt-2 p-4 md:p-5">
          {!days ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
            </div>
          ) : totals.requests === 0 && totals.inserts === 0 && totals.updates === 0 ? (
            <div className="flex flex-col items-center py-10">
              <BarChart3 className="h-9 w-9 text-muted-foreground" strokeWidth={1.5} />
              <p className="mt-3 font-mono text-sm text-muted-foreground">{t("近 {n} 天没有 API 请求", { n: DAYS })}</p>
            </div>
          ) : (
            <div className="-mx-4 overflow-x-auto px-4 md:-mx-5 md:px-5">
              <table className="w-full min-w-[560px] border-collapse font-mono text-xs">
                <thead>
                  <tr className="text-left text-[11px] text-muted-foreground">
                    <th className="w-16 py-1.5 pr-3 font-medium">{t("日期")}</th>
                    <th className="py-1.5 pr-3 font-medium">{t("请求")} <span className="text-destructive/70">/ {t("错误")}</span></th>
                    <th className="w-20 py-1.5 pr-3 text-right font-medium tabular-nums">{t("次数")}</th>
                    <th className="py-1.5 pr-3 font-medium">{t("写入")}</th>
                    <th className="w-24 py-1.5 text-right font-medium tabular-nums">{t("新上传")} / {t("更改次数")}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...days].reverse().map((d) => {
                    const reqPct = (d.requests / maxRequests) * 100;
                    const errPct = (d.errors / maxRequests) * 100;
                    const writes = d.inserts + d.updates;
                    const insPct = (d.inserts / maxWrites) * 100;
                    const updPct = (d.updates / maxWrites) * 100;
                    const empty = d.requests === 0 && writes === 0;
                    return (
                      <tr key={d.day} className={`border-t border-border/40 ${empty ? "text-muted-foreground/60" : ""}`}>
                        <td className="py-1.5 pr-3 tabular-nums">{d.day.slice(5)}</td>
                        <td className="py-1.5 pr-3">
                          <div className="relative h-3.5 w-full overflow-hidden rounded-sm bg-muted">
                            <div className="absolute inset-y-0 left-0 bg-brand-ink/70" style={{ width: `${reqPct}%` }} />
                            <div className="absolute inset-y-0 left-0 bg-destructive/80" style={{ width: `${errPct}%` }} />
                          </div>
                        </td>
                        <td className="py-1.5 pr-3 text-right tabular-nums">
                          {d.requests}
                          {d.errors > 0 && <span className="text-destructive"> / {d.errors}</span>}
                        </td>
                        <td className="py-1.5 pr-3">
                          <div className="flex h-3.5 w-full overflow-hidden rounded-sm bg-muted">
                            <div className="h-full bg-emerald-500/80" style={{ width: `${insPct}%` }} />
                            <div className="h-full bg-sky-500/70" style={{ width: `${updPct}%` }} />
                          </div>
                        </td>
                        <td className="py-1.5 text-right tabular-nums">
                          <span className="text-emerald-600 dark:text-emerald-400">{d.inserts}</span>
                          <span className="text-muted-foreground"> / </span>
                          <span className="text-sky-600 dark:text-sky-400">{d.updates}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SettingsGroup>
        <GroupFooter>{t("用量按天聚合,当天数据有几分钟延迟。配额余量以 key 管理页为准。")}</GroupFooter>

        <div className="mt-6">
          <SettingsGroup>
            <SettingsRow icon={<KeyRound className="h-5 w-5 text-amber-500" strokeWidth={1.5} />} label={t("管理 API Key")} href="/developers/keys" />
            <SettingsRow icon={<BookOpen className="h-5 w-5 text-sky-500" strokeWidth={1.5} />} label={t("查看文档")} href="/developers" />
          </SettingsGroup>
        </div>
      </main>
      <Footer />
    </div>
  );
}

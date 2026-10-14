"use client";

// 后台用户详情页的「浏览记录」区块:IP 定位(user_ip_geo:地区、更新时间、来源 edge/backfill)、
// 最近 30 条事件;「查看完整轨迹」打开 VisitorTimelineSheet(本人登录时的事件 + 他用过的设备上未登录时的浏览,
// 不含共用设备上别的账号登录时的事件)。

import { useEffect, useState } from "react";
import { Activity, MapPin, Route } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { fetchTimeline, fetchUserIpGeo } from "@/lib/analytics/admin";
import { countryFlag, formatGeo } from "@/lib/analytics/geo";
import { relativeTime } from "@/components/analytics/format";
import type { AnalyticsTimeline } from "@/lib/analytics/types";
import type { DbUserIpGeo } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AnalyticsErrorNotice } from "@/components/admin/analytics/analytics-error";
import { EventRow, dropCarDetailPageviews, fullDateTime } from "@/components/admin/analytics/event-row";
import { VisitorTimelineSheet } from "@/components/admin/analytics/visitor-timeline-sheet";

const RECENT = 30;

/** DB-IP Lite(CC BY 4.0)要求的署名链接:展示回填地区的地方都要带(后台用户列表 / 用户详情) */
export function DbIpAttribution({ className = "" }: { className?: string }) {
  const { t } = useI18n();
  return (
    <a
      href="https://db-ip.com"
      target="_blank"
      rel="noopener noreferrer"
      className={`underline-offset-2 hover:underline ${className}`}
    >
      {t("IP 定位数据由 DB-IP 提供")}
    </a>
  );
}

interface Loaded {
  userId: string;
  geo: DbUserIpGeo | null;
  timeline: AnalyticsTimeline | null;
  error: unknown;
  /** 拉取完成的时刻:相对时间的基准(渲染期不读 Date.now()) */
  now: number;
}

export function UserActivity({ userId }: { userId: string }) {
  const { t, locale } = useI18n();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [timelineOpen, setTimelineOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [geoMap, res] = await Promise.all([
        // 表未建/无权限时 fetchUserIpGeo 自己返回空对象
        fetchUserIpGeo([userId]).catch(() => ({}) as Record<string, DbUserIpGeo>),
        fetchTimeline({ userId, limit: RECENT }).then(
          (timeline) => ({ timeline, error: null as unknown }),
          (error: unknown) => ({ timeline: null, error })
        ),
      ]);
      if (cancelled) return;
      setLoaded({
        userId,
        geo: geoMap[userId] ?? null,
        timeline: res.timeline,
        error: res.error,
        now: Date.now(),
      });
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // 切换到别的用户时旧数据作废
  const ready = loaded?.userId === userId ? loaded : null;
  const geo = ready?.geo ?? null;
  const rows = ready?.timeline?.rows ?? [];
  const devices = ready?.timeline?.visitor_ids?.length ?? 0;
  const username = rows.find((r) => r.user_id === userId)?.username ?? undefined;

  return (
    <section>
      <h2 className="flex items-center gap-1.5 text-xs font-semibold">
        <Activity className="h-3.5 w-3.5" strokeWidth={1.5} />
        {t("浏览记录")}
        {devices > 0 && (
          <span className="font-normal text-muted-foreground">· {t("{n} 台设备", { n: devices })}</span>
        )}
      </h2>

      {/* IP 定位 */}
      <div className="mt-3 flex items-start gap-2 rounded-xl bg-card p-3 text-[11px]">
        <MapPin className="mt-px h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
        {!ready ? (
          <Skeleton className="h-4 w-48" />
        ) : geo ? (
          <div className="min-w-0 flex-1">
            <p className="break-words">
              <span className="text-muted-foreground">{t("IP 定位")}:</span>{" "}
              <span className="font-medium">
                {[countryFlag(geo.country), formatGeo(geo, locale, { withCountry: true })].filter(Boolean).join(" ") ||
                  t("未知地区")}
              </span>
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
              <span title={fullDateTime(geo.updated_at, locale)}>
                {t("更新于 {time}", { time: relativeTime(geo.updated_at, t, locale, ready.now) })}
              </span>
              <span
                className="rounded-full bg-muted px-1.5 py-0.5"
                title={
                  geo.source === "edge"
                    ? t("用户访问网站时按请求 IP 定位")
                    : t("按历史登录会话的 IP 离线回填")
                }
              >
                {geo.source === "edge" ? t("访问定位") : t("历史回填")}
              </span>
              {/* 回填数据来自 DB-IP Lite(CC BY 4.0):展示处须署名并链接 db-ip.com */}
              {geo.source === "backfill" && <DbIpAttribution />}
            </p>
          </div>
        ) : (
          <p className="text-muted-foreground">{t("暂无 IP 定位记录")}</p>
        )}
      </div>

      {/* 最近事件 */}
      <div className="mt-2 overflow-hidden rounded-xl bg-card">
        {!ready ? (
          <div className="space-y-2 p-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-5 w-full rounded-md" />
            ))}
          </div>
        ) : ready.error ? (
          <AnalyticsErrorNotice error={ready.error} className="m-2" />
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-[11px] text-muted-foreground">{t("暂无浏览记录")}</p>
        ) : (
          <ol className="divide-y divide-border/40 py-0.5">
            {dropCarDetailPageviews(rows).map((r) => (
              <li key={r.id}>
                <EventRow row={r} showDate markAnonymous />
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          className="h-7 gap-1 px-2 text-[11px]"
          disabled={!ready || !!ready.error || rows.length === 0}
          onClick={() => setTimelineOpen(true)}
        >
          <Route className="h-3 w-3" strokeWidth={1.5} />
          {t("查看完整轨迹")}
        </Button>
        {rows.length >= RECENT && (
          <span className="text-[10px] text-muted-foreground">{t("仅显示最近 {n} 条", { n: RECENT })}</span>
        )}
      </div>

      <VisitorTimelineSheet
        target={timelineOpen ? { userId, label: username } : null}
        onOpenChange={(open) => {
          if (!open) setTimelineOpen(false);
        }}
      />
    </section>
  );
}

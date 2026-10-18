"use client";

import { useEffect, useEffectEvent } from "react";
import { supabase } from "@/lib/supabase";
import { queryWithColumnFallback } from "@/lib/supabase-compat";
import { useRealtimeNotifications } from "@/lib/use-realtime-notifications";
import { useIdentity } from "@/components/identity-provider";
import { useI18n } from "@/components/i18n-provider";
import { getWatchList, updateWatchedPrice } from "@/lib/price-watch";
import { carTitle, localizePath, type Locale } from "@/lib/i18n";
import { buildCarTitles } from "@/lib/i18n/car-title";
import type { TFn } from "@/lib/i18n/content/types";
import { formatCarPrice } from "@/lib/format";
import { carLink } from "@/lib/static-link";
import {
  notifyPriceDrop,
  notifyNewListingMatches,
  getNotificationPrefs,
  getPermissionStatus,
} from "@/lib/notifications";
import {
  getSavedSearches,
  markSearchChecked,
  carMatchesParams,
  buildSearchUrl,
} from "@/lib/saved-searches";
import type { DbCar } from "@/lib/types";

// 降价检查用到的列:标题按显示语言取 title / title_zh;两列都空时由年份 / 品牌 / 车型 / 配置确定性生成
type WatchedCar = Pick<DbCar, "id" | "price" | "title" | "title_zh" | "year" | "make" | "model" | "trim" | "currency">;
// currency(car-currency.sql)未建时退回不带它的列集,按 USD 显示
const WATCHED_CAR_SELECTS = [
  "id, price, title, title_zh, year, make, model, trim, currency",
  "id, price, title, title_zh, year, make, model, trim",
] as const;

async function checkPriceWatch(t: TFn, locale: Locale, pathLocale: Locale) {
  const watchList = getWatchList();
  if (watchList.length === 0) return;

  const carIds = watchList.map((w) => w.carId);
  const { data } = await queryWithColumnFallback(
    (cols) => supabase.from("cars").select(cols).in("id", carIds),
    WATCHED_CAR_SELECTS
  );
  if (!data) return;
  for (const car of data as unknown as WatchedCar[]) {
    const watched = watchList.find((w) => w.carId === car.id);
    if (!watched || car.price >= watched.price) continue;
    const drop = watched.price - car.price;
    notifyPriceDrop(
      {
        carId: car.id,
        title: carTitle(car, locale) || carTitle(buildCarTitles(car), locale),
        drop: formatCarPrice(car, drop),
        pct: Math.round((drop / watched.price) * 100),
        price: formatCarPrice(car, car.price),
        // 通知点开是整页跳转:网页端带语言前缀,原生端是静态导出那棵树的 /car?id=
        url: localizePath(carLink(car.id), pathLocale),
      },
      t,
    );
    // 更新价格快照，避免下次打开重复提醒同一次降价
    updateWatchedPrice(car.id, car.price);
  }
}

const SAVED_SEARCH_CAR_COLUMNS =
  "id, make, model, title, title_zh, price, original_price, year, mileage, fuel_type, transmission, drivetrain, exterior_color, interior_color, carfax_url, carfax_summary, image_url, images, features, created_at, profiles(account_type)";
// 从新到旧:title_status(title-status.sql)与币种 / 里程单位(car-currency.sql,价格 / 里程条件折算用)各自可能没建
const SAVED_SEARCH_CAR_SELECTS = [
  `title_status, currency, mileage_unit, ${SAVED_SEARCH_CAR_COLUMNS}`,
  `title_status, ${SAVED_SEARCH_CAR_COLUMNS}`,
  `currency, mileage_unit, ${SAVED_SEARCH_CAR_COLUMNS}`,
  SAVED_SEARCH_CAR_COLUMNS,
] as const;

async function checkSavedSearches() {
  const searches = getSavedSearches();
  if (searches.length === 0) return;

  const earliest = searches.reduce(
    (min, s) => (s.lastCheckedAt < min ? s.lastCheckedAt : min),
    searches[0].lastCheckedAt
  );

  // 列清单需覆盖 carMatchesParams 用到的所有字段。title_status(title-status.sql)未执行时退回不带它的列集:
  // 「仅清白产权」的已存搜索届时一辆都不命中(与 car-filters 同规则),其他搜索照常提醒
  const query = (columns: string) =>
    supabase
      .from("cars")
      .select(columns)
      .eq("status", "active")
      .gt("created_at", earliest)
      .order("created_at", { ascending: false })
      .limit(100);
  const { data } = await queryWithColumnFallback(query, SAVED_SEARCH_CAR_SELECTS);

  const cars = ((data as unknown) as DbCar[] | null) ?? [];
  const now = new Date().toISOString();

  for (const search of searches) {
    const count = cars.filter(
      (c) =>
        c.created_at > search.lastCheckedAt &&
        carMatchesParams(c, search.params)
    ).length;
    if (count > 0) {
      notifyNewListingMatches(search.name, count, buildSearchUrl(search.params));
    }
    // 不论是否命中都更新检查时间，防止重复提醒
    markSearchChecked(search.id, now);
  }
}

export function RealtimeNotifications() {
  // 新私信提醒按当前操作身份(切换成车行时收车行的提醒)
  const { actingId } = useIdentity();
  const { t, locale, pathLocale, localeReady } = useI18n();

  useRealtimeNotifications(actingId);

  // 提醒文案与链接按显示语言生成;取最新的 t / 语言,但不让检查随语言切换重跑
  const runChecks = useEffectEvent(async () => {
    try {
      await checkPriceWatch(t, locale, pathLocale);
    } catch {
      // 静默失败
    }
    try {
      await checkSavedSearches();
    } catch {
      // 静默失败
    }
  });

  useEffect(() => {
    // 原生端等系统语言生效(localeReady)后再查,每次启动只查一次
    if (!localeReady) return;
    // 通知未开启/未授权时不做任何检查，避免静默消耗价格快照和
    // lastCheckedAt（用户开启通知后仍能收到此前积累的提醒）
    if (!getNotificationPrefs().enabled || getPermissionStatus() !== "granted") {
      return;
    }
    runChecks();
  }, [localeReady]);

  return null;
}

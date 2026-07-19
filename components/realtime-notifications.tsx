"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRealtimeNotifications } from "@/lib/use-realtime-notifications";
import { useIdentity } from "@/components/identity-provider";
import { getWatchList, updateWatchedPrice } from "@/lib/price-watch";
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

async function checkPriceWatch() {
  const watchList = getWatchList();
  if (watchList.length === 0) return;

  const carIds = watchList.map((w) => w.carId);
  const { data } = await supabase
    .from("cars")
    .select("id, price, title_zh")
    .in("id", carIds);
  if (!data) return;
  for (const car of data) {
    const watched = watchList.find((w) => w.carId === car.id);
    if (watched && car.price < watched.price) {
      notifyPriceDrop(car.title_zh, watched.price, car.price, car.id);
      // 更新价格快照，避免下次打开重复提醒同一次降价
      updateWatchedPrice(car.id, car.price);
    }
  }
}

async function checkSavedSearches() {
  const searches = getSavedSearches();
  if (searches.length === 0) return;

  const earliest = searches.reduce(
    (min, s) => (s.lastCheckedAt < min ? s.lastCheckedAt : min),
    searches[0].lastCheckedAt
  );

  // 列清单需覆盖 carMatchesParams 用到的所有字段
  const { data } = await supabase
    .from("cars")
    .select(
      "id, make, model, title, title_zh, price, original_price, year, mileage, fuel_type, transmission, drivetrain, exterior_color, interior_color, carfax_url, carfax_summary, image_url, images, features, created_at, profiles(account_type)"
    )
    .eq("status", "active")
    .gt("created_at", earliest)
    .order("created_at", { ascending: false })
    .limit(100);

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

  useRealtimeNotifications(actingId);

  useEffect(() => {
    // 通知未开启/未授权时不做任何检查，避免静默消耗价格快照和
    // lastCheckedAt（用户开启通知后仍能收到此前积累的提醒）
    if (!getNotificationPrefs().enabled || getPermissionStatus() !== "granted") {
      return;
    }
    (async () => {
      try {
        await checkPriceWatch();
      } catch {
        // 静默失败
      }
      try {
        await checkSavedSearches();
      } catch {
        // 静默失败
      }
    })();
  }, []);

  return null;
}

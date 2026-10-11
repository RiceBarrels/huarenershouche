// 访客 IP 粗定位(国家 / 州省代码 / 城市),由 /api/geo 读 Vercel 边缘头返回。
// 目前只给随机用户名挑地区词用;本地开发、超时、失败一律返回 null,调用方跳过地区即可。

import { apiOrigin } from "@/lib/capacitor";

export interface IpGeo {
  /** ISO 国家代码,如 "US" */
  country: string | null;
  /** ISO 3166-2 州/省代码,如 "NY" */
  region: string | null;
  /** 英文城市名,如 "Flushing" */
  city: string | null;
}

const CACHE_KEY = "clc_ip_geo";
let pending: Promise<IpGeo | null> | null = null;

export function getIpGeo(timeoutMs = 2500): Promise<IpGeo | null> {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) return Promise.resolve(JSON.parse(cached) as IpGeo);
  } catch {
    /* ignore */
  }
  if (pending) return pending;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  pending = fetch(`${apiOrigin()}/api/geo`, { signal: controller.signal })
    .then((res) => (res.ok ? (res.json() as Promise<IpGeo>) : null))
    .then((geo) => {
      if (geo) {
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(geo));
        } catch {
          /* ignore */
        }
      }
      return geo;
    })
    .catch(() => null)
    .finally(() => {
      clearTimeout(timer);
      pending = null;
    });
  return pending;
}

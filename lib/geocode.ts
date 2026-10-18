import { isCanadianPostalCode, normalizeCanadianPostalCode } from "@/lib/currency";

export interface GeoResult {
  city: string;
  state: string;
  stateCode: string;
  formatted: string; // "City, ST"
}

const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

function useGoogle(): boolean {
  return !!GOOGLE_KEY;
}

// ─── Google Geocoding helpers ────────────────────────────────────────

function parseGoogleResult(
  components: any[],
  lang: "en" | "zh" = "en"
): { city: string; state: string; stateCode: string } {
  let city = "";
  let state = "";
  let stateCode = "";

  for (const c of components) {
    const types: string[] = c.types || [];
    if (types.includes("locality")) {
      city = c.long_name;
    } else if (types.includes("sublocality_level_1") && !city) {
      city = c.long_name;
    } else if (types.includes("administrative_area_level_1")) {
      state = c.long_name;
      stateCode = c.short_name;
    }
  }
  // For Chinese, stateCode might be Chinese too, keep short_name
  return { city, state, stateCode };
}

async function googleGeocode(
  params: Record<string, string>,
  lang: "en" | "zh" = "en"
): Promise<any | null> {
  const sp = new URLSearchParams({
    ...params,
    key: GOOGLE_KEY,
    language: lang === "zh" ? "zh-CN" : "en",
  });
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?${sp.toString()}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== "OK" || !data.results?.length) return null;
    return data.results[0];
  } catch {
    return null;
  }
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Get user's current position via Capacitor Geolocation (native) or browser API (web)
 *
 * 5 分钟内复用上次定位;并发调用共享同一个请求,
 * 避免多个页面同时触发原生权限弹窗互相打架。
 */
let lastFix: { pos: GeolocationPosition; at: number } | null = null;
let inFlight: Promise<GeolocationPosition> | null = null;
const FIX_MAX_AGE = 300000; // 5 min

export async function getCurrentPosition(): Promise<GeolocationPosition> {
  if (lastFix && Date.now() - lastFix.at < FIX_MAX_AGE) return lastFix.pos;
  if (inFlight) return inFlight;
  inFlight = fetchPosition()
    .then((pos) => {
      lastFix = { pos, at: Date.now() };
      return pos;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

function toWebPosition(pos: {
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude: number | null;
    altitudeAccuracy: number | null | undefined;
    heading: number | null;
    speed: number | null;
  };
  timestamp: number;
}): GeolocationPosition {
  return {
    coords: {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      altitude: pos.coords.altitude,
      altitudeAccuracy: pos.coords.altitudeAccuracy,
      heading: pos.coords.heading,
      speed: pos.coords.speed,
    },
    timestamp: pos.timestamp,
  } as GeolocationPosition;
}

async function fetchPosition(): Promise<GeolocationPosition> {
  let native = false;
  try {
    const { Capacitor } = await import("@capacitor/core");
    native = Capacitor.isNativePlatform();
  } catch {
    // Capacitor not available — treat as web
  }

  if (native) {
    // 原生端只走 Capacitor 插件,失败不回退 navigator.geolocation
    // (WKWebView 里会再弹一个 WebKit 层的位置询问框,或直接挂起)
    const { Geolocation } = await import("@capacitor/geolocation");
    const perm = await Geolocation.checkPermissions();
    if (perm.location === "prompt" || perm.location === "prompt-with-rationale") {
      // 走共享的权限请求,避免和权限弹窗同时触发两个系统弹窗
      const { requestLocationPermission } = await import("@/lib/capacitor");
      const state = await requestLocationPermission();
      if (state !== "granted") throw new Error("Location permission not granted");
    } else if (perm.location !== "granted") {
      throw new Error("Location permission not granted");
    }
    try {
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: FIX_MAX_AGE,
      });
      return toWebPosition(pos);
    } catch {
      // iOS 上 getCurrentPosition 偶发超时/失败:用 watchPosition 等首个定位兜底
      return watchFirstFix(Geolocation);
    }
  }

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 8000,
      maximumAge: FIX_MAX_AGE,
    });
  });
}

function watchFirstFix(
  Geolocation: typeof import("@capacitor/geolocation").Geolocation
): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let watchId: string | null = null;

    function cleanup() {
      clearTimeout(timer);
      if (watchId) Geolocation.clearWatch({ id: watchId });
    }

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error("Location timeout"));
    }, 15000);

    Geolocation.watchPosition(
      { enableHighAccuracy: false, timeout: 15000 },
      (pos, err) => {
        if (settled) return;
        if (pos) {
          settled = true;
          cleanup();
          resolve(toWebPosition(pos));
        } else if (err) {
          settled = true;
          cleanup();
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      }
    ).then((id) => {
      watchId = id;
      if (settled) cleanup();
    });
  });
}

/**
 * Reverse geocode coordinates to city/state
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<GeoResult | null> {
  if (useGoogle()) {
    const result = await googleGeocode({ latlng: `${lat},${lng}` });
    if (result) {
      const { city, state, stateCode } = parseGoogleResult(
        result.address_components
      );
      return { city, state, stateCode, formatted: `${city}, ${stateCode}` };
    }
  }

  // Fallback: Nominatim
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=en`,
      { headers: { "User-Agent": "clcauto/1.0" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data.address;
    if (!addr) return null;
    const city =
      addr.city || addr.town || addr.village || addr.hamlet || addr.county || "";
    const state = addr.state || "";
    const stateCode = STATE_ABBR[state] || state;
    return { city, state, stateCode, formatted: `${city}, ${stateCode}` };
  } catch {
    return null;
  }
}

// 加拿大省 / 地区缩写(Nominatim 回退只给全称)
const CA_PROVINCE_ABBR: Record<string, string> = {
  Alberta: "AB", "British Columbia": "BC", Manitoba: "MB", "New Brunswick": "NB",
  "Newfoundland and Labrador": "NL", "Nova Scotia": "NS", Ontario: "ON", "Prince Edward Island": "PE",
  Quebec: "QC", Québec: "QC", Saskatchewan: "SK", "Northwest Territories": "NT", Nunavut: "NU", Yukon: "YT",
};

/** 邮编 → 地理编码参数:美国 5 位 zip 或加拿大邮编(统一成「A1A 1A1」) */
function postalQuery(zip: string): { code: string; country: "US" | "CA" } {
  return isCanadianPostalCode(zip)
    ? { code: normalizeCanadianPostalCode(zip), country: "CA" }
    : { code: zip, country: "US" };
}

/**
 * Lookup by US zip code or Canadian postal code
 */
export async function lookupZip(
  rawZip: string,
  lang: "en" | "zh" = "en"
): Promise<GeoResult | null> {
  const { code: zip, country } = postalQuery(rawZip);
  if (useGoogle()) {
    const result = await googleGeocode(
      { address: zip, components: `country:${country}` },
      lang
    );
    if (result) {
      const { city, stateCode } = parseGoogleResult(
        result.address_components,
        lang
      );
      return {
        city,
        state: "",
        stateCode,
        formatted: lang === "zh" ? city : `${city}, ${stateCode} ${zip}`,
      };
    }
  }

  // Fallback: Nominatim
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(zip)}&country=${country.toLowerCase()}&format=json&addressdetails=1&limit=1&accept-language=${lang}`,
      { headers: { "User-Agent": "clcauto/1.0" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.length) return null;
    const addr = data[0].address;
    const city =
      addr?.city ||
      addr?.town ||
      addr?.village ||
      addr?.hamlet ||
      addr?.county ||
      "";
    const state = addr?.state || "";
    const stateCode =
      lang === "en" ? (country === "CA" ? CA_PROVINCE_ABBR[state] : STATE_ABBR[state]) || state : state;
    return {
      city,
      state,
      stateCode,
      formatted: lang === "zh" ? city : `${city}, ${stateCode} ${zip}`,
    };
  } catch {
    return null;
  }
}

/**
 * Forward geocode: search for cities by name
 */
export async function searchCities(query: string): Promise<GeoResult[]> {
  if (!query || query.length < 2) return [];

  const zipMatch = query.match(/^\d{5}$/);
  if (zipMatch) {
    const result = await lookupZip(query);
    return result ? [result] : [];
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&countrycodes=us&format=json&addressdetails=1&limit=8&accept-language=en`,
      { headers: { "User-Agent": "clcauto/1.0" } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const seen = new Set<string>();
    return data
      .map((item: any) => {
        const addr = item.address;
        const city =
          addr?.city ||
          addr?.town ||
          addr?.village ||
          addr?.hamlet ||
          item.name ||
          "";
        const state = addr?.state || "";
        const stateCode = STATE_ABBR[state] || state;
        const formatted = `${city}, ${stateCode}`;
        return { city, state, stateCode, formatted };
      })
      .filter((r: GeoResult) => {
        if (!r.city || !r.stateCode || seen.has(r.formatted)) return false;
        seen.add(r.formatted);
        return true;
      });
  } catch {
    return [];
  }
}

/**
 * Detect user location: get coords → reverse geocode → return city string
 */
export async function detectUserCity(): Promise<GeoResult | null> {
  try {
    const pos = await getCurrentPosition();
    return await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
  } catch {
    return null;
  }
}

/**
 * Get user's current coordinates
 */
export async function getUserCoords(): Promise<{
  lat: number;
  lng: number;
} | null> {
  try {
    const pos = await getCurrentPosition();
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return null;
  }
}

/**
 * Auto-detect user's zipcode via browser geolocation + reverse geocode
 */
export async function detectUserZip(): Promise<string | null> {
  try {
    const pos = await getCurrentPosition();

    if (useGoogle()) {
      const result = await googleGeocode({
        latlng: `${pos.coords.latitude},${pos.coords.longitude}`,
      });
      if (result) {
        const pc = result.address_components?.find((c: any) =>
          c.types?.includes("postal_code")
        );
        if (pc?.short_name && /^\d{5}/.test(pc.short_name))
          return pc.short_name.slice(0, 5);
      }
    }

    // Fallback: Nominatim
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&addressdetails=1&accept-language=en`,
      { headers: { "User-Agent": "clcauto/1.0" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const zip = data.address?.postcode;
    if (zip && /^\d{5}/.test(zip)) return zip.slice(0, 5);
    return null;
  } catch {
    return null;
  }
}

/**
 * Geocode a US zipcode / Canadian postal code to coordinates
 */
export async function geocodeZipToCoords(
  rawZip: string
): Promise<{ lat: number; lng: number } | null> {
  if (!/^\d{5}$/.test(rawZip) && !isCanadianPostalCode(rawZip)) return null;
  const { code: zip, country } = postalQuery(rawZip);

  if (useGoogle()) {
    const result = await googleGeocode({
      address: zip,
      components: `country:${country}`,
    });
    if (result?.geometry?.location) {
      return {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
      };
    }
  }

  // Fallback: Nominatim
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(zip)}&country=${country.toLowerCase()}&format=json&limit=1`,
      { headers: { "User-Agent": "clcauto/1.0" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

/**
 * Forward geocode a location string to coordinates (cached)
 */
const geocodeCache = new Map<string, { lat: number; lng: number } | null>();

export async function geocodeCity(
  location: string
): Promise<{ lat: number; lng: number } | null> {
  if (geocodeCache.has(location)) return geocodeCache.get(location)!;

  if (useGoogle()) {
    const result = await googleGeocode({
      address: location,
      components: "country:US",
    });
    if (result?.geometry?.location) {
      const coords = {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
      };
      geocodeCache.set(location, coords);
      return coords;
    }
  }

  // Fallback: Nominatim
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&countrycodes=us&format=json&limit=1`,
      { headers: { "User-Agent": "clcauto/1.0" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.length) return null;
    const coords = {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
    };
    geocodeCache.set(location, coords);
    return coords;
  } catch {
    return null;
  }
}

/**
 * Haversine distance between two coordinates in miles
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Format distance for display
 */
export function formatDistance(miles: number): string {
  if (miles < 1) return "< 1 mi";
  if (miles < 100) return `${Math.round(miles)} mi`;
  return `${Math.round(miles / 10) * 10} mi`;
}

/**
 * Geocode a free-form address string and return coords + display name
 */
export async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number; display: string } | null> {
  if (!address.trim()) return null;

  if (useGoogle()) {
    const result = await googleGeocode({ address });
    if (result?.geometry?.location) {
      return {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
        display: result.formatted_address || address,
      };
    }
  }

  // Fallback: Nominatim
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&addressdetails=1&limit=1&accept-language=en`,
      { headers: { "User-Agent": "clcauto/1.0" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.length) return null;
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      display: data[0].display_name,
    };
  } catch {
    return null;
  }
}

const STATE_ABBR: Record<string, string> = {
  Alabama: "AL",
  Alaska: "AK",
  Arizona: "AZ",
  Arkansas: "AR",
  California: "CA",
  Colorado: "CO",
  Connecticut: "CT",
  Delaware: "DE",
  Florida: "FL",
  Georgia: "GA",
  Hawaii: "HI",
  Idaho: "ID",
  Illinois: "IL",
  Indiana: "IN",
  Iowa: "IA",
  Kansas: "KS",
  Kentucky: "KY",
  Louisiana: "LA",
  Maine: "ME",
  Maryland: "MD",
  Massachusetts: "MA",
  Michigan: "MI",
  Minnesota: "MN",
  Mississippi: "MS",
  Missouri: "MO",
  Montana: "MT",
  Nebraska: "NE",
  Nevada: "NV",
  "New Hampshire": "NH",
  "New Jersey": "NJ",
  "New Mexico": "NM",
  "New York": "NY",
  "North Carolina": "NC",
  "North Dakota": "ND",
  Ohio: "OH",
  Oklahoma: "OK",
  Oregon: "OR",
  Pennsylvania: "PA",
  "Rhode Island": "RI",
  "South Carolina": "SC",
  "South Dakota": "SD",
  Tennessee: "TN",
  Texas: "TX",
  Utah: "UT",
  Vermont: "VT",
  Virginia: "VA",
  Washington: "WA",
  "West Virginia": "WV",
  Wisconsin: "WI",
  Wyoming: "WY",
  "District of Columbia": "DC",
};

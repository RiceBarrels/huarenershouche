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
 */
export async function getCurrentPosition(): Promise<GeolocationPosition> {
  // On native, use Capacitor Geolocation plugin for proper permission handling
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform()) {
      const { Geolocation } = await import("@capacitor/geolocation");
      const perm = await Geolocation.checkPermissions();
      if (perm.location === "prompt" || perm.location === "prompt-with-rationale") {
        await Geolocation.requestPermissions();
      }
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: false,
        timeout: 10000,
      });
      // Return a GeolocationPosition-compatible object
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
  } catch {
    // Fall through to web API
  }

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 8000,
      maximumAge: 300000, // cache for 5 min
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

/**
 * Lookup by US zip code
 */
export async function lookupZip(
  zip: string,
  lang: "en" | "zh" = "en"
): Promise<GeoResult | null> {
  if (useGoogle()) {
    const result = await googleGeocode(
      { address: zip, components: "country:US" },
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
      `https://nominatim.openstreetmap.org/search?postalcode=${zip}&country=us&format=json&addressdetails=1&limit=1&accept-language=${lang}`,
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
      lang === "en" ? STATE_ABBR[state] || state : state;
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
 * Geocode a US zipcode to coordinates
 */
export async function geocodeZipToCoords(
  zip: string
): Promise<{ lat: number; lng: number } | null> {
  if (!/^\d{5}$/.test(zip)) return null;

  if (useGoogle()) {
    const result = await googleGeocode({
      address: zip,
      components: "country:US",
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
      `https://nominatim.openstreetmap.org/search?postalcode=${zip}&country=us&format=json&limit=1`,
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

// 后台用户地区的兜底:系统账号(转载车行)不登录、没有 IP 定位,也多半没填 profiles.location,
// 用门店地址解析出「城市, 州」。
// "8635 18th Ave, Brooklyn, NY 11214" → "Brooklyn, NY";"…, Toronto, ON M5V 2T6" → "Toronto, ON"。

// 州/省代码 + 可选邮编(美国 5 位 / 5+4,加拿大 A1A 1A1)
const POSTAL = String.raw`(?:\d{5}(?:-\d{4})?|[A-Z]\d[A-Z]\s?\d[A-Z]\d)`;
const STATE_ZIP_RE = new RegExp(String.raw`^([A-Z]{2})(?:\s+${POSTAL})?$`, "i");
// 城市与州之间没逗号:"Brooklyn NY 11214"
const CITY_STATE_ZIP_RE = new RegExp(String.raw`^(.+?)\s+([A-Z]{2})\s+${POSTAL}$`, "i");
const COUNTRY_RE = /^(usa|us|u\.s\.a?\.?|united states(?: of america)?|canada)$/i;

/** 门店地址 → "城市, 州";解析不了(只有街道、中文地址等)返回 null */
export function cityFromAddress(address: string | null | undefined): string | null {
  if (!address) return null;
  const parts = address
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  while (parts.length > 0 && COUNTRY_RE.test(parts[parts.length - 1])) parts.pop();
  if (parts.length === 0) return null;
  const last = parts[parts.length - 1];

  // 城市段不能带数字(那是街道门牌)
  const valid = (city: string) => city.length > 0 && city.length <= 60 && !/\d/.test(city);

  const m = STATE_ZIP_RE.exec(last);
  if (m && parts.length >= 2) {
    const city = parts[parts.length - 2];
    return valid(city) ? `${city}, ${m[1].toUpperCase()}` : null;
  }
  const m2 = CITY_STATE_ZIP_RE.exec(last);
  if (m2 && valid(m2[1])) return `${m2[1]}, ${m2[2].toUpperCase()}`;
  return null;
}

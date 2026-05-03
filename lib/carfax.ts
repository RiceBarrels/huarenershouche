const CARFAX_RE = /^https?:\/\/(www\.)?carfax\.com\//i;

export function isCarfaxUrl(url: string): boolean {
  return CARFAX_RE.test(url.trim());
}

export function normalizeCarfaxUrl(url: string): string {
  let u = url.trim();
  if (!u.startsWith("http")) u = "https://" + u;
  return u;
}

export interface CarfaxSummary {
  title: string;
  owners: string | null;
  accidents: string | null;
  serviceRecords: string | null;
}

export async function fetchCarfaxSummary(url: string): Promise<CarfaxSummary | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) return null;
    const html = await res.text();

    const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1]
      || html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]
      || "";

    const ogDesc = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1]
      || html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1]
      || "";

    const owners = ogDesc.match(/(\d+)\s*owner/i)?.[1] || null;
    const accidents = ogDesc.toLowerCase().includes("no accident")
      ? "0"
      : ogDesc.match(/(\d+)\s*accident/i)?.[1] || null;
    const serviceRecords = ogDesc.match(/(\d+)\s*service/i)?.[1] || null;

    const summary = [
      ogTitle,
      ogDesc,
    ].filter(Boolean).join(" — ");

    return {
      title: ogTitle || "Carfax Report",
      owners,
      accidents,
      serviceRecords,
    };
  } catch {
    return null;
  }
}

export function formatCarfaxSummary(s: CarfaxSummary): string {
  const parts: string[] = [];
  if (s.owners) parts.push(`${s.owners} 任车主`);
  if (s.accidents !== null) parts.push(s.accidents === "0" ? "无事故" : `${s.accidents} 次事故`);
  if (s.serviceRecords) parts.push(`${s.serviceRecords} 条维保记录`);
  return parts.length > 0 ? parts.join(" · ") : s.title;
}

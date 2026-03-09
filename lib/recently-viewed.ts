const KEY = "huarencars_recently_viewed";
const MAX = 12;

export function getRecentlyViewed(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function addRecentlyViewed(carId: string) {
  if (typeof window === "undefined") return;
  const ids = getRecentlyViewed().filter((id) => id !== carId);
  ids.unshift(carId);
  localStorage.setItem(KEY, JSON.stringify(ids.slice(0, MAX)));
}

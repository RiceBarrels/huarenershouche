const STORAGE_KEY = "huaren_price_watch";

export interface PriceWatchItem {
  carId: string;
  title: string;
  price: number;
  watchedAt: string;
  imageUrl: string | null;
}

export function getWatchList(): PriceWatchItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function addPriceWatch(item: PriceWatchItem): void {
  const list = getWatchList().filter((w) => w.carId !== item.carId);
  list.unshift(item);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 50)));
}

export function removePriceWatch(carId: string): void {
  const list = getWatchList().filter((w) => w.carId !== carId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function isWatching(carId: string): boolean {
  return getWatchList().some((w) => w.carId === carId);
}

export function getWatchedPrice(carId: string): number | null {
  const item = getWatchList().find((w) => w.carId === carId);
  return item ? item.price : null;
}

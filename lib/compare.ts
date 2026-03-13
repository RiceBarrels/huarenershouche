const STORAGE_KEY = "huaren_compare";
const MAX_COMPARE = 3;

export function getCompareIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function addToCompare(carId: string): boolean {
  const ids = getCompareIds();
  if (ids.includes(carId)) return false;
  if (ids.length >= MAX_COMPARE) return false;
  ids.push(carId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  window.dispatchEvent(new Event("compare-change"));
  return true;
}

export function removeFromCompare(carId: string): void {
  const ids = getCompareIds().filter((id) => id !== carId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  window.dispatchEvent(new Event("compare-change"));
}

export function clearCompare(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  window.dispatchEvent(new Event("compare-change"));
}

export function isInCompare(carId: string): boolean {
  return getCompareIds().includes(carId);
}

const STORAGE_KEY = "huaren_search_history";
const MAX_ITEMS = 10;

export function getSearchHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function addSearchHistory(term: string) {
  const trimmed = term.trim();
  if (!trimmed || trimmed.length < 2) return;
  const history = getSearchHistory().filter((h) => h !== trimmed);
  history.unshift(trimmed);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, MAX_ITEMS)));
}

export function clearSearchHistory() {
  localStorage.removeItem(STORAGE_KEY);
}

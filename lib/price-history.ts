export interface PriceRecord {
  price: number;
  date: string; // ISO date string
}

export interface CarPriceHistory {
  carId: string;
  title: string;
  records: PriceRecord[];
}

const STORAGE_KEY = "huaren_price_history";

function loadAll(): CarPriceHistory[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CarPriceHistory[]) : [];
  } catch {
    return [];
  }
}

function saveAll(data: CarPriceHistory[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function recordPrice(carId: string, title: string, price: number): void {
  const all = loadAll();
  const existing = all.find((h) => h.carId === carId);
  const now = new Date().toISOString();

  if (existing) {
    const last = existing.records[existing.records.length - 1];
    // Only add a new record if the price changed
    if (!last || last.price !== price) {
      existing.records.push({ price, date: now });
      existing.title = title;
    }
  } else {
    all.push({ carId, title, records: [{ price, date: now }] });
  }

  saveAll(all);
}

export function getPriceHistory(carId: string): PriceRecord[] {
  const all = loadAll();
  const entry = all.find((h) => h.carId === carId);
  return entry ? entry.records : [];
}

export function getAllPriceHistory(): CarPriceHistory[] {
  return loadAll();
}

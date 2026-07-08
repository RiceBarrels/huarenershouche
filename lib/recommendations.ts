import { getRecentlyViewed } from "./recently-viewed";
import { getSearchHistory } from "./search-history";
import type { DbCar } from "./types";

interface UserPreferences {
  makes: Record<string, number>;
  priceMin: number;
  priceMax: number;
  mileageMax: number;
  fuelTypes: Record<string, number>;
  locations: Record<string, number>;
}

function getFavoriteIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("huaren_favorites") || "[]");
  } catch {
    return [];
  }
}

export function hasUserHistory(): boolean {
  if (typeof window === "undefined") return false;
  const favs = getFavoriteIds();
  const recent = getRecentlyViewed();
  return favs.length >= 2 || recent.length >= 3;
}

export function extractPreferences(viewedCars: DbCar[]): UserPreferences {
  const prefs: UserPreferences = {
    makes: {},
    priceMin: 0,
    priceMax: Infinity,
    mileageMax: Infinity,
    fuelTypes: {},
    locations: {},
  };

  if (viewedCars.length === 0) return prefs;

  const favoriteIds = new Set(getFavoriteIds());
  const prices: number[] = [];

  for (const car of viewedCars) {
    const weight = favoriteIds.has(car.id) ? 3 : 1;

    prefs.makes[car.make] = (prefs.makes[car.make] || 0) + weight;
    prefs.fuelTypes[car.fuel_type] = (prefs.fuelTypes[car.fuel_type] || 0) + weight;
    if (car.location_zh) {
      prefs.locations[car.location_zh] = (prefs.locations[car.location_zh] || 0) + weight;
    }
    prices.push(car.price);
  }

  if (prices.length > 0) {
    prices.sort((a, b) => a - b);
    prefs.priceMin = Math.max(0, prices[0] * 0.7);
    prefs.priceMax = prices[prices.length - 1] * 1.3;
    prefs.mileageMax = Math.max(...viewedCars.map((c) => c.mileage)) * 1.5;
  }

  return prefs;
}

export function scoreCar(car: DbCar, prefs: UserPreferences): number {
  let score = 0;

  if (prefs.makes[car.make]) {
    score += prefs.makes[car.make] * 10;
  }

  if (car.price >= prefs.priceMin && car.price <= prefs.priceMax) {
    score += 8;
  }

  if (car.mileage <= prefs.mileageMax) {
    score += 4;
  }

  if (prefs.fuelTypes[car.fuel_type]) {
    score += prefs.fuelTypes[car.fuel_type] * 3;
  }

  if (car.location_zh && prefs.locations[car.location_zh]) {
    score += prefs.locations[car.location_zh] * 5;
  }

  // Recency boost
  const daysOld = (Date.now() - new Date(car.created_at).getTime()) / 86400000;
  if (daysOld < 3) score += 6;
  else if (daysOld < 7) score += 3;

  return score;
}

export function rankCars(
  cars: DbCar[],
  viewedCars: DbCar[],
  excludeIds: Set<string>
): DbCar[] {
  const prefs = extractPreferences(viewedCars);
  const searchTerms = getSearchHistory().map((t) => t.toLowerCase());

  return cars
    .filter((c) => !excludeIds.has(c.id))
    .map((car) => {
      let score = scoreCar(car, prefs);

      // Boost if car matches search history keywords
      const carText = `${car.make} ${car.model} ${car.title_zh} ${car.title}`.toLowerCase();
      for (const term of searchTerms) {
        if (carText.includes(term)) score += 7;
      }

      return { car, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((r) => r.car);
}

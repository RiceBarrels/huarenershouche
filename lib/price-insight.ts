import type { DbCar } from "./types";

/**
 * Simple price insight based on year/mileage/price ratio.
 * Returns a label and style class for display.
 */
export function getPriceInsight(
  car: DbCar,
  allCars: DbCar[]
): { label: string; className: string } | null {
  // Find similar cars (same make, within ±2 years)
  const similar = allCars.filter(
    (c) =>
      c.id !== car.id &&
      c.make === car.make &&
      Math.abs(c.year - car.year) <= 2
  );

  if (similar.length < 2) return null;

  const avgPrice =
    similar.reduce((sum, c) => sum + c.price, 0) / similar.length;
  const ratio = car.price / avgPrice;

  // Also factor in mileage
  const avgMileage =
    similar.reduce((sum, c) => sum + c.mileage, 0) / similar.length;
  const mileageBonus = car.mileage < avgMileage ? -0.05 : 0.03;

  const adjusted = ratio + mileageBonus;

  if (adjusted < 0.85) {
    return { label: "好价", className: "bg-green-600 text-white" };
  }
  if (adjusted < 0.95) {
    return { label: "合理", className: "bg-foreground/10 text-foreground" };
  }
  if (adjusted > 1.15) {
    return {
      label: "偏高",
      className: "bg-orange-500/10 text-orange-600",
    };
  }
  return null;
}

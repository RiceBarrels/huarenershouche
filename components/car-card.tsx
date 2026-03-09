import Link from "next/link";
import { MapPin, Gauge, Fuel, Calendar, Navigation } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDistance } from "@/lib/geocode";
import type { DbCar } from "@/lib/types";

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}

function formatMileage(miles: number): string {
  return new Intl.NumberFormat("en-US").format(miles);
}

export function CarCard({
  car,
  distance,
  priceInsight,
}: {
  car: DbCar;
  distance?: number;
  priceInsight?: { label: string; className: string } | null;
}) {
  return (
    <Link href={`/car/${car.id}`}>
      <article className="group cursor-pointer border border-border bg-card transition-colors hover:border-foreground/20">
        <div className="relative aspect-[16/10] overflow-hidden bg-muted">
          {car.image_url ? (
            <img
              src={car.image_url}
              alt={car.title}
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full items-center justify-center font-mono text-xs text-muted-foreground">
              暂无图片
            </div>
          )}
          <div className="absolute left-2 top-2 flex gap-1">
            {car.seller_type === "dealer" ? (
              <Badge
                variant="secondary"
                className="font-mono text-[10px] font-medium"
              >
                车行
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="bg-background/80 font-mono text-[10px] font-medium backdrop-blur-sm"
              >
                个人
              </Badge>
            )}
            {distance !== undefined && (
              <Badge
                variant="outline"
                className="gap-0.5 bg-background/80 font-mono text-[10px] font-medium backdrop-blur-sm"
              >
                <Navigation className="h-2.5 w-2.5" strokeWidth={1.5} />
                {formatDistance(distance)}
              </Badge>
            )}
          </div>
          <div className="absolute bottom-2 right-2 flex items-center gap-1">
            {priceInsight && (
              <span
                className={`px-1.5 py-0.5 font-mono text-[10px] font-semibold ${priceInsight.className}`}
              >
                {priceInsight.label}
              </span>
            )}
            <span className="bg-foreground px-2 py-1 font-mono text-sm font-semibold text-background">
              {formatPrice(car.price)}
            </span>
          </div>
        </div>

        <div className="p-3">
          <h3 className="font-mono text-sm font-semibold leading-tight tracking-tight">
            {car.title_zh}
          </h3>
          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
            {car.title}
          </p>

          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
            <div className="flex items-center gap-1.5">
              <Gauge
                className="h-3 w-3 text-muted-foreground"
                strokeWidth={1.5}
              />
              <span className="font-mono text-[11px] text-muted-foreground">
                {formatMileage(car.mileage)} mi
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Fuel
                className="h-3 w-3 text-muted-foreground"
                strokeWidth={1.5}
              />
              <span className="font-mono text-[11px] text-muted-foreground">
                {car.fuel_type}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin
                className="h-3 w-3 text-muted-foreground"
                strokeWidth={1.5}
              />
              <span className="font-mono text-[11px] text-muted-foreground">
                {car.location_zh}
                {distance !== undefined && (
                  <span className="ml-1 text-muted-foreground/60">
                    · {formatDistance(distance)}
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar
                className="h-3 w-3 text-muted-foreground"
                strokeWidth={1.5}
              />
              <span className="font-mono text-[11px] text-muted-foreground">
                {car.year}年
              </span>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5">
            <span className="font-mono text-[11px] text-muted-foreground">
              {car.seller_name}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground/60">
              {new Date(car.created_at).toLocaleDateString("zh-CN")}
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

// 车辆详情 — server component:每辆车独立 SEO metadata + Vehicle JSON-LD + 服务端预取。
// 静态导出(Capacitor)构建时 build:static 会用客户端兜底版本替换本文件,
// 客户端组件 car-detail 在无 initialCar 时仍会自行拉取数据。

import type { Metadata } from "next";
import { cache } from "react";
import { supabase } from "@/lib/supabase";
import { SITE_URL, SITE_NAME } from "@/lib/seo-pages";
import type { DbCar } from "@/lib/types";
import CarDetail from "../car-detail";

const VIDEO_RE = /\.(mp4|mov|webm|avi|mkv)(\?|$)/i;

const getCar = cache(async (id: string): Promise<DbCar | null> => {
  try {
    const { data } = await supabase
      .from("cars")
      .select("*, profiles!seller_id(account_type, avatar_url, is_system, claimed_by)")
      .eq("id", id)
      .maybeSingle();
    return (data as DbCar | null) ?? null;
  } catch {
    return null;
  }
});

function usd(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}

function coverImage(car: DbCar): string | null {
  const pics = [car.image_url, ...(car.images || [])].filter(
    (u): u is string => !!u && !VIDEO_RE.test(u),
  );
  return pics[0] ?? null;
}

/** 面向搜索/分享的一句话描述(双语关键信息)。 */
function buildDescription(car: DbCar): string {
  const priceLabel = car.price > 0 ? usd(car.price) : "电议";
  const miles = car.mileage > 0 ? `${new Intl.NumberFormat("en-US").format(car.mileage)} 英里` : "";
  const parts = [
    `${car.year} ${car.make} ${car.model}${car.trim ? " " + car.trim : ""}`,
    priceLabel,
    miles,
    car.location_zh || car.location,
    car.transmission,
    car.fuel_type,
  ].filter(Boolean);
  const zh = car.description_zh?.replace(/\s+/g, " ").trim();
  const base = parts.join(" · ");
  return (zh ? `${base}。${zh}` : `${base}。常來車網 · 北美华人二手车`).slice(0, 160);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const car = await getCar(id);

  if (!car || car.status === "removed" || car.owner_hidden) {
    return { title: "车源不存在或已下架", robots: { index: false, follow: false } };
  }

  const nameZh = `${car.year} ${car.make} ${car.model}${car.trim ? " " + car.trim : ""}`;
  const priceLabel = car.price > 0 ? usd(car.price) : "电议";
  const title = `${nameZh} ${priceLabel} - ${car.location_zh || car.location}`;
  const description = buildDescription(car);
  const cover = coverImage(car);
  const url = `${SITE_URL}/car/${car.id}`;

  return {
    title,
    description,
    keywords: [
      car.make,
      car.model,
      `${car.make} ${car.model}`,
      String(car.year),
      car.location_zh,
      car.location,
      car.fuel_type,
      "北美华人二手车",
      "华人卖车",
      "二手车",
    ].filter(Boolean) as string[],
    alternates: { canonical: `/car/${car.id}` },
    openGraph: {
      type: "website",
      title,
      description,
      url,
      siteName: SITE_NAME,
      ...(cover && { images: [{ url: cover, alt: nameZh }] }),
    },
    twitter: {
      card: cover ? "summary_large_image" : "summary",
      title,
      description,
      ...(cover && { images: [cover] }),
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const car = await getCar(id);

  // schema.org Car(继承 Vehicle/Product),带报价与关键规格,利于结构化检索
  const jsonLd =
    car && car.status !== "removed" && !car.owner_hidden
      ? {
          "@context": "https://schema.org",
          "@type": "Car",
          "@id": `${SITE_URL}/car/${car.id}`,
          name: `${car.year} ${car.make} ${car.model}${car.trim ? " " + car.trim : ""}`,
          brand: { "@type": "Brand", name: car.make },
          model: car.model,
          vehicleModelDate: String(car.year),
          ...(car.vin && { vehicleIdentificationNumber: car.vin }),
          ...(car.exterior_color && { color: car.exterior_color }),
          ...(car.fuel_type && { fuelType: car.fuel_type }),
          ...(car.drivetrain && { driveWheelConfiguration: car.drivetrain }),
          ...(car.mileage > 0 && {
            mileageFromOdometer: {
              "@type": "QuantitativeValue",
              value: car.mileage,
              unitCode: "SMI",
            },
          }),
          ...(car.transmission && { vehicleTransmission: car.transmission }),
          ...(() => {
            const imgs = [car.image_url, ...(car.images || [])].filter(
              (u): u is string => !!u && !VIDEO_RE.test(u),
            );
            return imgs.length ? { image: imgs } : {};
          })(),
          ...(car.description_zh || car.description
            ? { description: (car.description_zh || car.description || "").slice(0, 500) }
            : {}),
          ...(car.price > 0 && {
            offers: {
              "@type": "Offer",
              price: car.price,
              priceCurrency: "USD",
              availability:
                car.status === "active"
                  ? "https://schema.org/InStock"
                  : "https://schema.org/OutOfStock",
              itemCondition: "https://schema.org/UsedCondition",
              url: `${SITE_URL}/car/${car.id}`,
              ...(car.location && {
                availableAtOrFrom: {
                  "@type": "Place",
                  name: car.location_zh || car.location,
                  address: car.location,
                },
              }),
            },
          }),
        }
      : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <CarDetail initialCar={car} />
    </>
  );
}

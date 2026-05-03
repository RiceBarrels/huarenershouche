"use client";

import { Suspense } from "react";
import CarDetailPage from "./car-detail";

export default function CarQueryPage() {
  return (
    <Suspense>
      <CarDetailPage />
    </Suspense>
  );
}

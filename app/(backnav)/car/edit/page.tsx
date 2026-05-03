"use client";

import { Suspense } from "react";
import CarEditPage from "../car-edit";

export default function CarEditQueryPage() {
  return (
    <Suspense>
      <CarEditPage />
    </Suspense>
  );
}

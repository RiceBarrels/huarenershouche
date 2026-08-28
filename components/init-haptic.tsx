"use client";

import { useEffect } from "react";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { usePathname } from "@/components/localized-navigation";

export function InitHaptic() {
  const pathname = usePathname();
  useEffect(() => {
    Haptics.impact({ style: ImpactStyle.Light });
  }, [pathname]);
  return null;
}
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { HapticsProvider } from "@/components/haptics-provider";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="light" enableSystem>
      <HapticsProvider>{children}</HapticsProvider>
    </NextThemesProvider>
  );
}

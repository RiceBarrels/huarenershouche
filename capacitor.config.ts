import type { CapacitorConfig } from "@capacitor/cli";
import { config as dotenvConfig } from "dotenv";

// Load .env.local (Capacitor CLI doesn't read Next.js env files)
dotenvConfig({ path: ".env.local" });

const serverUrl = process.env.CAPACITOR_SERVER_URL || "https://cars.ricebarrel.com/";

const config: CapacitorConfig = {
  appId: "com.huarencars.app",
  appName: "华人二手车",
  webDir: "public",
  server: {
    // In production, load from deployed URL (supports SSR + dynamic routes)
    // In dev, load from local dev server
    ...(serverUrl ? { url: serverUrl } : {}),
    androidScheme: "https",
    iosScheme: "capacitor",
    cleartext: process.env.NODE_ENV !== "production",
    allowNavigation: [
      "cars.ricebarrel.com",
      "*.supabase.co",
      "accounts.google.com",
    ],
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 1500,
      backgroundColor: "#0C0A09",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0C0A09",
    },
    Keyboard: {
      resize: "body" as any,
      resizeOnFullScreen: true,
    },
  },
  ios: {
    contentInset: "automatic",
    preferredContentMode: "mobile",
    backgroundColor: "#0C0A09",
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#0C0A09",
  },
};

export default config;

import type { CapacitorConfig } from "@capacitor/cli";
import { config as dotenvConfig } from "dotenv";

// Load .env.local (Capacitor CLI doesn't read Next.js env files)
dotenvConfig({ path: ".env.local" });

const serverUrl = process.env.CAPACITOR_SERVER_URL || "https://www.clcauto.com/";

const config: CapacitorConfig = {
  appId: "com.clcauto.app",
  appName: "常來車網",
  webDir: "out",
  server: {
    // In production, load from deployed URL (supports SSR + dynamic routes)
    // // In dev, load from local dev server
    // ...(serverUrl ? { url: serverUrl } : {}),
    androidScheme: "https",
    iosScheme: "clcauto",
    // cleartext: process.env.NODE_ENV !== "production",
    // When remote URL fails to load (no network), show local fallback page
    errorPath: "index.html",
    allowNavigation: [
      "www.clcauto.com",
      "*.supabase.co",
      "accounts.google.com",
      "appleid.apple.com",
    ],
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 1500,
      backgroundColor: "#FFFFFF",
      showSpinner: false,
    },
    StatusBar: {
      style: "DEFAULT",
      backgroundColor: "#00000000",
      overlaysWebView: true,
    },
    Keyboard: {
      resize: "body" as any,
      resizeOnFullScreen: true,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
  ios: {
    contentInset: "never",
    preferredContentMode: "mobile",
    backgroundColor: "#FFFFFF",
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#FFFFFF",
  },
};

export default config;

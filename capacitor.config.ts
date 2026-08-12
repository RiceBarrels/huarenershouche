import type { CapacitorConfig } from "@capacitor/cli";
import { KeyboardResize } from "@capacitor/keyboard";
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
      // 键盘弹起时不缩放 webview:键盘避让全部由 JS 侧完成
      // (drawer 垫高层 / KeyboardToolbar / 全屏聊天的 padding 补偿)。
      // "body" 会让原生先压缩一遍、JS 再抬一遍,双重位移导致 UI 跳动
      resize: KeyboardResize.None,
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

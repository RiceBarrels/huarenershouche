// Capacitor native bridge utilities
// Safe wrappers that work on both web and native

import { Capacitor } from "@capacitor/core";

/** Check if running inside a native app (iOS/Android) */
export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

/** Get the current platform: "ios" | "android" | "web" */
export function getPlatform(): string {
  return Capacitor.getPlatform();
}

/** Safe status bar setup — only runs on native */
export async function setupStatusBar() {
  if (!isNative()) return;
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    // Let the status bar overlay the WebView so our CSS background shows through
    await StatusBar.setOverlaysWebView({ overlay: true });
    // Set text color based on current theme
    const isDark = document.documentElement.classList.contains("dark") ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches &&
        !document.documentElement.classList.contains("light"));
    await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
    await StatusBar.setBackgroundColor({ color: "#00000000" }); // transparent
  } catch {
    // Plugin not available
  }
}

/** Hide splash screen */
export async function hideSplash() {
  if (!isNative()) return;
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide();
  } catch {
    // Plugin not available
  }
}

/** Setup keyboard behavior for native */
export async function setupKeyboard() {
  if (!isNative()) return;
  try {
    const { Keyboard } = await import("@capacitor/keyboard");
    Keyboard.addListener("keyboardWillShow", (info) => {
      document.body.style.setProperty("--keyboard-height", `${info.keyboardHeight}px`);
    });
    Keyboard.addListener("keyboardWillHide", () => {
      document.body.style.setProperty("--keyboard-height", "0px");
    });
  } catch {
    // Plugin not available
  }
}

/** Setup back button handler for Android */
export async function setupBackButton(onBack?: () => void) {
  if (!isNative()) return;
  try {
    const { App } = await import("@capacitor/app");
    App.addListener("backButton", ({ canGoBack }) => {
      if (onBack) {
        onBack();
      } else if (canGoBack) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });
  } catch {
    // Plugin not available
  }
}

/** Native share (falls back to web share API) */
export async function nativeShare(options: {
  title: string;
  text?: string;
  url: string;
}) {
  if (isNative()) {
    try {
      const { Share } = await import("@capacitor/share");
      await Share.share({
        title: options.title,
        text: options.text,
        url: options.url,
        dialogTitle: "分享车辆",
      });
      return true;
    } catch {
      // Fall through to web
    }
  }
  // Web fallback
  if (navigator.share) {
    try {
      await navigator.share(options);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

/** Open external URL in native browser */
export async function openBrowser(url: string) {
  if (isNative()) {
    try {
      const { Browser } = await import("@capacitor/browser");
      await Browser.open({ url });
      return;
    } catch {
      // Fall through
    }
  }
  window.open(url, "_blank");
}

/** Native OAuth login — opens in-app browser and handles redirect */
export async function signInWithAppleNative(): Promise<{ error?: string }> {
  const { supabase } = await import("@/lib/supabase");
  const { Browser } = await import("@capacitor/browser");

  const redirectTo = "https://www.clcauto.com/auth/callback";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "apple",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) {
    return { error: error?.message || "Failed to get OAuth URL" };
  }

  await Browser.open({
    url: data.url,
    presentationStyle: "popover",
  });

  return {};
}

export async function signInWithGoogleNative(): Promise<{ error?: string }> {
  const { supabase } = await import("@/lib/supabase");
  const { Browser } = await import("@capacitor/browser");

  // Redirect to our callback page which extracts tokens and redirects
  // back to the app via custom URL scheme (com.clcauto.app://)
  const redirectTo = "https://www.clcauto.com/auth/callback";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) {
    return { error: error?.message || "Failed to get OAuth URL" };
  }

  // Open in-app browser (SFSafariViewController on iOS)
  await Browser.open({
    url: data.url,
    presentationStyle: "popover",
  });

  return {};
}

/** Set up deep link listener for OAuth callbacks */
export async function setupDeepLinkListener(onAuth: () => void) {
  if (!isNative()) return;
  try {
    const { App } = await import("@capacitor/app");
    App.addListener("appUrlOpen", async ({ url }) => {
      // Handle com.clcauto.app:// deep links
      if (!url.includes("auth/callback")) return;

      const hashPart = url.split("#")[1];
      if (!hashPart) return;

      const params = new URLSearchParams(hashPart);
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      if (!accessToken || !refreshToken) return;

      // Close in-app browser
      try {
        const { Browser } = await import("@capacitor/browser");
        await Browser.close();
      } catch { /* already closed */ }

      // Set session
      const { supabase } = await import("@/lib/supabase");
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (!error) onAuth();
    });
  } catch {
    // Plugin not available
  }
}

// ---------- Permissions (notifications & location) ----------

export type AppPermissionState = "granted" | "denied" | "prompt";

function normalizePermission(state: string | undefined): AppPermissionState {
  if (state === "granted") return "granted";
  if (state === "denied") return "denied";
  return "prompt"; // "prompt" | "prompt-with-rationale" | unknown
}

/** Check notification permission status (native only; web returns "granted" to stay quiet) */
export async function checkNotificationPermission(): Promise<AppPermissionState> {
  if (!isNative()) return "granted";
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const status = await PushNotifications.checkPermissions();
    return normalizePermission(status.receive);
  } catch {
    return "granted"; // plugin unavailable — don't nag
  }
}

/** Request notification permission; registers for push if granted */
export async function requestNotificationPermission(): Promise<AppPermissionState> {
  if (!isNative()) return "granted";
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const status = await PushNotifications.requestPermissions();
    const state = normalizePermission(status.receive);
    if (state === "granted") await registerPushNotifications();
    return state;
  } catch {
    return "denied";
  }
}

/** Check location permission status (native only; web returns "granted" to stay quiet) */
export async function checkLocationPermission(): Promise<AppPermissionState> {
  if (!isNative()) return "granted";
  try {
    const { Geolocation } = await import("@capacitor/geolocation");
    const status = await Geolocation.checkPermissions();
    return normalizePermission(status.location);
  } catch {
    // iOS throws if location services are disabled system-wide
    return "denied";
  }
}

/** Request location permission via the system dialog(并发调用共享同一次请求) */
let locPermRequest: Promise<AppPermissionState> | null = null;

export async function requestLocationPermission(): Promise<AppPermissionState> {
  if (!isNative()) return "granted";
  if (locPermRequest) return locPermRequest;
  locPermRequest = (async () => {
    try {
      const { Geolocation } = await import("@capacitor/geolocation");
      const status = await Geolocation.requestPermissions();
      const state = normalizePermission(status.location);
      if (state === "granted") notifyLocationGranted();
      return state;
    } catch {
      return "denied" as const;
    } finally {
      locPermRequest = null;
    }
  })();
  return locPermRequest;
}

/** 定位权限刚被授予时广播,让已挂载的页面重新检测位置(页面只在 mount 时检测一次) */
export function notifyLocationGranted() {
  window.dispatchEvent(new Event("clc-location-granted"));
}

/** Open the app's page in system settings (for permissions denied at OS level) */
export async function openAppSettings() {
  if (!isNative()) return;
  try {
    const { NativeSettings, AndroidSettings, IOSSettings } = await import(
      "capacitor-native-settings"
    );
    await NativeSettings.open({
      optionAndroid: AndroidSettings.ApplicationDetails,
      optionIOS: IOSSettings.App,
    });
  } catch {
    // Plugin not available
  }
}

/** Register with APNs/FCM and persist the device token for the signed-in user */
export async function registerPushNotifications() {
  if (!isNative()) return;
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");

    await PushNotifications.removeAllListeners();

    PushNotifications.addListener("registration", async ({ value: token }) => {
      try {
        localStorage.setItem("clc_push_token", token);
        const { supabase } = await import("@/lib/supabase");
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return; // saved locally; synced on next launch after login
        await supabase.from("push_tokens").upsert(
          { user_id: user.id, token, platform: getPlatform() },
          { onConflict: "token" }
        );
      } catch {
        // Table may not exist yet — token stays in localStorage
      }
    });

    // Tapping a notification: deep-link if the payload carries a url
    PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      const url = action.notification.data?.url;
      if (typeof url === "string" && url.startsWith("/")) {
        window.location.href = url;
      }
    });

    await PushNotifications.register();
  } catch {
    // Plugin not available
  }
}

/** Run a callback every time the app returns to the foreground */
export async function onAppResume(callback: () => void): Promise<() => void> {
  if (!isNative()) return () => {};
  try {
    const { App } = await import("@capacitor/app");
    const handle = await App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) callback();
    });
    return () => handle.remove();
  } catch {
    return () => {};
  }
}

/** Get geolocation (native or web) — 复用 geocode 里带权限处理/缓存/兜底的实现 */
export async function getLocation(): Promise<{
  lat: number;
  lng: number;
} | null> {
  try {
    const { getCurrentPosition } = await import("@/lib/geocode");
    const pos = await getCurrentPosition();
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return null;
  }
}

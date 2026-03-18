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

/** Get geolocation (native or web) */
export async function getLocation(): Promise<{
  lat: number;
  lng: number;
} | null> {
  if (isNative()) {
    try {
      const { Geolocation } = await import("@capacitor/geolocation");
      const pos = await Geolocation.getCurrentPosition();
      return { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch {
      // Fall through to web
    }
  }
  // Web fallback
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 10000 }
    );
  });
}

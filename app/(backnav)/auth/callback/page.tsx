"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    function handleCallback() {
      // The URL hash contains: #access_token=...&refresh_token=...&...
      const hash = window.location.hash.substring(1);
      if (!hash) {
        setStatus("error");
        return;
      }

      const params = new URLSearchParams(hash);
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (!accessToken || !refreshToken) {
        setStatus("error");
        return;
      }

      // Check if we're inside a Capacitor in-app browser (SFSafariViewController).
      // If so, redirect to the custom URL scheme to pass tokens back to the app.
      // The in-app browser can open custom schemes which triggers appUrlOpen.
      const isInAppBrowser =
        // SFSafariViewController doesn't have Capacitor bridge
        !window.hasOwnProperty("Capacitor") ||
        // Or check if we're NOT in the main WKWebView
        !(window as any).Capacitor?.isNativePlatform?.();

      if (isInAppBrowser) {
        // Redirect to custom URL scheme — this triggers the native app's deep link handler
        setStatus("success");
        // Small delay so user sees "登录成功" briefly
        setTimeout(() => {
          window.location.href = `com.clcauto.app://auth/callback#${hash}`;
        }, 500);
        return;
      }

      // Web browser: set session via Supabase client directly
      import("@/lib/supabase").then(async ({ supabase }) => {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          setStatus("error");
        } else {
          setStatus("success");
          setTimeout(() => router.push("/"), 1000);
        }
      });
    }

    handleCallback();
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 font-mono">
      {status === "loading" && (
        <>
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" strokeWidth={1.5} />
          <p className="mt-4 text-sm text-muted-foreground">正在登录...</p>
        </>
      )}
      {status === "success" && (
        <>
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-muted/50">
            <Check className="h-7 w-7 text-foreground" strokeWidth={1.5} />
          </div>
          <p className="mt-4 text-sm font-medium">登录成功</p>
          <p className="mt-1 text-xs text-muted-foreground">正在返回应用...</p>
        </>
      )}
      {status === "error" && (
        <>
          <p className="text-sm font-medium text-destructive">登录失败</p>
          <p className="mt-1 text-xs text-muted-foreground">请关闭此页面重试</p>
        </>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    // Supabase automatically picks up the tokens from the URL hash
    // when the page loads (via onAuthStateChange or getSession).
    // We just need to wait for it to process.
    async function handleCallback() {
      // Give Supabase client a moment to process the hash tokens
      // The supabase-js client auto-detects #access_token in the URL
      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
        // Try waiting a bit longer — the client may still be processing
        await new Promise((r) => setTimeout(r, 1000));
        const retry = await supabase.auth.getSession();
        if (retry.error || !retry.data.session) {
          setStatus("error");
          return;
        }
      }

      setStatus("success");

      // On web (non-Capacitor), redirect to home
      // On Capacitor, the user will close the in-app browser
      // and the browserFinished listener handles the rest
      setTimeout(() => {
        router.push("/");
      }, 1500);
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
          <div className="flex h-14 w-14 items-center justify-center border border-border bg-muted/50">
            <Check className="h-7 w-7 text-foreground" strokeWidth={1.5} />
          </div>
          <p className="mt-4 text-sm font-medium">登录成功</p>
          <p className="mt-1 text-xs text-muted-foreground">正在跳转...</p>
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

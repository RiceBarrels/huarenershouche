"use client";

// 网页端 OAuth 回跳兜底:回跳地址不在 Supabase 白名单时会落到 /zh,
// 这里按发起登录时记下的语言跳回对应语言树(见 lib/oauth-redirect)。
// 只在确实已登录时纠正,放弃登录留下的记录直接丢弃。

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n-provider";
import { isNative } from "@/lib/capacitor";
import { localizePath, stripLocale } from "@/lib/i18n";
import { takeOAuthLocale } from "@/lib/oauth-redirect";
import { supabase } from "@/lib/supabase";

export function OAuthLocaleRestore() {
  const { pathLocale } = useI18n();
  const router = useRouter();

  useEffect(() => {
    if (isNative()) return;
    const pending = takeOAuthLocale();
    if (!pending || pending === pathLocale) return;
    // getSession 会等 supabase 先从 URL hash 里取完 token,再跳转不会丢登录态
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      const rest = stripLocale(window.location.pathname);
      router.replace(localizePath(rest, pending) + window.location.search);
    });
  }, [pathLocale, router]);

  return null;
}

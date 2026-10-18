// 网页端 OAuth(Google / Apple)回跳地址:回到发起登录时的语言树。
//
// 以前写死 https://www.clcauto.com/,而 vercel.json 把 / 一律跳到 /zh,
// 英文等界面登录完都落回中文。现在回跳地址带语言前缀;万一该地址不在
// Supabase Redirect URLs 白名单里,Supabase 会退回 Site URL(根路径 → /zh),
// 所以同时在 sessionStorage 记下语言,落地后由 OAuthLocaleRestore 跳回去。
// 原生端走 lib/capacitor 的 /auth/callback 深链流程,不用这里。

import { LOCALES, type Locale } from "@/lib/i18n";

const OAUTH_LOCALE_KEY = "clc_oauth_locale";
// 超过这个时长的记录视为放弃登录后的残留,不再纠正
const MAX_AGE_MS = 10 * 60 * 1000;

export function oauthRedirectTo(locale: Locale): string {
  try {
    sessionStorage.setItem(OAUTH_LOCALE_KEY, JSON.stringify({ locale, at: Date.now() }));
  } catch {
    // 存不了就只靠回跳地址
  }
  return `https://www.clcauto.com/${locale}`;
}

/** 取出并清除发起 OAuth 时记下的语言(过期或无效返回 null) */
export function takeOAuthLocale(): Locale | null {
  try {
    const raw = sessionStorage.getItem(OAUTH_LOCALE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(OAUTH_LOCALE_KEY);
    const { locale, at } = JSON.parse(raw) as { locale: Locale; at: number };
    if (!LOCALES.includes(locale) || Date.now() - at > MAX_AGE_MS) return null;
    return locale;
  } catch {
    return null;
  }
}

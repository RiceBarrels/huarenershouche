import { supabase } from "@/lib/supabase";
import type { Locale } from "@/lib/i18n";

/**
 * 把界面语言记进登录用户的 user_metadata.locale,供 Supabase 认证邮件模板按 {{ .Data.locale }} 选语言
 * (supabase/email-templates/)。未登录或失败都静默;updateUser 的 data 与已有 metadata 合并,不覆盖其他键。
 */
export function syncAccountLocale(locale: Locale): void {
  void supabase.auth
    .getSession()
    .then(({ data }) => {
      const user = data.session?.user;
      if (!user || user.user_metadata?.locale === locale) return;
      return supabase.auth.updateUser({ data: { locale } });
    })
    .catch(() => {});
}

"use client";

// 全局 404:匹配不到任何路由时渲染(在根 layout 下,没有 I18nProvider,
// 所以用内置的迷你多语言词典,按 URL 前缀/浏览器语言自行判定)。
// 语言树内部抛出的 notFound() 走 app/[locale]/not-found.tsx(有完整词典与页头页尾)。

import { useEffect, useState } from "react";
import { type Locale, localeFromPath, detectLocale } from "@/lib/i18n";

const COPY: Record<Locale, { title: string; desc: string; home: string; browse: string }> = {
  zh: { title: "页面不存在", desc: "你访问的页面可能已被移除，或链接有误。", home: "返回首页", browse: "浏览车源" },
  en: { title: "Page not found", desc: "The page you're looking for may have been removed, or the link is incorrect.", home: "Back to home", browse: "Browse cars" },
  ko: { title: "페이지를 찾을 수 없습니다", desc: "찾으시는 페이지가 삭제되었거나 링크가 잘못되었을 수 있습니다.", home: "홈으로", browse: "매물 보기" },
  ja: { title: "ページが見つかりません", desc: "お探しのページは削除されたか、リンクが間違っている可能性があります。", home: "ホームへ", browse: "車両を見る" },
  es: { title: "Página no encontrada", desc: "Es posible que la página que buscas haya sido eliminada o que el enlace sea incorrecto.", home: "Volver al inicio", browse: "Ver vehículos" },
  fr: { title: "Page introuvable", desc: "La page que vous recherchez a peut-être été supprimée ou le lien est incorrect.", home: "Retour à l'accueil", browse: "Voir les véhicules" },
};

export default function GlobalNotFound() {
  // SSR/首帧按 zh,挂载后按 URL 前缀(/en/xxx 打错也能对上语言)或浏览器语言修正
  const [locale, setLocale] = useState<Locale>("zh");
  useEffect(() => {
    const fromPath = localeFromPath(window.location.pathname);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 挂载后一次性判定语言
    setLocale(fromPath ?? detectLocale(navigator.languages ?? [navigator.language]));
  }, []);
  const c = COPY[locale];

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 font-mono">
      {/* 工具感:大号等宽数字 + 1px 分隔线 + 品牌色小块,无光效 */}
      <p className="text-7xl font-bold tracking-tighter text-foreground md:text-8xl">
        4<span className="text-brand-ink">0</span>4
      </p>
      <div className="mt-4 h-1 w-10 bg-brand" aria-hidden="true" />
      <h1 className="mt-6 text-base font-semibold text-foreground">{c.title}</h1>
      <p className="mt-2 max-w-sm text-center text-sm leading-relaxed text-muted-foreground">
        {c.desc}
      </p>
      <div className="mt-8 flex items-center gap-3">
        <a
          href={`/${locale}`}
          className="flex h-9 items-center bg-primary px-5 text-xs text-primary-foreground transition-opacity hover:opacity-90"
        >
          {c.home}
        </a>
        <a
          href={`/${locale}/browse`}
          className="flex h-9 items-center border border-border px-5 text-xs text-foreground transition-colors hover:bg-muted"
        >
          {c.browse}
        </a>
      </div>
    </div>
  );
}

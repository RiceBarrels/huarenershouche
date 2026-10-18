"use client";

// 最外层兜底:根 layout 自身崩溃时渲染,必须自带 <html>/<body>,
// 没有任何 Provider,文案用中英双语静态写死,不引入组件依赖。

import { useSyncExternalStore } from "react";
import { localeFromPath } from "@/lib/i18n";
import { htmlLang } from "@/lib/i18n/content-langs";

// <html lang> 跟随 URL 语言前缀:服务端与水合首帧固定 zh-CN,客户端按 location.pathname 取值
const subscribeNoop = () => () => {};
const pathHtmlLang = () => htmlLang(localeFromPath(window.location.pathname) ?? "zh");
const serverHtmlLang = () => "zh-CN";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const lang = useSyncExternalStore(subscribeNoop, pathHtmlLang, serverHtmlLang);

  return (
    <html lang={lang}>
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          background: "#f8f8f8",
          color: "#1a1a1a",
          padding: "0 24px",
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: 56, fontWeight: 700, letterSpacing: "-0.04em", margin: 0 }}>500</p>
        <div style={{ marginTop: 16, height: 4, width: 40, background: "#89fcd2" }} />
        <h1 style={{ marginTop: 24, fontSize: 16 }}>页面出错了 / Something went wrong</h1>
        {error.digest && (
          <p style={{ marginTop: 8, fontSize: 10, color: "#888" }}>{error.digest}</p>
        )}
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: 32,
            height: 36,
            padding: "0 20px",
            fontSize: 12,
            fontFamily: "inherit",
            background: "#89fcd2",
            color: "#063a2c",
            border: "none",
            cursor: "pointer",
          }}
        >
          重试 / Retry
        </button>
      </body>
    </html>
  );
}

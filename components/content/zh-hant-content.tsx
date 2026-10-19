"use client";

// 繁體界面的用户内容转换(说明见 lib/i18n/content/hant.ts)。只在 locale === zh-hant 时生效,其他语言 context 为 null。
// - 服务端渲染:等完整转换器就绪(进程内只加载一次),转换并把结果累积起来,useServerInsertedHTML 随流写成
//   <script>,水合前就挂在 window.__clcHant 上;名称逐字表走 props(见 ZhHantContentProvider);
// - 客户端:转换器就绪前查种子表,种子里没有(挂载后才取到的内容)时触发懒加载,就绪后整树重渲染一次。
//   opencc 只有遇到种子里没有的中文时才下载 —— 纯 SSR 内容的页面不额外下载。

import { createContext, Fragment, use, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useServerInsertedHTML } from "next/navigation";
import { useI18n } from "@/components/i18n-provider";
import { needsHant, seedScript, seededHant, type HantFn } from "@/lib/i18n/content/hant";
import { hantCharsReady, registerHantChars } from "@/lib/i18n/zh-hant-names";
import {
  convertZhHant,
  loadZhHantConverter,
  subscribeZhHantConverter,
  zhHantConverterReady,
} from "@/lib/i18n/zh-hant-runtime";

const HantContext = createContext<HantFn | null>(null);

/** 繁體界面下的内容转换函数;其他语言为 null */
export function useZhHantContent(): HantFn | null {
  return useContext(HantContext);
}

const getFalse = () => false;

// 服务端进程内只加载一次名称字表
let charsPromise: Promise<string> | null = null;
function loadChars(): Promise<string> {
  charsPromise ??= import("@/lib/i18n/zh-hant-chars").then((m) => {
    registerHantChars(m.ZH_HANT_CHAR_PAIRS);
    return m.ZH_HANT_CHAR_PAIRS;
  });
  return charsPromise;
}

function ServerHant({ chars, children }: { chars?: string; children: ReactNode }) {
  if (!zhHantConverterReady()) use(loadZhHantConverter());
  if (chars) registerHantChars(chars);
  else use(loadChars());
  // 每次请求新建组件实例:pending 是本次请求的转换结果,flush 后清空
  const pending = useRef(new Map<string, string>());
  useServerInsertedHTML(() => {
    if (pending.current.size === 0) return null;
    const entries = Object.fromEntries(pending.current);
    pending.current.clear();
    return <script dangerouslySetInnerHTML={{ __html: seedScript(entries) }} />;
  });
  const fn = useMemo<HantFn>(
    () => (text) => {
      if (!needsHant(text)) return text;
      const out = convertZhHant(text) ?? text;
      // 转换后不变的中文也要进种子,否则客户端查不到会白白去下载 opencc
      pending.current.set(text, out);
      return out;
    },
    []
  );
  return <HantContext.Provider value={fn}>{children}</HantContext.Provider>;
}

function ClientHant({ enabled, chars, children }: { enabled: boolean; chars?: string; children: ReactNode }) {
  // 名称逐字表随 RSC payload 作为 props 到达:渲染子树之前同步注册,水合时 carTitle / t() 缺词与服务端一致
  // (不依赖内联脚本的执行时机)
  if (enabled && chars) registerHantChars(chars);
  // 服务端快照固定 false:水合首帧只用种子,与 SSR 输出一致
  const ready = useSyncExternalStore(subscribeZhHantConverter, zhHantConverterReady, getFalse);
  const missed = useRef(false);
  const fn = useMemo<HantFn | null>(
    () => !enabled ? null : (text) => {
      if (!needsHant(text)) return text;
      const full = ready ? convertZhHant(text) : null;
      if (full !== null) return full;
      const seeded = seededHant(text);
      if (seeded !== undefined) return seeded;
      missed.current = true;
      return text;
    },
    [enabled, ready]
  );
  // 渲染期间有种子未覆盖的中文 → 提交后再加载转换器(就绪时 ready 变化,整树重渲染)
  useEffect(() => {
    if (enabled && !ready && missed.current) void loadZhHantConverter();
  });
  // 名称逐字表:正常页面由 props 带来(charsKey 恒为 0,不重挂载);
  // 没带字表的繁體渲染(原生端在 App 内切换到繁體)懒加载,到位后整树重挂载一次,让 carTitle 等重新取值
  const [charsKey, setCharsKey] = useState(0);
  useEffect(() => {
    if (!enabled || hantCharsReady()) return;
    let alive = true;
    void import("@/lib/i18n/zh-hant-chars").then((m) => {
      registerHantChars(m.ZH_HANT_CHAR_PAIRS);
      if (alive) setCharsKey((k) => k + 1);
    });
    return () => {
      alive = false;
    };
  }, [enabled]);
  return (
    <HantContext.Provider value={fn}>
      <Fragment key={charsKey}>{children}</Fragment>
    </HantContext.Provider>
  );
}

/** chars:名称逐字表(lib/i18n/zh-hant-chars.ts),由 server component 只在 zh-hant 树传入 */
export function ZhHantContentProvider({ chars, children }: { chars?: string; children: ReactNode }) {
  const { locale } = useI18n();
  const enabled = locale === "zh-hant";
  // 客户端始终是同一棵树(原生端在 App 内切换语言不跳转,换包裹组件会让整页重新挂载);
  // 服务端不会切换语言,按 locale 二选一即可(组件结构不同不影响水合,只比对 DOM)
  if (typeof window !== "undefined") {
    return (
      <ClientHant enabled={enabled} chars={chars}>
        {children}
      </ClientHant>
    );
  }
  return enabled ? <ServerHant chars={chars}>{children}</ServerHant> : <>{children}</>;
}

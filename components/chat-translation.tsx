"use client";

// 私信翻译(聊天窗口用):每条对方发来的文字消息可「翻译此消息」,译文下方沿用内容翻译的
// TranslationNotice(「已从 X 翻译 · 显示原文」);每个会话可单独开「自动翻译」(默认关,localStorage 按
// conversation_id 记住;开启 = 只对这个会话授权),开着时对方的新消息若与界面语言不同就自动翻译。
// - 接口 503(没配模型 / 紧急开关)→ 本会话静默隐藏全部翻译 UI,不提示;
// - 接口 429(额度用完)→ 本会话停止自动翻译,只显示一行「翻译额度已用完，稍后再试」,不重试;
// - 对方声明的沟通语言(profiles.languages)不含当前界面语言时,输入框上方提示「对方使用 X · 消息可一键翻译」。
// 私信绝不进公开的 i18n 管线;译文缓存表与接口见 lib/chat-translate.ts。

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Languages } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { TranslationNotice } from "@/components/content/translation-notice";
import type { LocalizedView } from "@/hooks/use-localized";
import { supabase } from "@/lib/supabase";
import type { Locale } from "@/lib/i18n";
import { languageLabel, localeLanguageCodes } from "@/lib/i18n/languages";
import {
  chatTranslateSession,
  fetchCachedTranslations,
  needsTranslation,
  readAutoTranslate,
  translateMessage,
  useChatTranslateSession,
  writeAutoTranslate,
} from "@/lib/chat-translate";
import { cn } from "@/lib/utils";
import type { DbMessage } from "@/lib/types";

/** 开启自动翻译时,最多补译最近几条历史消息(其余仍可手动翻译),新到的消息逐条自动翻译 */
const AUTO_BACKLOG = 10;

export type ChatTranslationEntry =
  | { status: "loading" }
  | { status: "failed" }
  | { status: "same" }
  | { status: "done"; text: string; sourceLang: string | null; showOriginal: boolean };

const entryKey = (locale: Locale, id: string) => `${locale}:${id}`;

export function useChatTranslation({
  conversationId,
  currentUserId,
  otherUserId,
  messages,
  isMedia,
}: {
  conversationId: string;
  currentUserId: string;
  otherUserId: string | null;
  messages: DbMessage[];
  isMedia: (content: string) => boolean;
}) {
  const { locale } = useI18n();
  const session = useChatTranslateSession();
  const [entries, setEntries] = useState<Record<string, ChatTranslationEntry>>({});
  // 自动翻译开关:按会话记住;本页内改过的以 state 为准
  const [autoOverrides, setAutoOverrides] = useState<Record<string, boolean>>({});
  const auto = autoOverrides[conversationId] ?? readAutoTranslate(conversationId);
  const [otherLanguages, setOtherLanguages] = useState<string[] | null>(null);

  // 已处理过(请求过 / 查过缓存命中 / 正在请求)的 locale:id,自动翻译绝不重复请求同一条
  const handledRef = useRef(new Set<string>());
  const inFlightRef = useRef(new Set<string>());
  // 自动翻译的补译起点(会话:locale → 时间戳 ms):开启自动翻译(或开着进入会话)后第一次看到外语来信时定一次,
  // 取最近 AUTO_BACKLOG 条里最早那条的时间;之后只翻译不早于起点的消息。
  // 否则每次 messages 变化(自己发消息 / 新来一条)都会再往前捞 AUTO_BACKLOG 条旧消息,几轮就把整段历史译完、耗光额度。
  // 关掉自动翻译时清除,下次开启重新定起点(已译过的走缓存,不占额度)
  const cutoffRef = useRef(new Map<string, number>());
  const autoRef = useRef(auto);
  useEffect(() => {
    autoRef.current = auto;
  }, [auto]);

  // 对方声明的沟通语言(seller-languages.sql 未执行 / 读失败时不提示)
  useEffect(() => {
    if (!otherUserId) return;
    let alive = true;
    supabase
      .from("profiles")
      .select("languages")
      .eq("id", otherUserId)
      .maybeSingle()
      .then(
        ({ data, error }) => {
          if (!alive) return;
          const langs = (data as { languages?: unknown } | null)?.languages;
          setOtherLanguages(
            !error && Array.isArray(langs) ? langs.filter((l): l is string => typeof l === "string") : null,
          );
        },
        () => {},
      );
    return () => {
      alive = false;
    };
  }, [otherUserId]);

  // 对方发来的、与界面语言不同的文字消息(只算当前会话的:切会话时旧列表在新会话加载完之前还会留一下)
  const foreignIncoming = useMemo(
    () =>
      messages.filter(
        (m) =>
          m.conversation_id === conversationId &&
          m.sender_id !== currentUserId &&
          !isMedia(m.content) &&
          needsTranslation(m.content, locale),
      ),
    [messages, conversationId, currentUserId, isMedia, locale],
  );
  const foreignIds = useMemo(() => new Set(foreignIncoming.map((m) => m.id)), [foreignIncoming]);

  const runTranslate = useCallback(
    async (messageId: string) => {
      const key = entryKey(locale, messageId);
      if (inFlightRef.current.has(key)) return;
      inFlightRef.current.add(key);
      handledRef.current.add(key);
      setEntries((prev) => ({ ...prev, [key]: { status: "loading" } }));
      const r = await translateMessage(messageId, locale);
      inFlightRef.current.delete(key);
      setEntries((prev) => {
        const next = { ...prev };
        if (r.ok) {
          next[key] = r.same
            ? { status: "same" }
            : { status: "done", text: r.text, sourceLang: r.sourceLang, showOriginal: false };
        } else if (r.error === "failed") {
          next[key] = { status: "failed" };
        } else {
          // 503 / 429:由会话级开关接管 UI(隐藏或一行额度提示),这一条恢复成未翻译
          delete next[key];
        }
        return next;
      });
    },
    [locale],
  );

  // 自动翻译:只处理补译起点之后的消息;先批量读缓存(不占额度),再逐条请求剩下的(串行,429 后立即停)
  useEffect(() => {
    if (!auto || session.unavailable || session.exhausted) return;
    if (foreignIncoming.length === 0) return;
    const cutoffKey = `${conversationId}:${locale}`;
    let cutoff = cutoffRef.current.get(cutoffKey);
    if (cutoff === undefined) {
      // messages 按 created_at 升序(chat-thread 加载顺序 + 实时追加)
      const start = Math.max(0, foreignIncoming.length - AUTO_BACKLOG);
      cutoff = Date.parse(foreignIncoming[start].created_at);
      if (Number.isNaN(cutoff)) {
        // 时间解析不了:退回按位置跳过更早的(标成已处理,只挡自动翻译,手动翻译不受影响)
        for (const m of foreignIncoming.slice(0, start)) handledRef.current.add(entryKey(locale, m.id));
        cutoff = -Infinity;
      }
      cutoffRef.current.set(cutoffKey, cutoff);
    }
    const from = cutoff;
    const todo = foreignIncoming.filter(
      (m) =>
        !handledRef.current.has(entryKey(locale, m.id)) &&
        // 时间解析不了的(理论上没有)当作新消息
        !(Date.parse(m.created_at) < from),
    );
    if (todo.length === 0) return;
    for (const m of todo) handledRef.current.add(entryKey(locale, m.id));
    void (async () => {
      const cached = await fetchCachedTranslations(
        todo.map((m) => m.id),
        locale,
      );
      if (cached.size > 0) {
        setEntries((prev) => {
          const next = { ...prev };
          for (const [id, c] of cached) {
            next[entryKey(locale, id)] = { status: "done", text: c.text, sourceLang: c.sourceLang, showOriginal: false };
          }
          return next;
        });
      }
      for (const m of todo) {
        const s = chatTranslateSession();
        if (!autoRef.current || s.unavailable || s.exhausted) {
          // 中途关掉 / 不可用:没轮到的放回去,下次开启时还能补译
          if (!cached.has(m.id)) handledRef.current.delete(entryKey(locale, m.id));
          continue;
        }
        if (cached.has(m.id)) continue;
        await runTranslate(m.id);
      }
    })();
  }, [auto, foreignIncoming, conversationId, locale, session.unavailable, session.exhausted, runTranslate]);

  const setAuto = useCallback(
    (on: boolean) => {
      if (!on) {
        // 关掉:清本会话各语言的补译起点,下次开启按当时最近 AUTO_BACKLOG 条重新定
        const prefix = `${conversationId}:`;
        for (const k of [...cutoffRef.current.keys()]) if (k.startsWith(prefix)) cutoffRef.current.delete(k);
      }
      writeAutoTranslate(conversationId, on);
      setAutoOverrides((prev) => ({ ...prev, [conversationId]: on }));
    },
    [conversationId],
  );

  const toggleOriginal = useCallback(
    (messageId: string) => {
      const key = entryKey(locale, messageId);
      setEntries((prev) => {
        const e = prev[key];
        if (!e || e.status !== "done") return prev;
        return { ...prev, [key]: { ...e, showOriginal: !e.showOriginal } };
      });
    },
    [locale],
  );

  // 提示:对方声明了语言且不含当前界面语言(未声明时不猜)
  const codes: string[] = localeLanguageCodes(locale);
  const hintLangs =
    otherLanguages && otherLanguages.length > 0 && !otherLanguages.some((l) => codes.includes(l))
      ? otherLanguages.map(languageLabel).join(" / ")
      : null;

  const enabled = !session.unavailable;
  return {
    enabled,
    exhausted: session.exhausted,
    auto,
    setAuto,
    hintLangs: enabled ? hintLangs : null,
    /** 输入框上方的一行:有提示、有外语来信、已开自动翻译或额度用完时显示 */
    showBar: enabled && (!!hintLangs || foreignIncoming.length > 0 || auto || session.exhausted),
    entry: (messageId: string): ChatTranslationEntry | undefined => entries[entryKey(locale, messageId)],
    /** 这条消息是否给「翻译此消息」按钮 */
    canTranslate: (messageId: string) => enabled && foreignIds.has(messageId),
    translate: (messageId: string) => {
      if (enabled) void runTranslate(messageId);
    },
    toggleOriginal,
  };
}

export type ChatTranslation = ReturnType<typeof useChatTranslation>;

/** 译文标注:复用内容翻译的 TranslationNotice(按它要的 LocalizedView 形状拼一个单字段视图) */
export function ChatTranslationNotice({
  original,
  entry,
  onToggle,
  className,
}: {
  original: string;
  entry: ChatTranslationEntry;
  onToggle: () => void;
  className?: string;
}) {
  const { locale } = useI18n();
  if (entry.status !== "done" && entry.status !== "loading") return null;
  const pending = entry.status === "loading";
  const translatedText = entry.status === "done" ? entry.text : original;
  const showOriginal = entry.status === "done" ? entry.showOriginal : false;
  const sourceLang = entry.status === "done" ? entry.sourceLang : null;
  const shown = showOriginal || pending ? original : translatedText;
  const view: LocalizedView<"content"> = {
    text: { content: translatedText },
    original: { content: original },
    textLang: { content: pending ? (sourceLang ?? undefined) : locale },
    originalLang: { content: sourceLang ?? undefined },
    sourceLang,
    translated: !pending,
    state: pending ? "pending" : "ok",
    available: [],
    sourceLocale: null,
    shown: { content: shown },
    shownLang: { content: showOriginal || pending ? (sourceLang ?? undefined) : locale },
    showOriginal,
    toggleOriginal: onToggle,
    pending,
  };
  return <TranslationNotice view={view} className={className} />;
}

/** 消息时间行里的「翻译此消息」小按钮 */
export function ChatTranslateButton({ onClick, failed }: { onClick: () => void; failed?: boolean }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-[0.3rem] text-brand-ink underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-brand-ink/50"
    >
      <Languages className="size-3 shrink-0" strokeWidth={1.5} aria-hidden />
      {failed ? t("翻译失败，点此重试") : t("翻译此消息")}
    </button>
  );
}

/** 输入框上方的一行:对方语言提示 / 额度用完提示 + 本会话「自动翻译」开关 */
export function ChatTranslateBar({ tr }: { tr: ChatTranslation }) {
  const { t } = useI18n();
  if (!tr.showBar) return null;
  return (
    <div className="flex items-center gap-2 px-4 pt-2 font-mono text-[11px] leading-snug text-muted-foreground">
      <p className="min-w-0 flex-1 truncate">
        {tr.exhausted
          ? t("翻译额度已用完，稍后再试")
          : tr.hintLangs
            ? t("对方使用 {lang} · 消息可一键翻译", { lang: tr.hintLangs })
            : null}
      </p>
      {!tr.exhausted && (
        <button
          type="button"
          role="switch"
          aria-checked={tr.auto}
          title={t("开启后自动翻译对方在本会话中发来的消息")}
          onClick={() => tr.setAuto(!tr.auto)}
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-[0.3rem] border px-2 py-0.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-ink/50",
            tr.auto
              ? "border-transparent bg-primary text-primary-foreground"
              : "border-border text-muted-foreground hover:text-foreground",
          )}
        >
          <Languages className="size-3" strokeWidth={1.5} aria-hidden />
          {t("自动翻译")}
        </button>
      )}
    </div>
  );
}

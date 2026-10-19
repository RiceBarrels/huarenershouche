"use client";

// 注册后的全屏引导(网页版,一次性):品牌 / 用你的语言看车 / 站内聊天与防骗 / 偏好三问(PreferencesForm)。
// 由 UsernameGate 在取名之后、只对新账号弹出(lib/preferences.ts shouldShowOnboarding);
// Capacitor App 有自己的 welcome-screen,不走这里。
// 走完或跳过都记 clc_prefs.onboarded,同时记 setupDone(偏好题就在末页,首页卡片之后不再出现)。
// 埋点 kind = onboarding:view:N / skip:N / done,不含个人信息。

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Flag,
  Languages,
  MessageSquare,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { BrandLogo } from "@/components/brand-logo";
import { PreferencesForm } from "@/components/preferences-form";
import { getPreferences, updatePreferences } from "@/components/use-preferences";
import { trackOnboarding, trackSetupAnswer } from "@/lib/analytics/client";
import { ONBOARDING_PAGES, PREF_COUNTRIES, type PrefCountry } from "@/lib/preferences";
import { getIpGeo } from "@/lib/ip-geo";
import { EASE } from "@/lib/motion";
import { cn } from "@/lib/utils";

const MOSAIC = [
  "toyota", "honda", "tesla", "ford",
  "bmw", "mercedes-benz", "hyundai", "lexus",
  "subaru", "audi", "kia", "nissan",
];

interface Point {
  icon: LucideIcon;
  text: string;
}

// 只写部署即可用的功能:聊天翻译 / 联系 App / 产权状态 / 车况 / 描述自动翻译都要等 SQL,这里不提。
// 卖家语言排序:生产库 profiles.languages 已存在(6 号 2026-10-19 08:01 UTC 查 information_schema),
// 但不知道多少卖家填了,文案只讲排序行为,不写数字。
const LANGS: Point[] = [
  { icon: Languages, text: "界面语言随时切换" },
  { icon: Users, text: "会说你语言的卖家排在前面" },
];

// 措辞沿用 54ba559 的定金 / 付款诈骗提醒
const CHAT: Point[] = [
  { icon: MessageSquare, text: "站内私信,不用先留电话" },
  { icon: ShieldCheck, text: "聊天里自动提醒定金和转账骗局" },
  { icon: Flag, text: "不要为了「留车」提前付定金" },
];

/** 各界面语言的自称(芯片动画用,不翻译) */
const LOCALE_ENDONYM: Record<string, string> = {
  zh: "中文",
  "zh-hant": "中文",
  en: "English",
  ko: "한국어",
  ja: "日本語",
  es: "Español",
  fr: "Français",
};
const CHIP_LOCALES = ["zh", "en", "ko", "ja", "es", "fr"];

export function OnboardingScreen({ onClose }: { onClose: () => void }) {
  const { t, locale } = useI18n();
  const reduced = useReducedMotion();
  const [page, setPage] = useState(0);
  const [dir, setDir] = useState(1);
  const closedRef = useRef(false);
  // 末页国家按 IP 预选(零必填:不改直接「完成」也有效);用户「以后再说」时撤回这个预选
  const prefilledRef = useRef<PrefCountry | null>(null);
  const last = page === ONBOARDING_PAGES - 1;

  useEffect(() => {
    trackOnboarding(`view:${page + 1}`, locale);
  }, [page, locale]);

  useEffect(() => {
    if (!last || getPreferences().country) return;
    let alive = true;
    getIpGeo().then((geo) => {
      const c = geo?.country as PrefCountry | undefined;
      if (!alive || !c || c === "other" || !PREF_COUNTRIES.includes(c) || getPreferences().country) return;
      prefilledRef.current = c;
      updatePreferences({ country: c });
    });
    return () => {
      alive = false;
    };
  }, [last]);

  // 打开期间锁住页面滚动
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const finish = useCallback(
    (how: "completed" | "skipped") => {
      if (closedRef.current) return;
      closedRef.current = true;
      trackOnboarding(how === "completed" ? "done" : `skip:${page + 1}`, locale);
      const patch: { onboarded: typeof how; setupDone?: typeof how; country?: undefined } = { onboarded: how };
      if (how === "skipped" && prefilledRef.current && getPreferences().country === prefilledRef.current) {
        patch.country = undefined;
      }
      if (getPreferences().setupDone !== "completed") {
        patch.setupDone = how;
        trackSetupAnswer(`setup:${how}`, locale);
      }
      updatePreferences(patch);
      onClose();
    },
    [page, locale, onClose]
  );

  const go = useCallback(
    (delta: number) => {
      const next = page + delta;
      if (next < 0) return;
      if (next >= ONBOARDING_PAGES) return finish("completed");
      setDir(delta);
      setPage(next);
    },
    [page, finish]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // 偏好页里有输入框,方向键留给输入
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "Escape") finish("skipped");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, finish]);

  function onDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x < -60 || info.velocity.x < -400) go(1);
    else if (info.offset.x > 60 || info.velocity.x > 400) go(-1);
  }

  const shift = reduced ? 0 : 8;

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={t("欢迎来到常來車網")}
      className="fixed inset-0 z-[96] flex flex-col bg-background text-foreground"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduced ? 0 : 0.25, ease: EASE }}
    >
      {/* 极淡的方格底纹:工具感,不抢内容 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.5] [background-image:linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]"
      />

      {/* 顶栏:品牌 + 分段进度 + 跳过 */}
      <div className="relative mx-auto flex w-full max-w-xl items-center gap-4 px-4 pt-[max(env(safe-area-inset-top),1rem)]">
        <span className="font-logo text-lg tracking-tight">{t("常來車網")}</span>
        <div className="flex flex-1 gap-1.5" aria-hidden>
          {Array.from({ length: ONBOARDING_PAGES }, (_, i) => (
            <span key={i} className="h-1 flex-1 overflow-hidden rounded-[0.3rem] bg-border">
              <motion.span
                className="block h-full origin-left bg-primary"
                initial={false}
                animate={{ scaleX: i <= page ? 1 : 0 }}
                transition={{ duration: reduced ? 0 : 0.35, ease: EASE }}
              />
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={() => finish("skipped")}
          className="font-mono text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {t("跳过")}
        </button>
      </div>
      <p className="sr-only" aria-live="polite">
        {page + 1} / {ONBOARDING_PAGES}
      </p>

      {/* 分页 */}
      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.div
            key={page}
            custom={dir}
            className={cn(
              "absolute inset-0 mx-auto flex w-full max-w-xl flex-col px-6",
              last ? "overflow-y-auto pb-6 pt-6" : "justify-center pb-6"
            )}
            initial={{ opacity: 0, x: dir * shift }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -dir * shift }}
            transition={{ duration: reduced ? 0.15 : 0.22, ease: EASE }}
            drag={last || reduced ? false : "x"}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragEnd={onDragEnd}
          >
            {page === 0 && <WelcomePage reduced={!!reduced} />}
            {page === 1 && (
              <PointsPage
                reduced={!!reduced}
                eyebrow="01"
                title={t("用你的语言看车")}
                points={LANGS}
                art={<LanguageArt reduced={!!reduced} locale={locale} />}
              />
            )}
            {page === 2 && (
              <PointsPage
                reduced={!!reduced}
                eyebrow="02"
                title={t("站内聊,交易更安心")}
                points={CHAT}
                art={<TrustArt reduced={!!reduced} />}
              />
            )}
            {last && (
              <div>
                <Stagger reduced={!!reduced}>
                  <Item>
                    <span className="font-mono text-xs text-muted-foreground">03</span>
                  </Item>
                  <Item>
                    <h2 className="mt-1 font-logo text-3xl tracking-tight sm:text-4xl">{t("再问三件小事")}</h2>
                  </Item>
                  <Item>
                    <p className="mt-2 font-mono text-xs text-muted-foreground">{t("可以跳过,之后在「我的 · 偏好」里随时修改。")}</p>
                  </Item>
                </Stagger>
                <PreferencesForm />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 底栏 */}
      <div className="relative mx-auto flex w-full max-w-xl items-center gap-3 px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={page === 0}
          aria-label={t("上一步")}
          className="flex h-11 w-11 items-center justify-center rounded-[0.3rem] border border-border bg-background text-foreground transition-[opacity,transform] active:translate-y-px disabled:pointer-events-none disabled:opacity-0"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
        </button>
        {last && (
          <button
            type="button"
            onClick={() => finish("skipped")}
            className="h-11 rounded-[0.3rem] border border-border bg-background px-4 font-mono text-sm text-foreground transition-transform active:translate-y-px"
          >
            {t("以后再说")}
          </button>
        )}
        <button
          type="button"
          onClick={() => go(1)}
          className="group flex h-11 flex-1 items-center justify-center gap-2 rounded-[0.3rem] bg-primary font-mono text-sm font-medium text-primary-foreground transition-transform hover:-translate-y-px active:translate-y-px"
        >
          {last ? t("完成") : t("下一步")}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.5} />
        </button>
      </div>
    </motion.div>
  );
}

// ---------- 错峰入场 ----------

function Stagger({ reduced, children, className }: { reduced: boolean; children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: reduced ? 0 : 0.07, delayChildren: reduced ? 0 : 0.08 } } }}
    >
      {children}
    </motion.div>
  );
}

function Item({ children, className }: { children: React.ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: reduced ? 0 : 12 },
        visible: { opacity: 1, y: 0, transition: { duration: reduced ? 0 : 0.4, ease: EASE } },
      }}
    >
      {children}
    </motion.div>
  );
}

// ---------- 各页 ----------

function WelcomePage({ reduced }: { reduced: boolean }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center text-center">
      <motion.div
        className="grid grid-cols-4 gap-2.5"
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: reduced ? 0 : 0.035 } } }}
        aria-hidden
      >
        {MOSAIC.map((make, i) => (
          <motion.div
            key={make}
            variants={{
              hidden: { opacity: 0, scale: reduced ? 1 : 0.6, y: reduced ? 0 : 8 },
              visible: { opacity: 1, scale: 1, y: 0, transition: { duration: reduced ? 0 : 0.35, ease: EASE } },
            }}
            // 中间两格错开一点高度,让方阵不呆板
            className={cn(i % 4 === 1 && "translate-y-2", i % 4 === 2 && "-translate-y-1")}
          >
            <BrandLogo make={make} size="lg" />
          </motion.div>
        ))}
      </motion.div>
      <Stagger reduced={reduced} className="mt-10">
        <Item>
          <h1 className="font-logo text-4xl tracking-tight sm:text-5xl">{t("欢迎来到常來車網")}</h1>
        </Item>
        <Item>
          <p className="mt-3 font-mono text-sm tracking-wide">{t("买车卖车 · 就上常來車網")}</p>
        </Item>
        <Item>
          <p className="mx-auto mt-4 max-w-sm font-mono text-sm leading-relaxed text-muted-foreground">
            {t("免费发布,用你习惯的语言看车、问价、成交。")}
          </p>
        </Item>
      </Stagger>
    </div>
  );
}

function PointsPage({
  reduced,
  eyebrow,
  title,
  points,
  art,
}: {
  reduced: boolean;
  eyebrow: string;
  title: string;
  points: Point[];
  art: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div>
      <div className="mb-10 flex justify-center">{art}</div>
      <Stagger reduced={reduced}>
        <Item>
          <span className="font-mono text-xs text-muted-foreground">{eyebrow}</span>
        </Item>
        <Item>
          <h2 className="mt-1 font-logo text-3xl tracking-tight sm:text-4xl">{title}</h2>
        </Item>
        <ul className="mt-6 space-y-3">
          {points.map(({ icon: Icon, text }) => (
            <Item key={text}>
              <li className="flex items-center gap-3 rounded-[0.3rem] border border-border bg-card px-3 py-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.3rem] bg-secondary">
                  <Icon className="h-4 w-4" strokeWidth={1.5} />
                </span>
                <span className="font-mono text-sm">{t(text)}</span>
              </li>
            </Item>
          ))}
        </ul>
      </Stagger>
    </div>
  );
}

/** 语言芯片 + 一小列卖家:当前界面语言的芯片点亮,会说这门语言的卖家挪到最前 */
function LanguageArt({ reduced, locale }: { reduced: boolean; locale: string }) {
  const mine = LOCALE_ENDONYM[locale] ?? "English";
  const other = mine === "English" ? "Español" : "English";
  const [sorted, setSorted] = useState(reduced);
  useEffect(() => {
    if (reduced) return;
    const id = setTimeout(() => setSorted(true), 650);
    return () => clearTimeout(id);
  }, [reduced]);
  const rows = [
    { id: "a", lang: other, w: "w-20" },
    { id: "b", lang: "Tiếng Việt", w: "w-16" },
    { id: "c", lang: mine, w: "w-24" },
  ];
  const ordered = sorted ? [rows[2], rows[0], rows[1]] : rows;
  return (
    <div className="w-64" aria-hidden>
      <div className="flex flex-wrap justify-center gap-1.5">
        {CHIP_LOCALES.map((l) => {
          const on = LOCALE_ENDONYM[l] === mine;
          return (
            <span
              key={l}
              className={cn(
                "rounded-[0.3rem] border px-2 py-0.5 font-mono text-[11px] transition-colors duration-200",
                on && sorted ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground"
              )}
            >
              {LOCALE_ENDONYM[l]}
            </span>
          );
        })}
      </div>
      <div className="mt-4 space-y-1.5">
        {ordered.map((r) => (
          <motion.div
            key={r.id}
            layout={!reduced}
            transition={{ duration: 0.25, ease: EASE }}
            className={cn(
              "flex items-center gap-2 rounded-[0.3rem] border bg-card px-2.5 py-2 transition-colors duration-200",
              r.lang === mine && sorted ? "border-foreground" : "border-border"
            )}
          >
            <span className="h-5 w-5 shrink-0 rounded-[0.2rem] bg-secondary" />
            <span className={cn("h-1.5 rounded-[0.2rem] bg-muted-foreground/40", r.w)} />
            <span className="ml-auto font-mono text-[10px] text-muted-foreground">{r.lang}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/** 线稿:盾牌 + 依次打勾的检查单 */
function TrustArt({ reduced }: { reduced: boolean }) {
  return (
    <div className="flex items-center gap-4" aria-hidden>
      <motion.div
        className="flex h-20 w-20 items-center justify-center rounded-[0.3rem] border border-foreground bg-card text-foreground"
        initial={{ opacity: 0, rotate: reduced ? 0 : -6, scale: reduced ? 1 : 0.85 }}
        animate={{ opacity: 1, rotate: 0, scale: 1 }}
        transition={{ duration: reduced ? 0 : 0.45, ease: EASE }}
      >
        <ShieldCheck className="h-9 w-9" strokeWidth={1.5} />
      </motion.div>
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <motion.span
              className="flex h-4 w-4 items-center justify-center rounded-[0.2rem] border border-border bg-card"
              initial={{ opacity: 0, scale: reduced ? 1 : 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: reduced ? 0 : 0.25, delay: reduced ? 0 : 0.3 + i * 0.15, ease: EASE }}
            >
              <Check className="h-3 w-3" strokeWidth={1.5} />
            </motion.span>
            <div className={cn("h-2 rounded-[0.2rem] bg-muted-foreground/40", i === 0 ? "w-24" : i === 1 ? "w-20" : "w-28")} />
          </div>
        ))}
      </div>
    </div>
  );
}

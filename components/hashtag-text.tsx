"use client";

import { useMemo } from "react";
import { useRouter } from "@/components/localized-navigation";
import { useOverlay } from "@/components/car-overlay-provider";
import { HASHTAG_SPLIT_RE, URL_SOURCE, extractHashtags, normTag } from "@/lib/i18n/hashtags";
import { hashtagSearchHref, topicHref } from "@/lib/i18n/topics";
import type { TopicLabel } from "@/lib/i18n/content/types";

// 把文本里的 #话题 渲染成可点击链接(X 式)。切分规则与 SQL i18n.hashtag_tokens 一致(lib/i18n/hashtags):
// 网址整段按普通文本显示,网址里的 #片段(…/model3#specs、#wechat_redirect)不是话题。
// - topics:帖子的话题(bundle x.topics,含已解析的 slug 与当前语言 label),按 normTag 对应到文中的 #话题
// - mode="display"(正在显示译文):需要换语言的话题显示 #label;mode="original":原样显示作者写的 #raw
// - 译文里模型把助词 / 后文直接接在话题后面(#凯美瑞를、#特斯拉は冬の…)时,display 取最长的前缀作链接,
//   其余按普通文本显示;original 保持作者写的整个 #话题
// - 前缀边界:传了原文(original,同一字段)时只认作者原文里写过的 #话题 —— 译文里的 #话题都是从原文原样还原的,
//   topics 每帖最多 12 个、也可能比原文旧,作者写的第 13 个(或刚加的)#保险理赔 不会被拆成 #保险 + 理赔;
//   没传原文时认 topics 里的话题,且只在文字体系变化处拆(汉字→한글/かな、Latin→汉字…):粘上来的是另一种语言的
//   助词 / 后文,同一体系连着写(#保险理赔、#凯美瑞2024)视为作者写的整个话题
// - 已解析 → 话题聚合页 topicHref(slug);未解析 → 社区搜索 #raw
// 在卡片 Link 内部使用时会阻止冒泡,不会误触打开帖子;
// 在浮层/抽屉里点击时先清空浮层栈(跳转可能只变 query,pathname 清栈不会触发)

/** split 带捕获组:奇数下标是网址 */
const URL_SPLIT_RE = new RegExp(`(${URL_SOURCE})`, "gi");

/** 一段渲染内容:普通文本(含网址),或一个 #话题 链接(title = 显示 #label 时作者的原写法) */
export type HashtagPart = { kind: "text"; text: string } | { kind: "tag"; text: string; href: string; title?: string };

/** 字符的文字体系;数字单列(话题里常见 #凯美瑞2024、#Model3,不算换体系) */
function scriptOf(ch: string): "han" | "hangul" | "kana" | "latin" | "digit" | "other" {
  if (/\p{Nd}/u.test(ch)) return "digit";
  if (/\p{Script=Han}/u.test(ch)) return "han";
  if (/\p{Script=Hangul}/u.test(ch)) return "hangul";
  if (/[\p{Script=Hiragana}\p{Script=Katakana}ー]/u.test(ch)) return "kana";
  if (/\p{Script=Latin}/u.test(ch)) return "latin";
  return "other";
}

/** 没有原文可比时的前缀边界:rest 的首字与前缀末尾(跳过数字)不是同一文字体系;rest 以数字开头不算 */
function scriptBreak(prefix: readonly string[], next: string): boolean {
  const after = scriptOf(next);
  if (after === "digit") return false;
  for (let i = prefix.length - 1; i >= 0; i--) {
    const before = scriptOf(prefix[i]);
    if (before !== "digit") return before !== after;
  }
  return true;
}

/**
 * 文中的一个 #话题 对应帖子的哪个话题,以及链接覆盖的写法 token 与其后剩下的普通文本 rest。
 * authored:display 时作者原文里的全部 #话题(normTag,不限个数);null = 没传原文
 */
function matchTopic(
  part: string,
  byNorm: ReadonlyMap<string, TopicLabel>,
  mode: "display" | "original",
  authored: ReadonlySet<string> | null,
): { token: string; topic: TopicLabel | undefined; rest: string } {
  const norm = normTag(part) ?? "";
  const exact = byNorm.get(norm);
  if (exact || mode === "original" || authored?.has(norm)) return { token: part, topic: exact, rest: "" };
  // 按码点从长到短试前缀(不劈开 emoji);有原文时边界是作者写过的 #话题(可能不在 topics 里 → 搜它),
  // 否则是换文字体系处的已知话题
  const chars = Array.from(part.slice(1));
  for (let n = chars.length - 1; n > 0; n--) {
    const head = chars.slice(0, n);
    const prefix = head.join("");
    const key = normTag(prefix) ?? "";
    if (authored ? authored.has(key) : (byNorm.has(key) && scriptBreak(head, chars[n]))) {
      return { token: part[0] + prefix, topic: byNorm.get(key), rest: chars.slice(n).join("") };
    }
  }
  return { token: part, topic: undefined, rest: "" };
}

/** 文本 → 渲染片段(纯函数,导出供自检脚本测试);original = 作者原文(同一字段),只在 display 时用 */
export function hashtagParts(
  text: string,
  topics: readonly TopicLabel[] | undefined,
  mode: "display" | "original",
  original?: string,
): HashtagPart[] {
  const byNorm = new Map((topics ?? []).map((tp) => [tp.norm, tp]));
  const authored =
    mode === "display" && original !== undefined
      ? new Set(extractHashtags(original).flatMap((raw) => normTag(raw) ?? []))
      : null;
  const parts: HashtagPart[] = [];
  const plain = (s: string) => {
    if (!s) return;
    const last = parts[parts.length - 1];
    if (last?.kind === "text") last.text += s;
    else parts.push({ kind: "text", text: s });
  };
  // split 带捕获组:网址、#话题都在奇数下标
  text.split(URL_SPLIT_RE).forEach((chunk, i) => {
    if (i % 2 === 1) {
      plain(chunk);
      return;
    }
    chunk.split(HASHTAG_SPLIT_RE).forEach((part, j) => {
      if (j % 2 === 0) {
        plain(part);
        return;
      }
      const { token, topic, rest } = matchTopic(part, byNorm, mode, authored);
      const href = topic?.slug ? topicHref(topic.slug) : hashtagSearchHref(token);
      // label 等于 raw = 未解析,或作者本来就用界面语言写的:保持原样(大小写、全角 # 都不动)
      const shown = mode === "display" && topic && topic.label !== topic.raw ? `#${topic.label}` : token;
      parts.push(shown === token ? { kind: "tag", text: token, href } : { kind: "tag", text: shown, href, title: token });
      plain(rest);
    });
  });
  return parts;
}

export function HashtagText({
  text,
  original,
  topics,
  mode = "original",
  className,
}: {
  text: string;
  /** 作者原文(同一字段;display 时 text 是它的译文):认出作者自己写的 #话题,不被拆成更短的话题 */
  original?: string;
  topics?: readonly TopicLabel[];
  mode?: "display" | "original";
  className?: string;
}) {
  const router = useRouter();
  const { closeAll } = useOverlay();
  const parts = useMemo(() => hashtagParts(text, topics, mode, original), [text, topics, mode, original]);
  const content = parts.map((part, i) =>
    part.kind === "text" ? (
      part.text
    ) : (
      <button
        key={i}
        type="button"
        title={part.title}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          closeAll();
          router.push(part.href);
        }}
        className="text-blue-600 hover:underline dark:text-blue-400"
      >
        {part.text}
      </button>
    ),
  );
  return className ? <span className={className}>{content}</span> : <>{content}</>;
}

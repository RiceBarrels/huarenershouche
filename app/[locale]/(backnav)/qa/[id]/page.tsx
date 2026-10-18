// 问答详情 — server component:SEO metadata(问题标题/摘要按界面语言显示译文;canonical 与 hreflang
// 只覆盖该问题已完整本地化的语言)+ QAPage / 面包屑 JSON-LD + 服务端预取问题与公开回答及其译文;
// 不存在或被隐藏的问题 404。
// 静态导出(Capacitor)构建时 [id] 目录被 build:static 隐藏;客户端组件 qa-detail 无注入时自行拉取。

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { supabase } from "@/lib/supabase";
import { isMissingColumnError } from "@/lib/supabase-compat";
import { SITE_URL, SITE_NAME } from "@/lib/seo-pages";
import { serverT } from "@/lib/i18n/translate";
import type { Locale } from "@/lib/i18n";
import { isSiteLocale, ogLocale } from "@/lib/i18n/content-langs";
import { localize, xDefaultLocale, type Localized } from "@/lib/i18n/content/resolve";
import { getBundles } from "@/lib/i18n/content/server";
import type { BundleMap } from "@/lib/i18n/content/types";
import { contentAlternates, ogAlternates } from "@/lib/seo/alternates";
import { JsonLd } from "@/lib/seo/jsonld";
import { breadcrumbJsonLd, qaPageJsonLd } from "@/lib/seo/structured-data";
import { ContentI18nProvider } from "@/components/content/content-i18n-provider";
import type { DbQaAnswer, DbQaQuestion } from "@/lib/types";
import QaDetailPage from "../qa-detail";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const QA_SELECT = "*, profiles!user_id(username, avatar_url)";

interface QaData {
  question: DbQaQuestion;
  answers: DbQaAnswer[];
  questionRows: BundleMap;
  answerRows: BundleMap;
  /** 问题在当前语言下显示的标题/正文(metadata、JSON-LD 与页面同一口径) */
  view: Localized<"title" | "content">;
  xDefault: Locale;
}

/** 问题的公开回答(采纳 > 点赞 > 时间,与客户端一致);status 列未建(迁移前)时退回不带过滤的旧查询 */
async function fetchAnswers(questionId: string): Promise<DbQaAnswer[]> {
  const run = (activeOnly: boolean) => {
    let query = supabase.from("qa_answers").select(QA_SELECT).eq("question_id", questionId);
    if (activeOnly) query = query.eq("status", "active");
    return query
      .order("is_accepted", { ascending: false })
      .order("likes_count", { ascending: false })
      .order("created_at", { ascending: true });
  };
  let res = await run(true);
  if (res.error && isMissingColumnError(res.error)) res = await run(false);
  return (res.data as DbQaAnswer[] | null) ?? [];
}

const getQa = cache(async (id: string, locale: Locale): Promise<QaData | null> => {
  if (!UUID_RE.test(id)) return null;
  const [questionRes, answers] = await Promise.all([
    supabase.from("qa_questions").select(QA_SELECT).eq("id", id).eq("status", "active").maybeSingle(),
    fetchAnswers(id),
  ]);
  // 主体查询出错直接抛出(错误边界 500),不把暂时故障渲染成 404
  if (questionRes.error) throw new Error(`qa_questions(${id}): ${questionRes.error.message}`);
  const question = questionRes.data as DbQaQuestion | null;
  if (!question) return null;
  const [questionRows, answerRows] = await Promise.all([
    getBundles("qa_question", [question.id], locale),
    getBundles("qa_answer", answers.map((a) => a.id), locale),
  ]);
  const view = localize(
    { title: question.title, content: question.content },
    questionRows[question.id],
    locale,
  );
  return {
    question,
    answers,
    questionRows,
    answerRows,
    view,
    xDefault: xDefaultLocale(view.sourceLocale, view.available),
  };
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, id } = await params;
  const locale = isSiteLocale(rawLocale) ? rawLocale : notFound();
  const t = serverT(locale);
  const qa = await getQa(id, locale);

  if (!qa) {
    return { title: t("问题不存在或已被删除"), robots: { index: false, follow: false } };
  }

  const { question, view, xDefault } = qa;
  const path = `/qa/${question.id}`;
  const title = view.text.title;
  const description =
    view.text.content.replace(/\s+/g, " ").trim().slice(0, 160) || title;

  return {
    title,
    description,
    // 只为已完整本地化的语言声明 hreflang;当前语言尚无译文时 canonical 指向原文语言页(x-default)
    alternates: contentAlternates(locale, path, view.available, xDefault),
    openGraph: {
      type: "article",
      title,
      description,
      url: `${SITE_URL}/${locale}${path}`,
      siteName: t(SITE_NAME),
      locale: ogLocale(locale),
      alternateLocale: ogAlternates(locale, view.available),
      publishedTime: question.created_at,
      modifiedTime: question.updated_at,
      section: t("问答"),
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: rawLocale, id } = await params;
  const locale = isSiteLocale(rawLocale) ? rawLocale : notFound();
  const qa = await getQa(id, locale);
  if (!qa) notFound();

  const t = serverT(locale);
  const { question, answers, questionRows, answerRows, view } = qa;
  const url = `${SITE_URL}/${locale}/qa/${question.id}`;

  return (
    <>
      <JsonLd
        data={qaPageJsonLd({
          question,
          // 回答也用显示出来的文本(译文或原文)及其语言
          answers: answers.map((a) => {
            const shown = localize({ content: a.content }, answerRows[a.id], locale);
            return {
              text: shown.text.content,
              lang: shown.textLang.content,
              author: a.profiles?.username || t("匿名用户"),
              userId: a.user_id,
              createdAt: a.created_at,
              upvotes: a.likes_count,
              accepted: a.is_accepted,
            };
          }),
          view,
          locale,
          url,
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: t("首页"), url: `${SITE_URL}/${locale}` },
          { name: t("问答"), url: `${SITE_URL}/${locale}/qa` },
          { name: view.text.title, url },
        ])}
      />
      <ContentI18nProvider
        locale={locale}
        rows={{ qa_question: questionRows, qa_answer: answerRows }}
      >
        <QaDetailPage initialQuestion={question} initialAnswers={answers} />
      </ContentI18nProvider>
    </>
  );
}

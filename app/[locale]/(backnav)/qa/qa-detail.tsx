"use client";

// 问答详情(客户端):web 由 qa/[id] server page 注入问题与回答(SSR 直出),
// 无注入时(静态导出/直接渲染)按路由参数自行拉取。问题与回答都是用户原文,
// 按界面语言显示 DB 翻译管线的译文(useLocalized),可切回原文。

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "@/components/localized-navigation";
import {
  Heart,
  CheckCircle,
  Send,
  Loader2,
  ChevronLeft,
  HelpCircle,
  Eye,
  Check,
} from "lucide-react";
import { useRouteParams } from "@/lib/use-route-params";
import { useI18n } from "@/components/i18n-provider";
import { supabase } from "@/lib/supabase";
import { isMissingColumnError } from "@/lib/supabase-compat";
import { requestModeration } from "@/lib/moderation-client";
import { avatarUrl } from "@/lib/avatar";
import { useLocalized, useLocalizedPrefetch } from "@/hooks/use-localized";
import { LocalizedText } from "@/components/content/localized-text";
import { TranslationNotice } from "@/components/content/translation-notice";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { timeAgo } from "@/lib/format";
import type { DbQaQuestion, DbQaAnswer } from "@/lib/types";

const QA_SELECT = "*, profiles!user_id(username, avatar_url)";

// 与数据库上限一致(i18n-v2.sql qa_answers_text_len:回答正文 ≤ 10000 字)
const MAX_ANSWER_CHARS = 10000;

/** 问题的公开回答(采纳 > 点赞 > 时间);status 列未建(迁移前)时退回不带过滤的旧查询 */
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
  return ((res.data as DbQaAnswer[] | null) ?? []).filter((a) => a.status !== "blocked");
}

const CATEGORY_LABELS: Record<string, string> = {
  buying: "购车",
  selling: "卖车",
  loan: "贷款",
  insurance: "保险",
  dmv: "过户",
  maintenance: "保养",
  general: "其他",
};

const CATEGORY_COLORS: Record<string, string> = {
  buying: "bg-blue-500/10 text-blue-600 border-transparent dark:text-blue-400",
  selling: "bg-green-500/10 text-green-600 border-transparent dark:text-green-400",
  loan: "bg-purple-500/10 text-purple-600 border-transparent dark:text-purple-400",
  insurance: "bg-orange-500/10 text-orange-600 border-transparent dark:text-orange-400",
  dmv: "bg-red-500/10 text-red-600 border-transparent dark:text-red-400",
  maintenance: "bg-yellow-500/10 text-yellow-700 border-transparent dark:text-yellow-500",
  general: "bg-gray-500/10 text-gray-600 border-transparent dark:text-gray-400",
};

/** 一条回答:正文按界面语言显示译文,可切回原文 */
function AnswerCard({
  answer,
  canLike,
  canAccept,
  onLike,
  onAccept,
}: {
  answer: DbQaAnswer;
  canLike: boolean;
  canAccept: boolean;
  onLike: () => void;
  onAccept: () => void;
}) {
  const { t } = useI18n();
  const view = useLocalized("qa_answer", answer.id, { content: answer.content });
  return (
    <div
      className={`rounded-xl p-4 ${
        answer.is_accepted
          ? "bg-green-500/10"
          : "bg-card"
      }`}
    >
      {answer.is_accepted && (
        <div className="mb-2 flex items-center gap-1 font-mono text-[11px] font-medium text-green-600">
          <CheckCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
          {t("已采纳")}
        </div>
      )}

      {/* Answer author */}
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
          <img
            src={avatarUrl(answer.profiles?.avatar_url, answer.profiles?.username)}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
        <span className="font-mono text-xs font-medium">
          {answer.profiles?.username || t("匿名")}
        </span>
        {/* 相对时间在服务端渲染与水合之间可能跨过分钟边界,忽略这一处文本差异 */}
        <span className="font-mono text-[10px] text-muted-foreground" suppressHydrationWarning>
          {timeAgo(answer.created_at, t)}
        </span>
      </div>

      {/* Answer content */}
      <LocalizedText
        view={view}
        field="content"
        as="div"
        className="mt-3 whitespace-pre-wrap font-mono text-sm leading-relaxed text-foreground/90"
      />
      <TranslationNotice view={view} className="mt-1.5" />

      {/* Answer actions */}
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={onLike}
          disabled={!canLike}
          className={`flex items-center gap-1 font-mono text-[11px] transition-colors ${
            !canLike
              ? "cursor-not-allowed text-muted-foreground/50"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Heart className="h-3.5 w-3.5" strokeWidth={1.5} />
          {answer.likes_count || 0}
        </button>

        {canAccept && (
          <button
            onClick={onAccept}
            className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground transition-colors hover:text-green-600"
          >
            <Check className="h-3.5 w-3.5" strokeWidth={1.5} />
            {t("采纳")}
          </button>
        )}
      </div>
    </div>
  );
}

export default function QaDetailPage({
  initialQuestion,
  initialAnswers,
}: {
  // 服务端预取(qa/[id] server page 注入,已过滤为公开内容);不传则客户端拉取
  initialQuestion?: DbQaQuestion;
  initialAnswers?: DbQaAnswer[];
} = {}) {
  const { id: questionId } = useRouteParams<{ id: string }>();
  const { t } = useI18n();
  // 注入只对它所属的问题有效(uuid 不区分大小写,库里存小写)
  const seeded = !!questionId && initialQuestion?.id === questionId.toLowerCase();

  const [question, setQuestion] = useState<DbQaQuestion | null>(initialQuestion ?? null);
  const [answers, setAnswers] = useState<DbQaAnswer[]>(initialAnswers ?? []);
  const [loading, setLoading] = useState(!initialQuestion);
  const [answersLoading, setAnswersLoading] = useState(!initialAnswers);
  const [userId, setUserId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [modNotice, setModNotice] = useState("");
  const [tableError, setTableError] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 问题与回答的译文(问题为空时 hook 不发请求)
  const questionView = useLocalized("qa_question", question?.id, {
    title: question?.title,
    content: question?.content,
  });
  const answerIds = useMemo(() => answers.map((a) => a.id), [answers]);
  useLocalizedPrefetch("qa_answer", answerIds);

  // Auth
  useEffect(() => {
    supabase.auth
      .getUser()
      .then(({ data }) => setUserId(data.user?.id ?? null));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Increment views(每个问题一次;SSR 注入也照常计数)
  useEffect(() => {
    if (!questionId) return;
    supabase.rpc("increment_qa_views", { question_id: questionId }).then(
      () => {},
      () => {} // RPC may not exist, silently ignore
    );
  }, [questionId]);

  // Load question(SSR 已注入则跳过;与服务端一致只显示公开的问题)
  useEffect(() => {
    if (!questionId || seeded) return;
    let cancelled = false;

    async function loadQuestion() {
      const { data, error } = await supabase
        .from("qa_questions")
        .select(QA_SELECT)
        .eq("id", questionId)
        .eq("status", "active")
        .maybeSingle();
      if (cancelled) return;

      if (error) {
        if (
          error.message.includes("does not exist") ||
          error.message.includes("relation") ||
          error.code === "42P01"
        ) {
          setTableError(true);
        }
        setQuestion(null);
      } else {
        setQuestion((data as DbQaQuestion | null) ?? null);
      }
    }

    loadQuestion()
      .catch((err) => console.error("Failed to load question:", err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [questionId, seeded]);

  // Load answers(SSR 已注入则跳过;AI 审核屏蔽的回答不展示)
  useEffect(() => {
    if (!questionId || (seeded && initialAnswers)) return;
    let cancelled = false;

    fetchAnswers(questionId)
      .then((rows) => {
        if (!cancelled) setAnswers(rows);
      })
      .catch((err) => console.error("Failed to load answers:", err))
      .finally(() => {
        if (!cancelled) setAnswersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [questionId, seeded, initialAnswers]);

  async function handleAnswer() {
    if (!content.trim() || !userId || !questionId) return;
    setSending(true);
    setModNotice("");

    const { data, error } = await supabase
      .from("qa_answers")
      .insert({
        question_id: questionId,
        user_id: userId,
        content: content.trim(),
      })
      .select(QA_SELECT)
      .single();

    if (!error && data) {
      const created = data as DbQaAnswer;
      setAnswers((prev) => [...prev, created]);
      setContent("");
      // AI 审核(不阻塞提交;通过后服务端立即翻译):违规回答就地移除
      requestModeration("qa_answer", created.id).then((mod) => {
        if (!mod.blocked) return;
        setAnswers((prev) => prev.filter((a) => a.id !== created.id));
        setModNotice(t("内容涉嫌违反社区规范，已被系统拦截，将由管理员复核"));
      });
    } else {
      // 写入失败(网络、权限等):保留输入内容并在同一处提示,用户可直接重试
      setModNotice(t("提交失败，请稍后再试"));
    }

    setSending(false);
    inputRef.current?.focus();
  }

  async function handleLikeAnswer(answerId: string) {
    if (!userId) return;

    // Optimistic toggle
    setAnswers((prev) =>
      prev.map((a) =>
        a.id === answerId
          ? { ...a, likes_count: a.likes_count + 1 }
          : a
      )
    );

    const { error: likeError } = await supabase
      .from("qa_answer_likes")
      .insert({ answer_id: answerId, user_id: userId });

    if (likeError) {
      // May fail if already liked or table doesn't exist — rollback optimistic update
      setAnswers((prev) =>
        prev.map((a) =>
          a.id === answerId
            ? { ...a, likes_count: Math.max(0, a.likes_count - 1) }
            : a
        )
      );
    }
  }

  async function handleAccept(answerId: string) {
    if (!userId || !question || question.user_id !== userId) return;

    const { error } = await supabase
      .from("qa_questions")
      .update({ accepted_answer_id: answerId, is_resolved: true })
      .eq("id", question.id);

    if (!error) {
      await supabase
        .from("qa_answers")
        .update({ is_accepted: true })
        .eq("id", answerId);

      setQuestion((prev) =>
        prev ? { ...prev, accepted_answer_id: answerId, is_resolved: true } : prev
      );
      setAnswers((prev) =>
        prev.map((a) => ({
          ...a,
          is_accepted: a.id === answerId,
        }))
      );
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-background font-mono">
        <Header />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-4 h-6 w-3/4" />
          <Skeleton className="mt-3 h-24 w-full" />
          <Skeleton className="mt-6 h-40 w-full" />
        </main>
        <Footer />
      </div>
    );
  }

  if (tableError) {
    return (
      <div className="flex min-h-screen flex-col bg-background font-mono">
        <Header />
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-12">
          <HelpCircle
            className="h-8 w-8 text-muted-foreground/50"
            strokeWidth={1.5}
          />
          <p className="mt-3 font-mono text-sm text-muted-foreground">
            {t("问答即将上线")}
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!question) {
    return (
      <div className="flex min-h-screen flex-col bg-background font-mono">
        <Header />
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-12">
          <p className="font-mono text-sm text-muted-foreground">
            {t("问题不存在或已被删除")}
          </p>
          <Link href="/qa">
            <Button
              variant="secondary"
              size="sm"
              className="mt-4 gap-1.5 font-mono text-xs"
            >
              <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
              {t("返回问答")}
            </Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        {/* Back link */}
        <Link
          href="/qa"
          className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          {t("返回问答")}
        </Link>

        {/* Question */}
        <div className="mt-4">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`font-mono text-[10px] ${
                CATEGORY_COLORS[question.category] || ""
              }`}
            >
              {t(CATEGORY_LABELS[question.category] || question.category)}
            </Badge>
            {question.is_resolved && (
              <Badge
                variant="outline"
                className="gap-1 border-transparent bg-green-500/10 font-mono text-[10px] text-green-600"
              >
                <CheckCircle className="h-3 w-3" strokeWidth={1.5} />
                {t("已解决")}
              </Badge>
            )}
          </div>

          <LocalizedText
            view={questionView}
            field="title"
            as="h1"
            className="mt-3 font-mono text-base font-semibold leading-snug"
          />

          {/* Author + stats */}
          <div className="mt-2 flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
                <img
                  src={avatarUrl(question.profiles?.avatar_url, question.profiles?.username)}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
              <span className="font-mono text-xs">
                {question.profiles?.username || t("匿名")}
              </span>
            </div>
            {/* 相对时间在服务端渲染与水合之间可能跨过分钟边界,忽略这一处文本差异 */}
            <span className="font-mono text-[10px] text-muted-foreground" suppressHydrationWarning>
              {timeAgo(question.created_at, t)}
            </span>
            <span className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
              <Eye className="h-3 w-3" strokeWidth={1.5} />
              {question.views_count || 0}
            </span>
          </div>

          {/* Tags */}
          {question.tags && question.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {question.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Content */}
          <LocalizedText
            view={questionView}
            field="content"
            as="div"
            className="mt-4 whitespace-pre-wrap font-mono text-sm leading-relaxed text-foreground/90"
          />
          <TranslationNotice view={questionView} className="mt-2" />
        </div>

        {/* Answers — no scroll reveal: interactive content must never start
            hidden (Safari IntersectionObserver can fail on tall sections) */}
        <section className="mt-8 border-t border-border pt-6">
          <h2 className="font-mono text-sm font-semibold">
            {t("{n} 个回答", { n: answers.length })}
          </h2>

          {answersLoading ? (
            <div className="mt-4 space-y-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="rounded-xl bg-card p-4">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="mt-2 h-16 w-full" />
                </div>
              ))}
            </div>
          ) : answers.length === 0 ? (
            <p className="mt-4 py-6 text-center font-mono text-xs text-muted-foreground">
              {t("暂无回答，来帮忙解答吧")}
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {answers.map((answer) => (
                <AnswerCard
                  key={answer.id}
                  answer={answer}
                  canLike={!!userId}
                  /* 采纳按钮只给提问者,且问题尚未解决 */
                  canAccept={
                    userId === question.user_id &&
                    !question.is_resolved &&
                    !answer.is_accepted
                  }
                  onLike={() => handleLikeAnswer(answer.id)}
                  onAccept={() => handleAccept(answer.id)}
                />
              ))}
            </div>
          )}

          {/* Answer input */}
          <div className="mt-6 border-t border-border pt-6">
            <h3 className="font-mono text-xs font-semibold">{t("写回答")}</h3>
            <div className="mt-3">
              {userId ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    ref={inputRef}
                    className="w-full resize-none rounded-xl bg-muted px-3 py-2.5 font-mono text-sm transition-colors placeholder:text-muted-foreground focus:bg-background focus:outline-none focus:ring-2 focus:ring-brand-ink/40"
                    placeholder={t("分享你的经验和建议...")}
                    rows={4}
                    maxLength={MAX_ANSWER_CHARS}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                  />
                  {modNotice && (
                    <p className="font-mono text-[11px] text-destructive">{modNotice}</p>
                  )}
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      className="gap-1 font-mono text-xs"
                      onClick={handleAnswer}
                      disabled={!content.trim() || sending}
                    >
                      {sending ? (
                        <Loader2
                          className="h-3 w-3 animate-spin"
                          strokeWidth={1.5}
                        />
                      ) : (
                        <Send className="h-3 w-3" strokeWidth={1.5} />
                      )}
                      {t("提交回答")}
                    </Button>
                  </div>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="block w-full rounded-xl bg-muted px-4 py-3 text-center font-mono text-xs text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
                >
                  {t("登录后回答问题")}
                </Link>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

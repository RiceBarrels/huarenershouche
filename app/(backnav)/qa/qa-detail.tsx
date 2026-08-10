"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  Heart,
  MessageSquare,
  CheckCircle,
  Send,
  Loader2,
  ChevronLeft,
  HelpCircle,
  Eye,
  Check,
} from "lucide-react";
import { useRouteParams } from "@/lib/use-route-params";
import { supabase } from "@/lib/supabase";
import { avatarUrl } from "@/lib/avatar";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { timeAgo } from "@/lib/format";
import type { DbQaQuestion, DbQaAnswer } from "@/lib/types";

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
  buying: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400",
  selling: "bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400",
  loan: "bg-purple-500/10 text-purple-600 border-purple-500/20 dark:text-purple-400",
  insurance: "bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400",
  dmv: "bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400",
  maintenance: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20 dark:text-yellow-500",
  general: "bg-gray-500/10 text-gray-600 border-gray-500/20 dark:text-gray-400",
};

export default function QaDetailPage() {
  const { id: questionId } = useRouteParams<{ id: string }>();

  const [question, setQuestion] = useState<DbQaQuestion | null>(null);
  const [answers, setAnswers] = useState<DbQaAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [answersLoading, setAnswersLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [tableError, setTableError] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  // Load question
  useEffect(() => {
    if (!questionId) return;

    async function loadQuestion() {
      const { data, error } = await supabase
        .from("qa_questions")
        .select("*, profiles!user_id(username, avatar_url)")
        .eq("id", questionId)
        .single();

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
        setQuestion(data as DbQaQuestion);
      }
    }

    loadQuestion()
      .catch((err) => console.error("Failed to load question:", err))
      .finally(() => setLoading(false));

    // Increment views
    supabase.rpc("increment_qa_views", { question_id: questionId }).then(
      () => {},
      () => {} // RPC may not exist, silently ignore
    );
  }, [questionId]);

  // Load answers
  useEffect(() => {
    if (!questionId) return;

    async function loadAnswers() {
      const { data, error } = await supabase
        .from("qa_answers")
        .select("*, profiles!user_id(username, avatar_url)")
        .eq("question_id", questionId)
        .order("is_accepted", { ascending: false })
        .order("likes_count", { ascending: false })
        .order("created_at", { ascending: true });

      if (error) {
        setAnswers([]);
      } else {
        setAnswers((data as DbQaAnswer[]) || []);
      }
    }

    loadAnswers()
      .catch((err) => console.error("Failed to load answers:", err))
      .finally(() => setAnswersLoading(false));
  }, [questionId]);

  async function handleAnswer() {
    if (!content.trim() || !userId || !questionId) return;
    setSending(true);

    const { data, error } = await supabase
      .from("qa_answers")
      .insert({
        question_id: questionId,
        user_id: userId,
        content: content.trim(),
      })
      .select("*, profiles!user_id(username, avatar_url)")
      .single();

    if (!error && data) {
      setAnswers((prev) => [...prev, data as DbQaAnswer]);
      setContent("");
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
            问答即将上线
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
            问题不存在或已被删除
          </p>
          <Link href="/qa">
            <Button
              variant="outline"
              size="sm"
              className="mt-4 gap-1.5 font-mono text-xs"
            >
              <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
              返回问答
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
          返回问答
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
              {CATEGORY_LABELS[question.category] || question.category}
            </Badge>
            {question.is_resolved && (
              <Badge
                variant="outline"
                className="gap-1 border-green-500/20 bg-green-500/10 font-mono text-[10px] text-green-600"
              >
                <CheckCircle className="h-3 w-3" strokeWidth={1.5} />
                已解决
              </Badge>
            )}
          </div>

          <h1 className="mt-3 font-mono text-base font-semibold leading-snug">
            {question.title}
          </h1>

          {/* Author + stats */}
          <div className="mt-2 flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
                <img
                  src={avatarUrl(question.profiles?.avatar_url, question.profiles?.username)}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
              <span className="font-mono text-xs">
                {question.profiles?.username || "匿名"}
              </span>
            </div>
            <span className="font-mono text-[10px] text-muted-foreground">
              {timeAgo(question.created_at)}
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
                  className="rounded-full border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Content */}
          <div className="mt-4 whitespace-pre-wrap font-mono text-sm leading-relaxed text-foreground/90">
            {question.content}
          </div>
        </div>

        {/* Answers — no scroll reveal: interactive content must never start
            hidden (Safari IntersectionObserver can fail on tall sections) */}
        <section className="mt-8 border-t border-border pt-6">
          <h2 className="font-mono text-sm font-semibold">
            {answers.length} 个回答
          </h2>

          {answersLoading ? (
            <div className="mt-4 space-y-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border p-4">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="mt-2 h-16 w-full" />
                </div>
              ))}
            </div>
          ) : answers.length === 0 ? (
            <p className="mt-4 py-6 text-center font-mono text-xs text-muted-foreground">
              暂无回答，来帮忙解答吧
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {answers.map((answer) => (
                <div
                  key={answer.id}
                  className={`rounded-xl border p-4 ${
                    answer.is_accepted
                      ? "border-green-500/30 bg-green-500/5"
                      : "border-border"
                  }`}
                >
                  {answer.is_accepted && (
                    <div className="mb-2 flex items-center gap-1 font-mono text-[11px] font-medium text-green-600">
                      <CheckCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
                      已采纳
                    </div>
                  )}

                  {/* Answer author */}
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
                      <img
                        src={avatarUrl(answer.profiles?.avatar_url, answer.profiles?.username)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <span className="font-mono text-xs font-medium">
                      {answer.profiles?.username || "匿名"}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {timeAgo(answer.created_at)}
                    </span>
                  </div>

                  {/* Answer content */}
                  <div className="mt-3 whitespace-pre-wrap font-mono text-sm leading-relaxed text-foreground/90">
                    {answer.content}
                  </div>

                  {/* Answer actions */}
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      onClick={() => handleLikeAnswer(answer.id)}
                      disabled={!userId}
                      className={`flex items-center gap-1 font-mono text-[11px] transition-colors ${
                        !userId
                          ? "cursor-not-allowed text-muted-foreground/50"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Heart className="h-3.5 w-3.5" strokeWidth={1.5} />
                      {answer.likes_count || 0}
                    </button>

                    {/* Accept button (only for question author) */}
                    {userId === question.user_id &&
                      !question.is_resolved &&
                      !answer.is_accepted && (
                        <button
                          onClick={() => handleAccept(answer.id)}
                          className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground transition-colors hover:text-green-600"
                        >
                          <Check className="h-3.5 w-3.5" strokeWidth={1.5} />
                          采纳
                        </button>
                      )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Answer input */}
          <div className="mt-6 border-t border-border pt-6">
            <h3 className="font-mono text-xs font-semibold">写回答</h3>
            <div className="mt-3">
              {userId ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    ref={inputRef}
                    className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm placeholder:text-muted-foreground focus:border-foreground/30 focus:outline-none"
                    placeholder="分享你的经验和建议..."
                    rows={4}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                  />
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
                      提交回答
                    </Button>
                  </div>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="block w-full rounded-xl border border-dashed border-border px-4 py-3 text-center font-mono text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
                >
                  登录后回答问题
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

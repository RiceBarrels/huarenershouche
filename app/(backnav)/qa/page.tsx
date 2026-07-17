"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Eye,
  CheckCircle,
  Plus,
  HelpCircle,
  User,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { timeAgo } from "@/lib/format";
import type { DbQaQuestion } from "@/lib/types";

const CATEGORIES = [
  { key: "all", label: "全部" },
  { key: "buying", label: "购车" },
  { key: "selling", label: "卖车" },
  { key: "loan", label: "贷款" },
  { key: "insurance", label: "保险" },
  { key: "dmv", label: "过户" },
  { key: "maintenance", label: "保养" },
  { key: "general", label: "其他" },
] as const;

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
  buying: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  selling: "bg-green-500/10 text-green-600 border-green-500/20",
  loan: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  insurance: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  dmv: "bg-red-500/10 text-red-600 border-red-500/20",
  maintenance: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  general: "bg-gray-500/10 text-gray-600 border-gray-500/20",
};

export default function QaBoardPage() {
  const [questions, setQuestions] = useState<DbQaQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [tableError, setTableError] = useState(false);

  useEffect(() => {
    async function load() {
      let query = supabase
        .from("qa_questions")
        .select("*, profiles!user_id(username, avatar_url)")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(30);

      if (activeTab !== "all") {
        query = query.eq("category", activeTab);
      }

      const { data, error } = await query;

      if (error) {
        if (
          error.message.includes("does not exist") ||
          error.message.includes("relation") ||
          error.code === "42P01"
        ) {
          setTableError(true);
        }
        setQuestions([]);
      } else {
        setQuestions((data as DbQaQuestion[]) || []);
      }
    }

    load()
      .catch((err) => console.error("Failed to load questions:", err))
      .finally(() => setLoading(false));
  }, [activeTab]);

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Q&amp;A
          </span>
          <span className="h-px flex-1 bg-border" aria-hidden="true" />
        </div>
        <h1 className="mt-2 font-mono text-sm font-semibold tracking-tight">
          问答
        </h1>
        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
          购车卖车有疑问？在这里提问，社区帮你解答
        </p>

        {/* Category tabs */}
        <div className="mt-4 flex gap-1 overflow-x-auto border-b border-border pb-px">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => {
                setActiveTab(cat.key);
                setLoading(true);
              }}
              className={`shrink-0 px-2.5 py-2 font-mono text-xs transition-colors ${
                activeTab === cat.key
                  ? "border-b-2 border-foreground font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="mt-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="border border-border p-4">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
                <Skeleton className="mt-2 h-3 w-full" />
                <div className="mt-3 flex gap-4">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : tableError ? (
          <div className="mt-12 flex flex-col items-center py-12">
            <HelpCircle
              className="h-8 w-8 text-muted-foreground/50"
              strokeWidth={1.5}
            />
            <p className="mt-3 font-mono text-sm text-muted-foreground">
              问答即将上线
            </p>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground/70">
              敬请期待，问答功能正在建设中
            </p>
          </div>
        ) : questions.length === 0 ? (
          <div className="mt-12 flex flex-col items-center py-12">
            <HelpCircle
              className="h-8 w-8 text-muted-foreground/50"
              strokeWidth={1.5}
            />
            <p className="mt-3 font-mono text-sm text-muted-foreground">
              暂无问题
            </p>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground/70">
              成为第一个提问的人吧
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {questions.map((q) => {
              const card = (
              <Link
                key={q.id}
                href={`/qa/${q.id}`}
                className="block border border-border p-4 transition-colors hover:bg-muted/30"
              >
                <div className="flex items-start gap-2">
                  <Badge
                    variant="outline"
                    className={`shrink-0 font-mono text-[10px] ${
                      CATEGORY_COLORS[q.category] || ""
                    }`}
                  >
                    {CATEGORY_LABELS[q.category] || q.category}
                  </Badge>
                  <h3 className="flex-1 font-mono text-sm font-medium leading-snug">
                    {q.title}
                    {q.is_resolved && (
                      <CheckCircle
                        className="ml-1.5 inline h-3.5 w-3.5 text-green-500"
                        strokeWidth={1.5}
                      />
                    )}
                  </h3>
                </div>

                {/* Content preview */}
                <p className="mt-1.5 pl-0 font-mono text-xs leading-relaxed text-muted-foreground">
                  {q.content.length > 60
                    ? q.content.slice(0, 60) + "..."
                    : q.content}
                </p>

                {/* Tags */}
                {q.tags && q.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {q.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Stats row */}
                <div className="mt-3 flex items-center gap-4">
                  <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                    <MessageSquare className="h-3.5 w-3.5" strokeWidth={1.5} />
                    {q.answers_count || 0} 回答
                  </span>
                  <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                    <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />
                    {q.views_count || 0}
                  </span>
                  <span className="ml-auto flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                    {q.profiles?.username || "匿名"}
                    <span className="text-muted-foreground/60">
                      {timeAgo(q.created_at)}
                    </span>
                  </span>
                </div>
              </Link>
              );
              // 列表内容直出,不做滚动浮入(必须立即可见)
              return card;
            })}
          </div>
        )}
      </main>
      <Footer />

      {/* Floating ask button */}
      <Link
        href="/qa/ask"
        className="fixed bottom-20 right-4 z-40 flex h-12 w-12 items-center justify-center bg-foreground text-background shadow-lg transition-transform hover:scale-105 active:scale-95"
      >
        <Plus className="h-5 w-5" strokeWidth={1.5} />
      </Link>
    </div>
  );
}

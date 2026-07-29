"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  X,
  Plus,
  Loader2,
  ChevronLeft,
  HelpCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CATEGORIES = [
  { key: "buying", label: "购车" },
  { key: "selling", label: "卖车" },
  { key: "loan", label: "贷款" },
  { key: "insurance", label: "保险" },
  { key: "dmv", label: "过户" },
  { key: "maintenance", label: "保养" },
  { key: "general", label: "其他" },
] as const;

export default function AskQuestionPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [category, setCategory] = useState<string>("general");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth
      .getUser()
      .then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  function addTag() {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed]);
      setTagInput("");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setError("");

    if (!title.trim()) {
      setError("请输入标题");
      return;
    }
    if (!content.trim()) {
      setError("请描述你的问题");
      return;
    }

    setLoading(true);

    const { data, error: insertError } = await supabase
      .from("qa_questions")
      .insert({
        user_id: userId,
        title: title.trim(),
        content: content.trim(),
        category,
        tags,
        status: "active",
      })
      .select("id")
      .single();

    setLoading(false);

    if (insertError) {
      if (
        insertError.message.includes("does not exist") ||
        insertError.message.includes("relation") ||
        insertError.code === "42P01"
      ) {
        setError("问答功能即将上线，暂时无法提问");
      } else {
        setError(`提交失败: ${insertError.message}`);
      }
    } else if (data) {
      router.push(`/qa/${data.id}`);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        <Link
          href="/qa"
          className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          返回问答
        </Link>

        <h1 className="mt-4 font-logo text-base tracking-tight">
          提问
        </h1>
        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
          描述你的问题，社区会帮你解答
        </p>

        {!userId ? (
          <div className="mt-8 flex flex-col items-center rounded-xl border border-border p-8">
            <p className="font-mono text-sm text-muted-foreground">
              请先登录后再提问
            </p>
            <Link href="/login">
              <Button size="sm" className="mt-4 font-mono text-xs">
                登录 / 注册
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            {/* Category selector */}
            <div>
              <Label className="font-mono text-xs font-semibold">
                问题分类
              </Label>
              <div className="mt-2 flex flex-wrap gap-1">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setCategory(cat.key)}
                    className={`rounded-full border px-3 py-1.5 font-mono text-xs transition-colors ${
                      category === cat.key
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <Label className="font-mono text-xs font-semibold">
                问题标题 <span className="text-destructive">*</span>
              </Label>
              <Input
                className="mt-1 h-9 font-mono text-xs"
                placeholder="用一句话描述你的问题"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                required
              />
              <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                {title.length}/100
              </p>
            </div>

            {/* Content */}
            <div>
              <Label className="font-mono text-xs font-semibold">
                问题描述 <span className="text-destructive">*</span>
              </Label>
              <textarea
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                rows={8}
                placeholder="详细描述你的问题，包括相关背景信息..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              />
            </div>

            {/* Tags */}
            <div>
              <Label className="font-mono text-xs font-semibold">标签</Label>
              <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                添加标签帮助他人找到你的问题
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 rounded-full border border-border px-2 py-1 font-mono text-[11px]"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() =>
                        setTags((prev) => prev.filter((t) => t !== tag))
                      }
                    >
                      <X className="h-2.5 w-2.5 text-muted-foreground" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <Input
                  className="h-8 font-mono text-xs"
                  placeholder="添加标签，如：首付、贷款利率"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 font-mono text-xs"
                  onClick={addTag}
                >
                  <Plus className="h-3 w-3" strokeWidth={1.5} />
                  添加
                </Button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3">
                <p className="font-mono text-xs text-destructive">{error}</p>
              </div>
            )}

            {/* Submit */}
            <div className="flex gap-3 border-t border-border pt-6">
              <Button
                type="submit"
                className="gap-1.5 font-mono text-xs"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2
                      className="h-3.5 w-3.5 animate-spin"
                      strokeWidth={1.5}
                    />
                    提交中...
                  </>
                ) : (
                  <>
                    <HelpCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
                    提交问题
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="font-mono text-xs"
                onClick={() => router.back()}
              >
                取消
              </Button>
            </div>
          </form>
        )}
      </main>
      <Footer />
    </div>
  );
}

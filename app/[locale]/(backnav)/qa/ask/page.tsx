"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/components/localized-navigation";
import Link from "@/components/localized-navigation";
import {
  X,
  Plus,
  Loader2,
  ChevronLeft,
  HelpCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { requestModeration } from "@/lib/moderation-client";
import { useI18n } from "@/components/i18n-provider";
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

// 与数据库上限一致(i18n-v2.sql qa_questions_text_len:问题描述 ≤ 20000 字;标题 ≤ 300 字,输入框限 100 字更严)
const MAX_CONTENT_CHARS = 20000;

export default function AskQuestionPage() {
  const router = useRouter();
  const { t } = useI18n();
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
      setError(t("请输入标题"));
      return;
    }
    if (!content.trim()) {
      setError(t("请描述你的问题"));
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

    if (insertError) {
      setLoading(false);
      // 只有表不存在(42P01 / PostgREST 结构缓存里没有该表 PGRST205)才是问答未上线;不能按消息里有没有
      // "relation" 判断 —— 长度等 CHECK 违规(23514)的消息同样含 "relation"。其余失败保留表单内容并提示重试
      setError(
        insertError.code === "42P01" || insertError.code === "PGRST205"
          ? t("问答功能即将上线，暂时无法提问")
          : t("提交失败，请稍后再试"),
      );
      return;
    }

    // AI 审核(通过后服务端立即翻译成其他语言):违规问题被隐藏,不跳转到详情页
    const mod = await requestModeration("qa_question", data.id);
    setLoading(false);
    if (mod.blocked) {
      setError(t("内容涉嫌违反社区规范，已被系统拦截，将由管理员复核"));
      return;
    }
    router.push(`/qa/${data.id}`);
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
          {t("返回问答")}
        </Link>

        <h1 className="mt-4 font-logo text-base tracking-tight">
          {t("提问")}
        </h1>
        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
          {t("描述你的问题，社区会帮你解答")}
        </p>

        {!userId ? (
          <div className="mt-8 flex flex-col items-center rounded-xl bg-card p-8">
            <p className="font-mono text-sm text-muted-foreground">
              {t("请先登录后再提问")}
            </p>
            <Link href="/login">
              <Button size="sm" className="mt-4 font-mono text-xs">
                {t("登录 / 注册")}
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            {/* Category selector */}
            <div>
              <Label className="font-mono text-xs font-semibold">
                {t("问题分类")}
              </Label>
              <div className="mt-2 flex flex-wrap gap-1">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setCategory(cat.key)}
                    className={`rounded-full px-3 py-1.5 font-mono text-xs transition-colors ${
                      category === cat.key
                        ? "bg-primary/30 text-brand-ink"
                        : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                    }`}
                  >
                    {t(cat.label)}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <Label className="font-mono text-xs font-semibold">
                {t("问题标题")} <span className="text-destructive">*</span>
              </Label>
              <Input
                className="mt-1 h-9 font-mono text-xs"
                placeholder={t("用一句话描述你的问题")}
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
                {t("问题描述")} <span className="text-destructive">*</span>
              </Label>
              <textarea
                className="mt-1 w-full rounded-xl bg-muted px-3 py-2.5 font-mono text-xs leading-relaxed text-foreground transition-colors placeholder:text-muted-foreground focus:bg-background focus:outline-none focus:ring-2 focus:ring-brand-ink/40"
                rows={8}
                placeholder={t("详细描述你的问题，包括相关背景信息...")}
                maxLength={MAX_CONTENT_CHARS}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              />
            </div>

            {/* Tags */}
            <div>
              <Label className="font-mono text-xs font-semibold">{t("标签")}</Label>
              <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                {t("添加标签帮助他人找到你的问题")}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 rounded-full bg-muted px-2 py-1 font-mono text-[11px]"
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
                  placeholder={t("添加标签，如：首付、贷款利率")}
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
                  variant="secondary"
                  size="sm"
                  className="h-8 gap-1 font-mono text-xs"
                  onClick={addTag}
                >
                  <Plus className="h-3 w-3" strokeWidth={1.5} />
                  {t("添加")}
                </Button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl bg-destructive/10 px-3 py-2.5">
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
                    {t("提交中...")}
                  </>
                ) : (
                  <>
                    <HelpCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
                    {t("提交问题")}
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="font-mono text-xs"
                onClick={() => router.back()}
              >
                {t("取消")}
              </Button>
            </div>
          </form>
        )}
      </main>
      <Footer />
    </div>
  );
}

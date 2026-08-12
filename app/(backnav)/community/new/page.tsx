"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  X,
  Plus,
  Loader2,
  Hash,
  Car,
  Play,
  ChevronRight,
  Check,
  FileText,
  Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { KeyboardToolbar } from "@/components/keyboard-toolbar";

const POST_TYPES = [
  { key: "review", label: "车评" },
  { key: "showoff", label: "晒车" },
  { key: "discussion", label: "讨论" },
] as const;

// 快捷标签建议(类似小红书发布页的地点建议)
const TAG_SUGGESTIONS = [
  "新手购车",
  "提车作业",
  "二手车",
  "保养维修",
  "自驾游",
  "改装",
];

// ===== 多草稿存储(与 /post 同款交互:列表选择 + 可删除) =====
const DRAFTS_KEY = "community_post_drafts";
const LEGACY_DRAFT_KEY = "community_post_draft";
const MAX_DRAFTS = 10;

interface CommunityDraft {
  id: string;
  updatedAt: number;
  type: string;
  title: string;
  content: string;
  imageUrls: string[];
  make: string;
  model: string;
  year: string;
  tags: string[];
}

function persistDrafts(drafts: CommunityDraft[]) {
  try { localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts)); } catch { /* ignore */ }
}

function loadDrafts(): CommunityDraft[] {
  let drafts: CommunityDraft[] = [];
  try {
    const raw = localStorage.getItem(DRAFTS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if (Array.isArray(arr)) drafts = arr.filter((d) => d && d.id);
  } catch { /* ignore */ }
  // 迁移旧版单草稿
  try {
    const legacy = localStorage.getItem(LEGACY_DRAFT_KEY);
    if (legacy) {
      const d = JSON.parse(legacy);
      if (d && (d.title || d.content || d.imageUrls?.length)) {
        drafts.unshift({
          id: `d-${Date.now()}`,
          updatedAt: Date.now(),
          type: d.type || "discussion",
          title: d.title || "",
          content: d.content || "",
          imageUrls: Array.isArray(d.imageUrls) ? d.imageUrls : [],
          make: d.make || "",
          model: d.model || "",
          year: d.year || "",
          tags: Array.isArray(d.tags) ? d.tags : [],
        });
        persistDrafts(drafts);
      }
      localStorage.removeItem(LEGACY_DRAFT_KEY);
    }
  } catch { /* ignore */ }
  return drafts.sort((a, b) => b.updatedAt - a.updatedAt);
}

function draftTime(ts: number) {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "刚刚";
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小时前`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} 天前`;
  return new Date(ts).toLocaleDateString("zh-CN");
}

const VIDEO_RE = /\.(mp4|mov|webm|avi|mkv)(\?|$)/i;
const MAX_VIDEO_MB = 100;

function isVideoUrl(url: string): boolean {
  return VIDEO_RE.test(url);
}

export default function NewPostPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);

  const [type, setType] = useState<string>("discussion");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [carInfoOpen, setCarInfoOpen] = useState(false);
  // 草稿箱:多份草稿 + 当前正在编辑的草稿 id
  const [drafts, setDrafts] = useState<CommunityDraft[]>([]);
  const [draftId, setDraftId] = useState<string | null>(null);

  const contentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    supabase.auth
      .getUser()
      .then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  // 读入草稿箱:localStorage 只在客户端可读,挂载后一次性回填(不构成级联渲染)。
  // 不再自动恢复内容——有草稿时在页面顶部展示列表,由用户自己选
  /* eslint-disable-next-line react-hooks/set-state-in-effect */
  useEffect(() => setDrafts(loadDrafts()), []);

  function restoreDraft(d: CommunityDraft) {
    setType(d.type || "discussion");
    setTitle(d.title || "");
    setContent(d.content || "");
    setImageUrls(d.imageUrls || []);
    setMake(d.make || "");
    setModel(d.model || "");
    setYear(d.year || "");
    setTags(d.tags || []);
    setDraftId(d.id);
  }

  function deleteDraft(id: string) {
    setDrafts((prev) => {
      const next = prev.filter((d) => d.id !== id);
      persistDrafts(next);
      return next;
    });
    if (draftId === id) setDraftId(null);
  }

  // 正文输入区自适应高度
  function autoGrow() {
    const el = contentRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }
  useEffect(autoGrow, [content]);

  function saveDraft() {
    if (!title.trim() && !content.trim() && imageUrls.length === 0) return;
    let id = draftId;
    if (!id) {
      id = `d-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setDraftId(id);
    }
    const entry: CommunityDraft = {
      id,
      updatedAt: Date.now(),
      type, title, content, imageUrls, make, model, year, tags,
    };
    setDrafts((prev) => {
      const next = [entry, ...prev.filter((d) => d.id !== id)].slice(0, MAX_DRAFTS);
      persistDrafts(next);
      return next;
    });
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 1500);
  }

  async function uploadFiles(files: File[]) {
    if (!userId || files.length === 0) return;
    setUploading(true);
    for (const file of files) {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      if (!isImage && !isVideo) continue;
      if (isVideo && file.size > MAX_VIDEO_MB * 1024 * 1024) {
        setError(`视频不能超过 ${MAX_VIDEO_MB}MB`);
        continue;
      }
      const ext = file.name.split(".").pop();
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("car-images")
        .upload(path, file);
      if (!uploadError) {
        const {
          data: { publicUrl },
        } = supabase.storage.from("car-images").getPublicUrl(path);
        setImageUrls((prev) => [...prev, publicUrl]);
      }
    }
    setUploading(false);
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    uploadFiles(Array.from(files));
    e.target.value = "";
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(
      (f) => f.type.startsWith("image/") || f.type.startsWith("video/")
    );
    if (files.length > 0) {
      uploadFiles(files);
      return;
    }

    // Dropped image URL from web
    const html = e.dataTransfer.getData("text/html");
    const uri =
      e.dataTransfer.getData("text/uri-list") ||
      e.dataTransfer.getData("text/plain");

    let imgUrl = "";
    if (html) {
      const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (match) imgUrl = match[1];
    }
    if (
      !imgUrl &&
      uri &&
      /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|avif|bmp)/i.test(uri)
    ) {
      imgUrl = uri;
    }

    if (imgUrl) {
      setUploading(true);
      try {
        const res = await fetch(imgUrl);
        const blob = await res.blob();
        const ext = imgUrl.split(".").pop()?.split("?")[0] || "jpg";
        const file = new File([blob], `web-${Date.now()}.${ext}`, {
          type: blob.type || "image/jpeg",
        });
        await uploadFiles([file]);
      } catch {
        setImageUrls((prev) => [...prev, imgUrl]);
        setUploading(false);
      }
    }
  }

  function removeImage(index: number) {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
  }

  function toggleTag(tag: string) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function addCustomTag() {
    const trimmed = tagInput.trim().replace(/^#/, "");
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed]);
    }
    setTagInput("");
  }

  async function handleSubmit() {
    if (!userId) return;
    setError("");

    if (!title.trim()) {
      setError("请输入标题");
      return;
    }
    if (!content.trim()) {
      setError("请输入内容");
      return;
    }

    setLoading(true);

    const { data, error: insertError } = await supabase
      .from("community_posts")
      .insert({
        user_id: userId,
        type,
        title: title.trim(),
        content: content.trim(),
        images: imageUrls,
        make: type === "review" ? make || null : null,
        model: type === "review" ? model || null : null,
        year: type === "review" && year ? Number(year) : null,
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
        setError("社区功能即将上线，暂时无法发帖");
      } else {
        setError(`发布失败: ${insertError.message}`);
      }
    } else if (data) {
      if (draftId) deleteDraft(draftId);
      router.push(`/community/${data.id}`);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      {!userId ? (
        <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-6">
          <div className="mt-8 flex flex-col items-center rounded-2xl bg-card p-8">
            <p className="text-sm text-muted-foreground">请先登录后再发帖</p>
            <Link href="/login">
              <Button size="sm" className="mt-4 text-xs">
                登录 / 注册
              </Button>
            </Link>
          </div>
        </main>
      ) : (
        <>
          <main className="mx-auto w-full max-w-2xl flex-1 px-5 pb-44 pt-4 md:max-w-5xl md:px-8 md:pb-16 md:pt-10">
            {/* 桌面两栏:左侧编辑区,右侧媒体/草稿/发布(DOM 顺序不变,flex-row-reverse 翻转展示) */}
            <div className="md:flex md:flex-row-reverse md:items-start md:gap-10">
            <aside className="md:sticky md:top-24 md:w-72 md:shrink-0">
            {/* 草稿箱:有历史草稿时可直接选一份继续(也可删除) */}
            {drafts.filter((d) => d.id !== draftId).length > 0 && (
              <div className="mb-4 rounded-2xl bg-card p-4">
                <p className="text-sm font-medium text-foreground">继续上次的草稿</p>
                <div className="mt-3 space-y-2">
                  {drafts.filter((d) => d.id !== draftId).map((d) => (
                    <div key={d.id} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => restoreDraft(d)}
                        className="flex min-w-0 flex-1 items-center gap-3 rounded-xl bg-muted px-3.5 py-3 text-left transition-colors active:bg-muted/70"
                      >
                        {d.imageUrls?.[0] && !isVideoUrl(d.imageUrls[0]) ? (
                          <img
                            src={d.imageUrls[0]}
                            alt=""
                            className="h-10 w-10 shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background">
                            <FileText className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-foreground">
                            {d.title || d.content?.slice(0, 24) || "未命名草稿"}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {d.imageUrls?.length ? `${d.imageUrls.length} 个媒体 · ` : ""}
                            {draftTime(d.updatedAt)}
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        aria-label="删除草稿"
                        onClick={() => deleteDraft(d.id)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors active:bg-muted"
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 媒体上传:方形缩略图 + 加号块(支持拖拽);桌面在右栏换行平铺 */}
            <div
              className={`flex gap-3 overflow-x-auto pb-1 scrollbar-none rounded-xl transition-colors md:flex-wrap md:overflow-visible ${
                dragging ? "bg-muted/80 ring-2 ring-primary/30" : ""
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              {imageUrls.map((url, i) => (
                <div
                  key={i}
                  className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-muted"
                >
                  {isVideoUrl(url) ? (
                    <>
                      <video
                        src={url}
                        muted
                        playsInline
                        preload="metadata"
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute bottom-1.5 left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/50">
                        <Play className="h-2.5 w-2.5 fill-white text-white" />
                      </span>
                    </>
                  ) : (
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {imageUrls.length < 9 && (
                <label className="flex h-24 w-24 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-muted/50 active:bg-muted">
                  {uploading ? (
                    <Loader2
                      className="h-6 w-6 animate-spin text-muted-foreground"
                      strokeWidth={1.5}
                    />
                  ) : (
                    <Plus
                      className="h-7 w-7 text-muted-foreground"
                      strokeWidth={1.5}
                    />
                  )}
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploading}
                  />
                </label>
              )}
            </div>

            {/* 底部操作栏:存草稿 + 发布;手机固定底部,桌面内联在右栏媒体下方 */}
            <div
              className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-5 pt-3 backdrop-blur-sm md:static md:z-auto md:mt-6 md:border-0 md:bg-transparent md:px-0 md:pt-0 md:backdrop-blur-none"
              style={{
                paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))",
              }}
            >
              <div className="mx-auto flex max-w-2xl items-center gap-3">
                <button
                  type="button"
                  onClick={saveDraft}
                  className="shrink-0 rounded-full bg-muted px-6 py-3 text-sm text-muted-foreground transition-colors active:bg-muted/70 md:hover:bg-muted/70"
                >
                  {draftSaved ? "已保存" : "存草稿"}
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-primary py-3 text-base font-medium text-primary-foreground transition-opacity active:opacity-90 disabled:opacity-60 md:text-sm md:hover:opacity-90"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                      发布中...
                    </>
                  ) : (
                    "发布"
                  )}
                </button>
              </div>
            </div>
            </aside>

            <div className="min-w-0 md:flex-1">
            {/* 标题:无边框大字号输入 */}
            <div className="mt-4 flex items-center gap-3 md:mt-0">
              <input
                className="w-full bg-transparent text-xl font-semibold text-foreground placeholder:text-muted-foreground/50 focus:outline-none md:text-2xl"
                placeholder="添加标题"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
              />
              {title.length > 0 && (
                <span className="shrink-0 text-xs text-muted-foreground/60">
                  {title.length}/100
                </span>
              )}
            </div>

            {/* 正文:无边框自增高输入区 */}
            <textarea
              ref={contentRef}
              className="mt-3 min-h-[38vh] w-full resize-none bg-transparent text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
              placeholder="分享你的想法..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={1}
            />

            {/* 类型胶囊(类似 #话题 @用户 一排) */}
            <div className="mt-2 flex gap-2">
              {POST_TYPES.map((t) => {
                const active = type === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setType(t.key)}
                    className={`rounded-full px-4 py-2 text-sm transition-colors ${
                      active
                        ? "bg-primary/10 font-medium text-primary"
                        : "bg-muted text-muted-foreground active:bg-muted/70"
                    }`}
                  >
                    {active && (
                      <Check className="mr-1 inline h-3.5 w-3.5" strokeWidth={2} />
                    )}
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* 设置行列表 */}
            <div className="mt-5 border-t border-border">
              {/* 标签 */}
              <div className="py-4">
                <div className="flex items-center gap-3">
                  <Hash
                    className="h-5 w-5 text-foreground"
                    strokeWidth={1.5}
                  />
                  <span className="text-[15px]">添加标签</span>
                  <input
                    className="min-w-0 flex-1 bg-transparent text-right text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                    placeholder="自定义标签"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomTag();
                      }
                    }}
                    onBlur={() => tagInput.trim() && addCustomTag()}
                  />
                </div>
                {/* 建议标签 + 已选标签(横向滚动胶囊) */}
                <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-none">
                  {[...tags.filter((t) => !TAG_SUGGESTIONS.includes(t)), ...TAG_SUGGESTIONS].map(
                    (tag) => {
                      const selected = tags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] transition-colors ${
                            selected
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground active:bg-muted/70"
                          }`}
                        >
                          {selected && (
                            <X className="mr-1 inline h-3 w-3" strokeWidth={2} />
                          )}
                          #{tag}
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              {/* 车辆信息(车评可选) */}
              {type === "review" && (
                <div className="border-t border-border py-4">
                  <button
                    type="button"
                    className="flex w-full items-center gap-3"
                    onClick={() => setCarInfoOpen((v) => !v)}
                  >
                    <Car className="h-5 w-5 text-foreground" strokeWidth={1.5} />
                    <span className="text-[15px]">车辆信息</span>
                    <span className="flex-1 text-right text-sm text-muted-foreground/60">
                      {[make, model, year].filter(Boolean).join(" ") || "选填"}
                    </span>
                    <ChevronRight
                      className={`h-4 w-4 text-muted-foreground transition-transform ${
                        carInfoOpen ? "rotate-90" : ""
                      }`}
                      strokeWidth={1.5}
                    />
                  </button>
                  {carInfoOpen && (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {(
                        [
                          ["品牌", make, setMake, "Toyota", "text"],
                          ["车型", model, setModel, "Camry", "text"],
                          ["年份", year, setYear, "2023", "number"],
                        ] as const
                      ).map(([label, value, set, ph, inputType]) => (
                        <input
                          key={label}
                          type={inputType}
                          className="rounded-xl bg-muted px-3 py-2.5 text-sm text-foreground transition-colors placeholder:text-muted-foreground/50 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                          aria-label={label}
                          placeholder={`${label} ${ph}`}
                          value={value}
                          onChange={(e) => set(e.target.value)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="mt-2 rounded-xl bg-destructive/10 p-3">
                <p className="text-xs text-destructive">{error}</p>
              </div>
            )}
            </div>
            </div>
          </main>

          {/* 键盘弹起时吸附在键盘上方的工具条(表情 / #话题 / 完成) */}
          <KeyboardToolbar />
        </>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Upload,
  X,
  Plus,
  Loader2,
  ChevronLeft,
  ImageIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const POST_TYPES = [
  { key: "review", label: "车评" },
  { key: "showoff", label: "晒车" },
  { key: "discussion", label: "讨论" },
] as const;

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

  const [type, setType] = useState<string>("discussion");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth
      .getUser()
      .then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

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
      router.push(`/community/${data.id}`);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">

        <h1 className="mt-4 font-mono text-sm font-semibold tracking-tight">
          发帖
        </h1>

        {!userId ? (
          <div className="mt-8 flex flex-col items-center border border-border p-8">
            <p className="font-mono text-sm text-muted-foreground">
              请先登录后再发帖
            </p>
            <Link href="/login">
              <Button size="sm" className="mt-4 font-mono text-xs">
                登录 / 注册
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            {/* Type selector */}
            <div>
              <Label className="font-mono text-xs font-semibold">
                帖子类型
              </Label>
              <div className="mt-2 flex gap-1">
                {POST_TYPES.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setType(t.key)}
                    className={`border px-3 py-1.5 font-mono text-xs transition-colors ${
                      type === t.key
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <Label className="font-mono text-xs font-semibold">
                标题 <span className="text-destructive">*</span>
              </Label>
              <Input
                className="mt-1 h-9 font-mono text-xs"
                placeholder="输入标题"
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
                内容 <span className="text-destructive">*</span>
              </Label>
              <textarea
                className="mt-1 w-full border border-border bg-background px-3 py-2 font-mono text-xs leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                rows={8}
                placeholder="分享你的想法..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              />
            </div>

            {/* Images / videos */}
            <div>
              <Label className="font-mono text-xs font-semibold">图片 / 视频</Label>
              <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                支持拖拽上传，最多 9 个，视频不超过 {MAX_VIDEO_MB}MB
              </p>
              <div
                className={`mt-2 flex flex-wrap gap-2 p-2 transition-colors ${
                  dragging ? "bg-muted/80 ring-2 ring-foreground/20" : ""
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
                    className="group relative h-20 w-24 border border-border bg-muted"
                  >
                    {isVideoUrl(url) ? (
                      <video
                        src={url}
                        muted
                        playsInline
                        preload="metadata"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <img
                        src={url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center bg-foreground text-background opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {imageUrls.length < 9 && (
                  <label className="flex h-20 w-24 cursor-pointer flex-col items-center justify-center border border-dashed border-border transition-colors hover:border-foreground/30">
                    {uploading ? (
                      <Loader2
                        className="h-5 w-5 animate-spin text-muted-foreground"
                        strokeWidth={1.5}
                      />
                    ) : (
                      <>
                        <Upload
                          className="h-5 w-5 text-muted-foreground"
                          strokeWidth={1.5}
                        />
                        <span className="mt-1 font-mono text-[10px] text-muted-foreground">
                          上传
                        </span>
                      </>
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
            </div>

            {/* Car info for review type */}
            {type === "review" && (
              <div className="border border-border p-4">
                <Label className="font-mono text-xs font-semibold">
                  车辆信息（车评可选）
                </Label>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <div>
                    <Label className="font-mono text-[11px] text-muted-foreground">
                      品牌
                    </Label>
                    <Input
                      className="mt-1 h-8 font-mono text-xs"
                      placeholder="Toyota"
                      value={make}
                      onChange={(e) => setMake(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="font-mono text-[11px] text-muted-foreground">
                      车型
                    </Label>
                    <Input
                      className="mt-1 h-8 font-mono text-xs"
                      placeholder="Camry"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="font-mono text-[11px] text-muted-foreground">
                      年份
                    </Label>
                    <Input
                      className="mt-1 h-8 font-mono text-xs"
                      type="number"
                      placeholder="2023"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      min={1990}
                      max={2030}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tags */}
            <div>
              <Label className="font-mono text-xs font-semibold">标签</Label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 border border-border px-2 py-1 font-mono text-[11px]"
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
                  placeholder="添加标签，如：新手购车、二手车"
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
              <div className="border border-destructive/50 bg-destructive/5 p-3">
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
                    发布中...
                  </>
                ) : (
                  "发布帖子"
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

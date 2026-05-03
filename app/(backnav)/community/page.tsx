"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Heart,
  MessageSquare,
  Plus,
  User,
  ImageIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { timeAgo } from "@/lib/format";
import type { DbCommunityPost } from "@/lib/types";

const TABS = [
  { key: "all", label: "全部" },
  { key: "review", label: "车评" },
  { key: "showoff", label: "晒车" },
  { key: "discussion", label: "讨论" },
] as const;

const TYPE_LABELS: Record<string, string> = {
  review: "车评",
  showoff: "晒车",
  discussion: "讨论",
};

const TYPE_COLORS: Record<string, string> = {
  review: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  showoff: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  discussion: "bg-green-500/10 text-green-600 border-green-500/20",
};

export default function CommunityFeedPage() {
  const [posts, setPosts] = useState<DbCommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [tableError, setTableError] = useState(false);

  useEffect(() => {
    async function load() {
      let query = supabase
        .from("community_posts")
        .select("*, profiles!user_id(username, avatar_url)")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(20);

      if (activeTab !== "all") {
        query = query.eq("type", activeTab);
      }

      const { data, error } = await query;

      if (error) {
        // Table may not exist yet
        if (
          error.message.includes("does not exist") ||
          error.message.includes("relation") ||
          error.code === "42P01"
        ) {
          setTableError(true);
        }
        setPosts([]);
      } else {
        setPosts((data as DbCommunityPost[]) || []);
      }
    }

    load()
      .catch((err) => console.error("Failed to load community posts:", err))
      .finally(() => setLoading(false));
  }, [activeTab]);

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        <h1 className="font-mono text-sm font-semibold tracking-tight">
          社区
        </h1>
        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
          分享购车经验、晒爱车、参与讨论
        </p>

        {/* Tab filters */}
        <div className="mt-4 flex gap-1 border-b border-border">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setLoading(true);
              }}
              className={`px-3 py-2 font-mono text-xs transition-colors ${
                activeTab === tab.key
                  ? "border-b-2 border-foreground font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="mt-4 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border border-border p-4">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="mt-3 h-4 w-3/4" />
                <Skeleton className="mt-2 h-3 w-full" />
                <Skeleton className="mt-1 h-3 w-2/3" />
              </div>
            ))}
          </div>
        ) : tableError ? (
          <div className="mt-12 flex flex-col items-center py-12">
            <ImageIcon
              className="h-8 w-8 text-muted-foreground/50"
              strokeWidth={1.5}
            />
            <p className="mt-3 font-mono text-sm text-muted-foreground">
              社区即将上线
            </p>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground/70">
              敬请期待，社区功能正在建设中
            </p>
          </div>
        ) : posts.length === 0 ? (
          <div className="mt-12 flex flex-col items-center py-12">
            <MessageSquare
              className="h-8 w-8 text-muted-foreground/50"
              strokeWidth={1.5}
            />
            <p className="mt-3 font-mono text-sm text-muted-foreground">
              暂无帖子
            </p>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground/70">
              成为第一个发帖的人吧
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/community/${post.id}`}
                className="block border border-border p-4 transition-colors hover:bg-muted/30"
              >
                {/* Author row */}
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center border border-border bg-muted">
                    {post.profiles?.avatar_url ? (
                      <img
                        src={post.profiles.avatar_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="font-mono text-[10px] font-medium text-muted-foreground">
                        {(post.profiles?.username || "?")[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-xs font-medium">
                    {post.profiles?.username || "匿名"}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {timeAgo(post.created_at)}
                  </span>
                  <Badge
                    variant="outline"
                    className={`ml-auto font-mono text-[10px] ${
                      TYPE_COLORS[post.type] || ""
                    }`}
                  >
                    {TYPE_LABELS[post.type] || post.type}
                  </Badge>
                </div>

                {/* Title */}
                <h3 className="mt-2 font-mono text-sm font-medium leading-snug">
                  {post.title}
                </h3>

                {/* Content preview */}
                <p className="mt-1 font-mono text-xs leading-relaxed text-muted-foreground">
                  {post.content.length > 100
                    ? post.content.slice(0, 100) + "..."
                    : post.content}
                </p>

                {/* Image thumbnails */}
                {post.images && post.images.length > 0 && (
                  <div className="mt-2 flex gap-1.5">
                    {post.images.slice(0, 3).map((img, i) => (
                      <div
                        key={i}
                        className="h-16 w-20 shrink-0 border border-border bg-muted"
                      >
                        <img
                          src={img}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ))}
                    {post.images.length > 3 && (
                      <div className="flex h-16 w-20 shrink-0 items-center justify-center border border-border bg-muted">
                        <span className="font-mono text-[10px] text-muted-foreground">
                          +{post.images.length - 3}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Stats */}
                <div className="mt-3 flex items-center gap-4">
                  <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                    <Heart className="h-3.5 w-3.5" strokeWidth={1.5} />
                    {post.likes_count || 0}
                  </span>
                  <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                    <MessageSquare className="h-3.5 w-3.5" strokeWidth={1.5} />
                    {post.comments_count || 0}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />

      {/* Floating post button */}
      <Link
        href="/community/new"
        className="fixed bottom-20 right-4 z-40 flex h-12 w-12 items-center justify-center bg-foreground text-background shadow-lg transition-transform hover:scale-105 active:scale-95"
      >
        <Plus className="h-5 w-5" strokeWidth={1.5} />
      </Link>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/components/localized-navigation";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/components/i18n-provider";

// X 式紧凑关注按钮(帖子详情作者行等处):自查登录态与关注关系,
// 乐观更新、失败回滚;自己/未登录点击跳登录。follows 表见 supabase/follows.sql
export function FollowButton({
  userId,
  className = "",
}: {
  userId: string;
  className?: string;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [authId, setAuthId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAuthId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!authId || authId === userId) {
      setLoaded(true);
      return;
    }
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", authId)
      .eq("followee_id", userId)
      .then(({ count }) => {
        setIsFollowing((count || 0) > 0);
        setLoaded(true);
      });
  }, [authId, userId]);

  // 自己的帖子不显示
  if (authId === userId) return null;

  async function toggle() {
    if (!authId) {
      router.push("/login");
      return;
    }
    if (busy || !loaded) return;
    setBusy(true);
    if (isFollowing) {
      setIsFollowing(false);
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", authId)
        .eq("followee_id", userId);
      if (error) setIsFollowing(true);
    } else {
      setIsFollowing(true);
      const { error } = await supabase
        .from("follows")
        .insert({ follower_id: authId, followee_id: userId });
      if (error) setIsFollowing(false);
    }
    setBusy(false);
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      }}
      disabled={busy}
      className={`h-8 shrink-0 rounded-full px-4 font-mono text-[13px] font-medium transition-colors ${
        isFollowing
          ? "bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          : "bg-foreground text-background hover:opacity-90"
      } ${className}`}
    >
      {isFollowing ? t("已关注") : t("关注")}
    </button>
  );
}

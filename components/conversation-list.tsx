"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { avatarUrl } from "@/lib/avatar";
import { ChatThread, CHAT_MEDIA_RE } from "@/components/chat-thread";
import { useKeyboardHeight } from "@/hooks/use-keyboard-height";
import type { DbConversation } from "@/lib/types";

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  return new Date(dateStr).toLocaleDateString("zh-CN");
}

export function ConversationList({ userId, initialConvId, initialOtherUserId }: { userId: string; initialConvId?: string | null; initialOtherUserId?: string | null }) {
  const [conversations, setConversations] = useState<(DbConversation & { last_message?: string; unread_count?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeConversation, setActiveConversation] = useState<string | null>(initialConvId || null);
  const [activeOtherName, setActiveOtherName] = useState("");
  // 原生壳 resize:"none" 下 webview 不缩放,全屏聊天由这里垫出键盘高度
  const kbHeight = useKeyboardHeight();

  // 手机端聊天全屏时锁定背景页面滚动
  useEffect(() => {
    if (!activeConversation) return;
    if (window.matchMedia("(min-width: 768px)").matches) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [activeConversation]);

  async function loadConversations() {
    setLoading(true);
    const { data } = await supabase
      .from("conversations")
      .select("*, cars(id, title_zh, image_url, price)")
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .order("last_message_at", { ascending: false });

    const convs = (data as (DbConversation & { last_message?: string; unread_count?: number })[]) || [];

    // Collect all profile IDs and batch-fetch them
    const profileIds = new Set<string>();
    for (const conv of convs) {
      profileIds.add(conv.buyer_id);
      profileIds.add(conv.seller_id);
    }
    const profileMap = new Map<string, { username: string; avatar_url: string | null }>();
    if (profileIds.size > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", [...profileIds]);
      for (const p of profiles || []) {
        profileMap.set(p.id, { username: p.username, avatar_url: p.avatar_url });
      }
    }

    // Attach profiles + fetch last message and unread count
    for (const conv of convs) {
      conv.buyer_profile = profileMap.get(conv.buyer_id) || undefined;
      conv.seller_profile = profileMap.get(conv.seller_id) || undefined;

      const [lastMsgRes, unreadRes] = await Promise.all([
        supabase
          .from("messages")
          .select("content")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", conv.id)
          .eq("read", false)
          .neq("sender_id", userId),
      ]);
      conv.last_message = lastMsgRes.data?.content || "";
      conv.unread_count = unreadRes.count || 0;
    }

    setConversations(convs);
    setLoading(false);

    // Auto-open conversation from URL param
    if (initialConvId && !activeOtherName) {
      const target = convs.find((c) => c.id === initialConvId);
      if (target) {
        const isBuyer = target.buyer_id === userId;
        const otherProfile = isBuyer ? target.seller_profile : target.buyer_profile;
        setActiveOtherName(otherProfile?.username || "用户");
      }
    }

    // Auto-open conversation by other user ID
    if (initialOtherUserId && !activeConversation) {
      const target = convs.find((c) =>
        (c.buyer_id === initialOtherUserId && c.seller_id === userId) ||
        (c.seller_id === initialOtherUserId && c.buyer_id === userId)
      );
      if (target) {
        setActiveConversation(target.id);
        const isBuyer = target.buyer_id === userId;
        const otherProfile = isBuyer ? target.seller_profile : target.buyer_profile;
        setActiveOtherName(otherProfile?.username || "用户");
      }
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps -- loadConversations 每次渲染都是新引用,仅按入参重跑
  useEffect(() => {
    loadConversations();
  }, [userId, initialConvId, initialOtherUserId]);

  if (activeConversation) {
    return (
      <div
        // 手机:全屏接管(盖住页头,聊天占满视口,键盘弹起不跳);桌面:内嵌卡片
        className="fixed inset-0 z-[70] flex flex-col bg-background font-mono transition-[padding-bottom] duration-[250ms] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none md:static md:z-auto md:h-[600px] md:overflow-hidden md:rounded-xl md:bg-card"
        style={{
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingBottom: kbHeight > 0 ? `${kbHeight}px` : "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div className="min-h-0 flex-1">
          <ChatThread
            conversationId={activeConversation}
            currentUserId={userId}
            otherUsername={activeOtherName}
            onBack={() => {
              setActiveConversation(null);
              loadConversations();
            }}
          />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" strokeWidth={1.5} />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="mx-4 flex flex-col items-center rounded-xl border border-dashed border-border py-12 md:mx-0">
        <MessageSquare className="h-8 w-8 text-muted-foreground/50" strokeWidth={1.5} />
        <p className="mt-3 font-mono text-sm text-muted-foreground">暂无消息</p>
        <p className="mt-1 font-mono text-[11px] text-muted-foreground/70">
          在车辆详情页可以给卖家发消息
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border bg-card md:overflow-hidden md:rounded-xl">
      {conversations.map((conv) => {
        const isBuyer = conv.buyer_id === userId;
        const otherProfile = isBuyer ? conv.seller_profile : conv.buyer_profile;
        const otherName = otherProfile?.username || "用户";
        const unread = (conv.unread_count ?? 0) > 0;
        const preview = conv.last_message
          ? CHAT_MEDIA_RE.test(conv.last_message)
            ? /\.(mp4|mov|webm)(\?|$)/i.test(conv.last_message)
              ? "[视频]"
              : "[图片]"
            : conv.last_message
          : "暂无消息";

        return (
          <button
            key={conv.id}
            onClick={() => {
              setActiveConversation(conv.id);
              setActiveOtherName(otherName);
            }}
            className="flex w-full items-center gap-3 px-3 py-3.5 text-left transition-colors hover:bg-muted/50 active:bg-muted"
          >
            {/* Avatar + unread dot */}
            <div className="relative shrink-0">
              <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-muted">
                <img
                  src={avatarUrl(otherProfile?.avatar_url, otherProfile?.username)}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </span>
              {unread && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 font-mono text-[9px] font-semibold text-white">
                  {conv.unread_count}
                </span>
              )}
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className={`truncate font-mono text-[13px] ${unread ? "font-semibold" : "font-medium"}`}
                >
                  {otherName}
                </span>
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                  {timeAgo(conv.last_message_at)}
                </span>
              </div>
              <p
                className={`mt-0.5 truncate font-mono text-[11px] ${
                  unread ? "font-medium text-foreground" : "text-muted-foreground"
                }`}
              >
                {preview}
              </p>
              {conv.cars && (
                <p className="mt-1 flex items-center gap-1.5 truncate font-mono text-[10px] text-muted-foreground/70">
                  <span className="inline-block h-1 w-1 shrink-0 rounded-full bg-brand" aria-hidden="true" />
                  {conv.cars.title_zh} · {formatPrice(conv.cars.price)}
                </p>
              )}
            </div>

            {/* Car thumbnail */}
            {conv.cars?.image_url && (
              <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                <img src={conv.cars.image_url} alt="" className="h-full w-full object-cover" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

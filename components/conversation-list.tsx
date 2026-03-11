"use client";

import { useEffect, useState } from "react";
import { MessageSquare, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ChatThread } from "@/components/chat-thread";
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

export function ConversationList({ userId }: { userId: string }) {
  const [conversations, setConversations] = useState<(DbConversation & { last_message?: string; unread_count?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [activeOtherName, setActiveOtherName] = useState("");

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("conversations")
        .select(`
          *,
          cars!car_id(id, title_zh, image_url, price),
          buyer_profile:profiles!buyer_id(username, avatar_url),
          seller_profile:profiles!seller_id(username, avatar_url)
        `)
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        .order("last_message_at", { ascending: false });

      const convs = (data as (DbConversation & { last_message?: string; unread_count?: number })[]) || [];

      // Fetch last message and unread count for each conversation
      for (const conv of convs) {
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
    }
    load();
  }, [userId]);

  if (activeConversation) {
    return (
      <div className="h-[500px] border border-border">
        <ChatThread
          conversationId={activeConversation}
          currentUserId={userId}
          otherUsername={activeOtherName}
          onBack={() => {
            setActiveConversation(null);
            // Refresh list to update unread counts
            setLoading(true);
            supabase
              .from("conversations")
              .select(`
                *,
                cars!car_id(id, title_zh, image_url, price),
                buyer_profile:profiles!buyer_id(username, avatar_url),
                seller_profile:profiles!seller_id(username, avatar_url)
              `)
              .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
              .order("last_message_at", { ascending: false })
              .then(async ({ data }) => {
                const convs = (data as (DbConversation & { last_message?: string; unread_count?: number })[]) || [];
                for (const conv of convs) {
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
              });
          }}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <p className="py-8 text-center font-mono text-xs text-muted-foreground">
        加载中...
      </p>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center border border-border py-12">
        <MessageSquare className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
        <p className="mt-3 font-mono text-sm text-muted-foreground">暂无消息</p>
        <p className="mt-1 font-mono text-[11px] text-muted-foreground">
          在车辆详情页可以给卖家发消息
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {conversations.map((conv) => {
        const isBuyer = conv.buyer_id === userId;
        const otherProfile = isBuyer ? conv.seller_profile : conv.buyer_profile;
        const otherName = otherProfile?.username || "用户";

        return (
          <button
            key={conv.id}
            onClick={() => {
              setActiveConversation(conv.id);
              setActiveOtherName(otherName);
            }}
            className="flex w-full items-start gap-3 border border-border p-3 text-left transition-colors hover:border-foreground/20"
          >
            {/* Avatar */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-border bg-muted">
              {otherProfile?.avatar_url ? (
                <img src={otherProfile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <User className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-medium">{otherName}</span>
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                  {timeAgo(conv.last_message_at)}
                </span>
              </div>
              {conv.cars && (
                <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                  {conv.cars.title_zh} · {formatPrice(conv.cars.price)}
                </p>
              )}
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="truncate font-mono text-[11px] text-muted-foreground">
                  {conv.last_message || "暂无消息"}
                </p>
                {(conv.unread_count ?? 0) > 0 && (
                  <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-foreground px-1 font-mono text-[10px] font-medium text-background">
                    {conv.unread_count}
                  </span>
                )}
              </div>
            </div>

            {/* Car thumbnail */}
            {conv.cars?.image_url && (
              <div className="h-10 w-14 shrink-0 bg-muted">
                <img src={conv.cars.image_url} alt="" className="h-full w-full object-cover" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

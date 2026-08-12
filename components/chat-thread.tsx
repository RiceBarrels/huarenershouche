"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, Loader2, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { avatarUrl } from "@/lib/avatar";
import { userLink } from "@/lib/static-link";
import { Button } from "@/components/ui/button";
import type { DbMessage } from "@/lib/types";

// 媒体消息:内容为存储桶里的图片/视频公开 URL,渲染时直接展示
export const CHAT_MEDIA_RE =
  /^https?:\/\/\S+\.(jpe?g|png|gif|webp|heic|mp4|mov|webm)(\?\S*)?$/i;
const VIDEO_EXT_RE = /\.(mp4|mov|webm)(\?\S*)?$/i;

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  if (isToday) return time;
  return `${d.toLocaleDateString("zh-CN", { month: "short", day: "numeric" })} ${time}`;
}

interface ChatThreadProps {
  conversationId: string;
  currentUserId: string;
  otherUsername: string;
  onBack: () => void;
}

export function ChatThread({ conversationId, currentUserId, otherUsername, onBack }: ChatThreadProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<DbMessage[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  // 双方头像(含自己):按会话的 buyer/seller 拉资料,点头像进对应主页
  const [avatars, setAvatars] = useState<
    Record<string, { username: string; avatar_url: string | null }>
  >({});
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadProfiles() {
      const { data: conv } = await supabase
        .from("conversations")
        .select("buyer_id, seller_id")
        .eq("id", conversationId)
        .maybeSingle();
      if (!conv) return;
      setOtherUserId(conv.buyer_id === currentUserId ? conv.seller_id : conv.buyer_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", [conv.buyer_id, conv.seller_id]);
      if (profiles) {
        const map: Record<string, { username: string; avatar_url: string | null }> = {};
        for (const p of profiles) map[p.id] = { username: p.username, avatar_url: p.avatar_url };
        setAvatars(map);
      }
    }
    loadProfiles();
  }, [conversationId, currentUserId]);

  function goProfile(id: string) {
    router.push(userLink(id));
  }

  // Load messages + mark unread as read
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      const msgs = (data as DbMessage[]) || [];
      setMessages(msgs);
      setLoading(false);

      // Mark unread messages from the other party as read
      const unreadIds = msgs
        .filter((m) => !m.read && m.sender_id !== currentUserId)
        .map((m) => m.id);
      if (unreadIds.length > 0) {
        await supabase
          .from("messages")
          .update({ read: true })
          .in("id", unreadIds);
      }
    }
    load();

    // Realtime
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const newMsg = payload.new as DbMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          // Auto-mark as read if from other party
          if (newMsg.sender_id !== currentUserId) {
            supabase.from("messages").update({ read: true }).eq("id", newMsg.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!content.trim()) return;
    setSending(true);
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: currentUserId,
      content: content.trim(),
    });
    setContent("");
    setSending(false);
    inputRef.current?.focus();
  }

  // 上传图片/视频到存储桶,以公开 URL 作为消息内容发送
  async function handleUpload(file: File) {
    if (file.size > 50 * 1024 * 1024) {
      alert("文件不能超过 50MB");
      return;
    }
    setUploading(true);
    const ext = (file.name.split(".").pop() || "bin").toLowerCase();
    const path = `chat/${conversationId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("car-images").upload(path, file);
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from("car-images").getPublicUrl(path);
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        content: publicUrl,
      });
    } else {
      alert("上传失败,请重试");
    }
    setUploading(false);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button
          onClick={onBack}
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <button
          type="button"
          onClick={() => otherUserId && goProfile(otherUserId)}
          className="flex min-w-0 items-center gap-2 transition-opacity hover:opacity-80"
        >
          {otherUserId && (
            <span className="h-6 w-6 shrink-0 overflow-hidden rounded-full bg-muted">
              <img
                src={avatarUrl(avatars[otherUserId]?.avatar_url, avatars[otherUserId]?.username || otherUsername)}
                alt=""
                className="h-full w-full object-cover"
              />
            </span>
          )}
          <span className="truncate font-mono text-sm font-medium">{otherUsername}</span>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" strokeWidth={1.5} />
          </div>
        ) : messages.length === 0 ? (
          <p className="py-8 text-center font-mono text-xs text-muted-foreground">
            开始聊天吧
          </p>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => {
              const isMine = msg.sender_id === currentUserId;
              const sender = avatars[msg.sender_id];
              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2 ${isMine ? "flex-row-reverse" : ""}`}
                >
                  {/* 头像:自己/对方都显示,点击进主页 */}
                  <button
                    type="button"
                    onClick={() => goProfile(msg.sender_id)}
                    aria-label="查看主页"
                    className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-muted transition-opacity hover:opacity-80"
                  >
                    <img
                      src={avatarUrl(sender?.avatar_url, sender?.username || (isMine ? "我" : otherUsername))}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </button>
                  <div
                    className={`max-w-[75%] rounded-2xl ${
                      CHAT_MEDIA_RE.test(msg.content) ? "overflow-hidden p-1" : "px-3 py-2"
                    } ${
                      isMine
                        ? "bg-foreground text-background"
                        : "bg-muted"
                    }`}
                  >
                    {CHAT_MEDIA_RE.test(msg.content) ? (
                      VIDEO_EXT_RE.test(msg.content) ? (
                        <video
                          src={msg.content}
                          controls
                          playsInline
                          preload="metadata"
                          className="max-h-64 w-full rounded-xl"
                        />
                      ) : (
                        <a href={msg.content} target="_blank" rel="noreferrer">
                          <img
                            src={msg.content}
                            alt="图片消息"
                            loading="lazy"
                            className="max-h-64 w-full rounded-xl object-contain"
                          />
                        </a>
                      )
                    ) : (
                      <p className="whitespace-pre-wrap font-mono text-sm">
                        {msg.content}
                      </p>
                    )}
                    <p
                      className={`mt-1 font-mono text-[10px] ${
                        CHAT_MEDIA_RE.test(msg.content) ? "px-2 pb-1" : ""
                      } ${
                        isMine ? "text-background/60" : "text-muted-foreground"
                      }`}
                    >
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border px-4 py-3">
        <div className="flex gap-2">
          {/* 上传图片/视频 */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            aria-label="发送图片或视频"
            className="flex h-10 w-10 shrink-0 items-center justify-center self-end rounded-full bg-muted/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
            ) : (
              <Plus className="h-4 w-4" strokeWidth={1.5} />
            )}
          </button>
          <textarea
            ref={inputRef}
            className="flex-1 resize-none rounded-xl bg-muted px-3 py-2 font-mono text-sm placeholder:text-muted-foreground focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="输入消息..."
            rows={1}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button
            className="self-end gap-1 font-mono text-xs h-10"
            onClick={handleSend}
            disabled={!content.trim()}
          >
              <><Send className="h-3 w-3" strokeWidth={1.5} /> 发送</>
          </Button>
        </div>
      </div>
    </div>
  );
}

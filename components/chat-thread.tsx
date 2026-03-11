"use client";

import { useEffect, useState, useRef } from "react";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import type { DbMessage } from "@/lib/types";

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
  const [messages, setMessages] = useState<DbMessage[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
        <span className="font-mono text-sm font-medium">{otherUsername}</span>
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
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] px-3 py-2 ${
                      isMine
                        ? "bg-foreground text-background"
                        : "border border-border bg-muted"
                    }`}
                  >
                    <p className="whitespace-pre-wrap font-mono text-sm">
                      {msg.content}
                    </p>
                    <p
                      className={`mt-1 font-mono text-[10px] ${
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
          <textarea
            ref={inputRef}
            className="flex-1 resize-none border border-border bg-background px-3 py-2 font-mono text-sm placeholder:text-muted-foreground focus:border-foreground/30 focus:outline-none"
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
            size="sm"
            className="h-auto self-end gap-1 font-mono text-xs"
            onClick={handleSend}
            disabled={!content.trim() || sending}
          >
            {sending ? (
              <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />
            ) : (
              <Send className="h-3 w-3" strokeWidth={1.5} />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

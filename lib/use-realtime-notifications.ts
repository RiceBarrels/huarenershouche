"use client";

import { useEffect } from "react";
import { supabase } from "./supabase";
import { notifyNewMessage } from "./notifications";

export function useRealtimeNotifications(userId: string | null) {
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`messages:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async (payload) => {
          const msg = payload.new as {
            sender_id: string;
            content: string;
            conversation_id: string;
          };
          // messages 表没有 receiver_id 列，需按会话双方判定这条消息是否发给自己
          if (msg.sender_id === userId || !document.hidden) return;

          const { data: convo } = await supabase
            .from("conversations")
            .select("buyer_id, seller_id")
            .eq("id", msg.conversation_id)
            .single();
          if (!convo || (convo.buyer_id !== userId && convo.seller_id !== userId)) {
            return;
          }

          const { data: sender } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", msg.sender_id)
            .single();

          notifyNewMessage(
            sender?.username || "买家/卖家",
            msg.content,
            `/messages/${msg.sender_id}`
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);
}

"use client";

// 用户屏蔽(拉黑)helpers:blocks 表见 supabase/blocks.sql
// useBlockedIds():当前登录用户屏蔽的 user_id 集合,用于在
// 社区 feed/评论/会话列表里过滤被屏蔽用户的内容(未登录返回空集合)。

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export async function fetchBlockedIds(blockerId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from("blocks")
    .select("blocked_id")
    .eq("blocker_id", blockerId);
  return new Set((data || []).map((d: { blocked_id: string }) => d.blocked_id));
}

export async function blockUser(blockerId: string, blockedId: string) {
  return supabase.from("blocks").insert({ blocker_id: blockerId, blocked_id: blockedId });
}

export async function unblockUser(blockerId: string, blockedId: string) {
  return supabase
    .from("blocks")
    .delete()
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId);
}

export function useBlockedIds(): { blockedIds: Set<string>; refresh: () => void } {
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());

  const refresh = useCallback(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id;
      if (!uid) return;
      // 表可能还没建:失败静默,保持空集合
      fetchBlockedIds(uid)
        .then(setBlockedIds)
        .catch(() => {});
    });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { blockedIds, refresh };
}

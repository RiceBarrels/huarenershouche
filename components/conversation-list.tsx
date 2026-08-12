"use client";

import {
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence } from "framer-motion";
import { MessageSquare } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { avatarUrl } from "@/lib/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ChatThread, CHAT_MEDIA_RE } from "@/components/chat-thread";
import { SwipeSheet } from "@/components/swipe-sheet";
import { useOverlay } from "@/components/car-overlay-provider";
import {
  OverlayLayerRegistryCtx,
  OverlayLayerZCtx,
} from "@/components/overlay-stack";
import { useKeyboardHeight } from "@/hooks/use-keyboard-height";
import { useCachedData } from "@/lib/use-cached-data";
import { triggerHaptic } from "@/lib/haptics";
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

type ConvRow = DbConversation & { last_message?: string; unread_count?: number };

/** 收件箱双层缓存 key(PullToRefresh 清缓存用同一个) */
export const inboxCacheKey = (userId: string) => `messages_inbox_${userId}`;

async function fetchConversations(userId: string): Promise<ConvRow[]> {
  const { data } = await supabase
    .from("conversations")
    .select("*, cars(id, title_zh, image_url, price)")
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order("last_message_at", { ascending: false });

  const convs = (data as ConvRow[]) || [];

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

  return convs;
}

export function ConversationList({ userId, initialConvId, initialOtherUserId }: { userId: string; initialConvId?: string | null; initialOtherUserId?: string | null }) {
  const [activeConversation, setActiveConversation] = useState<string | null>(initialConvId || null);
  const [activeOtherName, setActiveOtherName] = useState("");
  // 原生壳 resize:"none" 下 webview 不缩放,全屏聊天由这里垫出键盘高度
  const kbHeight = useKeyboardHeight();

  // 双层缓存(同社区 feed/收藏):session 命中秒开,localStorage 冷启动兜底 + 后台刷新
  const { data, loading, mutate } = useCachedData<ConvRow[]>(
    inboxCacheKey(userId),
    () => fetchConversations(userId),
    [userId],
  );
  const conversations = data || [];

  // 手动/实时刷新:重拉并写回缓存(失败时保持现有列表)
  const refresh = useCallback(async () => {
    try {
      mutate(await fetchConversations(userId));
    } catch {
      /* 网络失败静默 */
    }
  }, [userId, mutate]);
  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  });

  // 实时动态更新:别人发来新消息 → 后台刷新列表(预览/未读数/排序跟着变);
  // 事件不带会话归属,refresh 只会拉回自己的会话,多余事件只是空刷
  useEffect(() => {
    const channel = supabase
      .channel(`inbox:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as { sender_id: string };
          if (msg.sender_id === userId) return;
          refreshRef.current();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // —— 移动端:聊天用浮层(SwipeSheet)打开,列表留在原地 —— 桌面端保持内嵌卡片
  const { enabled: mobileOverlay } = useOverlay();
  const layerRegistry = useContext(OverlayLayerRegistryCtx);
  const layerZMap = useContext(OverlayLayerZCtx);
  const chatLayerId = useId();
  const chatLayerZ = layerZMap?.get(chatLayerId) ?? 60;
  const layerMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const closeChat = useCallback(() => {
    setActiveConversation(null);
    // 回列表时刷新(已读后未读数归零)
    refreshRef.current();
  }, []);
  const closeChatRef = useRef(closeChat);
  useEffect(() => {
    closeChatRef.current = closeChat;
  });

  // 注册进浮层栈:统一层级 + 系统返回键/手势关闭聊天
  useEffect(() => {
    if (!mobileOverlay || !activeConversation || !layerRegistry) return;
    layerRegistry.register(chatLayerId, () => closeChatRef.current());
    return () => layerRegistry.release(chatLayerId);
  }, [mobileOverlay, activeConversation, layerRegistry, chatLayerId]);

  // 开/关聊天浮层触觉(与其他浮层一致)
  const prevActive = useRef(activeConversation);
  useEffect(() => {
    if (!!prevActive.current === !!activeConversation) return;
    prevActive.current = activeConversation;
    if (mobileOverlay) triggerHaptic();
  }, [activeConversation, mobileOverlay]);

  // 列表就绪后按 URL 参数自动打开会话(缓存命中时首帧即可打开)
  useEffect(() => {
    if (conversations.length === 0) return;
    if (initialConvId && !activeOtherName) {
      const target = conversations.find((c) => c.id === initialConvId);
      if (target) {
        const otherProfile =
          target.buyer_id === userId ? target.seller_profile : target.buyer_profile;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- URL 直达会话,仅数据就绪时一次
        setActiveOtherName(otherProfile?.username || "用户");
      }
    }
    if (initialOtherUserId && !activeConversation) {
      const target = conversations.find(
        (c) =>
          (c.buyer_id === initialOtherUserId && c.seller_id === userId) ||
          (c.seller_id === initialOtherUserId && c.buyer_id === userId),
      );
      if (target) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- URL 直达会话,仅数据就绪时一次
        setActiveConversation(target.id);
        const otherProfile =
          target.buyer_id === userId ? target.seller_profile : target.buyer_profile;
        setActiveOtherName(otherProfile?.username || "用户");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅列表数据变化时对账 URL 参数
  }, [conversations]);

  // 浮层顶栏的对方头像/名字(列表未就绪时退回名字占位)
  const activeConv = activeConversation
    ? conversations.find((c) => c.id === activeConversation)
    : undefined;
  const activeOtherProfile = activeConv
    ? activeConv.buyer_id === userId
      ? activeConv.seller_profile
      : activeConv.buyer_profile
    : undefined;

  let body: React.ReactNode;
  if (activeConversation && !mobileOverlay) {
    // 桌面端:聊天内嵌卡片替换列表(移动端聊天在下方 portal 的浮层里)
    body = (
      <div
        className="flex h-[600px] flex-col overflow-hidden rounded-[26px] bg-card font-mono"
        style={{
          paddingBottom: kbHeight > 0 ? `${kbHeight}px` : undefined,
        }}
      >
        <div className="min-h-0 flex-1">
          <ChatThread
            conversationId={activeConversation}
            currentUserId={userId}
            otherUsername={activeOtherName}
            onBack={closeChat}
          />
        </div>
      </div>
    );
  } else if (loading) {
    body = (
      <div className="overflow-hidden rounded-[26px] bg-card">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3.5">
            <Skeleton className="h-11 w-11 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  } else if (conversations.length === 0) {
    body = (
      <div className="flex flex-col items-center rounded-[26px] bg-card py-16">
        <MessageSquare className="h-10 w-10 text-muted-foreground" strokeWidth={1.5} />
        <p className="mt-3 font-mono text-sm text-muted-foreground">暂无消息</p>
        <p className="mt-1 font-mono text-[11px] text-muted-foreground/70">
          在车辆详情页可以给卖家发消息
        </p>
      </div>
    );
  } else {
    body = (
    // iOS 26 白色分组卡:26px 大圆角,分隔线从文字起始处缩进、末行无线
    <div className="overflow-hidden rounded-[26px] bg-card">
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
            className="group/row flex w-full items-center gap-3 pl-4 text-left transition-colors hover:bg-muted/40 active:bg-muted/60"
          >
            {/* Avatar + unread badge */}
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

            {/* 行内容:分隔线从这里起(iOS 缩进式分隔),末行无线 */}
            <div className="flex min-w-0 flex-1 items-center gap-3 border-b border-border/50 py-3 pr-4 group-last/row:border-0">
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className={`truncate font-mono text-[15px] ${unread ? "font-semibold" : "font-medium"}`}
                  >
                    {otherName}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                    {timeAgo(conv.last_message_at)}
                  </span>
                </div>
                <p
                  className={`mt-0.5 truncate font-mono text-[13px] ${
                    unread ? "font-medium text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {preview}
                </p>
                {conv.cars && (
                  <p className="mt-1 flex items-center gap-1.5 truncate font-mono text-[11px] text-muted-foreground/70">
                    <span className="inline-block h-1 w-1 shrink-0 rounded-full bg-brand" aria-hidden="true" />
                    {conv.cars.title_zh} · {formatPrice(conv.cars.price)}
                  </p>
                )}
              </div>

              {/* 车辆缩略图:同心圆角(26 − 12 = 14px) */}
              {conv.cars?.image_url && (
                <div className="h-12 w-16 shrink-0 overflow-hidden rounded-[14px] bg-muted">
                  <img src={conv.cars.image_url} alt="" className="h-full w-full object-cover" />
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
    );
  }

  return (
    <>
      {body}

      {/* 移动端聊天浮层:与详情浮层同一套图层模型(SwipeSheet 底部滑入、
          系统返回/顶栏返回可关),portal 到 body 避免手势冒泡进 PullToRefresh */}
      {layerMounted &&
        mobileOverlay &&
        createPortal(
          <AnimatePresence>
            {activeConversation && (
              <SwipeSheet
                key={activeConversation}
                onClose={closeChat}
                zIndex={chatLayerZ}
                topBarExtra={
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="h-6 w-6 shrink-0 overflow-hidden rounded-full bg-muted">
                      <img
                        src={avatarUrl(
                          activeOtherProfile?.avatar_url,
                          activeOtherProfile?.username || activeOtherName,
                        )}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </span>
                    <span className="truncate font-mono text-sm font-medium">
                      {activeOtherName || "用户"}
                    </span>
                  </div>
                }
              >
                {/* data-sheet-static="y":纵向交给聊天自己滚(下拉翻记录不算
                    关闭手势),横滑关闭浮层仍可用;键盘高度垫底 */}
                <div
                  data-sheet-static="y"
                  className="flex h-full flex-col transition-[padding-bottom] duration-[250ms] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none"
                  style={{
                    paddingBottom:
                      kbHeight > 0 ? `${kbHeight}px` : "env(safe-area-inset-bottom, 0px)",
                  }}
                >
                  <ChatThread
                    conversationId={activeConversation}
                    currentUserId={userId}
                    otherUsername={activeOtherName || "用户"}
                    onBack={closeChat}
                    hideHeader
                  />
                </div>
              </SwipeSheet>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}

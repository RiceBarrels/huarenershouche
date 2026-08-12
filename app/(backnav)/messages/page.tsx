"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ConversationList, inboxCacheKey } from "@/components/conversation-list";
import { clearCache } from "@/lib/cache";
import { PullToRefresh } from "@/components/pull-to-refresh";
import { useIdentity } from "@/components/identity-provider";
import { LargeTitle } from "@/components/ios-settings";

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen flex-col bg-background font-mono">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" strokeWidth={1.5} />
        </main>
        <Footer />
      </div>
    }>
      <MessagesContent />
    </Suspense>
  );
}

function MessagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // 收件箱按当前操作身份(切换成车行时看车行收件箱)
  const { actingId } = useIdentity();
  const [user, setUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/login");
        return;
      }
      setLoading(false);
    });
  }, [router]);

  useEffect(() => {
    if (actingId) setUser(actingId);
  }, [actingId]);

  const handleRefresh = useCallback(async () => {
    // 清双层缓存再重挂载,强制真正重拉(否则 session 缓存命中不会请求)
    if (actingId) clearCache(inboxCacheKey(actingId));
    setRefreshKey((k) => k + 1);
  }, [actingId]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-background font-mono">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" strokeWidth={1.5} />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      {/* iOS 26 风格:大标题 + 白色分组卡列表(顶部安全区由 BackNav 承担) */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-4">
        <LargeTitle title="消息" />
        <div className="mt-4">
          {user && (
            <ConversationList
              key={refreshKey}
              userId={user}
              initialConvId={searchParams.get("conv")}
            />
          )}
        </div>
      </main>
      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
    </PullToRefresh>
  );
}

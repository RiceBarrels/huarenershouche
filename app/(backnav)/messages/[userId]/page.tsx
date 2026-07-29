"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ConversationList } from "@/components/conversation-list";
import { PullToRefresh } from "@/components/pull-to-refresh";
import { useIdentity } from "@/components/identity-provider";

export default function MessagesWithUserPage() {
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
      <MessagesWithUserContent />
    </Suspense>
  );
}

function MessagesWithUserContent() {
  const router = useRouter();
  const params = useParams();
  const otherUserId = params.userId as string;
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
    setRefreshKey((k) => k + 1);
  }, []);

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
      <div
        className="flex min-h-screen flex-col bg-background font-mono"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <Header />
        <main className="mx-auto w-full max-w-3xl flex-1 py-4 md:px-4">
          <h1 className="mb-3 px-4 font-logo text-xl tracking-tight md:mb-4 md:px-0">
            消息
          </h1>
          {user && (
            <ConversationList
              key={refreshKey}
              userId={user}
              initialOtherUserId={otherUserId}
            />
          )}
        </main>
        <div className="hidden md:block">
          <Footer />
        </div>
      </div>
    </PullToRefresh>
  );
}

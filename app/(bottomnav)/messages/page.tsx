"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ConversationList } from "@/components/conversation-list";
import { PullToRefresh } from "@/components/pull-to-refresh";

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
  const [user, setUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/login");
        return;
      }
      setUser(data.user.id);
      setLoading(false);
    });
  }, [router]);

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
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-4">
        <h1 className="hidden font-mono text-lg font-semibold tracking-tight md:block md:mb-4">
          消息
        </h1>
        {user && (
          <ConversationList
            key={refreshKey}
            userId={user}
            initialConvId={searchParams.get("conv")}
          />
        )}
      </main>
      <Footer />
    </div>
    </PullToRefresh>
  );
}

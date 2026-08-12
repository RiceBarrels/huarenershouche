"use client";

// 设置 · 通知设置(iOS 26 风格)

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Skeleton } from "@/components/ui/skeleton";
import { LargeTitle } from "@/components/ios-settings";
import { NotificationSettings } from "@/components/notification-settings";

export default function NotificationSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/login"); return; }
      setLoading(false);
    });
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      <main className="relative mx-auto w-full max-w-lg flex-1 px-4 py-4">
        <LargeTitle title="通知设置" subtitle="降价、新车源与私信提醒" />
        {loading ? (
          <Skeleton className="mt-5 h-40 w-full rounded-xl" />
        ) : (
          <div className="mt-5">
            <NotificationSettings />
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

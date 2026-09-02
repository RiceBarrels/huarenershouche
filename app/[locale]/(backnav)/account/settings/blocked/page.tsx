"use client";

// 设置 · 屏蔽名单(iOS 风格):已屏蔽用户列表 + 取消屏蔽
// blocks 表见 supabase/blocks.sql;App Store UGC 合规(屏蔽机制的管理入口)

import { useEffect, useState } from "react";
import { useRouter } from "@/components/localized-navigation";
import Link from "@/components/localized-navigation";
import { Ban, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { avatarUrl } from "@/lib/avatar";
import { unblockUser } from "@/lib/blocks";
import { userLink } from "@/lib/static-link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Skeleton } from "@/components/ui/skeleton";
import { SettingsGroup, GroupFooter, LargeTitle } from "@/components/ios-settings";
import { useI18n } from "@/components/i18n-provider";

interface BlockedRow {
  blocked_id: string;
  created_at: string;
  profiles?: { username: string; avatar_url: string | null } | null;
}

export default function BlockedUsersPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [authId, setAuthId] = useState<string | null>(null);
  const [rows, setRows] = useState<BlockedRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.push("/login");
        return;
      }
      setAuthId(user.id);
      const { data } = await supabase
        .from("blocks")
        .select("blocked_id, created_at, profiles!blocked_id(username, avatar_url)")
        .eq("blocker_id", user.id)
        .order("created_at", { ascending: false });
      setRows((data as unknown as BlockedRow[]) || []);
      setLoading(false);
    });
  }, [router]);

  async function handleUnblock(blockedId: string) {
    if (!authId || busyId) return;
    setBusyId(blockedId);
    const { error } = await unblockUser(authId, blockedId);
    if (!error) setRows((prev) => prev.filter((r) => r.blocked_id !== blockedId));
    setBusyId(null);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      <main className="relative mx-auto w-full max-w-lg flex-1 px-4 py-4 md:py-8">
        <LargeTitle title={t("屏蔽名单")} subtitle={t("被屏蔽用户的帖子、评论和消息不会再展示")} />

        {loading ? (
          <div className="mt-5 space-y-3">
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>
        ) : rows.length === 0 ? (
          <div className="mt-8 flex flex-col items-center rounded-[26px] bg-card py-16">
            <Ban className="h-8 w-8 text-muted-foreground/50" strokeWidth={1.5} />
            <p className="mt-3 font-mono text-sm text-muted-foreground">{t("暂无屏蔽用户")}</p>
          </div>
        ) : (
          <>
            <SettingsGroup className="mt-5" capsule={rows.length === 1}>
              {rows.map((row) => (
                <div key={row.blocked_id} className="group/row flex w-full items-center gap-3 pl-4">
                  <Link
                    href={userLink(row.blocked_id)}
                    className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-muted"
                  >
                    <img
                      src={avatarUrl(row.profiles?.avatar_url, row.profiles?.username)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </Link>
                  <span className="flex min-h-[56px] min-w-0 flex-1 items-center gap-2 border-b border-border/50 py-2 mr-4 group-last/row:border-0">
                    <Link
                      href={userLink(row.blocked_id)}
                      className="min-w-0 flex-1 truncate font-mono text-[15px]"
                    >
                      {row.profiles?.username || t("用户")}
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleUnblock(row.blocked_id)}
                      disabled={busyId === row.blocked_id}
                      className="shrink-0 rounded-full bg-muted px-3 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground disabled:opacity-50"
                    >
                      {busyId === row.blocked_id ? (
                        <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />
                      ) : (
                        t("取消屏蔽")
                      )}
                    </button>
                  </span>
                </div>
              ))}
            </SettingsGroup>
            <GroupFooter>
              {t("取消屏蔽后，对方的内容会重新出现在你的浏览中。")}
            </GroupFooter>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

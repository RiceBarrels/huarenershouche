"use client";

// 设置 · 账号与安全(iOS 风格):登录邮箱行 + 危险区
// 「删除账号」居中红字行(App Store 5.1.1(v)),点开后展开确认输入

import { useEffect, useState } from "react";
import { useRouter } from "@/components/localized-navigation";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { SettingsGroup, GroupFooter, LargeTitle, SettingsRow } from "@/components/ios-settings";
import { ACTING_KEY } from "@/components/identity-provider";
import { useI18n } from "@/components/i18n-provider";

export default function SecuritySettingsPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMessage, setEmailMessage] = useState("");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // 确认词随语言变化(en 下需输入 "Delete"),校验/占位/提示保持一致
  const confirmWord = t("删除");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/login"); return; }
      setEmail(user.email || "");
      setLoading(false);
    });
  }, [router]);

  async function handleEmailUpdate() {
    if (!email.trim()) return;
    setEmailSaving(true);
    setEmailMessage("");
    const { error } = await supabase.auth.updateUser({ email });
    if (error) {
      setEmailMessage(error.message);
    } else {
      setEmailMessage(t("验证邮件已发送到新邮箱，请查收确认"));
    }
    setEmailSaving(false);
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText !== confirmWord || deleting) return;
    setDeleting(true);
    setDeleteError("");
    const { error } = await supabase.rpc("delete_account");
    if (error) {
      setDeleteError(t("删除失败: {msg}", { msg: error.message }));
      setDeleting(false);
      return;
    }
    // 服务端账号已删除,仅需清理本地会话与操作身份
    try { localStorage.removeItem(ACTING_KEY); } catch {}
    await supabase.auth.signOut({ scope: "local" }).catch(() => {});
    router.replace("/");
  }

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      <main className="relative mx-auto w-full max-w-lg flex-1 px-4 py-4 md:py-8">
        <LargeTitle title={t("账号与安全")} subtitle={t("登录邮箱与账号管理")} />

        {loading ? (
          <div className="mt-5 space-y-5">
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>
        ) : (
          <>
            {/* 登录邮箱 */}
            <SettingsGroup capsule className="mt-5">
              <label htmlFor="email" className="flex min-h-[56px] items-center pl-4">
                <span className="flex min-w-0 flex-1 items-center gap-3 pr-3">
                  <span className="w-16 shrink-0 font-mono text-[15px]">{t("邮箱")}</span>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    placeholder="your@email.com"
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 min-w-0 flex-1 bg-transparent font-mono text-[15px] outline-none placeholder:text-muted-foreground/50"
                  />
                  <button
                    type="button"
                    onClick={handleEmailUpdate}
                    disabled={emailSaving}
                    className="shrink-0 px-1.5 font-mono text-sm font-medium text-brand-ink transition-opacity active:opacity-60 disabled:opacity-40"
                  >
                    {emailSaving ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> : t("更改")}
                  </button>
                </span>
              </label>
            </SettingsGroup>
            {emailMessage ? (
              emailMessage === t("验证邮件已发送到新邮箱，请查收确认") ? (
                <p className="mt-2 px-5 font-mono text-xs leading-relaxed text-emerald-600 dark:text-emerald-400">
                  {emailMessage}
                </p>
              ) : (
                <p className="mt-2 rounded-xl bg-destructive/10 px-3 py-2.5 font-mono text-xs leading-relaxed text-destructive">
                  {emailMessage}
                </p>
              )
            ) : (
              <p className="mt-2 px-5 font-mono text-xs leading-relaxed text-muted-foreground">
                {t("更改邮箱后需要在新邮箱中点击验证链接才会生效。")}
              </p>
            )}

            {/* 屏蔽名单(App Store UGC 合规:屏蔽机制的管理入口) */}
            <SettingsGroup capsule className="mt-6">
              <SettingsRow label={t("屏蔽名单")} href="/account/settings/blocked" />
            </SettingsGroup>

            {/* 删除账号(危险区):收起时单行胶囊,展开成表单后回到大圆角卡 */}
            <SettingsGroup capsule={!deleteOpen} className="mt-6">
              {!deleteOpen ? (
                <button
                  type="button"
                  onClick={() => setDeleteOpen(true)}
                  className="flex min-h-[56px] w-full items-center justify-center text-center font-mono text-[15px] text-destructive transition-colors active:bg-muted/70"
                >
                  {t("删除账号")}
                </button>
              ) : (
                <div className="space-y-3 p-4">
                  <p className="font-mono text-sm font-semibold text-destructive">{t("删除账号")}</p>
                  <p className="font-mono text-xs leading-relaxed text-muted-foreground">
                    {t("请输入「{word}」以确认永久删除账号。", { word: confirmWord })}
                  </p>
                  <Input
                    className="h-11 font-mono text-sm"
                    placeholder={confirmWord}
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    disabled={deleting}
                  />
                  {deleteError && (
                    <p className="rounded-xl bg-destructive/10 px-3 py-2.5 font-mono text-xs text-destructive">{deleteError}</p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      className="h-11 flex-1 font-mono text-sm font-medium"
                      onClick={handleDeleteAccount}
                      disabled={deleteConfirmText !== confirmWord || deleting}
                    >
                      {deleting && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />}
                      {t("确认永久删除")}
                    </Button>
                    <Button
                      variant="secondary"
                      className="h-11 flex-1 font-mono text-sm"
                      onClick={() => { setDeleteOpen(false); setDeleteConfirmText(""); setDeleteError(""); }}
                      disabled={deleting}
                    >
                      {t("取消")}
                    </Button>
                  </div>
                </div>
              )}
            </SettingsGroup>
            <GroupFooter>
              {t("永久删除账号及全部数据，包括发布的车源、消息、收藏、评论和上传的图片。此操作立即生效且不可恢复。")}
            </GroupFooter>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

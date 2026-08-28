"use client";

// 设置 · 个人资料(iOS 风格):居中大头像 + 分组卡内表单行
// (label 左 / 无边框输入右,输入后 800ms 自动保存)

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "@/components/localized-navigation";
import { Camera, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { avatarUrl } from "@/lib/avatar";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Skeleton } from "@/components/ui/skeleton";
import { SettingsGroup, GroupFooter } from "@/components/ios-settings";
import { useI18n } from "@/components/i18n-provider";
import type { DbProfile } from "@/lib/types";

// iOS 式表单行:label 固定列 + 无边框输入,分隔线从 label 起始缩进
function FieldRow({
  label, value, placeholder, onChange, id,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
  id: string;
}) {
  return (
    <label htmlFor={id} className="group/row flex items-center pl-4">
      <span className="flex min-w-0 flex-1 items-center gap-3 border-b border-border/60 pr-4 group-last/row:border-0">
        <span className="w-16 shrink-0 font-mono text-[15px]">{label}</span>
        <input
          id={id}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 min-w-0 flex-1 bg-transparent font-mono text-[15px] outline-none placeholder:text-muted-foreground/50"
        />
      </span>
    </label>
  );
}

export default function ProfileSettingsPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [user, setUser] = useState<string | null>(null);
  const [profile, setProfile] = useState<DbProfile | null>(null);
  const [form, setForm] = useState({ username: "", phone: "", location: "" });
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formRef = useRef(form);
  useEffect(() => {
    formRef.current = form;
  }, [form]);

  const autoSave = useCallback(() => {
    if (!user) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      const f = formRef.current;
      setSaving(true);
      await supabase
        .from("profiles")
        .update({ username: f.username, phone: f.phone, location: f.location })
        .eq("id", user);
      setSaving(false);
    }, 800);
  }, [user]);

  function update(patch: Partial<typeof form>) {
    setForm((p) => ({ ...p, ...patch }));
    setTimeout(() => autoSave(), 0);
  }

  useEffect(() => {
    async function load() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { router.push("/login"); return; }
      setUser(authUser.id);
      const { data } = await supabase.from("profiles").select("*").eq("id", authUser.id).maybeSingle();
      if (data) {
        setProfile(data as DbProfile);
        setForm({
          username: data.username || "",
          phone: data.phone || "",
          location: data.location || "",
        });
      }
      setLoading(false);
    }
    load();
  }, [router]);

  useEffect(() => {
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, []);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setAvatarUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user);
      setProfile((prev) => (prev ? { ...prev, avatar_url: publicUrl } : prev));
    }
    setAvatarUploading(false);
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  }

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      <main className="relative mx-auto w-full max-w-lg flex-1 px-4 py-4 md:py-8">
        <div className="flex items-center gap-2 px-1">
          <h1 className="font-mono text-[28px] font-bold tracking-tight">{t("个人资料")}</h1>
          {saving && (
            <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />{t("保存中...")}
            </span>
          )}
        </div>

        {loading ? (
          <div className="mt-5 space-y-5">
            <div className="flex justify-center py-4"><Skeleton className="h-24 w-24 rounded-full" /></div>
            <Skeleton className="h-36 w-full rounded-xl" />
          </div>
        ) : (
          <>
            {/* 居中大头像(Apple ID 式,直接放在灰底画布上) */}
            <div className="mt-5 flex flex-col items-center">
              <button
                type="button"
                className="group relative h-24 w-24 overflow-hidden rounded-full bg-muted"
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                aria-label={t("更换头像")}
              >
                <img src={avatarUrl(profile?.avatar_url, user)} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 group-active:opacity-100">
                  {avatarUploading
                    ? <Loader2 className="h-5 w-5 animate-spin text-white" strokeWidth={1.5} />
                    : <Camera className="h-5 w-5 text-white" strokeWidth={1.5} />}
                </div>
              </button>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="mt-2 font-mono text-[13px] text-brand-ink transition-opacity active:opacity-60"
              >
                {t("更换头像")}
              </button>
            </div>

            {/* 资料表单(iOS 分组卡) */}
            <SettingsGroup className="mt-5">
              <FieldRow id="username" label={t("昵称")} value={form.username} placeholder={t("你的昵称")} onChange={(v) => update({ username: v })} />
              <FieldRow id="phone" label={t("电话")} value={form.phone} placeholder={t("联系电话")} onChange={(v) => update({ phone: v })} />
              <FieldRow id="location" label={t("地区")} value={form.location} placeholder={t("例如: Los Angeles, CA")} onChange={(v) => update({ location: v })} />
            </SettingsGroup>
            <GroupFooter>{t("修改会自动保存。昵称与地区会展示在你的主页和车源信息里。")}</GroupFooter>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

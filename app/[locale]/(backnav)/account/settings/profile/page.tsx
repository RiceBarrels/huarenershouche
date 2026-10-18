"use client";

// 设置 · 个人资料(iOS 风格):居中大头像 + 分组卡内表单行
// (label 左 / 无边框输入右,输入后 800ms 自动保存)。
// 点头像或「更换头像」都打开与「我的」页相同的头像查看器,在「⋯」菜单里更换或恢复默认。
// 即时通讯联系方式(contact_apps)跟随当前操作身份 actingId:切换成车行时编辑的是车行账号的;
// 失焦时保存并送 AI 审核,contact-apps.sql 未执行时整组不显示。

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "@/components/localized-navigation";
import { Camera, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { avatarUrl, defaultAvatarUrl, isDefaultAvatar } from "@/lib/avatar";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Skeleton } from "@/components/ui/skeleton";
import { AvatarViewer } from "@/components/avatar-viewer";
import { SettingsGroup, GroupFooter } from "@/components/ios-settings";
import { LanguagePicker } from "@/components/language-picker";
import { useI18n } from "@/components/i18n-provider";
import { useIdentity } from "@/components/identity-provider";
import { ContactAppsEditor, type ContactAppsInput } from "@/components/contact-apps-editor";
import {
  contactAppsToInput,
  normalizeContactApps,
  sameContactApps,
  type ContactApps,
} from "@/lib/contact-apps";
import { loadContactApps, saveContactApps } from "@/lib/contact-apps-client";
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
  const [form, setForm] = useState({ username: "", phone: "", location: "", languages: [] as string[] });
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarViewOpen, setAvatarViewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // 即时通讯联系方式:写到当前操作身份(本人或已认领的车行账号)
  const { actingId, actingProfile, isActingAsClaimed } = useIdentity();
  const [contactAvailable, setContactAvailable] = useState(false);
  const [contactInput, setContactInput] = useState<ContactAppsInput>(() => contactAppsToInput({}));
  const [contactNotice, setContactNotice] = useState<string | null>(null);
  const contactInputRef = useRef(contactInput);
  const savedContactRef = useRef<ContactApps>({});
  // 保存串行执行:连续失焦时后一次等前一次写完,始终写最新输入
  const contactChainRef = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => {
    contactInputRef.current = contactInput;
  }, [contactInput]);

  useEffect(() => {
    if (!actingId) return;
    let cancelled = false;
    loadContactApps(actingId).then(({ available, apps }) => {
      if (cancelled) return;
      savedContactRef.current = apps;
      setContactAvailable(available);
      setContactInput(contactAppsToInput(apps));
      setContactNotice(null);
    });
    return () => {
      cancelled = true;
    };
  }, [actingId]);

  function saveContact() {
    const target = actingId;
    if (!target) return;
    contactChainRef.current = contactChainRef.current.then(async () => {
      const { apps, errors } = normalizeContactApps(contactInputRef.current);
      // 有不合规的字段先不存(输入框下已提示),改好后再失焦时保存
      if (Object.keys(errors).length > 0 || sameContactApps(apps, savedContactRef.current)) return;
      setSaving(true);
      const result = await saveContactApps(target, apps);
      setSaving(false);
      if (result.status === "saved") {
        savedContactRef.current = apps;
        setContactNotice(null);
      } else if (result.status === "blocked") {
        savedContactRef.current = {};
        setContactInput(contactAppsToInput({}));
        setContactNotice(t("即时通讯联系方式未通过审核，已清除"));
      } else if (result.status === "rate_limited") {
        setContactNotice(t("操作过于频繁,请稍后再试"));
      } else if (result.status === "error") {
        setContactNotice(t("保存失败，请稍后重试"));
      }
    });
  }

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
        .update({ username: f.username, phone: f.phone, location: f.location, languages: f.languages })
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
          languages: (data.languages as string[] | null) || [],
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

  async function handleUseDefaultAvatar() {
    if (!user) return;
    setAvatarUploading(true);
    const url = defaultAvatarUrl(user);
    const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user);
    if (!error) setProfile((prev) => (prev ? { ...prev, avatar_url: url } : prev));
    setAvatarUploading(false);
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
                onClick={() => setAvatarViewOpen(true)}
                disabled={avatarUploading}
                aria-label={t("查看头像")}
              >
                <img src={avatarUrl(profile?.avatar_url, user)} alt="" className="h-full w-full object-cover" />
                <div className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity group-hover:opacity-100 group-active:opacity-100 ${avatarUploading ? "opacity-100" : "opacity-0"}`}>
                  {avatarUploading
                    ? <Loader2 className="h-5 w-5 animate-spin text-white" strokeWidth={1.5} />
                    : <Camera className="h-5 w-5 text-white" strokeWidth={1.5} />}
                </div>
              </button>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              <AvatarViewer
                src={avatarUrl(profile?.avatar_url, user)}
                alt={profile?.username || t("头像")}
                open={avatarViewOpen}
                onClose={() => setAvatarViewOpen(false)}
                onEdit={() => avatarInputRef.current?.click()}
                onUseDefault={!isDefaultAvatar(profile?.avatar_url) ? handleUseDefaultAvatar : undefined}
              />
              <button
                type="button"
                onClick={() => setAvatarViewOpen(true)}
                disabled={avatarUploading}
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

            {/* 沟通语言:买家按界面语言浏览时,会说该语言的卖家车源排在前面 */}
            <h2 className="mt-6 px-1 font-mono text-xs font-medium text-muted-foreground">{t("沟通语言")}</h2>
            <SettingsGroup className="mt-2">
              <div className="px-4 py-3">
                <LanguagePicker value={form.languages} onChange={(v) => update({ languages: v })} />
              </div>
            </SettingsGroup>
            <GroupFooter>{t("选择你能沟通的语言。买家用对应语言浏览时,你的车源会优先展示,并在车辆详情和主页标注。")}</GroupFooter>

            {/* 即时通讯:选填,只给已登录买家看;车辆详情按买家语言排按钮 */}
            {contactAvailable && (
              <>
                <h2 className="mt-6 px-1 font-mono text-xs font-medium text-muted-foreground">
                  {isActingAsClaimed && actingProfile?.username
                    ? t("{name} 的即时通讯联系方式", { name: actingProfile.username })
                    : t("即时通讯联系方式")}
                </h2>
                <ContactAppsEditor
                  variant="settings"
                  value={contactInput}
                  onChange={setContactInput}
                  onBlur={saveContact}
                />
                {contactNotice && (
                  <p className="mt-2 px-5 font-mono text-xs text-destructive">{contactNotice}</p>
                )}
                <GroupFooter>{t("选填。只展示给已登录的买家,车辆详情页会按买家的语言排列联系按钮。离开输入框时自动保存。")}</GroupFooter>
              </>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

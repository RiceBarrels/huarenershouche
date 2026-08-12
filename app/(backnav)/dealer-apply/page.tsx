"use client";

// 车行入驻(iOS 26 风格):大标题 + 权益白卡网格 + 分组卡
// 无边框表单(FieldRow),审核状态用白色大圆角卡展示。

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Clock,
  XCircle,
  Loader2,
  Send,
  LayoutGrid,
  MapPin,
  TrendingUp,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { geocodeAddress } from "@/lib/geocode";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { DesktopBack } from "@/components/desktop-back";
import { Button } from "@/components/ui/button";
import { SettingsGroup, GroupFooter, LargeTitle, FieldRow } from "@/components/ios-settings";
import type { DbDealerStore, DbProfile } from "@/lib/types";

const BENEFITS = [
  { icon: LayoutGrid, title: "批量发布", desc: "车行账号不限发布数量，车源统一管理" },
  { icon: BadgeCheck, title: "认证标识", desc: "车源卡片和主页展示认证车行标识，更受买家信任" },
  { icon: MapPin, title: "门店地图曝光", desc: "门店入驻地图，附近买家可直接找到你" },
  { icon: TrendingUp, title: "品牌主页", desc: "专属车行主页聚合全部在售车源和门店信息" },
];

interface ApplyForm {
  name: string;
  address: string;
  address2: string;
  city: string;
  state: string;
  zipcode: string;
  phone: string;
  wechat: string;
}

const EMPTY_FORM: ApplyForm = {
  name: "",
  address: "",
  address2: "",
  city: "",
  state: "",
  zipcode: "",
  phone: "",
  wechat: "",
};

export default function DealerApplyPage() {
  const [user, setUser] = useState<string | null | undefined>(undefined);
  const [profile, setProfile] = useState<DbProfile | null>(null);
  const [stores, setStores] = useState<DbDealerStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<ApplyForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      setUser(uid);
      if (!uid) {
        setLoading(false);
        return;
      }
      const [profileRes, storesRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).single(),
        supabase
          .from("dealer_stores")
          .select("*")
          .eq("owner_id", uid)
          .order("created_at", { ascending: false }),
      ]);
      setProfile((profileRes.data as DbProfile) || null);
      setStores((storesRes.data as DbDealerStore[]) || []);
      setLoading(false);
    }
    load();
  }, []);

  const verifiedStore = stores.find((s) => s.verification_status === "verified");
  const pendingStore = stores.find((s) => s.verification_status === "pending");
  const rejectedStore = stores.find((s) => s.verification_status === "rejected");

  function update(key: keyof ApplyForm, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const formValid =
    form.name.trim() && form.address.trim() && form.city.trim() && form.state.trim() && form.zipcode.trim();

  async function handleSubmit() {
    if (!user || !formValid || submitting) return;
    setSubmitting(true);
    setError("");
    const addrParts = [form.address.trim(), form.address2.trim()].filter(Boolean).join(", ");
    const fullAddress = `${addrParts}, ${form.city.trim()}, ${form.state.trim().toUpperCase()} ${form.zipcode.trim()}`;
    const geo = await geocodeAddress(fullAddress);
    const { data, error: err } = await supabase
      .from("dealer_stores")
      .insert({
        owner_id: user,
        name: form.name.trim(),
        address: fullAddress,
        zipcode: form.zipcode.trim() || null,
        phone: form.phone.trim() || null,
        wechat: form.wechat.trim() || null,
        lat: geo?.lat || null,
        lng: geo?.lng || null,
        verification_status: "pending",
        verification_submitted_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (err) {
      setError("提交失败，请稍后再试");
    } else if (data) {
      setStores((prev) => [data as DbDealerStore, ...prev]);
      setSubmitted(true);
    }
    setSubmitting(false);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      <main className="relative mx-auto w-full max-w-lg flex-1 px-4 py-4 pb-16">
        <DesktopBack />
        <LargeTitle title="车行入驻" subtitle="免费入驻，1-2 个工作日完成审核" />
        <p className="mt-3 px-1 font-mono text-xs leading-relaxed text-muted-foreground">
          华人车行免费入驻常來車網，提交门店资料后 1-2 个工作日完成审核，审核通过自动升级为认证车行账号。
        </p>

        {/* Benefits */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          {BENEFITS.map((b) => (
            <div key={b.title} className="rounded-[26px] bg-card p-4">
              <b.icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
              <p className="mt-2.5 font-mono text-sm font-semibold">{b.title}</p>
              <p className="mt-1 font-mono text-xs leading-relaxed text-muted-foreground">{b.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-6">
          {loading || user === undefined ? (
            <div className="flex items-center justify-center gap-2 rounded-[26px] bg-card py-10">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" strokeWidth={1.5} />
              <span className="font-mono text-xs text-muted-foreground">加载中...</span>
            </div>
          ) : !user ? (
            <Link
              href="/login"
              className="block rounded-[26px] bg-card px-4 py-10 text-center font-mono text-sm text-muted-foreground transition-colors active:bg-muted/60"
            >
              请先登录后再申请车行入驻 →
            </Link>
          ) : verifiedStore || profile?.account_type === "dealer" ? (
            <div className="rounded-[26px] bg-card p-5">
              <div className="flex items-center gap-2">
                <BadgeCheck className="h-5 w-5 text-brand" strokeWidth={1.5} />
                <p className="font-mono text-[15px] font-semibold">你已是认证车行</p>
              </div>
              <p className="mt-2 font-mono text-xs leading-relaxed text-muted-foreground">
                {verifiedStore ? `门店「${verifiedStore.name}」已通过认证。` : "账号已升级为车行。"}
                可在账号设置中管理门店信息、上传门店照片。
              </p>
              <Link href="/account/settings/stores">
                <Button variant="ghost" size="sm" className="mt-4 h-9 rounded-full bg-muted px-5 font-mono text-xs hover:bg-muted">
                  管理门店
                </Button>
              </Link>
            </div>
          ) : pendingStore && !submitted ? (
            <div className="rounded-[26px] bg-card p-5">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" strokeWidth={1.5} />
                <p className="font-mono text-[15px] font-semibold">审核中</p>
              </div>
              <p className="mt-2 font-mono text-xs leading-relaxed text-muted-foreground">
                门店「{pendingStore.name}」的入驻申请已提交
                {pendingStore.verification_submitted_at &&
                  `（${new Date(pendingStore.verification_submitted_at).toLocaleDateString("zh-CN")}）`}
                ，我们会在 1-2 个工作日内完成审核，结果会同步到你的账号。
              </p>
            </div>
          ) : submitted ? (
            <div className="rounded-[26px] bg-card p-5">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" strokeWidth={1.5} />
                <p className="font-mono text-[15px] font-semibold">申请已提交</p>
              </div>
              <p className="mt-2 font-mono text-xs leading-relaxed text-muted-foreground">
                我们会在 1-2 个工作日内完成审核，审核通过后账号自动升级为认证车行。
              </p>
            </div>
          ) : (
            <div>
              {rejectedStore && (
                <div className="mb-5 rounded-[26px] bg-card p-5">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-destructive" strokeWidth={1.5} />
                    <p className="font-mono text-[15px] font-semibold">上次申请未通过</p>
                  </div>
                  {rejectedStore.verification_note && (
                    <p className="mt-2 font-mono text-xs leading-relaxed text-muted-foreground">
                      原因：{rejectedStore.verification_note}
                    </p>
                  )}
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    请根据原因修改资料后重新提交。
                  </p>
                </div>
              )}

              <h2 className="px-1 font-mono text-xs font-medium text-muted-foreground">门店资料</h2>
              <SettingsGroup className="mt-2">
                <FieldRow label="车行名称" placeholder="如：金城车行 Golden City Auto" value={form.name} onChange={(v) => update("name", v)} required />
                <FieldRow label="街道地址" placeholder="123 Main St" value={form.address} onChange={(v) => update("address", v)} required />
                <FieldRow label="楼层单元" placeholder="Suite / Unit（可选）" value={form.address2} onChange={(v) => update("address2", v)} />
                <FieldRow label="城市" placeholder="City" value={form.city} onChange={(v) => update("city", v)} required />
                <FieldRow label="州" placeholder="CA" maxLength={2} inputClassName="uppercase" value={form.state} onChange={(v) => update("state", v.replace(/[^a-zA-Z]/g, ""))} required />
                <FieldRow label="邮编" placeholder="90000" maxLength={5} inputMode="numeric" value={form.zipcode} onChange={(v) => update("zipcode", v.replace(/\D/g, ""))} required />
                <FieldRow label="联系电话" placeholder="(xxx) xxx-xxxx" value={form.phone} onChange={(v) => update("phone", v)} />
                <FieldRow label="微信号" placeholder="WeChat ID" value={form.wechat} onChange={(v) => update("wechat", v)} />
              </SettingsGroup>
              <GroupFooter>车行名称、街道地址、城市、州与邮编为必填。</GroupFooter>

              {error && (
                <div className="mt-3 rounded-xl bg-destructive/10 px-3 py-2.5">
                  <p className="font-mono text-xs text-destructive">{error}</p>
                </div>
              )}

              <Button
                className="mt-6 h-12 w-full gap-1.5 rounded-full font-mono text-[15px] font-semibold transition-transform active:scale-[0.98]"
                disabled={!formValid || submitting}
                onClick={handleSubmit}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                ) : (
                  <Send className="h-4 w-4" strokeWidth={1.5} />
                )}
                提交入驻申请
              </Button>
              <p className="mt-3 px-1 font-mono text-[11px] leading-relaxed text-muted-foreground">
                提交即表示同意平台对门店信息进行审核。审核通过后账号自动升级为认证车行，可在账号设置中补充门店照片。
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

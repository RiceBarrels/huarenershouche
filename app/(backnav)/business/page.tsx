"use client";

// 商业合作(iOS 26 风格):大标题 + 服务分组卡 + 分组卡表单
// (无边框 FieldRow,自定义胶囊类型选择),提交后白卡成功态。

import { useState } from "react";
import { Building2, BadgeDollarSign, Megaphone, Send, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { Header } from "@/components/header";
import { DesktopBack } from "@/components/desktop-back";
import { SettingsGroup, GroupFooter, LargeTitle, FieldRow } from "@/components/ios-settings";

const SERVICES = [
  {
    icon: <Megaphone className="h-5 w-5" strokeWidth={1.5} />,
    title: "广告投放",
    desc: "首页横幅、搜索推荐、品牌专区等多种广告位",
  },
  {
    icon: <Building2 className="h-5 w-5" strokeWidth={1.5} />,
    title: "车行入驻",
    desc: "批量发布、品牌展示、优先排序等车行专属服务",
  },
  {
    icon: <BadgeDollarSign className="h-5 w-5" strokeWidth={1.5} />,
    title: "定制合作",
    desc: "汽车金融、保险、检测等第三方服务合作",
  },
];

const COOP_TYPES = ["广告投放", "车行入驻", "金融合作", "保险合作", "检测服务", "其他"];

export default function BusinessPage() {
  const [form, setForm] = useState({
    company: "",
    contact: "",
    email: "",
    phone: "",
    type: "",
    message: "",
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.company.trim() || !form.email.trim() || !form.message.trim()) return;
    setSending(true);

    const { data: { user } } = await supabase.auth.getUser();

    // Save ticket
    await supabase.from("support_tickets").insert({
      user_id: user?.id || null,
      type: "business",
      name: form.contact,
      email: form.email,
      phone: form.phone || null,
      company: form.company,
      cooperation_type: form.type || null,
      message: form.message,
    });

    // Send in-app message to all admins
    if (user) {
      const { data: admins } = await supabase.from("profiles").select("id").eq("role", "admin");
      for (const admin of admins || []) {
        let convId: string | null = null;
        const { data: existing } = await supabase
          .from("conversations")
          .select("id")
          .eq("buyer_id", user.id)
          .eq("seller_id", admin.id)
          .limit(1)
          .maybeSingle();
        if (existing) {
          convId = existing.id;
        } else {
          const { data: newConv } = await supabase
            .from("conversations")
            .insert({ buyer_id: user.id, seller_id: admin.id, car_id: null })
            .select("id")
            .single();
          convId = newConv?.id || null;
        }
        if (convId) {
          await supabase.from("messages").insert({
            conversation_id: convId,
            sender_id: user.id,
            content: `[商业合作] ${form.company}${form.type ? ` · ${form.type}` : ""}\n${form.message}`,
          });
          await supabase
            .from("conversations")
            .update({ last_message_at: new Date().toISOString() })
            .eq("id", convId);
        }
      }
    }

    setSending(false);
    setSent(true);
    setForm({ company: "", contact: "", email: "", phone: "", type: "", message: "" });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      <main className="relative mx-auto w-full max-w-lg flex-1 px-4 py-4">
        <DesktopBack />
        <LargeTitle title="商业合作" subtitle="面向车行、金融、保险等行业伙伴" />

        {/* Services */}
        <SettingsGroup className="mt-5">
          {SERVICES.map((s, i) => (
            <div key={i} className="group/row flex items-center gap-3 pl-4">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center">{s.icon}</span>
              <span className="flex min-h-[56px] min-w-0 flex-1 flex-col justify-center border-b border-border/50 py-2.5 pr-4 group-last/row:border-0">
                <span className="font-mono text-[15px]">{s.title}</span>
                <span className="mt-0.5 font-mono text-xs text-muted-foreground">{s.desc}</span>
              </span>
            </div>
          ))}
        </SettingsGroup>
        <GroupFooter>
          车行入驻请前往{" "}
          <Link href="/dealer-apply" className="text-brand-ink underline underline-offset-2 active:opacity-60">
            车行入驻申请
          </Link>
          。
        </GroupFooter>

        {sent ? (
          <div className="mt-6 flex flex-col items-center rounded-[26px] bg-card py-10">
            <CheckCircle className="h-8 w-8 text-brand-ink" strokeWidth={1.5} />
            <p className="mt-3 font-mono text-sm font-semibold">申请已提交</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">我们会在 1-3 个工作日内联系您</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-5 h-9 rounded-full bg-muted px-5 font-mono text-xs hover:bg-muted"
              onClick={() => setSent(false)}
            >
              再次提交
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2 className="mt-6 px-1 font-mono text-xs font-medium text-muted-foreground">合作咨询</h2>
            <SettingsGroup className="mt-2">
              <FieldRow id="company" label="公司名称" placeholder="公司/品牌名" value={form.company} onChange={(v) => setForm((f) => ({ ...f, company: v }))} required />
              <FieldRow id="contact" label="联系人" placeholder="您的姓名" value={form.contact} onChange={(v) => setForm((f) => ({ ...f, contact: v }))} />
              <FieldRow id="email" label="邮箱" type="email" placeholder="your@company.com" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} required />
              <FieldRow id="phone" label="电话" placeholder="(xxx) xxx-xxxx" value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} />
            </SettingsGroup>
            <GroupFooter>公司名称与邮箱为必填。</GroupFooter>

            <h2 className="mt-5 px-1 font-mono text-xs font-medium text-muted-foreground">合作类型</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {COOP_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, type: t }))}
                  className={`rounded-full px-3.5 py-2 font-mono text-xs transition-colors ${
                    form.type === t ? "bg-primary/30 font-medium text-brand-ink" : "bg-card active:bg-muted/60"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <h2 className="mt-5 px-1 font-mono text-xs font-medium text-muted-foreground">合作详情</h2>
            <SettingsGroup className="mt-2">
              <textarea
                className="block w-full resize-none bg-transparent px-5 py-4 font-mono text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground/50"
                rows={4}
                placeholder="请描述您的合作需求..."
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                required
              />
            </SettingsGroup>

            <Button
              type="submit"
              className="mt-6 h-12 w-full gap-1.5 rounded-full font-mono text-[15px] font-semibold transition-transform active:scale-[0.98]"
              disabled={sending || !form.company.trim() || !form.email.trim() || !form.message.trim()}
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> : <Send className="h-4 w-4" strokeWidth={1.5} />}
              提交申请
            </Button>
          </form>
        )}
      </main>
    </div>
  );
}

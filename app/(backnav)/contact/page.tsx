"use client";

// 联系客服(iOS 26 风格):大标题 + 联系方式分组卡 + FAQ 折叠
// 分组卡 + 分组卡留言表单,提交后白卡成功态。

import { useState } from "react";
import { Mail, MessageCircle, Clock, Send, Loader2, CheckCircle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/header";
import { DesktopBack } from "@/components/desktop-back";
import { SettingsGroup, GroupFooter, LargeTitle, FieldRow } from "@/components/ios-settings";

const FAQ = [
  { q: "如何发布车辆？", a: "登录后点击底部「发布」按钮，填写车辆信息即可免费发布。支持 VIN 自动识别车辆信息。" },
  { q: "如何成为认证车行？", a: "在「设置」中将账号类型切换为「车行」，添加门店地址并上传门店照片，提交认证申请后等待人工审核。" },
  { q: "如何联系卖家？", a: "在车辆详情页点击「发消息」按钮，即可与卖家实时沟通。" },
  { q: "发布的车辆多久会显示？", a: "车辆发布后立即显示在平台上，无需审核等待。" },
  { q: "如何举报不良信息？", a: "在车辆详情页点击右上角菜单中的「举报」，选择原因后提交，我们会尽快处理。" },
];

const CONTACT_INFO = [
  { icon: <MessageCircle className="h-5 w-5" strokeWidth={1.5} />, label: "微信客服", value: "clcauto_support" },
  { icon: <Clock className="h-5 w-5" strokeWidth={1.5} />, label: "工作时间", value: "周一至周五 9:00 - 18:00 (EST)" },
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) return;
    setSending(true);

    const { data: { user } } = await supabase.auth.getUser();

    // Save ticket
    await supabase.from("support_tickets").insert({
      user_id: user?.id || null,
      type: "contact",
      name: form.name,
      email: form.email,
      message: form.message,
    });

    // Send in-app message to all admins
    if (user) {
      const { data: admins } = await supabase.from("profiles").select("id").eq("role", "admin");
      for (const admin of admins || []) {
        // Find or create conversation with a dummy system car reference
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
            content: `[客服咨询] ${form.name}\n${form.message}`,
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
    setForm({ name: "", email: "", message: "" });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      <main className="relative mx-auto w-full max-w-lg flex-1 px-4 py-4">
        <DesktopBack />
        <LargeTitle title="联系客服" subtitle="有任何问题或建议，欢迎联系我们" />

        {/* Contact info */}
        <SettingsGroup className="mt-5">
          <a href="mailto:contact@clcauto.com" className="group/row flex items-center gap-3 pl-4 transition-colors active:bg-muted/60">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center">
              <Mail className="h-5 w-5" strokeWidth={1.5} />
            </span>
            <span className="flex min-h-[56px] min-w-0 flex-1 items-center gap-2 border-b border-border/50 py-2 pr-4 group-last/row:border-0">
              <span className="min-w-0 flex-1 font-mono text-[15px]">邮件联系</span>
              <span className="shrink-0 font-mono text-[13px] text-muted-foreground">contact@clcauto.com</span>
            </span>
          </a>
          {CONTACT_INFO.map((c) => (
            <div key={c.label} className="group/row flex items-center gap-3 pl-4">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center">{c.icon}</span>
              <span className="flex min-h-[56px] min-w-0 flex-1 items-center gap-2 border-b border-border/50 py-2 pr-4 group-last/row:border-0">
                <span className="min-w-0 flex-1 font-mono text-[15px]">{c.label}</span>
                <span className="shrink-0 font-mono text-[13px] text-muted-foreground">{c.value}</span>
              </span>
            </div>
          ))}
        </SettingsGroup>

        {/* FAQ */}
        <h2 className="mt-6 px-1 font-mono text-xs font-medium text-muted-foreground">常见问题</h2>
        <SettingsGroup className="mt-2">
          {FAQ.map((item, i) => (
            <details key={i} className="group ml-4 border-b border-border/50 last:border-0">
              <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-3 py-2 pr-4 font-mono text-[15px] transition-opacity active:opacity-60 [&::-webkit-details-marker]:hidden">
                {item.q}
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform group-open:rotate-90" strokeWidth={2} />
              </summary>
              <p className="pb-3.5 pr-4 font-mono text-[13px] leading-relaxed text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </SettingsGroup>

        {/* Contact form */}
        {sent ? (
          <div className="mt-6 flex flex-col items-center rounded-[26px] bg-card py-10">
            <CheckCircle className="h-8 w-8 text-brand-ink" strokeWidth={1.5} />
            <p className="mt-3 font-mono text-sm font-semibold">消息已发送</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">我们会尽快回复您</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-5 h-9 rounded-full bg-muted px-5 font-mono text-xs hover:bg-muted"
              onClick={() => setSent(false)}
            >
              再次留言
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2 className="mt-6 px-1 font-mono text-xs font-medium text-muted-foreground">在线留言</h2>
            <SettingsGroup className="mt-2">
              <FieldRow id="name" label="姓名" placeholder="您的称呼" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} required />
              <FieldRow id="email" label="邮箱" type="email" placeholder="your@email.com" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} required />
            </SettingsGroup>

            <SettingsGroup className="mt-3">
              <textarea
                className="block w-full resize-none bg-transparent px-5 py-4 font-mono text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground/50"
                rows={4}
                placeholder="请描述您的问题或建议..."
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                required
              />
            </SettingsGroup>
            <GroupFooter>我们通常会在 1 个工作日内通过邮件回复。</GroupFooter>

            <Button
              type="submit"
              className="mt-6 h-12 w-full gap-1.5 rounded-full font-mono text-[15px] font-semibold transition-transform active:scale-[0.98]"
              disabled={sending || !form.name.trim() || !form.email.trim() || !form.message.trim()}
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> : <Send className="h-4 w-4" strokeWidth={1.5} />}
              发送留言
            </Button>
          </form>
        )}
      </main>
    </div>
  );
}

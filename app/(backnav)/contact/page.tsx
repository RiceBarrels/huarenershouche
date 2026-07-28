"use client";

import { useState } from "react";
import { Mail, MessageCircle, Clock, Send, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/header";
import { DesktopBack } from "@/components/desktop-back";

const FAQ = [
  { q: "如何发布车辆？", a: "登录后点击底部「发布」按钮，填写车辆信息即可免费发布。支持 VIN 自动识别车辆信息。" },
  { q: "如何成为认证车行？", a: "在「设置」中将账号类型切换为「车行」，添加门店地址并上传门店照片，提交认证申请后等待人工审核。" },
  { q: "如何联系卖家？", a: "在车辆详情页点击「发消息」按钮，即可与卖家实时沟通。" },
  { q: "发布的车辆多久会显示？", a: "车辆发布后立即显示在平台上，无需审核等待。" },
  { q: "如何举报不良信息？", a: "在车辆详情页点击右上角菜单中的「举报」，选择原因后提交，我们会尽快处理。" },
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
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-4 md:py-8">
        <DesktopBack />
        <h1 className="text-lg font-semibold">联系客服</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          有任何问题或建议，欢迎联系我们
        </p>

        {/* Contact info */}
        <div className="mt-6 space-y-3">
          <a
            href="mailto:contact@clcauto.com"
            className="flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:border-foreground/30"
          >
            <Mail className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
            <div>
              <p className="text-xs font-medium">邮件联系</p>
              <p className="text-[11px] text-muted-foreground">contact@clcauto.com</p>
            </div>
          </a>
          <div className="flex items-center gap-3 rounded-xl border border-border p-3">
            <MessageCircle className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
            <div>
              <p className="text-xs font-medium">微信客服</p>
              <p className="text-[11px] text-muted-foreground">clcauto_support</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border p-3">
            <Clock className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
            <div>
              <p className="text-xs font-medium">工作时间</p>
              <p className="text-[11px] text-muted-foreground">周一至周五 9:00 - 18:00 (EST)</p>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-8">
          <h2 className="text-sm font-semibold">常见问题</h2>
          <div className="mt-3 space-y-2">
            {FAQ.map((item, i) => (
              <details key={i} className="group overflow-hidden rounded-lg border border-border">
                <summary className="flex cursor-pointer items-center justify-between px-3 py-2.5 text-xs font-medium transition-colors hover:bg-muted/50">
                  {item.q}
                  <span className="text-muted-foreground transition-transform group-open:rotate-90">›</span>
                </summary>
                <p className="border-t border-border px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>

        {/* Contact form */}
        <div className="mt-8">
          <h2 className="text-sm font-semibold">在线留言</h2>
          {sent ? (
            <div className="mt-4 flex flex-col items-center rounded-xl border border-border py-8">
              <CheckCircle className="h-8 w-8 text-emerald-500" strokeWidth={1.5} />
              <p className="mt-3 text-xs font-medium">消息已发送</p>
              <p className="mt-1 text-[11px] text-muted-foreground">我们会尽快回复您</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 text-xs"
                onClick={() => setSent(false)}
              >
                再次留言
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-3 space-y-3">
              <div>
                <Label className="text-[11px]">姓名</Label>
                <Input
                  className="mt-1 h-9 text-xs"
                  placeholder="您的称呼"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label className="text-[11px]">邮箱</Label>
                <Input
                  className="mt-1 h-9 text-xs"
                  type="email"
                  placeholder="your@email.com"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label className="text-[11px]">留言内容</Label>
                <textarea
                  className="mt-1 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs outline-none focus:border-foreground"
                  rows={4}
                  placeholder="请描述您的问题或建议..."
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  required
                />
              </div>
              <Button
                type="submit"
                size="sm"
                className="w-full gap-1.5 text-xs"
                disabled={sending || !form.name.trim() || !form.email.trim() || !form.message.trim()}
              >
                {sending ? <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} /> : <Send className="h-3 w-3" strokeWidth={1.5} />}
                发送留言
              </Button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Building2, BadgeDollarSign, Megaphone, Send, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

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
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-4">
        <h1 className="text-lg font-semibold">商业合作</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          常来车网面向车行、金融、保险等行业伙伴开放合作
        </p>

        {/* Services */}
        <div className="mt-6 space-y-3">
          {SERVICES.map((s, i) => (
            <div key={i} className="flex items-start gap-3 border border-border p-3">
              <div className="shrink-0 text-muted-foreground">{s.icon}</div>
              <div>
                <p className="text-xs font-medium">{s.title}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Form */}
        <div className="mt-8">
          <h2 className="text-sm font-semibold">合作咨询</h2>
          {sent ? (
            <div className="mt-4 flex flex-col items-center border border-border py-8">
              <CheckCircle className="h-8 w-8 text-emerald-500" strokeWidth={1.5} />
              <p className="mt-3 text-xs font-medium">申请已提交</p>
              <p className="mt-1 text-[11px] text-muted-foreground">我们会在 1-3 个工作日内联系您</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 text-xs"
                onClick={() => setSent(false)}
              >
                再次提交
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px]">公司名称 *</Label>
                  <Input
                    className="mt-1 h-9 text-xs"
                    placeholder="公司/品牌名"
                    value={form.company}
                    onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label className="text-[11px]">联系人</Label>
                  <Input
                    className="mt-1 h-9 text-xs"
                    placeholder="您的姓名"
                    value={form.contact}
                    onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px]">邮箱 *</Label>
                  <Input
                    className="mt-1 h-9 text-xs"
                    type="email"
                    placeholder="your@company.com"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label className="text-[11px]">电话</Label>
                  <Input
                    className="mt-1 h-9 text-xs"
                    placeholder="(xxx) xxx-xxxx"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label className="text-[11px]">合作类型</Label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {["广告投放", "车行入驻", "金融合作", "保险合作", "检测服务", "其他"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={`border px-2.5 py-1 text-[11px] transition-colors ${
                        form.type === t ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground/30"
                      }`}
                      onClick={() => setForm((f) => ({ ...f, type: t }))}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-[11px]">合作详情 *</Label>
                <textarea
                  className="mt-1 w-full resize-none border border-border bg-background px-3 py-2 font-mono text-xs outline-none focus:border-foreground"
                  rows={4}
                  placeholder="请描述您的合作需求..."
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  required
                />
              </div>
              <Button
                type="submit"
                size="sm"
                className="w-full gap-1.5 text-xs"
                disabled={sending || !form.company.trim() || !form.email.trim() || !form.message.trim()}
              >
                {sending ? <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} /> : <Send className="h-3 w-3" strokeWidth={1.5} />}
                提交申请
              </Button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

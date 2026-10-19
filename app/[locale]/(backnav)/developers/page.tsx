"use client";

import { useState } from "react";

// 开发者文档页:概览 / 鉴权 / 配额 / 端点一览 / 写入字段 / 枚举 / 示例 / 错误格式。
// 端点表用本地常量,不引 buildOpenApi 以免文档对象进客户端包;
// 枚举表走 enumCatalog(locale),与后端一个来源。

import { KeyRound, BarChart3, FileJson, ArrowRight, Sparkles } from "lucide-react";
import Link from "@/components/localized-navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SettingsGroup, SettingsRow, LargeTitle, GroupFooter } from "@/components/ios-settings";
import { useI18n } from "@/components/i18n-provider";
import { enumCatalog } from "@/lib/api/enums";
import { dbLocale } from "@/lib/i18n";
import {
  ANON_RATE_LIMIT_PER_MIN,
  DEFAULT_KEY_RATE_LIMIT_PER_MIN,
  MAX_KEYS_PER_OWNER,
  QUOTA_LIMITS,
  LISTING_MAX_IMAGES,
  BATCH_MAX_ITEMS,
} from "@/lib/api/types";
import { CodeBlock, CopyButton } from "./code-block";
import { buildAiPrompt } from "@/lib/api/ai-prompt";

const AI_PROMPT = buildAiPrompt();

const BASE_URL = "https://www.clcauto.com/api/v1";

type Method = "GET" | "POST" | "PUT" | "DELETE";

const ENDPOINTS: { method: Method; path: string; scope: string; desc: string }[] = [
  { method: "GET", path: "/cars", scope: "—", desc: "车源列表(游标分页,支持筛选)" },
  { method: "GET", path: "/cars/{id}", scope: "—", desc: "车源详情" },
  { method: "GET", path: "/dealers", scope: "—", desc: "已认证车行门店列表" },
  { method: "GET", path: "/dealers/{id}", scope: "—", desc: "门店详情与在售车" },
  { method: "GET", path: "/meta/makes", scope: "—", desc: "品牌 / 车型 / 数量聚合" },
  { method: "GET", path: "/me", scope: "any", desc: "当前 key、账号、门店与配额" },
  { method: "GET", path: "/inventory", scope: "write:inventory", desc: "我名下通过 API 管理的车" },
  { method: "GET", path: "/inventory/{external_id}", scope: "write:inventory", desc: "按库存编号查一条" },
  { method: "PUT", path: "/inventory/{external_id}", scope: "write:inventory", desc: "幂等 upsert(核心端点)" },
  { method: "DELETE", path: "/inventory/{external_id}", scope: "write:inventory", desc: "标记已售(默认)或下架" },
  { method: "POST", path: "/inventory/{external_id}/images", scope: "write:images", desc: "替换图片列表" },
  { method: "POST", path: "/inventory/batch", scope: "write:inventory", desc: "批量 upsert" },
  { method: "POST", path: "/inventory/reconcile", scope: "write:inventory", desc: "全量对账,不在列表里的自动下架" },
  { method: "GET", path: "/openapi.json", scope: "—", desc: "OpenAPI 3.1 规范" },
];

const METHOD_CLS: Record<Method, string> = {
  GET: "text-emerald-600 dark:text-emerald-400",
  POST: "text-sky-600 dark:text-sky-400",
  PUT: "text-amber-600 dark:text-amber-400",
  DELETE: "text-red-600 dark:text-red-400",
};

// required: "必填" | "可选" | "个人必填"
const FIELDS: { name: string; type: string; required: string; desc: string }[] = [
  { name: "external_id", type: "string", required: "必填", desc: "库存编号,放在路径里;同一账号内唯一" },
  { name: "vin", type: "string(17)", required: "必填", desc: "同账号 VIN 重复返回 409" },
  { name: "year", type: "integer", required: "必填", desc: "" },
  { name: "make / model", type: "string", required: "必填", desc: "英文品牌 / 车型" },
  { name: "trim", type: "string", required: "可选", desc: "" },
  { name: "price", type: "integer", required: "必填", desc: "整数,币种见 currency;0 = 电议" },
  { name: "original_price", type: "integer", required: "可选", desc: "" },
  { name: "currency", type: "enum", required: "可选", desc: "USD(默认)、CAD、AUD 或 NZD;省略则保留原值,null 恢复 USD" },
  { name: "mileage", type: "integer", required: "必填", desc: "整数,单位见 mileage_unit" },
  { name: "mileage_unit", type: "enum", required: "可选", desc: "mi(默认)或 km;省略则保留原值,null 恢复 mi" },
  { name: "fuel_type / transmission", type: "enum", required: "必填", desc: "见下方枚举表" },
  { name: "drivetrain", type: "enum", required: "可选", desc: "见下方枚举表" },
  { name: "title_status", type: "enum", required: "可选", desc: "产权状态,见下方枚举表;省略则保留原值,null 清空" },
  { name: "condition", type: "object", required: "可选", desc: "车况清单:service_records / one_owner / smoker(布尔)、keys_count(0–5)、tires_condition、known_issues(见下方枚举表);不收自由文本,省略则保留原值,null 清空" },
  { name: "exterior_color / interior_color", type: "string", required: "可选", desc: "英文" },
  { name: "description", type: "string", required: "可选", desc: "任一语言,其他语言自动翻译" },
  { name: "description_lang", type: "string", required: "可选", desc: "已弃用:可传但会被忽略(语言自动检测)" },
  { name: "features", type: "string[]", required: "可选", desc: "" },
  { name: "images", type: "string[]", required: "可选", desc: "https 链接,最多 30 张,单张 ≤ 10MB" },
  { name: "carfax_url", type: "string", required: "可选", desc: "" },
  { name: "store_id", type: "uuid", required: "可选", desc: "多门店时指定,省略用第一家已认证门店" },
  { name: "location", type: "string", required: "个人必填", desc: "城市或 zip;车行省略则跟随门店地址" },
];

const CURL_PUT = `curl -X PUT ${BASE_URL}/inventory/STK12345 \\
  -H "Authorization: Bearer clc_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "vin": "1HGCV1F3XLA012345",
    "year": 2020, "make": "Honda", "model": "Accord", "trim": "Sport",
    "price": 18900, "mileage": 41200,
    "fuel_type": "gasoline", "transmission": "cvt", "drivetrain": "fwd",
    "exterior_color": "white", "interior_color": "black",
    "description": "One owner, clean title.",
    "features": ["Apple CarPlay", "Sunroof"],
    "images": ["https://cdn.example.com/stk12345/1.jpg"]
  }'`;

const CURL_GET = `curl "${BASE_URL}/cars?make=Toyota&price_max=20000&sort=newest&limit=20&lang=en" \\
  -H "Authorization: Bearer clc_live_..."`;

const NODE_RECONCILE = `const BASE = "${BASE_URL}";
const headers = {
  Authorization: \`Bearer \${process.env.CLC_API_KEY}\`,
  "Content-Type": "application/json",
};

// 1. Current stock exported from your DMS
//    [{ external_id, vin, year, make, model, price, mileage, images, ... }]
const stock = await loadStockFromDms();

// 2. Upsert in batches of ${BATCH_MAX_ITEMS}
for (let i = 0; i < stock.length; i += ${BATCH_MAX_ITEMS}) {
  const res = await fetch(\`\${BASE}/inventory/batch\`, {
    method: "POST",
    headers,
    body: JSON.stringify({ items: stock.slice(i, i + ${BATCH_MAX_ITEMS}) }),
  });
  const { results } = await res.json();
  for (const r of results) if (!r.ok) console.warn(r.external_id, r.error);
}

// 3. Reconcile: anything not in the list is marked removed
const rec = await fetch(\`\${BASE}/inventory/reconcile\`, {
  method: "POST",
  headers,
  body: JSON.stringify({ active_external_ids: stock.map((s) => s.external_id) }),
});
console.log(await rec.json()); // { dry_run: false, removed: [{ id, external_id }], failed: [], quota }`;

const ERROR_EXAMPLE = `{
  "error": {
    "code": "validation_failed",
    "message": "price is required",
    "details": [{ "field": "price", "issue": "required" }]
  }
}`;

const QUOTA_EXAMPLE = `HTTP/1.1 429 Too Many Requests
X-Quota-Tier: personal
X-Quota-Inserts-Remaining: 0
X-Quota-Updates-Remaining: 12

{
  "error": {
    "code": "quota_exceeded",
    "message": "Daily insert quota reached",
    "quota": { "tier": "personal", "inserts_used": 10, "inserts_limit": 10,
               "updates_used": 18, "updates_limit": 30, "resets_at": "2026-09-03T00:00:00.000Z" }
  }
}`;

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-6 scroll-mt-20">
      <h2 className="px-1 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{title}</h2>
      <SettingsGroup className="mt-2 p-4 md:p-5">{children}</SettingsGroup>
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-[13px] leading-relaxed text-foreground/90">{children}</p>;
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[12px]">{children}</code>;
}

function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 md:-mx-5 md:px-5">
      <table className="w-full min-w-[520px] border-collapse font-mono text-xs">
        <thead>
          <tr className="border-b border-border/60 text-left text-[11px] text-muted-foreground">
            {head.map((h) => (
              <th key={h} className="py-2 pr-3 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, i) => (
            <tr key={i} className="border-b border-border/40 last:border-0 align-top">
              {cells.map((c, j) => (
                <td key={j} className="py-2 pr-3">{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DevelopersPage() {
  const { t, locale } = useI18n();
  const enums = enumCatalog(dbLocale(locale));
  const personal = QUOTA_LIMITS.personal;
  const dealer = QUOTA_LIMITS.dealer;

  const ENUM_KINDS: { kind: keyof typeof enums; label: string }[] = [
    { kind: "fuel_type", label: "燃料" },
    { kind: "transmission", label: "变速箱" },
    { kind: "drivetrain", label: "驱动" },
    { kind: "title_status", label: "产权状态" },
    { kind: "tires_condition", label: "轮胎状况" },
    { kind: "known_issue", label: "已知问题" },
    { kind: "status", label: "状态" },
  ];

  const NAV = [
    { id: "overview", label: "概览" },
    { id: "ai", label: "AI 格式" },
    { id: "auth", label: "鉴权" },
    { id: "quota", label: "配额档位" },
    { id: "endpoints", label: "端点一览" },
    { id: "fields", label: "车辆写入字段" },
    { id: "enums", label: "枚举值" },
    { id: "examples", label: "示例" },
    { id: "errors", label: "错误格式" },
  ];

  const [aiExpanded, setAiExpanded] = useState(false);
  const [aiCopied, setAiCopied] = useState(false);
  async function copyAiPrompt() {
    try {
      await navigator.clipboard.writeText(AI_PROMPT);
      setAiCopied(true);
      setTimeout(() => setAiCopied(false), 1500);
    } catch {}
  }

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono">
      <Header />
      <main className="relative mx-auto w-full max-w-4xl flex-1 px-4 py-4 md:px-6 md:py-8">
        <LargeTitle
          title={t("开发者 / API")}
          subtitle={t("Public API v0 · 只读车源与库存自动上传")}
          trailing={
            <Link href="/developers/keys">
              <Button size="sm" className="h-9 gap-1.5 px-4 font-mono text-xs font-medium">
                <KeyRound className="h-4 w-4" strokeWidth={1.5} />
                {t("管理 Key")}
              </Button>
            </Link>
          }
        />

        {/* 章节锚点 */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {NAV.map((n) => (
            <a key={n.id} href={`#${n.id}`} className="rounded-full bg-card px-3 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground">
              {t(n.label)}
            </a>
          ))}
        </div>

        <Section id="overview" title={t("概览")}>
          <div className="space-y-3">
            <P>{t("常來車網 Public API 提供只读的车源与车行数据接口,以及车行库存的自动上传接口。个人用户和车行使用同一套端点,只是写入配额不同。")}</P>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] text-muted-foreground">Base URL</span>
              <Code>{BASE_URL}</Code>
            </div>
            <ul className="list-disc space-y-1 pl-5 font-mono text-[13px] leading-relaxed text-foreground/90">
              <li>{t("请求与响应均为 JSON;字段名英文,枚举字段返回 { value: 英文 slug, label: 按 lang 翻译的文案 }。")}</li>
              <li>{t("跨域开放(CORS *),可直接在浏览器或小程序里调用只读端点。")}</li>
              <li>{t("列表端点用游标分页:带上返回的 next_cursor 取下一页,limit 最大 {n}。", { n: 100 })}</li>
            </ul>
          </div>
        </Section>

        <Section id="ai" title={t("AI 格式")}>
          <div className="space-y-3">
            <P>{t("把下面这段说明整段复制,粘贴给 ChatGPT / Claude 等 AI 助手,再用一句话告诉它你要做什么(例如「把这个 CSV 里的车上传到我的账号」)。AI 就知道怎么调接口、单位怎么换算、什么时候必须先 dry run。")}</P>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" size="sm" onClick={copyAiPrompt} className="gap-1.5 font-mono">
                <Sparkles className="h-4 w-4" strokeWidth={1.5} />
                {aiCopied ? t("已复制") : t("复制 AI 说明")}
              </Button>
              <span className="font-mono text-[11px] text-muted-foreground">
                {t("约 {n} 字", { n: AI_PROMPT.length })}
              </span>
            </div>
            <p className="font-mono text-[12px] leading-relaxed text-muted-foreground">
              {t("说明里的 <API_KEY> 是占位符:把你在「管理 API Key」创建的 key 单独告诉 AI,不要贴到公开场合。")}
            </p>
            <div className="overflow-hidden rounded-xl bg-muted/50">
              <div className="flex items-center justify-between gap-2 border-b border-border/50 px-3 py-1.5">
                <span className="truncate font-mono text-[11px] text-muted-foreground">llms.txt</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAiExpanded((v) => !v)}
                    className="inline-flex h-7 items-center rounded-full bg-muted px-2.5 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {aiExpanded ? t("收起") : t("展开全文")}
                  </button>
                  <CopyButton text={AI_PROMPT} />
                </div>
              </div>
              <pre className={`overflow-x-auto p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap ${aiExpanded ? "" : "max-h-56 overflow-y-hidden"}`}>
                <code>{AI_PROMPT}</code>
              </pre>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] text-muted-foreground">{t("纯文本地址(AI 也可直接抓取):")}</span>
              <a href="/api/v1/llms.txt" target="_blank" rel="noopener" className="font-mono text-[12px] underline underline-offset-4">
                {BASE_URL}/llms.txt
              </a>
            </div>
          </div>
        </Section>

        <Section id="auth" title={t("鉴权")}>
          <div className="space-y-3">
            <P>{t("在门户创建 API key,以 Bearer token 形式放在 Authorization 头:")}</P>
            <CodeBlock code={`Authorization: Bearer clc_live_...`} title="HTTP header" />
            <ul className="list-disc space-y-1 pl-5 font-mono text-[13px] leading-relaxed text-foreground/90">
              <li>{t("只读端点不带 key 也能访问,但按 IP 限流(每分钟 {n} 次)且联系方式脱敏。", { n: ANON_RATE_LIMIT_PER_MIN })}</li>
              <li>{t("带 key 的请求按 key 自己的限速(默认每分钟 {n} 次);写入端点必须带有对应 scope 的 key。", { n: DEFAULT_KEY_RATE_LIMIT_PER_MIN })}</li>
              <li>{t("每个账号最多 {n} 个有效 key;key 明文只在创建时展示一次,泄露后请立即吊销并重建。", { n: MAX_KEYS_PER_OWNER })}</li>
            </ul>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                ["read:cars", "读取车源"],
                ["read:dealers", "读取车行"],
                ["write:inventory", "写入库存"],
                ["write:images", "上传图片"],
              ].map(([scope, label]) => (
                <Badge key={scope} variant="outline" className="gap-1.5 font-mono text-[10px]">
                  <span>{scope}</span>
                  <span className="text-muted-foreground">{t(label)}</span>
                </Badge>
              ))}
            </div>
          </div>
        </Section>

        <Section id="quota" title={t("配额档位")}>
          <Table
            head={[t("档位"), t("判定"), t("新上传 / 天"), t("更改 / 天"), t("在售上限")]}
            rows={[
              [
                <span key="p" className="font-semibold">{t("个人")}</span>,
                t("默认"),
                String(personal.inserts),
                String(personal.updates),
                t("与手动发帖一致"),
              ],
              [
                <span key="d" className="font-semibold">{t("车行")}</span>,
                t("名下有已认证门店"),
                <span key="dw" className="whitespace-nowrap">{t("{n} 次写(合计)", { n: dealer.inserts })}</span>,
                "—",
                String(dealer.active),
              ],
            ]}
          />
          <p className="mt-3 font-mono text-xs leading-relaxed text-muted-foreground">
            {t("配额按账号计,同一账号下所有 key 共享;每天 UTC 0 点重置。「新上传」= 首次 PUT 某个 external_id;「更改」= 对已有车的 PUT / DELETE / 图片上传 / 对账下架。每次写入响应都带 X-Quota-Inserts-Remaining / X-Quota-Updates-Remaining 头,方便脚本自行节流。")}
          </p>
        </Section>

        <Section id="endpoints" title={t("端点一览")}>
          <Table
            head={[t("方法"), t("路径"), "Scope", t("说明")]}
            rows={ENDPOINTS.map((e) => [
              <span key="m" className={`font-semibold ${METHOD_CLS[e.method]}`}>{e.method}</span>,
              <span key="p" className="whitespace-nowrap">{e.path}</span>,
              <span key="s" className="whitespace-nowrap text-muted-foreground">{e.scope}</span>,
              t(e.desc),
            ])}
          />
          <p className="mt-3 font-mono text-xs leading-relaxed text-muted-foreground">
            {t("批量端点一次最多 {n} 条,逐条扣配额;超出部分逐条返回 quota_exceeded,前面已成功的不回滚。", { n: BATCH_MAX_ITEMS })}
          </p>
        </Section>

        <Section id="fields" title={t("车辆写入字段")}>
          <P>{t("PUT /inventory/{external_id} 与 batch 的每条 item 共用同一套字段:")}</P>
          <div className="mt-3">
            <Table
              head={[t("字段"), t("类型"), t("必填"), t("说明")]}
              rows={FIELDS.map((f) => [
                <span key="n" className="whitespace-nowrap">{f.name}</span>,
                <span key="t" className="text-muted-foreground">{f.type}</span>,
                <span key="r" className={`whitespace-nowrap ${f.required === "可选" ? "text-muted-foreground" : ""}`}>{t(f.required)}</span>,
                f.desc ? t(f.desc) : "",
              ])}
            />
          </div>
          <p className="mt-3 font-mono text-xs leading-relaxed text-muted-foreground">
            {t("写入同步落库后立即返回;VIN 解码、AI 审核、翻译与图片转存在后台进行,响应里的 processing 会列出仍在处理的步骤。图片最多 {n} 张。", { n: LISTING_MAX_IMAGES })}
          </p>
        </Section>

        <Section id="enums" title={t("枚举值")}>
          <div className="space-y-4">
            {ENUM_KINDS.map(({ kind, label }) => (
              <div key={kind}>
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold">{kind}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">{t(label)}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {enums[kind].map((e) => (
                    <Badge key={e.value} variant="secondary" className="gap-1.5 font-mono text-[10px] font-normal">
                      <span className="font-semibold">{e.value}</span>
                      <span className="text-muted-foreground">{e.label}</span>
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section id="examples" title={t("示例")}>
          <div className="space-y-4">
            <CodeBlock code={CURL_PUT} title={`curl · PUT /inventory/{external_id}`} />
            <CodeBlock code={CURL_GET} title="curl · GET /cars" />
            <CodeBlock code={NODE_RECONCILE} title={`Node.js · ${t("全量同步 + 对账")}`} />
          </div>
        </Section>

        <Section id="errors" title={t("错误格式")}>
          <div className="space-y-3">
            <P>{t("所有错误统一为 { error: { code, message, details? } };validation_failed 会在 details 里逐字段说明。")}</P>
            <CodeBlock code={ERROR_EXAMPLE} title="400 validation_failed" />
            <P>{t("触发每分钟限速返回 429 rate_limited(带 Retry-After);当天写配额用完返回 429 quota_exceeded,body 里带 quota:")}</P>
            <CodeBlock code={QUOTA_EXAMPLE} title="429 quota_exceeded" />
            <Table
              head={["code", "HTTP", t("说明")]}
              rows={[
                ["bad_request / validation_failed", "400", t("参数或请求体不合法")],
                ["unauthorized / key_revoked / key_expired", "401", t("缺少 key、key 无效、已吊销或已过期")],
                ["insufficient_scope / ip_not_allowed / forbidden", "403", t("scope 不足、IP 不在白名单或账号被封")],
                ["not_found", "404", t("资源不存在或不可见")],
                ["conflict", "409", t("同账号 VIN 重复(附 existing_id,可加 ?adopt=true 接管)")],
                ["listing_blocked", "409", t("该车源已被系统或管理员下架，无法重新上架")],
                ["rate_limited / quota_exceeded", "429", t("限速或配额用尽")],
                ["internal_error", "500", t("服务端异常")],
              ]}
            />
          </div>
        </Section>

        <div className="mt-6">
          <SettingsGroup>
            <SettingsRow
              icon={<KeyRound className="h-5 w-5 text-amber-500" strokeWidth={1.5} />}
              label={t("管理 API Key")}
              href="/developers/keys"
            />
            <SettingsRow
              icon={<BarChart3 className="h-5 w-5 text-emerald-500" strokeWidth={1.5} />}
              label={t("用量统计")}
              href="/developers/usage"
            />
            <a href="/api/v1/openapi.json" target="_blank" rel="noopener" className="group/row flex w-full items-center gap-3 pl-4 text-left transition-colors active:bg-muted/60">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                <FileJson className="h-5 w-5 text-sky-500" strokeWidth={1.5} />
              </span>
              <span className="mr-4 flex min-h-[56px] min-w-0 flex-1 items-center gap-2 py-2">
                <span className="min-w-0 flex-1 truncate font-mono text-[15px]">{t("OpenAPI 规范")}</span>
                <span className="shrink-0 font-mono text-sm text-muted-foreground">openapi.json</span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/40" strokeWidth={2} />
              </span>
            </a>
          </SettingsGroup>
          <GroupFooter>{t("规范由服务端生成,可直接导入 Postman / Scalar / 代码生成器。")}</GroupFooter>
        </div>
      </main>
      <Footer />
    </div>
  );
}

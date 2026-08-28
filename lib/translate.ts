// 车辆文案双语翻译 —— 服务端专用(经 OpenRouter 调用 inclusionai/ling-2.6-flash)。
// 绝不要在客户端组件里 import:OPENROUTER_API_KEY 必须留在服务端。
//
// localizeListing() 一次调用即补全 title / title_zh / description / description_zh,
// 并把 features(标签)做成双语:英文标签→保留英文并加中文,中文标签→保留中文并加英文。
// 未配置 OPENROUTER_API_KEY 时优雅降级:原样返回,不影响发布/同步。

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "inclusionai/ling-2.6-flash";
const REQUEST_TIMEOUT_MS = 45_000;
const MAX_ATTEMPTS = 4;
const MAX_TOKENS = 8000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// 指数退避 + 抖动:0.6s, 1.2s, 2.4s ... 避免并发同时重试再次撞限流
const backoffMs = (attempt: number) => Math.round(600 * 2 ** attempt * (0.7 + Math.random() * 0.6));

export interface ListingFields {
  title?: string | null;
  title_zh?: string | null;
  description?: string | null;
  description_zh?: string | null;
  features?: string[] | null;
}

export interface LocalizedFields {
  title: string | null;
  title_zh: string | null;
  description: string | null;
  description_zh: string | null;
  features: string[];
}

export function isTranslationConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

function dedup(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const v = (raw ?? "").toString().trim();
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

function asStr(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

// 从模型返回里提取 JSON 对象(容忍 ```json 代码块或前后多余文字)。
function extractJson(text: string | null | undefined): Record<string, unknown> | null {
  if (!text) return null;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// 车型英文名 → 公认简体中文名。只收录确定的译名;不在表里的车型保持英文,
// 由代码确定性替换(不让 AI 猜,避免 RAV4→揽胜、Trailblazer→探界者 这类乱翻)。
const MODEL_ZH: Record<string, string> = {
  // Toyota
  Camry: "凯美瑞", Corolla: "卡罗拉", Avalon: "亚洲龙", Prius: "普锐斯", Highlander: "汉兰达",
  Sienna: "塞纳", Venza: "威飒", Sequoia: "红杉", "Land Cruiser": "兰德酷路泽", Crown: "皇冠",
  // Honda
  Civic: "思域", Accord: "雅阁", Odyssey: "奥德赛", Fit: "飞度",
  // Nissan
  Altima: "天籁", Sentra: "轩逸", Rogue: "奇骏", Murano: "楼兰", Kicks: "劲客",
  // Mercedes-Benz
  "C-Class": "C级", "E-Class": "E级", "S-Class": "S级", "A-Class": "A级",
  // Chevrolet
  Equinox: "探界者", Malibu: "迈锐宝", Camaro: "科迈罗", Corvette: "科尔维特",
  // Ford
  Explorer: "探险者", Escape: "翼虎", Edge: "锐界", Mustang: "野马", Focus: "福克斯",
  // Subaru
  Outback: "傲虎", Forester: "森林人", Impreza: "翼豹", Legacy: "力狮",
  // Hyundai
  Elantra: "伊兰特", Sonata: "索纳塔", Tucson: "途胜", "Santa Fe": "圣达菲",
  // Kia
  Sportage: "狮跑", Sorento: "索兰托", Soul: "秀尔",
  // Volkswagen
  Jetta: "捷达", Passat: "帕萨特", Tiguan: "途观", Golf: "高尔夫", Atlas: "途昂", Touareg: "途锐",
  // Jeep
  Wrangler: "牧马人", "Grand Cherokee": "大切诺基", Cherokee: "自由光", Compass: "指南者", Renegade: "自由侠",
};

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// 长名优先(Grand Cherokee 先于 Cherokee),整词、大小写不敏感
const MODEL_ZH_RULES = Object.entries(MODEL_ZH)
  .sort((a, b) => b[0].length - a[0].length)
  .map(([en, zh]) => ({ re: new RegExp(`\\b${escapeRe(en)}\\b`, "gi"), zh }));

// 在中文字段里把英文车型名替换成中文(确定性,不经 AI)。
function applyModelZh(text: string | null): string | null {
  if (!text) return text;
  let out = text;
  for (const { re, zh } of MODEL_ZH_RULES) out = out.replace(re, zh);
  return out;
}

function hasCJK(s: string | null | undefined): boolean {
  return !!s && /[一-鿿]/.test(s);
}

const SYSTEM_PROMPT =
  "You are a precise English⇄Simplified-Chinese translator for a used-car marketplace serving Chinese communities in North America. Output ONLY a raw JSON object — no markdown, no code fence, no commentary.";

function buildUserPrompt(input: ListingFields): string {
  const descSource = input.description || input.description_zh || "";
  const descLang = hasCJK(descSource) ? "Chinese" : "English";
  return [
    "Translate this car listing into BOTH languages. Rules:",
    "- Keep vehicle brand / model / trim / year / VIN / units unchanged (e.g. Camry, RX 350, AWD, 1.5L). Do NOT translate or guess model/trim proper nouns — leave them exactly as written in English.",
    "- Never add, omit, or embellish information — translate meaning only.",
    "- title = natural English title; title_zh = natural Chinese title (brand translated, model kept in English).",
    "- description = the English version of the description.",
    "- description_zh = a COMPLETE Simplified-Chinese translation of the description. It must NOT be empty and must NOT be a copy of the English.",
    "- If there is no description text at all, set both description and description_zh to null.",
    "- features: return EVERY input tag PLUS its counterpart in the other language (English tag → add Chinese; Chinese tag → add English), as one flat de-duplicated array. Do not invent tags.",
    "",
    `The listing's description is currently written in ${descLang}.`,
    "",
    'Output JSON with exactly these keys: {"title": string, "title_zh": string, "description": string|null, "description_zh": string|null, "features": string[]}',
    "",
    "INPUT:",
    JSON.stringify({
      title: input.title ?? null,
      title_zh: input.title_zh ?? null,
      description: input.description ?? null,
      description_zh: input.description_zh ?? null,
      features: input.features ?? [],
    }),
  ].join("\n");
}

/**
 * 补全一条车辆文案的中英双语字段。任何失败都回退到输入原值(不抛错)。
 */
export async function localizeListing(input: ListingFields): Promise<LocalizedFields> {
  const fallback: LocalizedFields = {
    title: input.title ?? null,
    title_zh: input.title_zh ?? null,
    description: input.description ?? null,
    description_zh: input.description_zh ?? null,
    features: dedup(input.features ?? []),
  };

  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return fallback;

  // 没有任何可翻译内容就直接返回
  const hasContent =
    !!input.title || !!input.title_zh || !!input.description || !!input.description_zh || (input.features?.length ?? 0) > 0;
  if (!hasContent) return fallback;

  const body = JSON.stringify({
    model: MODEL,
    temperature: 0,
    max_tokens: MAX_TOKENS,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(input) },
    ],
  });

  // 并发翻译时容易撞上限流(429),必须重试+退避,否则会静默回退成空翻译。
  let content: string | null = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(OPENROUTER_URL, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://clcauto.com",
          "X-Title": "CLCAuto Listing Translation",
        },
        body,
      });
      clearTimeout(timer);

      // 限流 / 服务端错误 → 退避重试
      if (res.status === 429 || res.status >= 500) {
        if (attempt < MAX_ATTEMPTS - 1) {
          await sleep(backoffMs(attempt));
          continue;
        }
        console.warn(`[translate] giving up after ${MAX_ATTEMPTS} attempts, last status ${res.status}`);
        return fallback;
      }
      if (!res.ok) {
        console.warn(`[translate] http ${res.status}`);
        return fallback;
      }
      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      content = json.choices?.[0]?.message?.content ?? null;
      break;
    } catch (err) {
      clearTimeout(timer);
      if (attempt < MAX_ATTEMPTS - 1) {
        await sleep(backoffMs(attempt));
        continue;
      }
      console.warn(`[translate] request failed: ${err instanceof Error ? err.message : String(err)}`);
      return fallback;
    }
  }

  const parsed = extractJson(content);
  if (!parsed) {
    console.warn("[translate] could not parse model output");
    return fallback;
  }

  const features =
    Array.isArray(parsed.features) && parsed.features.length > 0
      ? dedup((parsed.features as unknown[]).map((f) => String(f)))
      : fallback.features;

  return {
    // 标题一律用调用方传入的确定性标题(year+make+model 拼的),不用 AI 生成的——
    // 否则 flash 模型偶尔会把整辆车认错(如 Honda Accord 被写成 丰田 凯美瑞)。
    // 中文标题只做确定性的车型名替换。
    title: fallback.title ?? asStr(parsed.title),
    title_zh: applyModelZh(fallback.title_zh ?? asStr(parsed.title_zh)),
    // 描述与标签才用 AI(自由文本,需要真正翻译);中文描述里的英文车型名也替换掉。
    description: asStr(parsed.description) ?? fallback.description,
    description_zh: applyModelZh(asStr(parsed.description_zh) ?? fallback.description_zh),
    features,
  };
}

// ---- 小语种按需翻译(cars.other_i18n 缓存用) ----

const TARGET_LANG_NAMES: Record<string, string> = {
  en: "English",
  ko: "Korean",
  es: "Spanish",
};

/**
 * 把车源标题/描述翻译成目标小语种(如 ko)。失败或未配置时返回 null,
 * 由调用方回退英文展示。品牌/车型/单位保持英文不翻。
 */
export async function translateListingInto(
  target: string,
  input: { title: string | null; description: string | null }
): Promise<{ title: string | null; description: string | null } | null> {
  const key = process.env.OPENROUTER_API_KEY;
  const lang = TARGET_LANG_NAMES[target];
  if (!key || !lang) return null;
  if (!input.title && !input.description) return { title: null, description: null };

  const body = JSON.stringify({
    model: MODEL,
    temperature: 0,
    max_tokens: MAX_TOKENS,
    messages: [
      {
        role: "system",
        content: `You are a precise translator for a used-car marketplace. Translate into natural ${lang}. Keep vehicle brand / model / trim / year / VIN / units (mi, AWD, 1.5L...) unchanged in English. Never add or omit information. Output ONLY a raw JSON object — no markdown, no commentary.`,
      },
      {
        role: "user",
        content: [
          `Translate this car listing into ${lang}.`,
          'Output JSON with exactly these keys: {"title": string|null, "description": string|null}',
          "If a field is null in the input, keep it null.",
          "",
          "INPUT:",
          JSON.stringify({ title: input.title, description: input.description }),
        ].join("\n"),
      },
    ],
  });

  let content: string | null = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(OPENROUTER_URL, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://clcauto.com",
          "X-Title": "CLCAuto Listing Translation",
        },
        body,
      });
      clearTimeout(timer);
      if (res.status === 429 || res.status >= 500) {
        if (attempt < MAX_ATTEMPTS - 1) {
          await sleep(backoffMs(attempt));
          continue;
        }
        return null;
      }
      if (!res.ok) return null;
      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      content = json.choices?.[0]?.message?.content ?? null;
      break;
    } catch {
      clearTimeout(timer);
      if (attempt < MAX_ATTEMPTS - 1) {
        await sleep(backoffMs(attempt));
        continue;
      }
      return null;
    }
  }

  const parsed = extractJson(content);
  if (!parsed) return null;
  return {
    title: asStr(parsed.title) ?? input.title,
    description: asStr(parsed.description) ?? input.description,
  };
}

/**
 * 社区帖子按需翻译(en/ko 等)。保持 #话题、@提及、车型品牌名原样。
 * 失败或未配置返回 null,前端回退显示原文。
 */
export async function translatePostInto(
  target: string,
  input: { title: string | null; content: string | null }
): Promise<{ title: string | null; content: string | null } | null> {
  const key = process.env.OPENROUTER_API_KEY;
  const lang = TARGET_LANG_NAMES[target];
  if (!key || !lang) return null;
  if (!input.title && !input.content) return { title: null, content: null };

  const body = JSON.stringify({
    model: MODEL,
    temperature: 0,
    max_tokens: MAX_TOKENS,
    messages: [
      {
        role: "system",
        content: `You are a precise translator for a used-car community forum. Translate into natural ${lang}. Keep #hashtags, @mentions, URLs, and vehicle brand/model/trim names unchanged. Preserve line breaks. Never add or omit information. Output ONLY a raw JSON object — no markdown, no commentary.`,
      },
      {
        role: "user",
        content: [
          `Translate this community post into ${lang}.`,
          'Output JSON with exactly these keys: {"title": string|null, "content": string|null}',
          "If a field is null in the input, keep it null.",
          "",
          "INPUT:",
          JSON.stringify({ title: input.title, content: input.content }),
        ].join("\n"),
      },
    ],
  });

  let content: string | null = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(OPENROUTER_URL, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://clcauto.com",
          "X-Title": "CLCAuto Post Translation",
        },
        body,
      });
      clearTimeout(timer);
      if (res.status === 429 || res.status >= 500) {
        if (attempt < MAX_ATTEMPTS - 1) {
          await sleep(backoffMs(attempt));
          continue;
        }
        return null;
      }
      if (!res.ok) return null;
      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      content = json.choices?.[0]?.message?.content ?? null;
      break;
    } catch {
      clearTimeout(timer);
      if (attempt < MAX_ATTEMPTS - 1) {
        await sleep(backoffMs(attempt));
        continue;
      }
      return null;
    }
  }

  const parsed = extractJson(content);
  if (!parsed) return null;
  return {
    title: asStr(parsed.title) ?? input.title,
    content: asStr(parsed.content) ?? input.content,
  };
}

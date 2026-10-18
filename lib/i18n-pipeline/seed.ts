// glossary 与标题映射的确定性预置(spec 8 Seeds),由 scripts/i18n-backfill.ts --seed 调用(service client)。
// 纯模块,不引入 server-only(Bun 脚本共用)。可重复执行:词条按 (kind, slug) upsert、写法按 (kind, alias_norm)
// upsert,后写的覆盖先写的;种子标签永远优先于模型标签。
//
// - seedTitleMaps():MAKES_ZH + MODEL_ZH_BY_MAKE → i18n.make_zh / i18n.model_zh(SQL i18n.car_title 与
//   lib/i18n/car-title.ts buildCarTitles 共用这一份映射,改表后要重新 seed)
// - seedGlossary():
//   · 品牌话题(MAKES 除 Other):slug = kebab(make);标签 zh 中文名、en 英文名、ko/ja/es/fr 取词典译名
//     (译名含汉字 = 词典缺词回退成了中文,改用英文名)。所有标签 + EXTRA_BRAND_ALIASES 都是该话题的写法,
//     #特斯拉 = #tesla = #테슬라 = #テスラ 从第一天起就是同一个话题
//   · 车型话题(MODEL_ZH_BY_MAKE):slug = {make}-{model};标签 zh 中文车型名、其余 "{Make} {Model}";
//     写法只收带品牌的拼法(Toyota Camry、丰田凯美瑞)和中文车型名,不收 Edge / Focus / Golf / Fit 这类
//     英文常用词,免得普通话题被并进车型
//   · 词典话题(TAG_SUGGESTIONS)与配置(FEATURE_SUGGESTIONS):标签取各语言词典译名,slug 见 DICTIONARY_SLUGS
//     (取模型最可能给出的英文 slug,模型解析出同一个 slug 的写法会并入这里)。建议原文本身显式登记为写法:
//     发帖 / 发布页点选后存库的就是这串原文,i18n_term_labels 与 bundle 靠它解析出各语言名称
// 同一 kind 下两个种子词条共用一个写法(标签也算写法)时直接报错:后写的会把写法改指过去,前一个悄悄失去它。

import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/sources/service-client";
import { MAKES, MAKES_ZH } from "@/lib/mock-data";
import { MODEL_ZH_BY_MAKE } from "@/lib/i18n/car-title";
import { normTag } from "@/lib/i18n/hashtags";
import { FEATURE_SUGGESTIONS, TAG_SUGGESTIONS } from "@/lib/i18n/tag-suggestions";
import { translate } from "@/lib/i18n/translate";
import { LOCALES, type Locale } from "@/lib/i18n";

type Make = Exclude<(typeof MAKES)[number], "Other">;
type TermKind = "topic" | "feature";

/** 种子写法:alias 为原样拼写,lang 为这个拼写本身的语言(展示规则:与界面语言相同则原样显示) */
export interface SeedAlias {
  alias: string;
  lang: Locale;
}

/**
 * 品牌的额外写法(标签本身已自动成为写法,这里只放标签以外的):英文昵称 / 缩写、繁体与港台译名、
 * 各语言常见俗称、日文片假名(ja 词典里多数品牌还是英文名)。
 * 刻意不收同时是常用词的写法(富豪 = Volvo、福斯 = VW、蓮花 = Lotus、現代、大眾、鈴木、ミニ、ラム…),
 * 这些交给模型按上下文判断。
 */
export const EXTRA_BRAND_ALIASES: Readonly<Partial<Record<Make, readonly SeedAlias[]>>> = {
  Acura: [
    { alias: "謳歌", lang: "zh" },
    { alias: "アキュラ", lang: "ja" },
  ],
  "Alfa Romeo": [
    { alias: "阿爾法羅密歐", lang: "zh" },
    { alias: "アルファロメオ", lang: "ja" },
  ],
  "Aston Martin": [
    { alias: "阿斯頓馬丁", lang: "zh" },
    { alias: "アストンマーティン", lang: "ja" },
  ],
  Audi: [
    { alias: "奧迪", lang: "zh" },
    { alias: "アウディ", lang: "ja" },
  ],
  Bentley: [
    { alias: "賓利", lang: "zh" },
    { alias: "ベントレー", lang: "ja" },
  ],
  BMW: [{ alias: "寶馬", lang: "zh" }],
  Bugatti: [{ alias: "ブガッティ", lang: "ja" }],
  Buick: [
    { alias: "別克", lang: "zh" },
    { alias: "ビュイック", lang: "ja" },
  ],
  Cadillac: [
    { alias: "凱迪拉克", lang: "zh" },
    { alias: "キャデラック", lang: "ja" },
  ],
  Chevrolet: [
    { alias: "Chevy", lang: "en" },
    { alias: "雪佛蘭", lang: "zh" },
    { alias: "シボレー", lang: "ja" },
  ],
  Chrysler: [
    { alias: "克萊斯勒", lang: "zh" },
    { alias: "クライスラー", lang: "ja" },
  ],
  Dodge: [{ alias: "ダッジ", lang: "ja" }],
  Ferrari: [{ alias: "フェラーリ", lang: "ja" }],
  Fiat: [
    { alias: "菲亞特", lang: "zh" },
    { alias: "フィアット", lang: "ja" },
  ],
  Ford: [{ alias: "フォード", lang: "ja" }],
  Genesis: [{ alias: "ジェネシス", lang: "ja" }],
  Honda: [{ alias: "ホンダ", lang: "ja" }],
  Hummer: [
    { alias: "悍馬", lang: "zh" },
    { alias: "ハマー", lang: "ja" },
  ],
  Hyundai: [
    { alias: "ヒョンデ", lang: "ja" },
    { alias: "ヒュンダイ", lang: "ja" },
  ],
  Infiniti: [{ alias: "インフィニティ", lang: "ja" }],
  Jaguar: [{ alias: "ジャガー", lang: "ja" }],
  Jeep: [{ alias: "ジープ", lang: "ja" }],
  Kia: [
    { alias: "起亞", lang: "zh" },
    { alias: "キア", lang: "ja" },
  ],
  Lamborghini: [
    { alias: "Lambo", lang: "en" },
    { alias: "蘭博基尼", lang: "zh" },
    { alias: "藍寶堅尼", lang: "zh" },
    { alias: "林寶堅尼", lang: "zh" },
    { alias: "ランボルギーニ", lang: "ja" },
  ],
  "Land Rover": [
    { alias: "荒原路華", lang: "zh" },
    { alias: "ランドローバー", lang: "ja" },
  ],
  Lexus: [
    { alias: "雷克薩斯", lang: "zh" },
    { alias: "凌志", lang: "zh" },
    { alias: "レクサス", lang: "ja" },
  ],
  Lincoln: [{ alias: "リンカーン", lang: "ja" }],
  Lotus: [{ alias: "ロータス", lang: "ja" }],
  Maserati: [{ alias: "瑪莎拉蒂", lang: "zh" }],
  Maybach: [{ alias: "邁巴赫", lang: "zh" }],
  Mazda: [{ alias: "馬自達", lang: "zh" }],
  McLaren: [
    { alias: "邁凱倫", lang: "zh" },
    { alias: "麥拉倫", lang: "zh" },
  ],
  "Mercedes-Benz": [
    { alias: "Benz", lang: "en" },
    { alias: "Mercedes", lang: "en" },
    { alias: "梅赛德斯", lang: "zh" },
    { alias: "梅賽德斯", lang: "zh" },
    { alias: "奔馳", lang: "zh" },
    { alias: "賓士", lang: "zh" },
    { alias: "平治", lang: "zh" },
    { alias: "벤츠", lang: "ko" },
    { alias: "ベンツ", lang: "ja" },
  ],
  Nissan: [
    { alias: "日產", lang: "zh" },
    { alias: "日産", lang: "ja" },
    { alias: "ニッサン", lang: "ja" },
  ],
  Polestar: [{ alias: "極星", lang: "zh" }],
  Porsche: [{ alias: "保時捷", lang: "zh" }],
  Rivian: [{ alias: "リビアン", lang: "ja" }],
  "Rolls-Royce": [{ alias: "勞斯萊斯", lang: "zh" }],
  Smart: [{ alias: "斯瑪特", lang: "zh" }],
  Subaru: [
    { alias: "斯巴魯", lang: "zh" },
    { alias: "速霸陸", lang: "zh" },
  ],
  Toyota: [{ alias: "豐田", lang: "zh" }],
  Volkswagen: [{ alias: "VW", lang: "en" }],
  Volvo: [{ alias: "沃爾沃", lang: "zh" }],
};

/** 词典话题 / 配置的 slug(TAG_SUGGESTIONS / FEATURE_SUGGESTIONS 每一项都必须有) */
const DICTIONARY_SLUGS: Readonly<Record<TermKind, Readonly<Record<string, string>>>> = {
  topic: {
    新手购车: "first-car",
    提车作业: "new-car-delivery",
    二手车: "used-cars",
    保养维修: "maintenance",
    自驾游: "road-trip",
    改装: "car-modification",
  },
  feature: {
    倒车影像: "backup-camera",
    全景天窗: "panoramic-sunroof",
    CarPlay: "apple-carplay",
    座椅加热: "heated-seats",
    无事故: "no-accidents",
    一手车主: "one-owner",
    真皮座椅: "leather-seats",
    自适应巡航: "adaptive-cruise-control",
  },
};

interface SeedTerm {
  kind: TermKind;
  slug: string;
  origin: "brand" | "model" | "dictionary";
  labels: Record<Locale, string>;
  aliases: readonly SeedAlias[];
}

export interface SeedTitleMapsResult {
  makes: number;
  models: number;
}

export interface SeedGlossaryResult {
  brands: number;
  models: number;
  topics: number;
  features: number;
}

const HAN_RE = /\p{Script=Han}/u;
// 同 i18n.terms 的 CHECK 约束
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SLUG_MAX = 48;

const kebab = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

function brandLabels(make: Make): Record<Locale, string> {
  const zh = MAKES_ZH[make] ?? make;
  const local = (l: Locale) => {
    const v = translate(l, zh).trim();
    return v && !HAN_RE.test(v) ? v : make;
  };
  return { zh, en: make, ko: local("ko"), ja: local("ja"), es: local("es"), fr: local("fr") };
}

function dictionaryLabels(tag: string): Record<Locale, string> {
  const labels = { zh: tag } as Record<Locale, string>;
  for (const l of LOCALES) if (l !== "zh") labels[l] = translate(l, tag).trim() || tag;
  // 其他语言缺词时回退英文;英文也缺就只剩中文原文 —— 先补 lib/i18n/en.ts
  if (HAN_RE.test(labels.en)) throw new Error(`seed: lib/i18n/en.ts has no translation for "${tag}"`);
  return labels;
}

function dictionaryTerms(kind: TermKind, tags: readonly string[]): SeedTerm[] {
  return tags.map((tag) => {
    const slug = DICTIONARY_SLUGS[kind][tag];
    if (!slug) throw new Error(`seed: DICTIONARY_SLUGS.${kind} has no slug for "${tag}"`);
    // 建议原文是中文界面的词条:语言记 zh(中文界面原样显示,其他语言显示词条标签)
    const aliases: SeedAlias[] = [{ alias: tag, lang: "zh" }];
    return { kind, slug, origin: "dictionary", labels: dictionaryLabels(tag), aliases };
  });
}

/** 写法在库里按 (kind, normTag) 唯一;标签同样会写成写法,一并检查 */
function assertNoAliasCollisions(terms: readonly SeedTerm[]): void {
  const owners = new Map<string, string>();
  for (const t of terms) {
    for (const spelling of [...Object.values(t.labels), ...t.aliases.map((a) => a.alias)]) {
      const norm = normTag(spelling);
      if (!norm) continue;
      const key = `${t.kind}:${norm}`;
      const owner = owners.get(key);
      if (owner && owner !== t.slug) {
        throw new Error(`seed: "${spelling}" is a spelling of both ${t.kind}/${owner} and ${t.kind}/${t.slug}`);
      }
      owners.set(key, t.slug);
    }
  }
}

/** 全部种子词条(先整体构建并校验,数据有误时一行都不写) */
function glossarySeeds(): SeedTerm[] {
  const brands = MAKES.filter((m): m is Make => m !== "Other").map(
    (make): SeedTerm => ({
      kind: "topic",
      slug: kebab(make),
      origin: "brand",
      labels: brandLabels(make),
      aliases: EXTRA_BRAND_ALIASES[make] ?? [],
    }),
  );
  const models = Object.entries(MODEL_ZH_BY_MAKE).flatMap(([make, byModel]) => {
    const makeZh = MAKES_ZH[make] ?? make;
    return Object.entries(byModel).map(([model, modelZh]): SeedTerm => {
      const name = `${make} ${model}`;
      return {
        kind: "topic",
        slug: kebab(name),
        origin: "model",
        labels: { zh: modelZh, en: name, ko: name, ja: name, es: name, fr: name },
        aliases: [
          { alias: name, lang: "en" },
          { alias: `${makeZh}${modelZh}`, lang: "zh" },
          { alias: modelZh, lang: "zh" },
        ],
      };
    });
  });
  const terms = [
    ...brands,
    ...models,
    ...dictionaryTerms("topic", TAG_SUGGESTIONS),
    ...dictionaryTerms("feature", FEATURE_SUGGESTIONS),
  ];
  for (const t of terms) {
    if (!SLUG_RE.test(t.slug) || t.slug.length > SLUG_MAX) throw new Error(`seed: invalid slug "${t.slug}"`);
  }
  assertNoAliasCollisions(terms);
  return terms;
}

async function seedTerm(svc: SupabaseClient, t: SeedTerm): Promise<void> {
  const { error } = await svc.rpc("i18n_seed_term", {
    p_kind: t.kind,
    p_slug: t.slug,
    p_labels: t.labels,
    p_origin: t.origin,
    p_aliases: t.aliases.map((a) => a.alias),
    p_alias_langs: t.aliases.map((a) => a.lang),
  });
  if (error) throw new Error(`i18n_seed_term ${t.kind}/${t.slug}: ${error.message}`, { cause: error });
}

/** 中文品牌名 / 车型名映射写入 i18n.make_zh / i18n.model_zh */
export async function seedTitleMaps(): Promise<SeedTitleMapsResult> {
  const svc = createServiceClient();
  const { error } = await svc.rpc("i18n_seed_title_maps", { p_makes: MAKES_ZH, p_models: MODEL_ZH_BY_MAKE });
  if (error) throw new Error(`i18n_seed_title_maps: ${error.message}`, { cause: error });
  return {
    makes: Object.keys(MAKES_ZH).length,
    models: Object.values(MODEL_ZH_BY_MAKE).reduce((n, byModel) => n + Object.keys(byModel).length, 0),
  };
}

/** 品牌 / 车型 / 词典话题与配置的种子词条(按顺序逐条写入,遇错即抛) */
export async function seedGlossary(): Promise<SeedGlossaryResult> {
  const terms = glossarySeeds();
  const svc = createServiceClient();
  for (const t of terms) await seedTerm(svc, t);
  const count = (pred: (t: SeedTerm) => boolean) => terms.filter(pred).length;
  return {
    brands: count((t) => t.origin === "brand"),
    models: count((t) => t.origin === "model"),
    topics: count((t) => t.origin === "dictionary" && t.kind === "topic"),
    features: count((t) => t.origin === "dictionary" && t.kind === "feature"),
  };
}

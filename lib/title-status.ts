// 车辆产权状态(cars.title_status,supabase/title-status.sql)—— 纯模块(server / client / Bun 通用)。
//
// 和 fuel_type 等枚举一样库里存中文,界面用 t(值) 渲染;Public API 的英文 slug 见 lib/api/enums.ts。
// null = 卖家没填 / 转载源没有明确写:不猜,也不当成清白产权(「仅清白产权」筛选不命中 null)。

export const TITLE_STATUSES = ["清白产权", "重建产权", "残值产权", "柠檬回购"] as const;
export type TitleStatus = (typeof TITLE_STATUSES)[number];

export const CLEAN_TITLE: TitleStatus = "清白产权";

export function isTitleStatus(v: unknown): v is TitleStatus {
  return typeof v === "string" && (TITLE_STATUSES as readonly string[]).includes(v);
}

/** 非清白产权(重建 / 残值 / 柠檬回购):详情页用中性警示样式(琥珀 / 石色,不用红色) */
export function isBrandedTitle(v: TitleStatus | null | undefined): boolean {
  return !!v && v !== CLEAN_TITLE;
}

/** 每种产权一句白话解释(中文作 i18n key,界面 t() 渲染) */
export const TITLE_STATUS_EXPLAIN: Record<TitleStatus, string> = {
  清白产权: "产权上没有重建 / 残值 / 柠檬回购等品牌标记;车辆历史请另查 Carfax 等报告",
  重建产权: "曾被保险公司判定全损,修复并重新通过检验后上路;会影响贷款、保险和转售",
  残值产权: "被保险公司判定全损,通常需修复并通过检验(转为重建产权)后才能上牌上路",
  柠檬回购: "因反复出现质量问题,被厂家按柠檬法回购后再次出售",
};

/** 供列表 / 下拉用:{ value, explain },顺序即展示顺序 */
export const TITLE_STATUS_OPTIONS: { value: TitleStatus; explain: string }[] = TITLE_STATUSES.map((value) => ({
  value,
  explain: TITLE_STATUS_EXPLAIN[value],
}));

// ===== 转载源关键词提取(lib/sources/sync.ts):只认明确写出的关键词,冲突或没写 → null =====

// 否定词的作用范围 = 它所在子句里排在它后面的全部内容,不只是紧挨着的那个词:
//   「not a salvage title」「No rebuilt or salvage title」「Never had a salvage or rebuilt title」「非残值产权」都不算。
// 子句以句末标点 / 分号 / 换行为界;逗号把子句再切成段,否定词默认只管本段 ——「No accidents, clean title」里的
// no 管不到 clean,照常算。例外是逗号连起来的并列清单:关键词所在段在它前面出现 or / nor / 或,
// 就继续往前看那些短的清单项,如「No accidents, flood, or salvage title」里的 No 仍然覆盖 salvage。
// 宁可漏判成 null(界面不显示),也不能把清白车标成残值 / 重建。
// 清白产权反过来:子句级否定只会把「No accidents and clean title」「无事故清白产权」漏成 null,
// 所以 clean 只认紧挨着的否定(见 NEGATION_ADJACENT),品牌产权(重建 / 残值 / 柠檬)用子句级。
const CLAUSE_BREAK = /[.!?;。！？；\n]/;
const SEGMENT_BREAK = /[,，]/;
const NEGATION = /\b(?:no|not|non|never|without|nor|neither|zero)\b|n['’]t\b|\b(?:free|clear)\s+(?:of|from)\b|[非无不没]/i;
const LIST_CONJUNCTION = /\b(?:or|nor)\b|或/i;
// 并列清单里的一项最多几个词(「flood」「frame damage」),再长就当成另一句话,否定不再往前延伸
const LIST_ITEM_MAX_WORDS = 3;

// 紧挨着的否定:否定词(no / not / non / never / without / n't,中间只允许 a / been / is 这类虚词)后面直接是关键词,
// 如「not a clean title」;中文「非 / 无 / 不是 / 没有」同理
const NEGATION_ADJACENT =
  /(?:(?:\b(?:no|not|non|never|without)|n['’]t)(?:[\s-]+(?:a|an|any|the|been|be|is|was|has|had|have|ever|from))*|[非无不没](?:是|有)?)[\s-]*$/i;

function isNegatedAdjacent(text: string, index: number): boolean {
  return NEGATION_ADJACENT.test(text.slice(Math.max(0, index - 40), index));
}

/** text[index] 起的命中是否落在否定词的作用范围里(子句级,用于品牌产权) */
function isNegated(text: string, index: number): boolean {
  let start = index;
  while (start > 0 && !CLAUSE_BREAK.test(text[start - 1])) start--;
  const segments = text.slice(start, index).split(SEGMENT_BREAK);
  // 最后一段 = 关键词所在段里、关键词之前的部分
  const own = segments[segments.length - 1];
  if (NEGATION.test(own)) return true;
  if (!LIST_CONJUNCTION.test(own)) return false;
  for (let i = segments.length - 2; i >= 0; i--) {
    if (NEGATION.test(segments[i])) return true;
    if (segments[i].trim().split(/\s+/).length > LIST_ITEM_MAX_WORDS) return false;
  }
  return false;
}

/**
 * 重建产权:rebuilt / reconstructed 后跟 title(可夹州名缩写,如 rebuilt CA title),或「rebuilt salvage」
 * 「salvage rebuilt」这类连写(其中的 salvage 不另算残值)。单独的 rebuilt 不算:rebuilt engine、
 * engine rebuilt last year 说的是翻修零件,不是产权。
 * 残值产权同样要带产权语境(salvage title / salvage-branded / title is salvage):单独的 salvage 多是
 * 「no flood/salvage history」「We buy salvage cars」这类免责 / 收车广告,不能据此判定。
 */
const REBUILT_COMBO = /\b(?:rebuilt|reconstructed)[\s/-]+salvage\b|\bsalvage[\s/-]+(?:rebuilt|reconstructed)\b/gi;
const REBUILT = /\b(?:rebuilt|reconstructed)(?:[\s-]+[a-z]{2})?[\s-]+title\b/gi;
const SALVAGE =
  /\bsalvaged?(?:[\s-]+[a-z]{2})?[\s-]+(?:title[ds]?|brand(?:ed)?|certificate)\b|\btitle[\s-]+(?:is|was)[\s-]+salvage\b/gi;
// 柠檬:必须带产权语境(lemon title / lemon buyback / lemon law buyback / lemon law repurchase)
const LEMON = /\blemon(?:[\s-]+law)?[\s-]+(?:title|buy[\s-]?backs?|repurchase)\b/gi;
// 清白:clean title / clean CA title / clean & clear title,或规格表「Title: Clean」「Title Status: Clean」
const CLEAN =
  /\bclean(?:[\s-]+(?:&|and)[\s-]+clear)?(?:[\s-]+[a-z]{2})?[\s-]+title\b|\btitle(?:[\s-]+(?:status|type|brand))?\s*[:：-]\s*clean\b/gi;
// 规格表里明确写出的其他品牌:「Title: Rebuilt」「Title Status: Salvage」
const SPEC_BRANDED = /\btitle(?:[\s-]+(?:status|type|brand))?\s*[:：-]\s*(rebuilt|reconstructed|salvage|lemon)\b/gi;

// 中文写法(华人车行常见):干净 title / 清白产权 / 重建产权 / 残值产权 / 柠檬车
const ZH_RULES: [RegExp, TitleStatus][] = [
  [/清白产权|干净产权|干净\s*title/gi, "清白产权"],
  [/重建产权|重建\s*title|翻新产权/gi, "重建产权"],
  [/残值产权|残值\s*title|报废产权/gi, "残值产权"],
  [/柠檬回购|柠檬车|柠檬法回购/gi, "柠檬回购"],
];

/** 所有命中位置里至少有一处没被否定(negated 默认子句级;清白产权传 isNegatedAdjacent) */
function hasAffirmed(text: string, re: RegExp, negated: (text: string, index: number) => boolean = isNegated): boolean {
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (!negated(text, m.index)) return true;
    if (m[0].length === 0) re.lastIndex++;
  }
  return false;
}

/**
 * 从源站描述 / 规格 / 标签里提取产权状态。只认明确关键词:
 *   clean title → 清白产权;rebuilt / reconstructed title(或 rebuilt salvage 连写)→ 重建产权;salvage title → 残值产权;
 *   lemon(产权语境)→ 柠檬回购。命中多种(互相矛盾)或一种都没有 → null,绝不猜。
 */
export function extractTitleStatus(...parts: (string | readonly string[] | null | undefined)[]): TitleStatus | null {
  const text = parts
    .flatMap((p) => (p == null ? [] : typeof p === "string" ? [p] : [...p]))
    .filter((s) => s && s.trim())
    .join("\n");
  if (!text) return null;

  const found = new Set<TitleStatus>();
  // 规格表「Title: Rebuilt」类
  SPEC_BRANDED.lastIndex = 0;
  for (const m of text.matchAll(SPEC_BRANDED)) {
    const v = m[1].toLowerCase();
    found.add(v === "salvage" ? "残值产权" : v === "lemon" ? "柠檬回购" : "重建产权");
  }
  // rebuilt salvage 连写先记为重建,再从文本里抹掉,避免其中的 salvage 被另算成残值
  if (hasAffirmed(text, REBUILT_COMBO)) found.add("重建产权");
  const rest = text.replace(REBUILT_COMBO, " ");
  if (hasAffirmed(rest, REBUILT)) found.add("重建产权");
  if (hasAffirmed(rest, SALVAGE)) found.add("残值产权");
  if (hasAffirmed(rest, LEMON)) found.add("柠檬回购");
  if (hasAffirmed(rest, CLEAN, isNegatedAdjacent)) found.add("清白产权");
  for (const [re, v] of ZH_RULES) {
    if (hasAffirmed(text, re, v === CLEAN_TITLE ? isNegatedAdjacent : isNegated)) found.add(v);
  }
  return found.size === 1 ? [...found][0] : null;
}

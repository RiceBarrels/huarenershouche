// 车辆标题(确定性生成,不经 AI):title = 年份 品牌 车型 配置;title_zh = 年份 中文品牌 中文车型 配置。
// 与 SQL i18n.car_title(supabase/i18n-v2.sql)逐字一致:发布 / 编辑 / API v1 / 转载同步都用 buildCarTitles
// 写 title、title_zh,enforce 模式下触发器按同一规则重算。中文映射表由 lib/i18n-pipeline/seed.ts 的
// seedTitleMaps() 同步进库(i18n.make_zh / i18n.model_zh),改表或改规则必须两边一起改并重新 seed。

import { MAKES_ZH } from "@/lib/mock-data";

/**
 * 车型英文名 → 公认简体中文名,按品牌分组。只收录确定的译名;不在表里的车型保持原文,
 * 不让 AI 猜(避免 RAV4→揽胜、Trailblazer→探界者 这类乱翻)。
 * 查找规则:品牌精确匹配,车型去掉首尾空格后整串大小写不敏感匹配(Grand Cherokee L 不会命中 Cherokee)。
 */
export const MODEL_ZH_BY_MAKE: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  Toyota: {
    Camry: "凯美瑞", Corolla: "卡罗拉", Avalon: "亚洲龙", Prius: "普锐斯", Highlander: "汉兰达",
    Sienna: "塞纳", Venza: "威飒", Sequoia: "红杉", "Land Cruiser": "兰德酷路泽", Crown: "皇冠",
  },
  Honda: { Civic: "思域", Accord: "雅阁", Odyssey: "奥德赛", Fit: "飞度" },
  Nissan: { Altima: "天籁", Sentra: "轩逸", Rogue: "奇骏", Murano: "楼兰", Kicks: "劲客" },
  "Mercedes-Benz": { "C-Class": "C级", "E-Class": "E级", "S-Class": "S级", "A-Class": "A级" },
  Chevrolet: { Equinox: "探界者", Malibu: "迈锐宝", Camaro: "科迈罗", Corvette: "科尔维特" },
  Ford: { Explorer: "探险者", Escape: "翼虎", Edge: "锐界", Mustang: "野马", Focus: "福克斯" },
  Subaru: { Outback: "傲虎", Forester: "森林人", Impreza: "翼豹", Legacy: "力狮" },
  Hyundai: { Elantra: "伊兰特", Sonata: "索纳塔", Tucson: "途胜", "Santa Fe": "圣达菲" },
  Kia: { Sportage: "狮跑", Sorento: "索兰托", Soul: "秀尔" },
  Volkswagen: { Jetta: "捷达", Passat: "帕萨特", Tiguan: "途观", Golf: "高尔夫", Atlas: "途昂", Touareg: "途锐" },
  Jeep: {
    Wrangler: "牧马人", "Grand Cherokee": "大切诺基", Cherokee: "自由光", Compass: "指南者", Renegade: "自由侠",
  },
};

const own = (o: object, key: string) => Object.prototype.hasOwnProperty.call(o, key);

/** SQL btrim(x) 的默认行为:只去首尾半角空格(不去 tab / 换行) */
const btrim = (s: string) => s.replace(/^ +| +$/g, "");

/** 同 i18n.model_zh 的主键:make + lower(btrim(model)) */
const MODEL_ZH_NORM = new Map(
  Object.entries(MODEL_ZH_BY_MAKE).map(
    ([make, models]) => [make, new Map(Object.entries(models).map(([m, zh]) => [btrim(m).toLowerCase(), zh]))] as const
  )
);

/** 同 cars 列:year / make / model NOT NULL,trim 可空(发布、编辑、API v1、转载同步都按这个形状传) */
export interface CarTitleInput {
  year: number;
  make: string;
  model: string;
  trim: string | null;
}

/**
 * 确定性双语标题,逐项对应 SQL:
 * concat_ws(' ', year, zh ? coalesce(make_zh[make], make) : make,
 *           zh ? coalesce(model_zh[make][lower(btrim(model))], btrim(model)) : btrim(model),
 *           nullif(btrim(trim), ''))
 * —— null 项跳过(concat_ws 语义),空配置不出现。
 */
export function buildCarTitles(car: CarTitleInput): { title: string; title_zh: string } {
  // NaN(表单年份没填好)存不进 int 列,按 SQL 的 null 处理:不进标题
  const year = Number.isFinite(car.year) ? String(car.year) : null;
  const model = btrim(car.model);
  const trim = car.trim == null ? null : btrim(car.trim) || null;

  const makeZh = own(MAKES_ZH, car.make) ? MAKES_ZH[car.make] : car.make;
  const modelZh = MODEL_ZH_NORM.get(car.make)?.get(model.toLowerCase()) ?? model;

  const join = (parts: (string | null)[]) => parts.filter((p): p is string => p !== null).join(" ");
  return { title: join([year, car.make, model, trim]), title_zh: join([year, makeZh, modelZh, trim]) };
}

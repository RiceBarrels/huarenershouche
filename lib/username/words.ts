// 随机用户名词库(按界面语言)。结构:
//   [形容词][地区](两者可互换) + [老/小][名字] + 先生/女士/酱
// 每段都可能被随机跳过,组装逻辑见 lib/username/index.ts。

import type { DbLocale } from "@/lib/i18n";

export type Gender = "male" | "female";

export interface NameRules {
  /** 可放地区前或后的形容词(名词性,如「留学生」「Goblin」) */
  adjectives: string[];
  /** 只能放地区前的修饰语(如「길잃은」「迷子の」「Sleepy」) */
  prefixAdjectives: string[];
  /** 拿不到真实姓名时顶替名字位的小名词 */
  nouns: string[];
  /** 「老/小」类前缀,只在有名字/名词时出现 */
  elders: string[];
  /** 称谓模板,{n} = 前缀 + 名字;未知性别用 neutral */
  titles: Record<Gender | "neutral", string[]>;
  /** 段内连接符:形容词与地区、老/小与名字 */
  innerJoin: string;
  /** 前半段(形容词 + 地区)与名字段之间的连接符 */
  outerJoin: string;
  /** 生成结果的最大字符数(按码点) */
  maxLength: number;
}

// 按数据库语言建词库:zh-hant 暂复用 zh 词库(见 generateUsername 的 dbLocale)
export const NAME_RULES: Record<DbLocale, NameRules> = {
  zh: {
    adjectives: [
      "留学生", "哥布林", "超级", "社恐", "熬夜", "摸鱼", "干饭", "佛系", "暴躁", "快乐",
      "神秘", "无敌", "退休", "躺平", "野生", "秃头", "打工人", "发呆", "路痴", "养生",
      "咸鱼", "柠檬精", "话痨", "硬核", "宇宙", "隔壁", "早八", "卷王", "赛博", "量子",
      "菜鸟", "涡轮增压", "手动挡", "漂移", "省油", "四驱", "敞篷", "刚落地", "迷路", "睡不醒",
    ],
    prefixAdjectives: [],
    nouns: [
      "车友", "车主", "买家", "路人", "网友", "同学", "掌柜", "大侠", "船长", "熊猫",
      "柴犬", "包子", "饺子", "奶茶", "土豆", "番茄", "豆包", "汤圆",
    ],
    elders: ["老", "小"],
    titles: { male: ["{n}先生"], female: ["{n}女士"], neutral: ["{n}酱"] },
    innerJoin: "",
    outerJoin: "",
    maxLength: 14,
  },
  en: {
    adjectives: [
      "Goblin", "Super", "Turbo", "Midnight", "Rookie", "Cosmic", "Lowkey", "Legendary",
      "Certified", "Stick-Shift", "AWD", "Freshman", "Night-Owl", "Main-Character",
    ],
    prefixAdjectives: [
      "Sleepy", "Lost", "Feral", "Retired", "Chaotic", "Caffeinated", "Sneaky", "Spicy",
      "Hungry", "Grumpy", "Lucky", "Mysterious", "Fearless", "Wandering", "Snacky",
      "Unbothered", "Drifting",
    ],
    nouns: [
      "Driver", "Rider", "Pilot", "Buyer", "Neighbor", "Panda", "Dumpling", "Boba",
      "Noodle", "Potato", "Shiba", "Racer", "Cruiser", "Wizard", "Ranger",
    ],
    elders: ["Lil", "Big", "Old", "Young"],
    titles: {
      male: ["Mr. {n}", "Sir {n}"],
      female: ["Ms. {n}", "Madam {n}"],
      neutral: ["Captain {n}", "{n} Jr."],
    },
    innerJoin: " ",
    outerJoin: " ",
    maxLength: 28,
  },
  ko: {
    adjectives: [
      "유학생", "고블린", "슈퍼", "터보", "우주", "직장인", "최강", "드리프트", "수동",
      "사륜구동", "오픈카", "허당", "힐링", "아침형", "야행성", "매운맛",
    ],
    prefixAdjectives: [
      "길잃은", "신비한", "무적의", "배고픈", "졸린", "행복한", "전설의", "은퇴한",
      "야생의", "느긋한", "평화로운", "엉뚱한",
    ],
    nouns: [
      "드라이버", "차주", "이웃", "판다", "만두", "버블티", "감자", "시바", "라이더",
      "마법사", "선장", "곰돌이",
    ],
    elders: ["꼬마", "왕", "아기"],
    titles: {
      male: ["{n}씨", "{n}군"],
      female: ["{n}씨", "{n}양"],
      neutral: ["{n}님", "{n}짱"],
    },
    innerJoin: "",
    outerJoin: " ",
    maxLength: 16,
  },
  ja: {
    adjectives: [
      "留学生", "ゴブリン", "スーパー", "ターボ", "宇宙", "社畜", "最強", "ドリフト",
      "マニュアル", "四駆", "激辛", "天然", "癒し系", "早起き", "夜ふかし", "腹ペコ",
      "寝不足", "のんびり", "気まぐれ",
    ],
    prefixAdjectives: ["迷子の", "謎の", "無敵の", "伝説の", "野生の", "陽気な", "平和な"],
    nouns: [
      "ドライバー", "車好き", "旅人", "パンダ", "餃子", "タピオカ", "ポテト", "柴犬",
      "魔法使い", "ライダー", "船長",
    ],
    elders: ["ちび", "デカ", "ベテラン"],
    titles: {
      male: ["{n}くん", "{n}さん"],
      female: ["{n}さん", "{n}ちゃん"],
      neutral: ["{n}さん", "{n}ちゃん"],
    },
    innerJoin: "",
    outerJoin: "",
    maxLength: 16,
  },
  // es/fr 只选不随性别变化的词,避免对未知性别的人用错阴阳性
  es: {
    adjectives: [
      "Súper", "Turbo", "Mega", "Ninja", "Goblin", "Pirata", "Estudiante", "Fantasma",
      "Zombi", "Leyenda", "Rebelde", "Valiente", "Feliz", "Veloz", "Audaz", "Libre",
      "Salvaje", "Gourmet", "Turista", "Cometa",
    ],
    prefixAdjectives: [],
    nouns: ["Piloto", "Panda", "Boba", "Taco", "Churro", "Shiba", "Dumpling", "Patata"],
    elders: ["Mini", "Gran"],
    titles: {
      male: ["Don {n}", "Señor {n}"],
      female: ["Doña {n}", "Señora {n}"],
      neutral: ["Capi {n}", "{n} Jr."],
    },
    innerJoin: " ",
    outerJoin: " ",
    maxLength: 28,
  },
  fr: {
    adjectives: [
      "Super", "Turbo", "Méga", "Ninja", "Gobelin", "Pirate", "Fantôme", "Zombie",
      "Rebelle", "Libre", "Sauvage", "Rapide", "Cosmique", "Magique", "Mystique", "Timide",
      "Calme", "Drôle", "Insomniaque", "Touriste", "Légende", "Énergique",
    ],
    prefixAdjectives: [],
    nouns: ["Pilote", "Panda", "Boba", "Croissant", "Macaron", "Shiba", "Patate", "Pirate"],
    elders: ["Mini", "Big"],
    titles: {
      male: ["M. {n}", "Monsieur {n}"],
      female: ["Mme {n}", "Madame {n}"],
      neutral: ["Capitaine {n}", "{n} Jr."],
    },
    innerJoin: " ",
    outerJoin: " ",
    maxLength: 28,
  },
};

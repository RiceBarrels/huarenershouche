// 「关于我们」制作团队资料。role / gender / zodiac / birthdayNote 为中文 key,
// 渲染时经 t() 翻译;生日用 ISO 写法,各语言通用。

export interface TeamMember {
  slug: "muheng-fan" | "kevin-zhuo";
  name: string;
  handle?: string;
  initials: string;
  role: string;
  birthday: string;
  /** 生日部分保密时的说明 */
  birthdayNote?: string;
  gender: string;
  zodiac: string;
  email: string;
  website?: string;
}

export const TEAM: TeamMember[] = [
  {
    slug: "muheng-fan",
    name: "Muheng Fan",
    handle: "rice_barrel",
    initials: "MF",
    role: "创始人 · 开发者",
    birthday: "2008-03-23",
    gender: "男",
    zodiac: "白羊座",
    email: "fanmuheng@gmail.com",
    website: "https://ricebarrel.com",
  },
  {
    slug: "kevin-zhuo",
    name: "Kevin Zhuo",
    initials: "KZ",
    role: "联合创始人",
    birthday: "2005-12-**",
    birthdayNote: "具体生日不愿透露",
    gender: "男",
    zodiac: "射手座",
    email: "kevinzhuo641@gmail.com",
  },
];

export function getTeamMember(slug: TeamMember["slug"]): TeamMember {
  return TEAM.find((m) => m.slug === slug)!;
}

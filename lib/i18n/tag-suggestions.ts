// 发布页的快捷标签建议 —— 纯数据模块(客户端 / 服务端 / Bun 脚本共用)。
// 点选后存库的仍是这里的原文(帖子 tags / 车源 features_original 原样保存),
// 界面上经 useTermLabels 显示当前语言的话题 / 配置名;
// lib/i18n-pipeline/seed.ts 用同一份清单 + 词典译名预置 glossary 词条(确定性,不经 AI),
// 每条原文都登记为对应词条的写法,存库的原文因此总能解析出各语言名称。
// 增删条目时同步 seed.ts 的 DICTIONARY_SLUGS,并在各语言词典里补齐译名。

/** 社区发帖的快捷话题(community/new) */
export const TAG_SUGGESTIONS: readonly string[] = [
  "新手购车",
  "提车作业",
  "二手车",
  "保养维修",
  "自驾游",
  "改装",
];

/** 发布车辆的常见配置亮点(post) */
export const FEATURE_SUGGESTIONS: readonly string[] = [
  "倒车影像",
  "全景天窗",
  "CarPlay",
  "座椅加热",
  "无事故",
  "一手车主",
  "真皮座椅",
  "自适应巡航",
];

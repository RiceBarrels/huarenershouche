// 名称类中文(车辆标题 title_zh、地点 location_zh、拼出来的 SEO 链接文案)的同步繁体转换:逐字查表,不依赖 opencc。
// carTitle / carLocation 在服务端、客户端、列表卡片里随处同步调用,不能等懒加载的整句转换器,
// 且服务端与水合首帧必须逐字一致 —— 查表是纯函数,两边结果天然相同。
// 品牌 / 车型 / 城市名几乎没有一简多繁的歧义;整段正文(描述、帖子、评论)走 lib/i18n/content/hant.ts。
//
// 字表约 15KB 且几乎压缩不动,不能进所有语言的客户端包:
// - RSC:lib/i18n/content/server.ts 静态加载后 registerHantChars();
// - 客户端组件(含 SSR):zh-hant 树的 server layout 把字表作为 props 交给 ZhHantContentProvider,
//   provider 在渲染子树前注册(随 RSC payload 到达,水合时必然就绪);
// - 没带字表的繁體渲染(原生端 App 内切换语言)由 provider 懒加载后注册。
//   字表到位之前 toHantName 原样返回简体。

let table: Map<string, string> | null = null;

function buildTable(pairs: string): Map<string, string> {
  const map = new Map<string, string>();
  const chars = [...pairs];
  for (let i = 0; i + 1 < chars.length; i += 2) map.set(chars[i], chars[i + 1]);
  return map;
}

function charTable(): Map<string, string> | null {
  return table;
}

/** 加载到字表后注册(RSC / SSR / 客户端懒加载) */
export function registerHantChars(pairs: string): void {
  if (!table) table = buildTable(pairs);
}

export function hantCharsReady(): boolean {
  return charTable() !== null;
}

/** 简体名称 → 繁体(逐字);非中文字符原样保留;字表未就绪时原样返回 */
export function toHantName(text: string): string {
  if (!text || !/[一-鿿]/.test(text)) return text;
  const map = charTable();
  if (!map) return text;
  let out = "";
  for (const ch of text) out += map.get(ch) ?? ch;
  return out;
}

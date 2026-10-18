// JSON-LD 输出的唯一出口(B02):结构化数据里有用户内容(帖子标题、车源描述……),
// 直接 JSON.stringify 塞进 <script> 时 "</script>" 会提前闭合标签造成 XSS。
// 这里把 < > & 以及 U+2028 / U+2029(JS 行终止符)转成 \uXXXX,JSON 语义不变。

const UNSAFE_CHARS: Record<string, string> = {
  "<": "\\u003c",
  ">": "\\u003e",
  "&": "\\u0026",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029",
};

export function serializeJsonLd(data: object): string {
  return JSON.stringify(data).replace(/[<>&\u2028\u2029]/g, (c) => UNSAFE_CHARS[c]);
}

export function JsonLd({ data }: { data: object }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />
  );
}

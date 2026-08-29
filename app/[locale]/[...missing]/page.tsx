import { notFound } from "next/navigation";

// 兜底路由:语言树下未匹配的任何路径都进这里,转交给
// app/[locale]/not-found.tsx(带导航壳的本地化 404)。
// 静态导出(Capacitor)时该动态目录会被 build:static 隐藏,原生端由
// errorPath 回退 index.html,不受影响。
export default function MissingCatchAll() {
  notFound();
}

// 静态导出(build:static)的全局 404:build-static.ts 构建时把它换成 app/not-found.tsx,
// 在唯一的根 layout(app/layout.static.tsx)下渲染。web 端改由 app/global-not-found.tsx 渲染同一视图。
export { default } from "@/components/not-found-view";

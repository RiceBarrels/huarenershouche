import { BackNav } from "@/components/back-nav";
import { PageTransition } from "@/components/page-transition";
import { NavBackProvider } from "@/components/nav-back-context";

export default function BackNavLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div id="backnav-content">
      {/* edgeBack:JS 交互式左缘返回(上一页实时垫底);不再启用 WKWebView 系统手势 */}
      <PageTransition edgeBack>
        <BackNav />
        {/* 桌面返回统一进 Header 导航栏(NavBackProvider 标记本组),页面内不再各自放返回 */}
        <NavBackProvider>{children}</NavBackProvider>
      </PageTransition>
    </div>
  );
}

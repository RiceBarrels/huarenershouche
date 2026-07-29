import { BackNav } from "@/components/back-nav";
import { PageTransition } from "@/components/page-transition";

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
        {children}
      </PageTransition>
    </div>
  );
}

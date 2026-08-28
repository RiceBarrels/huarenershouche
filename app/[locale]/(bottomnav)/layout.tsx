import { MobileTabBar } from "@/components/bottom-nav";
import { PageTransition } from "@/components/page-transition";

export default function BottomNavLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Reserve space for the fixed mobile tab bar (incl. safe area) */}
      {/* edgeBack 与 (backnav) 一致:全站统一转场(push/pop + 跟手左缘返回) */}
      <PageTransition edgeBack>
        <div className="pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
          {children}
        </div>
      </PageTransition>
      <MobileTabBar />
    </>
  );
}

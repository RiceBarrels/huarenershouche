import { MobileTabBar } from "@/components/bottom-nav";

export default function BottomNavLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Reserve space for the fixed mobile tab bar (incl. safe area) */}
      <div className="pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
        {children}
      </div>
      <MobileTabBar />
    </>
  );
}

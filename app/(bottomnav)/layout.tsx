import { MobileTabBar } from "@/components/bottom-nav";

export default function BottomNavLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div
        className="pointer-events-none z-50 fixed top-0 left-0 right-0 bg-linear-to-b from-background from-20% to-transparent flex justify-center items-center safe-area-pill-container"
        style={{
          height: "env(safe-area-inset-top, 0px)",
        }}
      >
        
      </div>
      {children}
      <MobileTabBar />
    </>
  );
}

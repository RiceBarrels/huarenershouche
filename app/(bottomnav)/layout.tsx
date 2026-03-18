import { MobileTabBar } from "@/components/bottom-nav";

export default function BottomNavLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <div
        className="pointer-events-none fixed left-0 right-0 bg-gradient-to-t from-background to-transparent"
        style={{
          height: "env(safe-area-inset-bottom, 0px)",
        }}
      />
      <MobileTabBar />
    </>
  );
}

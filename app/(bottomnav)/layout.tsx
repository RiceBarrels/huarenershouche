import { MobileTabBar } from "@/components/bottom-nav";

export default function BottomNavLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <MobileTabBar />
    </>
  );
}

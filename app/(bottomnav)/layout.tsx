import { MobileTabBar } from "@/components/bottom-nav";
import { NotchUI } from "@/components/notch-ui";

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

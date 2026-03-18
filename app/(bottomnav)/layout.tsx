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
        className="pointer-events-none z-50 fixed top-0 left-0 right-0 bg-linear-to-b from-background from-20% to-transparent flex justify-center items-center"
        style={{
          height: "env(safe-area-inset-top, 0px)",
        }}
      >
        <div className="text-white bg-black font-mono text-[11px] px-3 py-1 rounded-full">
          车来车网
        </div>
      </div>
      <MobileTabBar />
    </>
  );
}

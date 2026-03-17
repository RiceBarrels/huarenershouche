import { BackNav } from "@/components/back-nav";
import { SwipeBack } from "@/components/swipe-back";
import { PageTransition } from "@/components/page-transition";

export default function BackNavLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div id="backnav-content">
      <PageTransition>
        <BackNav />
        <SwipeBack />
        {children}
      </PageTransition>
    </div>
  );
}

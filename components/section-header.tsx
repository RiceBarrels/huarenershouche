import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface SectionHeaderProps {
  index?: string;
  label?: string;
  title: string;
  action?: { href: string; label: string };
  className?: string;
}

// Unified section heading: indexed mono micro-label + title + 1px rule.
// e.g. <SectionHeader index="01" label="RECOMMENDED" title="为你推荐" action={{ href: "/browse", label: "查看全部" }} />
export function SectionHeader({ index, label, title, action, className }: SectionHeaderProps) {
  return (
    <div className={className}>
      {(index || label) && (
        <div className="mb-2 hidden items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground md:flex">
          {index && <span className="text-brand">{index}</span>}
          {index && label && <span className="text-foreground/20">/</span>}
          {label && <span>{label}</span>}
        </div>
      )}
      <div className="flex items-end justify-between gap-4">
        <h2 className="font-mono text-base font-bold tracking-tight md:text-2xl md:font-semibold">{title}</h2>
        {action && (
          <Link
            href={action.href}
            className="group flex shrink-0 items-center gap-1 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            {action.label}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={1.5} />
          </Link>
        )}
      </div>
      <div className="mt-3 hidden h-px w-full bg-border md:block" />
    </div>
  );
}

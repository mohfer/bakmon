import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

type BadgeTone = "neutral" | "muted";

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}

const toneClasses: Record<BadgeTone, string> = {
  neutral: "border-border bg-surface text-foreground",
  muted: "border-border bg-transparent text-muted",
};

export function Badge({ tone = "neutral", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-7 max-w-full items-center gap-1.5 rounded-full border px-2.5 font-mono text-[11px] font-medium uppercase tracking-[0.04em]",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

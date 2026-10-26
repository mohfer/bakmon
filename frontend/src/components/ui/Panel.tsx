import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

interface PanelProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
}

export function Panel({ className, children, ...props }: PanelProps) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-[10px] border border-border bg-background",
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}

interface PanelHeaderProps {
  label: string;
  children?: ReactNode;
  className?: string;
}

export function PanelHeader({ label, children, className }: PanelHeaderProps) {
  return (
    <div
      className={cn(
        "flex min-h-[52px] flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-5 py-2.5 sm:px-6",
        className,
      )}
    >
      <h2 className="mono-label">{label}</h2>
      {children ? (
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      ) : null}
    </div>
  );
}

import { ArchiveRestore } from "lucide-react";
import type { ConnectionState } from "../types";
import { StatusBadge } from "./StatusBadge";
import { ThemeToggle } from "./ThemeToggle";

interface HeaderProps {
  state: ConnectionState;
}

export function Header({ state }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between gap-4 px-5 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-foreground">
            <ArchiveRestore size={16} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="text-[15px] font-semibold tracking-[-0.03em]">
              bakmon
            </span>
            <span className="hidden text-[13px] text-muted sm:inline">
              Backup monitor
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <StatusBadge state={state} />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

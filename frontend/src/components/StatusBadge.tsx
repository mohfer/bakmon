import { cn } from "../lib/cn";
import type { ConnectionState } from "../types";

interface StatusBadgeProps {
  state: ConnectionState;
}

const statusConfig = {
  connected: {
    label: "Connected",
    shortLabel: "Live",
    dot: "bg-success",
    description: "Backend connected",
  },
  connecting: {
    label: "Connecting",
    shortLabel: "Connecting",
    dot: "bg-warning animate-pulse",
    description: "Connecting to backend",
  },
  disconnected: {
    label: "Disconnected",
    shortLabel: "Offline",
    dot: "bg-danger",
    description: "Backend disconnected",
  },
} satisfies Record<
  ConnectionState,
  { label: string; shortLabel: string; dot: string; description: string }
>;

export function StatusBadge({ state }: StatusBadgeProps) {
  const config = statusConfig[state];

  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={config.description}
      title={config.description}
      className="inline-flex h-8 items-center gap-2 rounded-full border border-border bg-surface px-3 text-[12px] font-medium text-foreground"
    >
      <span
        aria-hidden="true"
        className={cn("size-1.5 shrink-0 rounded-full", config.dot)}
      />
      <span className="sm:hidden">{config.shortLabel}</span>
      <span className="hidden sm:inline">{config.label}</span>
    </span>
  );
}

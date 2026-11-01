import { useEffect, useState } from "react";
import { AlertTriangle, Check, Eye, EyeOff, Info, X } from "lucide-react";
import { cn } from "../lib/cn";
import type {
  BackupPhase,
  BackupState,
  Milestone,
  MilestoneTone,
} from "../types";
import { Badge } from "./ui/Badge";
import type { BadgeTone } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Panel, PanelHeader } from "./ui/Panel";

interface InfoPanelProps {
  state: BackupState;
  visible: boolean;
  onToggle: () => void;
}

interface PhaseView {
  label: string;
  tone: BadgeTone;
  dot: string;
}

const phaseViews: Record<BackupPhase, PhaseView> = {
  idle: { label: "Idle", tone: "muted", dot: "bg-border-strong" },
  starting: {
    label: "Starting",
    tone: "warning",
    dot: "bg-warning animate-pulse",
  },
  snapshot: {
    label: "Snapshot",
    tone: "warning",
    dot: "bg-warning animate-pulse",
  },
  upload: {
    label: "Uploading",
    tone: "warning",
    dot: "bg-warning animate-pulse",
  },
  waiting: { label: "Waiting", tone: "neutral", dot: "bg-border-strong" },
  completed: { label: "Completed", tone: "success", dot: "bg-success" },
  failed: { label: "Failed", tone: "danger", dot: "bg-danger" },
};

const milestoneDots: Record<MilestoneTone, string> = {
  neutral: "bg-border-strong",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

function relativeTime(updatedAt: number, now: number): string | null {
  if (!updatedAt) {
    return null;
  }

  const seconds = Math.max(0, Math.floor((now - updatedAt) / 1000));

  if (seconds < 2) {
    return "just now";
  }

  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  return `${Math.floor(hours / 24)}d ago`;
}

function vmLabel(state: BackupState): string | null {
  if (!state.vm) {
    return null;
  }

  return state.vm.name
    ? `${state.vm.type} ${state.vm.id} · ${state.vm.name}`
    : `${state.vm.type} ${state.vm.id}`;
}

function getHeadline(state: BackupState): string {
  const vm = vmLabel(state);

  switch (state.phase) {
    case "starting":
      return "Starting backup job";
    case "snapshot":
      if (state.snapshotCompleted) {
        return vm ? `Snapshot complete · ${vm}` : "Snapshot complete";
      }
      return vm ? `Snapshotting ${vm}` : "Snapshot in progress";
    case "upload":
      return vm ? `Uploading ${vm}` : "Upload in progress";
    case "waiting":
      return vm ? `Upload complete · ${vm}` : "Waiting for next job";
    case "completed":
      return "Backup job completed";
    case "failed":
      return "Backup job failed";
    default:
      return "Waiting for backup job";
  }
}

function getMeta(state: BackupState): string | null {
  if (state.phase === "completed") {
    const finished = state.jobFinishedAt ?? "--";
    return state.jobDuration
      ? `Finished ${finished} · ${state.jobDuration}`
      : `Finished ${finished}`;
  }

  if (state.phase === "failed") {
    const at = state.jobFinishedAt ?? state.lastMilestone?.at;
    return at ? `Failed ${at}` : "Run stopped";
  }

  if (state.phase === "idle") {
    return null;
  }

  return state.jobStartedAt ? `Started ${state.jobStartedAt}` : "Live";
}

function getProgressSummary(state: BackupState): string | null {
  if (state.phase === "completed") {
    return `${state.snapshotCount} snapshot${state.snapshotCount === 1 ? "" : "s"} · ${state.uploadCount} upload${state.uploadCount === 1 ? "" : "s"}`;
  }

  if (
    state.phase !== "starting" &&
    state.phase !== "snapshot" &&
    state.phase !== "upload"
  ) {
    return null;
  }

  const { transferred, total, percent, speed, eta } = state.progress;
  const parts: string[] = [];

  if (total !== "--") {
    parts.push(`${transferred} / ${total}`);
  }

  if (percent > 0) {
    parts.push(`${percent}%`);
  }

  if (speed !== "--") {
    parts.push(speed);
  }

  if (eta !== "--") {
    parts.push(`ETA ${eta}`);
  }

  return parts.length > 0 ? parts.join(" · ") : null;
}

function MilestoneMarker({ tone }: { tone: MilestoneTone }) {
  if (tone === "success") {
    return (
      <Check
        size={13}
        strokeWidth={2.25}
        className="mt-0.5 shrink-0 text-success"
        aria-hidden="true"
      />
    );
  }

  if (tone === "danger") {
    return (
      <X
        size={13}
        strokeWidth={2.25}
        className="mt-0.5 shrink-0 text-danger"
        aria-hidden="true"
      />
    );
  }

  if (tone === "warning") {
    return (
      <AlertTriangle
        size={13}
        strokeWidth={2}
        className="mt-0.5 shrink-0 text-warning"
        aria-hidden="true"
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn("mt-[7px] size-1.5 shrink-0 rounded-full", milestoneDots[tone])}
    />
  );
}

function RecentMilestones({ milestones }: { milestones: Milestone[] }) {
  const recent = milestones.slice(0, 4);

  if (recent.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-border pt-4">
      <p className="mono-label">Recent</p>
      <ol className="mt-3 space-y-2.5">
        {recent.map((milestone) => (
          <li key={milestone.id} className="flex items-start gap-3">
            <span className="w-14 shrink-0 pt-px font-mono text-[11px] leading-5 tabular-nums text-muted">
              {milestone.at ?? "--:--"}
            </span>
            <MilestoneMarker tone={milestone.tone} />
            <span className="min-w-0 text-[12px] leading-5 text-foreground/80">
              {milestone.message}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function InfoPanel({ state, visible, onToggle }: InfoPanelProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const phaseView = phaseViews[state.phase];
  const hasRun = state.phase !== "idle" || state.milestones.length > 0;
  const headline = getHeadline(state);
  const meta = getMeta(state);
  const summary = getProgressSummary(state);
  const updated = relativeTime(state.updatedAt, now);
  const showUpdated =
    updated !== null &&
    state.phase !== "idle" &&
    state.phase !== "completed" &&
    state.phase !== "failed";

  return (
    <Panel className="animate-enter [animation-delay:120ms]">
      <PanelHeader label="Latest event">
        {state.warnings > 0 ? (
          <span title={state.lastWarning ?? undefined}>
            <Badge tone="warning">
              <AlertTriangle size={11} strokeWidth={2} aria-hidden="true" />
              {state.warnings} warning{state.warnings === 1 ? "" : "s"}
            </Badge>
          </span>
        ) : null}

        <Badge tone={phaseView.tone}>
          <span
            aria-hidden="true"
            className={cn("size-1.5 shrink-0 rounded-full", phaseView.dot)}
          />
          {phaseView.label}
        </Badge>

        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          aria-expanded={visible}
          aria-controls="latest-event"
        >
          {visible ? (
            <EyeOff size={14} strokeWidth={1.75} aria-hidden="true" />
          ) : (
            <Eye size={14} strokeWidth={1.75} aria-hidden="true" />
          )}
          {visible ? "Hide info" : "Show info"}
        </Button>
      </PanelHeader>

      {visible ? (
        <div id="latest-event" className="animate-enter px-5 py-5 sm:px-6">
          {hasRun ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                <div className="min-w-0">
                  <p className="text-[15px] font-medium leading-6 tracking-[-0.01em] text-foreground">
                    {headline}
                  </p>
                  {meta ? (
                    <p className="mt-1 text-xs leading-5 text-muted">{meta}</p>
                  ) : null}
                </div>

                {showUpdated ? (
                  <span className="shrink-0 font-mono text-[11px] leading-5 text-muted">
                    updated {updated}
                  </span>
                ) : null}
              </div>

              {summary ? (
                <p className="font-mono text-[12px] leading-5 tabular-nums text-muted">
                  {summary}
                </p>
              ) : null}

              <RecentMilestones milestones={state.milestones} />
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <Info
                size={16}
                strokeWidth={1.75}
                className="mt-0.5 shrink-0 text-muted"
                aria-hidden="true"
              />
              <p className="text-sm leading-6 text-muted">
                No summary yet. Snapshot, upload, and completion milestones will
                appear here automatically.
              </p>
            </div>
          )}
        </div>
      ) : null}
    </Panel>
  );
}

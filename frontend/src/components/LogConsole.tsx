import type { RefObject } from "react";
import { ArrowDown, ChevronDown, ChevronUp, Terminal } from "lucide-react";
import { cn } from "../lib/cn";
import type { ConnectionState } from "../types";
import { Button } from "./ui/Button";
import { Panel, PanelHeader } from "./ui/Panel";
import { Skeleton } from "./ui/Skeleton";
import { Switch } from "./ui/Switch";

interface LogConsoleProps {
  logs: string[];
  visible: boolean;
  autoScroll: boolean;
  state: ConnectionState;
  containerRef: RefObject<HTMLDivElement | null>;
  onToggle: () => void;
  onAutoScrollChange: (checked: boolean) => void;
  onScroll: () => void;
  onScrollToBottom: () => void;
}

const skeletonWidths = ["w-[72%]", "w-[84%]", "w-[56%]", "w-[90%]", "w-[64%]"];

function isErrorLine(line: string) {
  return line.startsWith("[ERROR]");
}

function LogSkeleton() {
  return (
    <div className="space-y-3 px-5 py-5 sm:px-6" aria-busy="true">
      {skeletonWidths.map((width) => (
        <div key={width} className="flex items-center gap-4">
          <Skeleton className="hidden h-3 w-8 sm:block" />
          <Skeleton className={cn("h-3", width)} />
        </div>
      ))}
      <span className="sr-only">Waiting for log output</span>
    </div>
  );
}

export function LogConsole({
  logs,
  visible,
  autoScroll,
  state,
  containerRef,
  onToggle,
  onAutoScrollChange,
  onScroll,
  onScrollToBottom,
}: LogConsoleProps) {
  const isEmpty = logs.length === 0;
  const isConnecting = state === "connecting";

  return (
    <Panel className="animate-enter [animation-delay:180ms]">
      <PanelHeader label="Live output">
        <span className="hidden font-mono text-[11px] tabular-nums text-muted sm:inline">
          {logs.length.toLocaleString()} lines
        </span>
        <Button
          variant={visible ? "ghost" : "secondary"}
          size="sm"
          onClick={onToggle}
          aria-expanded={visible}
          aria-controls="live-output"
        >
          {visible ? (
            <ChevronUp size={14} strokeWidth={1.75} aria-hidden="true" />
          ) : (
            <ChevronDown size={14} strokeWidth={1.75} aria-hidden="true" />
          )}
          {visible ? "Hide logs" : "Show logs"}
        </Button>
      </PanelHeader>

      {visible ? (
        <div id="live-output">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-2.5 sm:px-6">
            <Switch
              checked={autoScroll}
              onCheckedChange={onAutoScrollChange}
              label="Auto-scroll"
            />

            {!autoScroll ? (
              <Button variant="ghost" size="sm" onClick={onScrollToBottom}>
                <ArrowDown size={14} strokeWidth={1.75} aria-hidden="true" />
                Scroll to bottom
              </Button>
            ) : null}
          </div>

          {isConnecting && isEmpty ? (
            <div className="bg-surface">
              <LogSkeleton />
            </div>
          ) : isEmpty ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 bg-surface px-6 py-12 text-center">
              <span className="flex size-9 items-center justify-center rounded-md border border-border bg-background text-muted">
                <Terminal size={16} strokeWidth={1.75} aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {state === "disconnected"
                    ? "Log stream unavailable"
                    : "Waiting for output"}
                </p>
                <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-muted">
                  {state === "disconnected"
                    ? "The backend connection is closed. Reload the page to reconnect."
                    : "New lines will appear here as the backup writes them."}
                </p>
              </div>
            </div>
          ) : (
            <div
              ref={containerRef}
              onScroll={onScroll}
              role="log"
              aria-label="Backup logs"
              aria-live="off"
              tabIndex={0}
              className="h-[60vh] max-h-[640px] min-h-[280px] overflow-y-auto overscroll-contain bg-surface py-2 font-mono text-[12px] leading-5 focus-visible:outline-offset-[-2px] sm:text-[13px]"
            >
              {logs.map((line, index) => (
                <div
                  key={index}
                  className="flex gap-4 px-5 py-0.5 transition-colors duration-150 hover:bg-background sm:px-6"
                >
                  <span
                    aria-hidden="true"
                    className="hidden w-8 shrink-0 select-none text-right text-[10px] leading-5 tabular-nums text-muted/60 sm:block"
                  >
                    {String(index + 1).padStart(3, "0")}
                  </span>
                  <span
                    className={cn(
                      "min-w-0 whitespace-pre-wrap break-words",
                      isErrorLine(line) && "text-danger",
                    )}
                  >
                    {line}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </Panel>
  );
}

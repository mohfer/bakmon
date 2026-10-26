import { cn } from "../lib/cn";
import type { ProgressDetail } from "../types";
import { Panel, PanelHeader } from "./ui/Panel";
import { Skeleton } from "./ui/Skeleton";

interface ProgressPanelProps {
  progress: number;
  detail: ProgressDetail;
  loading: boolean;
}

const ticks = Array.from({ length: 21 }, (_, index) => index * 5);
const tickLabels = [0, 25, 50, 75, 100];

function ProgressSkeleton() {
  return (
    <div aria-busy="true" aria-label="Waiting for backup progress">
      <div className="flex items-end justify-between gap-4">
        <Skeleton className="h-12 w-32 sm:h-16 sm:w-36" />
        <Skeleton className="mb-1 h-3 w-24" />
      </div>

      <div className="mt-8 space-y-3 sm:mt-10">
        <Skeleton className="h-0.5 w-full rounded-none" />
        <div className="flex justify-between">
          <Skeleton className="h-2 w-5" />
          <Skeleton className="h-2 w-5" />
          <Skeleton className="h-2 w-5" />
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-6 border-t border-border pt-5 sm:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="space-y-3">
            <Skeleton className="h-2 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProgressPanel({
  progress,
  detail,
  loading,
}: ProgressPanelProps) {
  const metrics = [
    { label: "Transferred", value: detail.transferred },
    { label: "Speed", value: detail.speed },
    { label: "ETA", value: detail.eta },
    { label: "Elapsed", value: detail.elapsed },
  ];

  return (
    <Panel className="animate-enter [animation-delay:60ms]">
      <PanelHeader label="Backup progress" />

      <div className="px-5 py-6 sm:px-8 sm:py-7">
        {loading ? (
          <ProgressSkeleton />
        ) : (
          <>
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
              <span className="font-mono text-[48px] font-medium leading-none tracking-[-0.06em] tabular-nums sm:text-[64px]">
                {progress}
                <span className="ml-1 text-[28px] text-muted sm:text-[32px]">
                  %
                </span>
              </span>
              <span className="pb-1 text-xs text-muted">
                of {detail.total}
              </span>
            </div>

            <div
              className="mt-8 sm:mt-10"
              role="progressbar"
              aria-label="Backup progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              aria-valuetext={`${progress}% — ${detail.transferred} of ${detail.total}`}
            >
              <div className="relative h-12">
                {ticks.map((tick) => {
                  const isMajor = tick % 25 === 0;

                  return (
                    <span
                      key={tick}
                      aria-hidden="true"
                      className={cn(
                        "absolute top-0 w-px -translate-x-1/2",
                        isMajor ? "h-3 bg-border-strong" : "h-1.5 bg-border",
                      )}
                      style={{ left: `${tick}%` }}
                    />
                  );
                })}

                <div className="absolute inset-x-0 top-5 h-0.5 overflow-hidden bg-border">
                  <div
                    className="h-full bg-foreground transition-[width] duration-200 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                {progress > 0 ? (
                  <span
                    aria-hidden="true"
                    className="absolute top-[17px] size-2 -translate-x-1/2 bg-foreground"
                    style={{ left: `${progress}%` }}
                  />
                ) : null}

                <div
                  aria-hidden="true"
                  className="absolute inset-x-0 top-8 flex justify-between font-mono text-[10px] leading-none text-muted"
                >
                  {tickLabels.map((tick) => (
                    <span
                      key={tick}
                      className={cn(
                        "tabular-nums",
                        tick !== 0 && tick !== 50 && tick !== 100
                          ? "hidden sm:inline"
                          : undefined,
                      )}
                    >
                      {tick}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <dl className="mt-8 grid grid-cols-2 border-t border-border sm:grid-cols-4">
              {metrics.map((metric, index) => (
                <div
                  key={metric.label}
                  className={cn(
                    "flex min-w-0 flex-col gap-2 py-5 pr-4",
                    index % 2 === 1 && "border-l border-border pl-4",
                    index >= 2 && "border-t border-border",
                    index > 0 && "sm:border-l sm:border-border sm:pl-5",
                    index >= 2 && "sm:border-t-0",
                    index === 0 && "sm:pl-0",
                  )}
                >
                  <dt className="mono-label">{metric.label}</dt>
                  <dd className="truncate font-mono text-[13px] font-medium leading-none tabular-nums text-foreground sm:text-sm">
                    {metric.value}
                  </dd>
                </div>
              ))}
            </dl>
          </>
        )}
      </div>
    </Panel>
  );
}

import { Badge } from "./ui/Badge";

interface PageHeaderProps {
  target: string;
  hasTarget: boolean;
  endpoint: string;
}

export function PageHeader({ target, hasTarget, endpoint }: PageHeaderProps) {
  return (
    <section className="animate-enter flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <p className="mono-label">Overview</p>
        <h1 className="mt-3 text-[40px] font-semibold leading-[1.04] tracking-[-0.04em] sm:text-[48px]">
          Backup monitor
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-6 text-muted">
          Live progress from your Proxmox backup job, streamed over WebSocket.
        </p>
      </div>

      <dl className="grid w-full grid-cols-[72px_minmax(0,1fr)] items-center gap-x-5 gap-y-3 border-t border-border pt-5 lg:ml-auto lg:w-auto lg:min-w-[360px] lg:border-t-0 lg:pt-0">
        <dt className="mono-label">Target</dt>
        <dd className="min-w-0">
          <Badge tone={hasTarget ? "neutral" : "muted"}>{target}</Badge>
        </dd>

        <dt className="mono-label">Endpoint</dt>
        <dd
          className="truncate font-mono text-xs text-muted"
          title={`WebSocket endpoint: ${endpoint}`}
        >
          {endpoint}
        </dd>
      </dl>
    </section>
  );
}

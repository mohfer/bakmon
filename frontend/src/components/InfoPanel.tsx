import { Eye, EyeOff, Info } from "lucide-react";
import { Button } from "./ui/Button";
import { Panel, PanelHeader } from "./ui/Panel";

interface InfoPanelProps {
  info: string;
  visible: boolean;
  onToggle: () => void;
}

export function InfoPanel({ info, visible, onToggle }: InfoPanelProps) {
  return (
    <Panel className="animate-enter [animation-delay:120ms]">
      <PanelHeader label="Latest event">
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
        <div
          id="latest-event"
          className="animate-enter px-5 py-5 sm:px-6"
        >
          {info ? (
            <div className="flex items-start gap-3">
              <Info
                size={16}
                strokeWidth={1.75}
                className="mt-0.5 shrink-0 text-warning"
                aria-hidden="true"
              />
              <p className="min-w-0 whitespace-pre-wrap break-words font-mono text-[13px] leading-6 text-foreground">
                {info}
              </p>
            </div>
          ) : (
            <p className="text-sm leading-6 text-muted">
              No summary yet. Lines tagged{" "}
              <code className="font-mono text-[12px] text-foreground">INFO:</code>
              , timestamped entries, or{" "}
              <code className="font-mono text-[12px] text-foreground">===</code>{" "}
              summaries appear here.
            </p>
          )}
        </div>
      ) : null}
    </Panel>
  );
}

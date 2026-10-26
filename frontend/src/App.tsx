import { useEffect, useRef, useState } from "react";
import { WifiOff } from "lucide-react";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { InfoPanel } from "./components/InfoPanel";
import { LogConsole } from "./components/LogConsole";
import { PageHeader } from "./components/PageHeader";
import { ProgressPanel } from "./components/ProgressPanel";
import type { ConnectionState, ProgressDetail } from "./types";

function App() {
  const IP_SERVER = import.meta.env.VITE_IP_SERVER || "localhost";
  const PORT = import.meta.env.VITE_PORT || 4000;

  const isLocalOrIP = /^(localhost|127\.0\.0\.1|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i.test(IP_SERVER);
  const wsProtocol = isLocalOrIP ? "ws" : "wss";
  const wsUrl = `${wsProtocol}://${IP_SERVER}:${PORT}`;

  const MAX_LOGS = 1000;

  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState("Connecting...");
  const [showLogs, setShowLogs] = useState(false);
  const [progress, setProgress] = useState(0);
  const [infoLines, setInfoLines] = useState<string[]>([]);
  const [showInfo, setShowInfo] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);

  const latestInfo = infoLines[infoLines.length - 1] || "";

  const [progressDetail, setProgressDetail] = useState<ProgressDetail>({
    transferred: "0.000 GiB",
    total: "0.000 GiB",
    percent: 0,
    speed: "0.000 MiB/s",
    eta: "--",
    elapsed: "--",
    vmType: "--",
    vmId: "--",
  });

  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => setStatus("✅ Connected to backend");
    ws.onclose = () => setStatus("❌ Disconnected from backend");

    ws.onmessage = (event: MessageEvent) => {
      const message =
        typeof event.data === "string" ? event.data : JSON.stringify(event.data);

      const newLines = message.split(/\r?\n/).filter(Boolean);

      setLogs((prev) => {
        const updated = [...prev, ...newLines];
        if (updated.length > MAX_LOGS) {
          return updated.slice(updated.length - MAX_LOGS);
        }
        return updated;
      });

      const infoRegex = /^(?:\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}\s=>|INFO:|===)/;
      const matched = newLines.filter((ln) => infoRegex.test(ln));
      if (matched.length) {
        setInfoLines((prev) => {
          const updated = [...prev, ...matched];
          if (updated.length > 100) {
            return updated.slice(updated.length - 100);
          }
          return updated;
        });
      }

      const regexPercent = /(\d{1,3})%/;
      const matchPercent = message.match(regexPercent);
      if (matchPercent) {
        setProgress(Number(matchPercent[1]));
        setProgressDetail((prev) => ({ ...prev, percent: Number(matchPercent[1]) }));
      }

      const regexDetail =
        /([\d.]+\s\w+) \/ ([\d.]+\s\w+), (\d{1,3})%, ([\d.]+\s\w+\/s), ETA ([\dywdhms.]+)/i;
      const matchDetail = message.match(regexDetail);
      if (matchDetail) {
        setProgressDetail((prev) => ({
          ...prev,
          transferred: matchDetail[1],
          total: matchDetail[2],
          percent: Number(matchDetail[3]),
          speed: matchDetail[4],
          eta: matchDetail[5],
        }));
      }

      const regexElapsed = /Elapsed time:\s+([\dywdhms.]+)/i;
      const matchElapsed = message.match(regexElapsed);
      if (matchElapsed) {
        setProgressDetail((prev) => ({ ...prev, elapsed: matchElapsed[1] }));
      }

      const regexTarget = /vzdump-(qemu|lxc)-(\d+)-\d{4}_\d{2}_\d{2}-\d{2}_\d{2}_\d{2}/i;
      const matchTarget = message.match(regexTarget);
      if (matchTarget) {
        const rawType = matchTarget[1].toLowerCase();
        const vmType = rawType === "qemu" ? "VM" : "LXC";
        const vmId = matchTarget[2];
        setProgressDetail((prev) => ({ ...prev, vmType, vmId }));
      }
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [wsUrl]);

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      const container = logContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  }, [logs, autoScroll, showLogs]);

  const handleScroll = () => {
    const container = logContainerRef.current;
    if (!container) return;

    const isAtBottom =
      container.scrollHeight - container.scrollTop <= container.clientHeight + 10;

    setAutoScroll(isAtBottom);
  };

  const handleScrollToBottom = () => {
    const container = logContainerRef.current;
    if (container) {
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      container.scrollTo({
        top: container.scrollHeight,
        behavior: reduceMotion ? "auto" : "smooth",
      });
    }

    setAutoScroll(true);
  };

  const connectionState: ConnectionState = status.startsWith("✅")
    ? "connected"
    : status.startsWith("❌")
      ? "disconnected"
      : "connecting";

  const hasTarget = progressDetail.vmId !== "--";
  const target = hasTarget
    ? `${progressDetail.vmType} ${progressDetail.vmId}`
    : "Awaiting job";
  const isLoading = connectionState === "connecting" && logs.length === 0;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:border focus:border-border focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:text-foreground"
      >
        Skip to content
      </a>

      <Header state={connectionState} />

      <main
        id="main-content"
        className="mx-auto w-full max-w-[1200px] flex-1 px-5 pb-20 pt-12 sm:px-8 sm:pt-16"
      >
        <PageHeader target={target} hasTarget={hasTarget} endpoint={wsUrl} />

        {connectionState === "disconnected" ? (
          <div
            role="alert"
            className="animate-enter mt-8 flex items-start gap-3 rounded-[10px] border border-border bg-surface px-4 py-3.5 sm:px-5"
          >
            <WifiOff
              size={16}
              strokeWidth={1.75}
              className="mt-0.5 shrink-0 text-danger"
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-medium text-foreground">
                Backend connection closed
              </p>
              <p className="mt-0.5 text-xs leading-5 text-muted">
                Reload the page to start a new WebSocket connection.
              </p>
            </div>
          </div>
        ) : null}

        <div className="mt-8 flex flex-col gap-4 sm:mt-10 sm:gap-5">
          <ProgressPanel
            progress={progress}
            detail={progressDetail}
            loading={isLoading}
          />

          <InfoPanel
            info={latestInfo}
            visible={showInfo}
            onToggle={() => setShowInfo((current) => !current)}
          />

          <LogConsole
            logs={logs}
            visible={showLogs}
            autoScroll={autoScroll}
            state={connectionState}
            containerRef={logContainerRef}
            onToggle={() => setShowLogs((current) => !current)}
            onAutoScrollChange={setAutoScroll}
            onScroll={handleScroll}
            onScrollToBottom={handleScrollToBottom}
          />
        </div>
      </main>

      <Footer endpoint={wsUrl} />
    </div>
  );
}

export default App;

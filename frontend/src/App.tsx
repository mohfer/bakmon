import { useEffect, useState, useRef } from "react";
import {
  Box,
  Button,
  Callout,
  Flex,
  Progress,
  Switch,
  Text,
} from "@radix-ui/themes";
import { CheckCircledIcon, CrossCircledIcon, InfoCircledIcon } from "@radix-ui/react-icons";

function App() {
  const IP_SERVER = import.meta.env.VITE_IP_SERVER || "localhost";
  const PORT = import.meta.env.VITE_PORT || 4000;

  const MAX_LOGS = 1000;

  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState("Connecting...");
  const [showLogs, setShowLogs] = useState(false);
  const [progress, setProgress] = useState(0);
  const [infoLines, setInfoLines] = useState<string[]>([]);
  const [showInfo, setShowInfo] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);

  const latestInfo = infoLines[infoLines.length - 1] || "";

  const [progressDetail, setProgressDetail] = useState({
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
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ws = new WebSocket(`ws://${IP_SERVER}:${PORT}`);

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
  }, [IP_SERVER, PORT]);

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      const container = logContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  }, [logs, autoScroll]);

  const handleScroll = () => {
    const container = logContainerRef.current;
    if (!container) return;

    const isAtBottom =
      container.scrollHeight - container.scrollTop <= container.clientHeight + 10;

    setAutoScroll(isAtBottom);
  };

  return (
    <Box p={{ initial: "2", sm: "4" }}>
      <Flex direction="column" gap="3">
        <Callout.Root color={status.startsWith("✅") ? "grass" : status.startsWith("❌") ? "tomato" : "amber"}>
          <Callout.Icon>
            {status.startsWith("✅") ? (
              <CheckCircledIcon />
            ) : status.startsWith("❌") ? (
              <CrossCircledIcon />
            ) : (
              <InfoCircledIcon />
            )}
          </Callout.Icon>
          <Callout.Text>{status}</Callout.Text>
        </Callout.Root>

        <Box>
          <Flex direction="column" gap="1">
            <Text size="2">Target: {progressDetail.vmType} {progressDetail.vmId}</Text>
            <Text size="2">Transferred: {progressDetail.transferred}</Text>
            <Text size="2">Total: {progressDetail.total}</Text>
            <Text size="2">Percent: {progressDetail.percent}%</Text>
            <Text size="2">Speed: {progressDetail.speed}</Text>
            <Text size="2">ETA: {progressDetail.eta}</Text>
            <Text size="2">Elapsed time: {progressDetail.elapsed}</Text>
          </Flex>
        </Box>

        <Flex gap="2" wrap="wrap" align="center">
          <Button variant="soft" color="yellow" onClick={() => setShowLogs((p) => !p)}>
            {showLogs ? "Hide Logs" : "Show Logs"}
          </Button>
          {!autoScroll && (
            <Button color="grass" onClick={() => {
              logEndRef.current?.scrollIntoView({ behavior: "smooth" });
              setAutoScroll(true);
            }}>
              Scroll to Bottom
            </Button>
          )}
          <Button color="indigo" variant="soft" onClick={() => setShowInfo((s) => !s)}>
            {showInfo ? "Hide Info" : "Show Info"}
          </Button>
          <Flex align="center" gap="2">
            <Text size="2">Auto-scroll</Text>
            <Switch checked={autoScroll} onCheckedChange={(v) => setAutoScroll(Boolean(v))} />
          </Flex>
        </Flex>

        <Box>
          <Progress value={progress} variant="surface" />
          <Flex justify="end">
            <Text size="1" color="amber">{progress}%</Text>
          </Flex>
        </Box>

        {showInfo && (
          <Callout.Root color="amber">
            <Callout.Icon>
              <InfoCircledIcon />
            </Callout.Icon>
            <Callout.Text>
              {latestInfo ? (
                <Text as="span" size="2" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {latestInfo}
                </Text>
              ) : (
                <Text size="1" color="gray">No details yet</Text>
              )}
            </Callout.Text>
          </Callout.Root>
        )}

        {showLogs && (
          <Box style={{ height: '60vh', overflowY: 'auto' }} ref={logContainerRef} onScroll={handleScroll}>
            <Flex direction="column" gap="1" p="2">
              {logs.map((line, i) => (
                <Text key={i} size="1" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {line}
                </Text>
              ))}
              <div ref={logEndRef} />
            </Flex>
          </Box>
        )}
      </Flex>
    </Box>
  );
}

export default App;

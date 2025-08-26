import { useEffect, useState, useRef } from "react";

function App() {
  const IP_SERVER = import.meta.env.VITE_IP_SERVER || "localhost";
  const PORT = Number(import.meta.env.VITE_PORT) || 4000;

  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState("Connecting...");
  const [showLogs, setShowLogs] = useState(true);
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
  });

  const logContainerRef = useRef<HTMLDivElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ws = new WebSocket(`ws://${IP_SERVER}:${PORT}`);

    ws.onopen = () => setStatus("✅ Connected to backend");
    ws.onclose = () => setStatus("❌ Disconnected from backend");
    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
      setStatus("⚠️ Error connecting to backend");
    };

    ws.onmessage = (event: MessageEvent) => {
      const message =
        typeof event.data === "string" ? event.data : JSON.stringify(event.data);

      const newLines = message.split(/\r?\n/).filter(Boolean);
      setLogs((prev) => [...prev, ...newLines]);

      const infoRegex = /^(?:\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}\s=>|INFO:|===)/;
      const matched = newLines.filter((ln) => infoRegex.test(ln));
      if (matched.length) {
        setInfoLines((prev) => [...prev, ...matched]);
      }

      const regexPercent = /(\d{1,3})%/;
      const matchPercent = message.match(regexPercent);
      if (matchPercent) {
        setProgress(Number(matchPercent[1]));
        setProgressDetail((prev) => ({ ...prev, percent: Number(matchPercent[1]) }));
      }

      const regexDetail =
        /([\d.]+\s\w+) \/ ([\d.]+\s\w+), (\d{1,3})%, ([\d.]+\s\w+\/s), ETA ([\dhms.]+)/i;
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

      const regexElapsed = /Elapsed time:\s+([\dhms.]+)/i;
      const matchElapsed = message.match(regexElapsed);
      if (matchElapsed) {
        setProgressDetail((prev) => ({ ...prev, elapsed: matchElapsed[1] }));
      }
    };

    return () => ws.close();
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
    <div className="bg-black text-green-400 font-mono min-h-screen flex flex-col items-center px-2 sm:px-4 py-2 sm:py-4 overflow-x-hidden">
      <div className="w-full">
        {/* Status */}
        <div className="mb-4 text-yellow-300 text-base sm:text-lg text-center">
          {status}
        </div>

        {/* Summary progress */}
        <div className="mb-2 text-sm sm:text-base text-green-300 space-y-1">
          <div>Transferred: {progressDetail.transferred}</div>
          <div>Total: {progressDetail.total}</div>
          <div>Percent: {progressDetail.percent}%</div>
          <div>Speed: {progressDetail.speed}</div>
          <div>ETA: {progressDetail.eta}</div>
          <div>Elapsed time: {progressDetail.elapsed}</div>
        </div>

        {/* Tombol kontrol */}
        <div className="flex gap-2 mb-2 flex-wrap">
          <button
            className="px-3 py-2 bg-gray-800 text-yellow-300 rounded text-sm sm:text-base"
            onClick={() => setShowLogs((prev) => !prev)}
          >
            {showLogs ? "Hide Logs" : "Show Logs"}
          </button>

          {!autoScroll && (
            <button
              className="px-3 py-2 bg-green-600 text-white rounded text-sm sm:text-base"
              onClick={() => {
                logEndRef.current?.scrollIntoView({ behavior: "smooth" });
                setAutoScroll(true);
              }}
            >
              Scroll to Bottom
            </button>
          )}
          <button
            className="px-3 py-2 bg-blue-700 text-white rounded text-sm sm:text-base"
            onClick={() => setShowInfo((s) => !s)}
          >
            {showInfo ? "Hide Info" : "Show Info"}
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-800 rounded h-4 mb-2">
          <div
            className="bg-green-500 h-4 rounded transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-xs sm:text-sm text-right text-yellow-300 mb-2">
          {progress}%
        </div>

        {/* Logs */}
        {showInfo && (
          <div className="mb-2">
            <div className="bg-gray-800 text-sm text-yellow-200 rounded p-2">
              {latestInfo ? (
                <div className="break-words whitespace-pre-wrap">{latestInfo}</div>
              ) : (
                <div className="text-xs text-gray-400">No details yet</div>
              )}
            </div>
          </div>
        )}
        {showLogs && (
          <div
            ref={logContainerRef}
            onScroll={handleScroll}
            className="space-y-1 bg-gray-900 rounded p-2 h-[40vh] sm:h-[60vh] overflow-y-auto text-xs sm:text-sm"
            style={{ scrollBehavior: "auto" }}
          >
            {logs.map((line, i) => (
              <div key={i} className="break-words whitespace-pre-wrap">
                {line}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

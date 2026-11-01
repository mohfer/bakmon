import express from "express";
import { WebSocketServer } from "ws";
import { spawn } from "child_process";
import { readFile } from "fs/promises";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

const today = new Date();
const yyyy = today.getFullYear();
const mm = String(today.getMonth() + 1).padStart(2, "0");
const dd = String(today.getDate()).padStart(2, "0");

const app = express();
const IP_SERVER = process.env.IP_SERVER || "localhost";
const PORT = process.env.PORT || 4000;

const LOG_DIR = process.env.LOG_DIR || "/var/log";
const LOG_FILE = path.join(
    LOG_DIR,
    `backup-vm-${yyyy}-${mm}-${dd}.log`
);
console.log("🚀 ~ LOG_FILE:", LOG_FILE)

const server = app.listen(PORT, () => {
    console.log(`Backend running at http://${IP_SERVER}:${PORT}`);
});

const wss = new WebSocketServer({ server });

const MAX_CONTEXT_LINES = 5000;

function isProgressNoise(line) {
    return (
        line.trim() === "" ||
        /^Transferred:/.test(line) ||
        /^Transferring:/.test(line) ||
        /^Elapsed time:/.test(line) ||
        /^\s*\*\s+/.test(line)
    );
}

function lastTransferSummary(lines) {
    const pattern =
        /Transferred:\s+[\d.]+\s+[A-Za-z]+\s*\/\s*[\d.]+\s+[A-Za-z]+,\s*\d{1,3}%,\s*[\d.]+\s+[A-Za-z]+\/s,\s*ETA\s+\S+/i;

    for (let index = lines.length - 1; index >= 0; index -= 1) {
        const match = lines[index].match(pattern);

        if (match) {
            return match[0];
        }
    }

    return null;
}

function lastMatchingLine(lines, pattern) {
    for (let index = lines.length - 1; index >= 0; index -= 1) {
        if (pattern.test(lines[index])) {
            return lines[index];
        }
    }

    return null;
}

async function readRunContext() {
    try {
        const content = await readFile(LOG_FILE, "utf8");
        // Drop the trailing element: it is either the empty string after the
        // final newline or an incomplete line still being written. tail starts
        // from that line, so the context never duplicates it.
        const lines = content.split(/\r?\n/).slice(0, -1);
        const nextLine = lines.length + 1;

        let start = -1;
        for (let index = lines.length - 1; index >= 0; index -= 1) {
            if (lines[index].startsWith("=== Start:")) {
                start = index;
                break;
            }
        }

        if (start === -1) {
            return null;
        }

        const runLines = lines.slice(start);
        const filtered = runLines.filter((line) => !isProgressNoise(line));
        const finishIndex = filtered.findIndex((line) =>
            line.startsWith("=== Selesai")
        );

        // Keep the final transfer numbers for a finished run so the summary
        // still shows real values when the page opens after completion.
        if (finishIndex !== -1) {
            const finalStats = [
                lastTransferSummary(runLines),
                lastMatchingLine(runLines, /^Elapsed time:/),
            ].filter(Boolean);

            filtered.splice(finishIndex, 0, ...finalStats);
        }

        if (filtered.length <= MAX_CONTEXT_LINES) {
            return { lines: filtered, nextLine };
        }

        return {
            lines: [filtered[0], ...filtered.slice(-(MAX_CONTEXT_LINES - 1))],
            nextLine,
        };
    } catch (error) {
        console.log("Could not build run context:", error.message);
        return null;
    }
}

wss.on("connection", async (ws) => {
    console.log("Client connected");

    const tailFromStart = (process.env.TAIL_FROM_START || "").toLowerCase();
    const fromStart = tailFromStart === "true" || tailFromStart === "1";
    const context = fromStart ? null : await readRunContext();

    if (ws.readyState !== 1) {
        console.log("Client disconnected before stream started");
        return;
    }

    const tailArgs = [];
    if (context?.lines.length) {
        ws.send(`${context.lines.join("\n")}\n`);
        tailArgs.push("-n", `+${context.nextLine}`);
    } else if (fromStart) {
        tailArgs.push("-n", "+1");
    } else {
        const n = String(process.env.TAIL_N || 100);
        tailArgs.push("-n", n);
    }
    tailArgs.push("-f", LOG_FILE);

    const tail = spawn("tail", tailArgs);

    tail.stdout.on("data", (data) => {
        ws.send(data.toString());
    });

    tail.stderr.on("data", (data) => {
        ws.send("[ERROR] " + data.toString());
    });

    ws.on("close", () => {
        console.log("Client disconnected");
        tail.kill();
    });
});

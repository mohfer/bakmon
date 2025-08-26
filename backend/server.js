import express from "express";
import { WebSocketServer } from "ws";
import { spawn } from "child_process";
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

const LOG_FILE = path.join(
    "/var/log",
    `backup-vm-${yyyy}-${mm}-${dd}.log`
);
console.log("🚀 ~ LOG_FILE:", LOG_FILE)

const server = app.listen(PORT, () => {
    console.log(`Backend running at http://${IP_SERVER}:${PORT}`);
});

const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
    console.log("Client connected");

    const tail = spawn("tail", ["-f", LOG_FILE]);

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

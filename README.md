# Backup Monitor

A simple app to monitor home server backup progress in real time over WebSocket. The frontend shows connection status, a progress bar, detailed progress (transferred, total, speed, ETA, elapsed), and line-by-line logs. It also shows the latest single-line info from the backend (lines starting with `INFO:`, timestamped `=>`, or summary `=== ... ===`).

## Tech Stack
- Backend: Node.js WebSocket server
- Frontend: Vite + React + TypeScript (Bun)
- Docker: Optional for backend/deployment
 - External tools (log producers): Proxmox vzdump (VM/LXC backup), rclone (OneDrive upload)

## Structure
- `backend/` — WebSocket server (Dockerfile, docker-compose, server.js)
- `frontend/` — React UI for progress and logs

## Quick Start

1) Backend
- Run locally (adjust scripts if needed):
```cmd
cd backend
npm install
npm start
```
- Or with Docker Compose:
```cmd
cd backend
docker compose up --build
```

2) Frontend
```cmd
cd frontend
bun install
bun dev
```

Open http://localhost:5173 (Vite default). Make sure the backend host/port is correct.

## Environment Variables (Frontend)
- `VITE_IP_SERVER` (default: `localhost`)
- `VITE_PORT` (default: `4000`)

Example `.env` in `frontend/`:
```env
VITE_IP_SERVER=192.168.1.10
VITE_PORT=4000
```

## Notes
- UI auto-scrolls to the newest log. If you scroll up, a button appears to jump back to the bottom.
- The Info panel shows the most recent single-line status from the backend.

## Log source and format

- Sources:
	- Proxmox VM/LXC backup logs produced by `vzdump` (backup job lifecycle output).
	- Upload logs from `rclone` when sending archives to OneDrive.
- Source file (rotated daily):
	- `/var/log/backup-vm-YYYY-MM-DD.log` (date adjusts daily, e.g. `/var/log/backup-vm-2025-08-24.log`).
- Lines recognized by the UI:
	- Timestamped events: `YYYY-MM-DD HH:MM:SS => <message>` (e.g., upload start/success, cleanup).
	- Info lines: `INFO: <message>` (Proxmox vzdump output, etc.).
	- Summary lines: `=== <summary> ===` (e.g., `=== Backup selesai pada 2025-08-26 07:19:31 ===`).
	- Progress details: `<x GiB> / <y GiB>, <percent>%, <speed>/s, ETA <time>`
		- Example: `1.143 GiB / 1.897 GiB, 60%, 2.161 MiB/s, ETA 5m57s`
	- Elapsed time: `Elapsed time: <duration>`
	- Percent-only lines like `60%` also update the progress bar.

Example snippet:
```
INFO: Backup job finished successfully
2025-08-26 07:18:07 => Mulai upload ...tar.zst ke OneDrive
2025-08-26 07:19:30 => Upload sukses, hapus file lokal ...tar.zst
=== Backup selesai pada 2025-08-26 07:19:31 ===
1.143 GiB / 1.897 GiB, 60%, 2.161 MiB/s, ETA 5m57s
Elapsed time: 00:00:10
```


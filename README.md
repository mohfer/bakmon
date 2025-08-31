# Bakmon

A simple app to monitor home server backup progress in real time over WebSocket. The frontend shows connection status, a progress bar, detailed progress (transferred, total, speed, ETA, elapsed), and line-by-line logs. It also shows the latest single-line info from the backend (lines starting with `INFO:`, timestamped `=>`, or summary `=== ... ===`).

## Tech Stack
- Backend: Node.js (Express) + ws (WebSocket)
- Frontend: Vite + React + TypeScript (built with Bun, served by Nginx)
- Docker: Backend and Frontend images via Dockerfiles and per-folder docker-compose
- External tools (log producers): Proxmox vzdump (VM/LXC backup), rclone (OneDrive upload)

## Structure
- `backend/` — WebSocket server (Dockerfile, docker-compose.yml, server.js, .env)
- `frontend/` — React UI (Dockerfile, docker-compose.yml, nginx.conf, .env)
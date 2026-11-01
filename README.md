# Bakmon

A simple app to monitor home server backup progress in real time over WebSocket. The frontend shows connection status, phase-aware progress (snapshot vs upload), detailed metrics (transferred, total, speed, ETA, elapsed), a structured latest-event panel with recent milestones, and line-by-line logs. It reads the current run from the backend, so refreshing mid-run or after completion keeps the full summary.

## Tech Stack

- **Backend:** Node.js (Express) + ws (WebSocket)
- **Frontend:** Vite + React + TypeScript (built with Bun, served by Nginx)
- **Docker:** Multi-stage builds with optimized Alpine images
- **External tools:** Proxmox vzdump (VM/LXC backup), rclone (OneDrive upload)

## Features

- Real-time backup progress monitoring via WebSocket
- Phase-aware progress for vzdump snapshots and rclone uploads
- Structured latest event with recent milestones, warnings, and job counts
- Replays the current run's milestones on connect, even when the page opens mid-run or after completion
- Dynamic WebSocket protocol (ws:// for local/IP, wss:// for domain)
- Progress bar with detailed metrics (speed, ETA, elapsed time)
- Live log viewer with auto-scroll

## Project Structure

```
bakmon/
├── docker-compose.yml          # Main compose file (backend + frontend)
├── Dockerfile.backend          # Optimized multi-stage backend image
├── Dockerfile.frontend         # Multi-stage frontend build + nginx
├── .dockerignore               # Docker build context exclusions
├── .env.example                # Environment variables template
├── backend/
│   ├── server.js               # WebSocket server
│   └── package.json
└── frontend/
    ├── src/
    │   └── App.tsx             # React main component
    ├── nginx.conf              # Nginx configuration
    └── package.json
```

## Quick Start

1. **Clone and setup:**

   ```bash
   git clone https://github.com/mohfer/bakmon.git
   cd bakmon
   cp .env.example .env
   ```

2. **Configure environment:**
   Edit `.env` file:

   ```env
   # Backend
   IP_SERVER=localhost
   PORT=4000

   # Log monitoring configuration
   LOG_DIR=/var/log
   TAIL_FROM_START=false
   TAIL_N=100

   # Frontend (build-time)
   VITE_IP_SERVER=localhost  # Use domain for wss://
   VITE_PORT=4000
   ```

   **Log monitoring options:**

   - `LOG_DIR` — directory containing `backup-vm-YYYY-MM-DD.log` (default `/var/log`; when using Docker, mount it into the backend container).
   - `TAIL_FROM_START=false` — on connect, replay the current run's milestones (progress noise filtered out), then follow new lines.
   - `TAIL_FROM_START=true` — replay the entire log from line one; useful for debugging.
   - `TAIL_N` — trailing line count used only when no run context can be read.

3. **Build and run:**

   ```bash
   docker-compose up -d
   ```

4. **Access:**
   - Frontend: http://localhost:5173
   - Backend WebSocket: ws://localhost:4000

## Configuration

### Understanding Backend vs Frontend Configuration

**Backend Configuration (Runtime - env_file):**

- `IP_SERVER` and `PORT` define where the backend **runs** the WebSocket server
- Can use local IP (192.168.x.x) for internal network
- Config is read at container runtime, can be changed without rebuild

**Frontend Configuration (Build-time - args):**

- `VITE_IP_SERVER` and `VITE_PORT` define the address that client browsers use to **connect** to WebSocket
- Must use domain/IP that is accessible from user's browser
- Config is embedded into JavaScript bundle during build, requires rebuild if changed

### Scenario 1: Development (Local)

Frontend and backend on the same machine:

```env
# Backend (running server on localhost)
IP_SERVER=localhost
PORT=4000

# Frontend (browser connects to localhost)
VITE_IP_SERVER=localhost
VITE_PORT=4000
```

Result: Browser connects to `ws://localhost:4000`

### Scenario 2: Production with Reverse Proxy (Recommended)

Backend in internal network with reverse proxy (nginx/traefik) for SSL:

```env
# Backend (running on internal network)
IP_SERVER=192.168.1.100
PORT=4000

# Frontend (client browser connects to public domain with SSL)
VITE_IP_SERVER=bakmon-backend.example.com
VITE_PORT=443
```

Result: Browser connects to `wss://bakmon-backend.example.com:443`

**Architecture:**

```
Browser → wss://bakmon-backend.example.com:443 (SSL)
         → Reverse Proxy (Nginx/Traefik)
         → ws://192.168.1.100:4000 (Backend Container)
```

**Benefits:**

- Backend remains secure in internal network
- SSL/TLS handled by reverse proxy
- User-friendly domain for clients
- Port 443 is standard for HTTPS/WSS

### Scenario 3: Direct Public Access

Backend directly exposed to public with domain (not recommended for production):

```env
# Backend
IP_SERVER=0.0.0.0
PORT=4000

# Frontend
VITE_IP_SERVER=bakmon.example.com
VITE_PORT=4000
```

### WebSocket Protocol Selection

Frontend automatically selects protocol:

- **ws://** → If IP address or localhost (`192.168.1.100`, `localhost`)
- **wss://** → If domain name (`bakmon-backend.example.com`)

### Port Display Logic

Port is not displayed in URL for standard ports:

- Port 443 for wss:// → `wss://domain.com` (without :443)
- Custom port → `wss://domain.com:8443` (with port)

## Docker Images

**Compressed size (on-disk):**

- **Backend:** ~137MB (Node.js Alpine, multi-stage, non-root user)
- **Frontend:** ~49MB (Nginx Alpine with static build)

**Virtual size (uncompressed):**

- **Backend:** ~197MB
- **Frontend:** ~75MB

## Development

**Backend only:**

```bash
docker-compose up backend
```

**Rebuild after changes:**

```bash
docker-compose build --no-cache
docker-compose up -d
```

**View logs:**

```bash
docker-compose logs -f
```

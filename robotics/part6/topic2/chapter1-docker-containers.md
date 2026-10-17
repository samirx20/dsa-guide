# Part 6, Topic 2: Docker & Background Workers
## Chapter 1: Containers & Docker

### What You'll Learn
- Why "it works on my machine" is a problem
- What containers are and how they differ from VMs
- How to write a Dockerfile
- How to use Docker Compose for multi-container apps

---

## 1. The Problem: Environment Inconsistency

```text
Your Mac:                    Production Server (Linux):
┌────────────────────────┐   ┌────────────────────────┐
│  Node.js 20.10.0       │   │  Node.js 18.19.0       │
│  macOS 14.2            │   │  Ubuntu 22.04          │
│  Apple Silicon (ARM)   │   │  Intel (x86)           │
│                        │   │                        │
│  App works perfectly!  │   │  App crashes!          │
└────────────────────────┘   └────────────────────────┘

"What do you mean it doesn't work? It works on MY machine!"
```

### The Solution: Containers

```text
Container:
┌─────────────────────────────────────────────────────────┐
│  Your App + Node.js 20 + All Dependencies               │
│  ─────────────────────────────────────────────          │
│  Lightweight Linux Kernel (shared with host)            │
│                                                         │
│  Works the SAME everywhere:                             │
│  ✓ Mac                                                  │
│  ✓ Linux                                                │
│  ✓ Windows                                              │
│  ✓ Cloud                                                │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Container vs Virtual Machine

```text
Virtual Machine (Heavy):
┌─────────────────────────────────────────────────────────┐
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │    App A     │  │    App B     │  │    App C     │     │
│  │  + Bins/Libs │  │  + Bins/Libs │  │  + Bins/Libs │     │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤     │
│  │   Guest OS   │  │   Guest OS   │  │   Guest OS   │     │
│  │  (Full VM)   │  │  (Full VM)   │  │  (Full VM)   │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│  ─────────────────────────────────────────────          │
│  Hypervisor                                            │
│  ─────────────────────────────────────────────          │
│  Host OS                                               │
└─────────────────────────────────────────────────────────┘
  • Each VM runs a full OS (GBs of RAM)
  • Boot time: Minutes
  • Heavy overhead

Container (Lightweight):
┌─────────────────────────────────────────────────────────┐
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │    App A     │  │    App B     │  │    App C     │     │
│  │  + Bins/Libs │  │  + Bins/Libs │  │  + Bins/Libs │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│  ─────────────────────────────────────────────          │
│  Container Runtime (Docker)                             │
│  ─────────────────────────────────────────────          │
│  Host OS (shared kernel)                                │
└─────────────────────────────────────────────────────────┘
  • Containers share the host OS kernel
  • Boot time: Milliseconds
  • Very lightweight (MBs of RAM)
```

---

## 3. The Dockerfile

A Dockerfile is a recipe for building your container.

### Basic Node.js Dockerfile

```dockerfile
# 1. Start from a base image
FROM node:20-alpine

# 2. Set working directory inside container
WORKDIR /app

# 3. Copy package files first (for caching)
COPY package*.json ./

# 4. Install dependencies
RUN npm install

# 5. Copy the rest of your code
COPY . .

# 6. Expose the port
EXPOSE 3000

# 7. Start the app
CMD ["npm", "start"]
```

**What each line does:**
```dockerfile
FROM node:20-alpine
# ↑ Use official Node.js 20 image (Alpine Linux = tiny base)

WORKDIR /app
# ↑ Create /app directory and cd into it

COPY package*.json ./
# ↑ Copy package.json and package-lock.json
#   Do this FIRST so Docker caches the npm install layer

RUN npm install
# ↑ Install dependencies
#   This layer is cached unless package*.json changes

COPY . .
# ↑ Copy everything else (your source code)

EXPOSE 3000
# ↑ Tell Docker this app uses port 3000

CMD ["npm", "start"]
# ↑ Command to run when container starts
```

---

## 4. Images vs Containers

```text
Image (Blueprint):
┌─────────────────────────────────────────────────────────┐
│  • Read-only template                                   │
│  • Created from Dockerfile                              │
│  • Stored in registry (Docker Hub, AWS ECR)             │
│  • Like a CLASS in OOP                                  │
└─────────────────────────────────────────────────────────┘

Container (Running Instance):
┌─────────────────────────────────────────────────────────┐
│  • Running instance of an image                         │
│  • Can create many from same image                      │
│  • Has its own filesystem, network, processes           │
│  • Like an OBJECT in OOP                                │
└─────────────────────────────────────────────────────────┘
```

### Build and Run

```bash
# Build an image from Dockerfile
docker build -t my-api .
#        ↑      ↑    ↑
#        |      |    └── Use current directory
#        |      └── Tag (name) the image
#        └── Build command

# Run a container from the image
docker run -p 8080:3000 -d my-api
#      ↑   ↑         ↑   ↑
#      |   |         |   └── Image name
#      |   |         └── Run in background (detached)
#      |   └── Map host port 8080 to container port 3000
#      └── Run command

# Now visit http://localhost:8080
```

---

## 5. Docker Compose (Multi-Container Apps)

Real apps need multiple services (API + Database + Redis).

```yaml
# docker-compose.yml
version: '3.8'

services:
  # Your API
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgres://user:pass@db:5432/mydb
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  # PostgreSQL database
  db:
    image: postgres:15
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=mydb
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  # Redis cache
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

# Persist database data
volumes:
  pgdata:
```

### Commands

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f api

# Rebuild after code changes
docker-compose up -d --build
```

**What's happening:**
```text
docker-compose up -d:
┌─────────────────────────────────────────────────────────┐
│  1. Builds your API image from Dockerfile               │
│  2. Pulls postgres:15 image from Docker Hub             │
│  3. Pulls redis:7-alpine image from Docker Hub          │
│  4. Creates a private network for all services          │
│  5. Starts all containers                               │
│  6. API can reach DB at "db:5432" (service name = DNS)  │
│  7. API can reach Redis at "redis:6379"                 │
└─────────────────────────────────────────────────────────┘
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Build image | `docker build -t name .` |
| Run container | `docker run -p 8080:3000 -d name` |
| List containers | `docker ps` |
| Stop container | `docker stop id` |
| View logs | `docker logs id` |
| Start services | `docker-compose up -d` |
| Stop services | `docker-compose down` |
| Rebuild | `docker-compose up -d --build` |

> **Next:** For adding Redis to your Docker Compose stack — caching, rate limiting, and session storage — see [Part 6, Topic 2: Redis Caching Patterns](./chapter3-redis-caching.md).

---

## Practice & Self-Check

### Predict the Output / Trace by Hand

**Q1. Layer cache (Section 3 Dockerfile).** You already built `my-api` once. For each change below, which of the 7 numbered steps are **served from cache** and which **re-run**?
- (a) You edit only `src/server.js`.
- (b) You add a dependency, so `package.json` and `package-lock.json` change.
- (c) A teammate "simplifies" the file by moving `COPY . .` above `RUN npm install` and deleting the separate `COPY package*.json ./`. Now you edit only `src/server.js`.

**Q2. Port mapping.** You run `docker run -p 8080:3000 -d my-api`, and the app listens on port 3000 inside the container. Which of these succeed?
- (a) From your laptop's browser: `http://localhost:8080`
- (b) From your laptop's browser: `http://localhost:3000`
- (c) You then run `docker run -p 8080:3000 -d my-api` **a second time**. What happens, and how many containers are running?

**Q3. Compose networking (Section 5).** Inside the `api` container:
- (a) Why does `postgres://user:pass@db:5432/mydb` work?
- (b) What happens if someone changes it to `postgres://user:pass@localhost:5432/mydb`?
- (c) The `db` service's mapping is changed to `"5433:5432"`. Which URL must the **API** now use, and which port does a SQL client on your laptop use?

**Q4. Volumes and lifecycle.** You start the Section 5 stack, insert 100 rows into Postgres, and then run each sequence starting from that state. How many rows are there after `docker-compose up -d` again?
- (a) `docker-compose down` → `docker-compose up -d`
- (b) `docker-compose down -v` → `docker-compose up -d`
- (c) Same as (a), but the `volumes:` lines were never added to the `db` service.

**Q5. `depends_on`.** On a cold start the API crashes once with "connection refused" to `db:5432`, even though `depends_on: [db]` is set. Why? What is the fix?

### Coding Exercises

**E1 (Easy).** Write a cache-friendly `Dockerfile` for a FastAPI telemetry service whose project root contains `requirements.txt` and `main.py` (exposing `app`). Use `python:3.12-slim`, listen on port 8000, and make it reachable from outside the container.
Check: `docker build -t telemetry-api . && docker run -p 8000:8000 -d telemetry-api`, then `curl http://localhost:8000/docs` returns the Swagger page.

**E2 (Easy–Medium).** Write a `docker-compose.yml` for `api` (built from `.`), `db` (`postgres:16`), and `redis` (`redis:7-alpine`):
- the API reaches both services **by service name**;
- Postgres data survives `docker compose down`;
- the API only starts once Postgres **accepts connections**, not merely once its container starts.

**E3 (Medium).** Turn E1 into a **multi-stage** build. A `builder` stage turns `requirements.txt` into wheels, and the final stage installs only those wheels, runs as a **non-root** user, and ships no build cache. Add a `.dockerignore` that keeps `.git`, virtualenvs, `__pycache__`, and local `.env` files out of the build context.

#### Dry-Run: Answers

**Q1.**

| step | (a) edit source | (b) change package files | (c) bad order, edit source |
|------|-----------------|---------------------------|----------------------------|
| 1 `FROM` | cache | cache | cache |
| 2 `WORKDIR` | cache | cache | cache |
| 3 `COPY package*.json` | cache (files unchanged) | **re-run** | (removed) |
| 4 `RUN npm install` | cache | **re-run** | — |
| `COPY . .` | **re-run** | **re-run** | **re-run** (moved up) |
| `RUN npm install` (after copy) | — | — | **re-run** (its input layer changed) |
| `EXPOSE`, `CMD` | re-run (metadata only, instant) | re-run | re-run |

The rule is that once a layer's inputs change, **that layer and every layer after it** are rebuilt. Copying the manifest files first means a source-only edit skips the slow `npm install`. In (c), every one-character edit triggers a full reinstall.

**Q2.**
- (a) Works. Host port 8080 forwards to container port 3000.
- (b) Fails (connection refused). Nothing is published on host port 3000. `EXPOSE 3000` is documentation, not a port mapping.
- (c) The second `docker run` **fails**, because host port 8080 is already allocated (`Bind for 0.0.0.0:8080 failed: port is already allocated`). One container keeps running. Depending on the Docker version, the failed one may be left behind in the `Created` state, but it is not running. Use `-p 8081:3000` to run a second copy, which works because both containers come from the same image (one class, many objects).

**Q3.**
- (a) Compose puts all services on a private network with built-in DNS, and the service name `db` resolves to the Postgres container's IP.
- (b) Connection refused. Inside a container, `localhost` is **that container itself**, and no Postgres runs in the `api` container.
- (c) The API still uses **`db:5432`**, because container-to-container traffic uses the *container* port and the mapping only affects the host. Your laptop uses `localhost:5433`.

**Q4.**
- (a) **100 rows.** `down` removes containers and the network, but **keeps named volumes** like `pgdata`.
- (b) **0 rows** (fresh database). `-v` also deletes the named volumes.
- (c) **0 rows.** Without a volume, the data lived in the container's writable layer, which `down` deleted together with the container.

**Q5.** `depends_on` in its short form only orders **container start-up**. Postgres needs a few seconds after its container starts before it accepts connections, and the API connects in that gap. The fix is a `healthcheck` on `db` plus `depends_on: db: condition: service_healthy` (see E2), and ideally connect-retry logic in the app as well.

**E1 — reference solution**

```dockerfile
FROM python:3.12-slim

WORKDIR /app

# Dependencies first: this layer is cached until requirements.txt changes
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Source code last: edits only invalidate this layer
COPY . .

EXPOSE 8000

# 0.0.0.0, not 127.0.0.1: inside the container, loopback is unreachable from the host
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

This is the same ordering trick as Q1. If uvicorn binds `127.0.0.1`, the `-p 8000:8000` mapping forwards traffic to an interface the server is not listening on, and the request fails.

**E2 — reference solution**

```yaml
services:
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/telemetry
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      db:
        condition: service_healthy     # wait for pg_isready, not just "started"
      redis:
        condition: service_started

  db:
    image: postgres:16
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=telemetry
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d telemetry"]
      interval: 5s
      timeout: 3s
      retries: 10

  redis:
    image: redis:7-alpine

volumes:
  pgdata:
```

`db` and `redis` publish no host ports, because only the API needs to reach them and it does so over the Compose network (Q3). The top-level `version:` key is obsolete in Compose v2 and can be omitted.

**E3 — reference solution**

```dockerfile
# ---- Stage 1: build wheels (compilers and caches stay here) ----
FROM python:3.12-slim AS builder
WORKDIR /build
COPY requirements.txt .
RUN pip wheel --no-cache-dir --wheel-dir /wheels -r requirements.txt

# ---- Stage 2: minimal runtime ----
FROM python:3.12-slim
WORKDIR /app
COPY --from=builder /wheels /wheels
RUN pip install --no-cache-dir /wheels/* && rm -rf /wheels
RUN useradd --create-home appuser
COPY --chown=appuser:appuser . .
USER appuser
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```text
# .dockerignore
.git
.venv
venv
__pycache__
*.pyc
.env
```

Only the last stage becomes the image, so anything installed in `builder` (and the pip cache) is discarded. Running as `appuser` means a compromised process inside the container is not root. `.dockerignore` shrinks the build context and keeps secrets in `.env` out of the image layers. It also keeps `COPY . .` from being invalidated by unrelated files like `.git`.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Systems & Robotics Visualizer for **Chapter 1: Containers & Docker**
- **Live Architecture & Data-Flow Sandbox:**
  - Render an interactive system pipeline and state inspector for **chapter1 docker containers**, animating data packets, telemetry frames, validation boundaries, and execution states across each stage.
  - Display live latency, throughput, validation status (`<Badge>` in emerald for valid, rose for rejected/fault), and memory/state transitions as parameters change.
- **Step-by-Step Execution & Failure-Mode Inspector:**
  - Allow the user to inject both valid telemetry payloads and fault scenarios (malformed schemas, timeouts, out-of-range sensor spikes) and watch the system recover or trigger deterministic fallbacks in a live `<Table>` audit log.

### 2. Required `shadcn/ui` Controls
- **Simulation Controls:** `<Button>` triggers for **Run Step**, **Inject Fault / Anomaly**, and **Reset State**; `<Slider>` for request rate, timeout threshold, or physical parameter bounds.
- **Mode & Configuration Toggles:** `<Switch>` to toggle strict validation / guardrails ON vs. OFF, and `<Tabs>` to switch between *Architecture View*, *Live Payload Inspector*, and *Production Code Breakdown*.


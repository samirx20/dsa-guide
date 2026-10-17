# Part 5, Topic 2: Docker & Background Workers
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

> **Next:** For adding Redis to your Docker Compose stack — caching, rate limiting, and session storage — see [Part 5, Topic 3: Redis Caching Patterns](../topic3/chapter2-redis-caching.md).

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


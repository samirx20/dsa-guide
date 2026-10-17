# Part 5, Topic 2: Docker & Background Workers
## Chapter 2: Background Queues

### What You'll Learn
- Why heavy tasks shouldn't run in your API
- How queues and workers work
- How to use BullMQ with Redis
- How to scale workers

---

## 1. The Problem: Blocking the API

```text
User uploads 1GB video, API processes it:
┌─────────────────────────────────────────────────────────┐
│  POST /upload → API starts processing (5 minutes)      │
│                                                         │
│  User waits...                                          │
│  Other users wait...                                    │
│  API is busy, can't handle other requests              │
│  Browser timeout! 💥                                   │
└─────────────────────────────────────────────────────────┘
```

### The Solution: Background Workers

```text
User uploads 1GB video, API queues it:
┌─────────────────────────────────────────────────────────┐
│  POST /upload → API writes job to queue (10ms)          │
│               → API returns 200 OK immediately          │
│                                                         │
│  Worker picks up job → Processes video (5 minutes)      │
│  API is free to handle other requests!                  │
└─────────────────────────────────────────────────────────┘
```

---

## 2. The Architecture

```text
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Frontend  │ ──→ │   API    │ ──→ │  Queue   │ ←── │  Worker  │
│          │ ←── │          │     │ (Redis)  │     │          │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
     │                │                │                │
     │                │                │                │
 "Upload video"   "Add job to     "Store pending    "Pick jobs
                   queue, return   jobs"            and process"
                   immediately"

Flow:
1. Frontend: "Process video X"
2. API: Adds job to Redis queue (instant)
3. API: Returns "Processing!" to frontend
4. Worker: Picks up job from queue
5. Worker: Processes video (5 minutes)
6. Worker: Updates database when done
```

---

## 3. BullMQ Setup

### Install

```bash
npm install bullmq ioredis
```

### API Side: Add Jobs to Queue

```typescript
// queue.ts
import { Queue } from 'bullmq'

const videoQueue = new Queue('VideoProcessing', {
    connection: { host: 'localhost', port: 6379 }
})

export default videoQueue
```

```typescript
// api.ts
import videoQueue from './queue'

app.post('/upload', async (c) => {
    const { videoId } = await c.req.json()

    // Add job to queue (takes milliseconds)
    await videoQueue.add('process-video', {
        videoId,
        resolutions: ['720p', '1080p', '4k']
    })

    // Return immediately
    return c.json({
        message: 'Video queued for processing!',
        videoId
    })
})
```

**What's happening:**
```typescript
await videoQueue.add('process-video', {
    videoId,
    resolutions: ['720p', '1080p', '4k']
})
//  ↑         ↑                ↑
//  |         |                └── Job data (what worker needs)
//  |         └── Job name (for logging)
//  └── Add to queue

// Redis stores:
// { videoId: "abc", resolutions: ["720p", "1080p", "4k"] }
// API returns immediately - doesn't wait for processing!
```

### Worker Side: Process Jobs

```typescript
// worker.ts
import { Worker } from 'bullmq'

const worker = new Worker('VideoProcessing', async (job) => {
    console.log(`Processing video: ${job.data.videoId}`)

    // Heavy work happens here (5 minutes)
    await processVideo(job.data.videoId, job.data.resolutions)

    console.log(`Done processing: ${job.data.videoId}`)
}, {
    connection: { host: 'localhost', port: 6379 }
})

// Handle failures
worker.on('failed', (job, err) => {
    console.error(`Job ${job.id} failed:`, err.message)
})

// Handle completion
worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed!`)
})
```

---

## 4. Running Workers

```bash
# Start API
npm run dev

# Start worker (separate terminal)
npm run worker
```

Or with Docker Compose:

```yaml
# docker-compose.yml
services:
  api:
    build: .
    ports:
      - "3000:3000"
    depends_on:
      - redis

  worker:
    build: .
    command: npm run worker  # Different command than API
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
```

---

## 5. Scaling Workers

```text
1 Worker:
┌──────────┐     ┌──────────┐     ┌──────────┐
│   API    │ ──→ │  Redis   │ ──→ │ Worker 1 │
└──────────┘     └──────────┘     └──────────┘
                                    Processes 1 job at a time

5 Workers:
┌──────────┐     ┌──────────┐     ┌──────────┐
│   API    │ ──→ │  Redis   │ ──→ │ Worker 1 │
└──────────┘     │          │     │ Worker 2 │
                 │          │     │ Worker 3 │
                 │          │     │ Worker 4 │
                 └──────────┘     │ Worker 5 │
                                  └──────────┘
                                  Process 5 jobs in parallel!

Just add more worker containers!
```

---

## 6. Job Options

```typescript
// Delayed job (run in 5 minutes)
await videoQueue.add('process-video', { videoId }, {
    delay: 5 * 60 * 1000  // 5 minutes in milliseconds
})

// Retry on failure (3 attempts)
await videoQueue.add('process-video', { videoId }, {
    attempts: 3,
    backoff: {
        type: 'exponential',  // Wait longer each retry
        delay: 1000           // 1s, 2s, 4s
    }
})

// Priority (lower number = higher priority)
await videoQueue.add('urgent-task', { videoId }, { priority: 1 })
await videoQueue.add('normal-task', { videoId }, { priority: 5 })
```

---

## Quick Reference

| Task | Code |
|------|------|
| Create queue | `new Queue('name', { connection })` |
| Add job | `queue.add('name', data, options)` |
| Create worker | `new Worker('name', processor, { connection })` |
| Delay job | `{ delay: 5000 }` |
| Retry | `{ attempts: 3 }` |
| Priority | `{ priority: 1 }` |

> **Next:** For a practical use case of background queues — sending transactional emails asynchronously with BullMQ — see [Topic 6: Transactional Email](../topic6/chapter2-email-flows.md).

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Systems & Robotics Visualizer for **Chapter 2: Background Queues**
- **Live Architecture & Data-Flow Sandbox:**
  - Render an interactive system pipeline and state inspector for **chapter2 background queues**, animating data packets, telemetry frames, validation boundaries, and execution states across each stage.
  - Display live latency, throughput, validation status (`<Badge>` in emerald for valid, rose for rejected/fault), and memory/state transitions as parameters change.
- **Step-by-Step Execution & Failure-Mode Inspector:**
  - Allow the user to inject both valid telemetry payloads and fault scenarios (malformed schemas, timeouts, out-of-range sensor spikes) and watch the system recover or trigger deterministic fallbacks in a live `<Table>` audit log.

### 2. Required `shadcn/ui` Controls
- **Simulation Controls:** `<Button>` triggers for **Run Step**, **Inject Fault / Anomaly**, and **Reset State**; `<Slider>` for request rate, timeout threshold, or physical parameter bounds.
- **Mode & Configuration Toggles:** `<Switch>` to toggle strict validation / guardrails ON vs. OFF, and `<Tabs>` to switch between *Architecture View*, *Live Payload Inspector*, and *Production Code Breakdown*.


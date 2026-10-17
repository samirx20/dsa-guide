# Part 6, Topic 2: Docker & Background Workers
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
        delay: 1000           // 1s, 2s (3 attempts = 2 retries)
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

## Practice & Self-Check

### Predict the Output / Trace by Hand

**Q1. Retries and backoff (Section 6).** A job is added with `{ attempts: 3, backoff: { type: 'exponential', delay: 1000 } }`, and `processVideo` throws **every** time. How many times does the processor run? How long does BullMQ wait before each retry? (BullMQ's exponential backoff waits $\text{delay} \cdot 2^{\,\text{attemptsMade} - 1}$.) Which worker event fires, and how often? How many attempts would you need to get three waits of 1 s, 2 s and 4 s?

**Q2. Priority order.** With **no worker running**, the API adds these jobs in this order. Then one worker with concurrency 1 starts. In what order are they processed?

```typescript
await videoQueue.add('A', { videoId: 'a' }, { priority: 5 })
await videoQueue.add('B', { videoId: 'b' }, { priority: 1 })
await videoQueue.add('C', { videoId: 'c' }, { priority: 5 })
await videoQueue.add('D', { videoId: 'd' })               // no priority
```

**Q3. Scaling math (Section 5).** 20 videos are queued at once, each takes exactly 5 minutes, and each worker processes one job at a time. How long until the last one finishes with 1 worker, 5 workers, and 3 workers?

**Q4. Delays are a minimum.** At 12:00:00 a job is added with `delay: 5 * 60 * 1000`. The only worker is busy with a 7-minute job that started at 12:00:00. When does the delayed job **start**?

**Q5. Compose wiring (Section 4).** You run the chapter's compose file with `docker compose up -d --scale worker=5`.
- (a) How many containers are running in total?
- (b) The worker logs `connect ECONNREFUSED 127.0.0.1:6379`. Which line of `worker.ts` is wrong, and what should it say?

### Coding Exercises

**E1 (Easy).** Write `backoffDelays(attempts: number, baseMs: number): number[]` that returns the waits BullMQ's exponential backoff performs if **every** attempt fails.
- `backoffDelays(3, 1000)` returns `[1000, 2000]`
- `backoffDelays(5, 500)` returns `[500, 1000, 2000, 4000]`
- `backoffDelays(1, 1000)` returns `[]`

**E2 (Easy–Medium).** Write `makespan(durations: number[], workers: number): number`, the time at which the last job finishes when jobs are taken **in queue order** and each job goes to whichever worker is free earliest.
- `makespan([5, 5, 5, 5, 5], 2)` returns `15`
- `makespan([10, 1, 1, 1], 2)` returns `10`
- `makespan(Array(20).fill(5), 3)` returns `35`. `makespan([], 4)` returns `0`.

**E3 (Medium).** Write an in-memory retry runner that mimics a BullMQ worker with `attempts` and exponential `backoff`:

```typescript
type Result = { status: 'completed' | 'failed'; attemptsMade: number;
                waits: number[]; value?: unknown; error?: string }

async function runWithRetry(
    processor: (attempt: number) => Promise<unknown>,
    attempts: number,
    baseMs: number,
    sleep?: (ms: number) => Promise<void>,   // injectable so tests don't really wait
): Promise<Result>
```

- A processor that throws on attempts 1 and 2 and returns `'ok'` on attempt 3, with `(attempts=3, baseMs=1000)`, gives `{ status: 'completed', attemptsMade: 3, waits: [1000, 2000], value: 'ok' }`.
- A processor that always throws `'ffmpeg crashed'` gives `{ status: 'failed', attemptsMade: 3, waits: [1000, 2000], error: 'ffmpeg crashed' }`.

#### Dry-Run: Answers

**Q1.** The processor runs **3 times** in total (`attempts` counts the first try, not just the retries).

| attempt | outcome | attemptsMade | wait before next |
|--------:|---------|-------------:|-----------------:|
| 1 | throws | 1 | $1000 \cdot 2^0 = 1000$ ms |
| 2 | throws | 2 | $1000 \cdot 2^1 = 2000$ ms |
| 3 | throws | 3 | — (no attempts left) |

There are only **two** waits (1 s, 2 s), which is what the chapter's comment `// 1s, 2s (3 attempts = 2 retries)` says. A third wait of 4 s would need `attempts: 4`. The worker's `'failed'` event fires on **every** failed attempt (3 times, with `attemptsMade` 1, 2, 3). After the third, the job moves to the *failed* set for good, and `'completed'` never fires.

**Q2.** **D, B, A, C.** In BullMQ, a job **without** a priority goes to the normal wait list and is picked before any prioritized job. Among prioritized jobs, a lower number means more urgent ($1$ before $5$). Equal priorities keep insertion order, so A comes before C.

**Q3.** The finish time is $\lceil \tfrac{\text{jobs}}{\text{workers}} \rceil \times 5$ minutes:
- 1 worker: $20 \times 5 = 100$ min
- 5 workers: $\lceil 20/5 \rceil = 4$ rounds, so **20 min**
- 3 workers: $\lceil 20/3 \rceil = 7$ rounds, so **35 min**. The last round has only 2 jobs, so one worker sits idle.

**Q4.** At **12:07:00**. The job becomes *eligible* at 12:05:00, but the only worker is still busy until 12:07:00. `delay` is the earliest start time, not a guaranteed start time.

**Q5.**
- (a) **7**: 1 `api` + 5 `worker` + 1 `redis`. Every worker container runs the same image with `command: npm run worker`, and they all pull from the same Redis list, so each job goes to exactly one worker.
- (b) `connection: { host: 'localhost', port: 6379 }`. Inside a container, `localhost` is the worker container itself. It should be `host: 'redis'` (the Compose service name), ideally read from an env var such as `process.env.REDIS_HOST`. The same fix applies to `queue.ts` in the API.

**E1 — reference solution**

```typescript
export function backoffDelays(attempts: number, baseMs: number): number[] {
    const waits: number[] = []
    // a wait happens after every failed attempt except the last one
    for (let attemptsMade = 1; attemptsMade < attempts; attemptsMade++) {
        waits.push(baseMs * 2 ** (attemptsMade - 1))
    }
    return waits
}
```

There are $\max(0, n - 1)$ waits. Their sum is $\text{base} \cdot (2^{n-1} - 1)$, so `(3, 1000)` waits $1000 \cdot 3 = 3000$ ms in total.

**E2 — reference solution**

```typescript
export function makespan(durations: number[], workers: number): number {
    const freeAt: number[] = new Array(workers).fill(0)   // when each worker is next free
    for (const d of durations) {
        let idx = 0
        for (let i = 1; i < workers; i++) if (freeAt[i] < freeAt[idx]) idx = i
        freeAt[idx] += d                                   // job runs on earliest-free worker
    }
    return Math.max(0, ...freeAt)
}
```

Trace for `[10, 1, 1, 1]` with 2 workers: `freeAt` goes $[0,0] \to [10,0] \to [10,1] \to [10,2] \to [10,3]$, so the answer is $\max = 10$. One long job dominates, and adding workers cannot beat the longest single job. The loop is $O(n \cdot w)$. A min-heap would make it $O(n \log w)$.

**E3 — reference solution**

```typescript
type Result = { status: 'completed' | 'failed'; attemptsMade: number;
                waits: number[]; value?: unknown; error?: string }

export async function runWithRetry(
    processor: (attempt: number) => Promise<unknown>,
    attempts: number,
    baseMs: number,
    sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
): Promise<Result> {
    const waits: number[] = []
    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            const value = await processor(attempt)
            return { status: 'completed', attemptsMade: attempt, waits, value }
        } catch (err) {
            if (attempt === attempts) {
                return { status: 'failed', attemptsMade: attempt, waits,
                         error: (err as Error).message }
            }
            const wait = baseMs * 2 ** (attempt - 1)
            waits.push(wait)
            await sleep(wait)
        }
    }
    throw new Error('unreachable')
}

// test without real waiting:
// await runWithRetry(async (a) => { if (a < 3) throw new Error('x'); return 'ok' },
//                    3, 1000, async () => {})
```

This is Q1's trace in code. Injecting `sleep` makes the test instant and deterministic, the same idea as overriding a dependency. Because the processor receives `attempt`, it can behave differently on retries, for example to skip work that already succeeded, so retries stay **idempotent**.

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


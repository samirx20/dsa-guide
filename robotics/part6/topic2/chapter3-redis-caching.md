# Part 5, Topic 3: Caching & Performance
## Chapter 2: Redis Caching Patterns

### What You'll Learn
- What Redis is and why it's fast
- How to add Redis to your Docker Compose stack
- Cache-aside pattern
- Cache invalidation strategies
- Practical caching patterns

---

## 1. What is Redis?

Redis is an in-memory key-value store. It's 100x faster than Postgres for simple lookups because data lives in RAM, not on disk.

```text
Postgres (disk-based):
┌──────────┐     ┌──────────┐
│ Request  │ ──→ │ Postgres │     ~5-50ms
│          │ ←── │ (disk)   │
└──────────┘     └──────────┘

Redis (memory-based):
┌──────────┐     ┌──────────┐
│ Request  │ ──→ │  Redis   │     ~0.1-1ms
│          │ ←── │ (RAM)    │
└──────────┘     └──────────┘
```

### Use Cases

| Use Case | Why Redis |
|----------|-----------|
| Session store | Fast reads, TTL for expiry |
| API response cache | Avoid repeated DB queries |
| Rate limiting | Atomic counters |
| Job queue | BullMQ uses Redis |
| Real-time pub/sub | Multi-server communication |

---

## 2. Docker Compose Setup

Add Redis to your existing stack.

```yaml
# docker-compose.yml
services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgres://postgres:password@db:5432/mydb
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: password
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data

volumes:
  pgdata:
  redisdata:
```

```bash
docker compose up -d
```

---

## 3. Redis Client Setup

```typescript
// lib/redis.ts
import Redis from 'ioredis'

export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

redis.on('error', (err) => {
    console.error('Redis connection error:', err.message)
})
```

---

## 4. Basic Operations

```typescript
// SET a value (with optional TTL)
await redis.set('user:42', JSON.stringify({ name: 'Alice' }))
await redis.set('token:abc', 'value', 'EX', 3600)  // Expires in 1 hour

// GET a value
const data = await redis.get('user:42')
const user = data ? JSON.parse(data) : null

// DELETE a value
await redis.del('user:42')

// Check if key exists
const exists = await redis.exists('user:42')

// Increment a counter
await redis.incr('page_views:/home')

// Set with NX (only if not exists — useful for locks)
const acquired = await redis.set('lock:job:123', '1', 'EX', 30, 'NX')
// Returns 'OK' if acquired, null if already locked
```

---

## 5. Cache-Aside Pattern

The most common caching strategy.

```text
Cache-aside flow:
┌──────────┐     ┌──────────┐     ┌──────────┐
│ Request  │ ──→ │  Redis   │     │ Postgres │
│          │     │          │     │          │
│          │     │ Check    │     │          │
│          │     │ cache    │     │          │
│          │     ├──────────┤     │          │
│          │     │ HIT?     │     │          │
│          │ ←── │ Return   │     │          │
│          │     │ cached   │     │          │
│          │     │          │     │          │
│          │     │ MISS?    │     │ Query    │
│          │ ──────────────────→ │ DB       │
│          │     │          │ ←── │          │
│          │     │ Store in │     │          │
│          │     │ cache    │     │          │
│          │ ←── │ Return   │     │          │
└──────────┘     └──────────┘     └──────────┘
```

### Implementation

```typescript
async function getProducts() {
    const cacheKey = 'products:all'

    // 1. Check cache
    const cached = await redis.get(cacheKey)
    if (cached) {
        return JSON.parse(cached)  // Cache hit
    }

    // 2. Cache miss: query database
    const products = await db.select().from(products)

    // 3. Store in cache (TTL: 5 minutes)
    await redis.set(cacheKey, JSON.stringify(products), 'EX', 300)

    return products
}

async function getProduct(id: number) {
    const cacheKey = `product:${id}`

    const cached = await redis.get(cacheKey)
    if (cached) return JSON.parse(cached)

    const [product] = await db.select()
        .from(products)
        .where(eq(products.id, id))

    if (product) {
        await redis.set(cacheKey, JSON.stringify(product), 'EX', 300)
    }

    return product
}
```

### As a Hono Middleware

```typescript
function cacheMiddleware(ttlSeconds: number) {
    return async (c, next) => {
        const key = `cache:${c.req.method}:${c.req.url}`
        const cached = await redis.get(key)

        if (cached) {
            return c.json(JSON.parse(cached))
        }

        await next()

        // Cache successful GET responses
        if (c.res.status === 200 && c.req.method === 'GET') {
            const body = await c.res.clone().text()
            await redis.set(key, body, 'EX', ttlSeconds)
        }
    }
}

// Usage
app.get('/products', cacheMiddleware(300), async (c) => {
    const products = await db.select().from(products)
    return c.json(products)
})
```

---

## 6. Cache Invalidation

When data changes, you need to invalidate (delete) cached data.

### TTL-Based (Simple)

```typescript
// Every cache entry expires after 5 minutes
await redis.set(key, data, 'EX', 300)
// After 5 min, it's gone. Next request repopulates it.
```

### Event-Based (Precise)

```typescript
// When a product is updated, invalidate its cache
app.put('/products/:id', authGuard(), async (c) => {
    const id = c.req.param('id')
    const data = await c.req.json()

    await db.update(products).set(data).where(eq(products.id, id))

    // Invalidate cache
    await redis.del(`product:${id}`)
    await redis.del('products:all')  // Also invalidate the list

    return c.json({ success: true })
})
```

### Stale Data Tradeoff

```text
TTL-based:    Simple, but stale data possible for up to TTL duration
Event-based:  Precise, but more code, race conditions possible
Hybrid:       Use short TTL + event invalidation (recommended)
```

---

## 7. Cache Stampede

When a popular cache entry expires, 1000 requests might hit the database simultaneously.

```text
Cache stampede:
┌─────────────────────────────────────────────┐
│  Cache expires                              │
│  1000 requests arrive at the same time      │
│  All 1000 query the database                │
│  Database overloaded 💥                     │
└─────────────────────────────────────────────┘
```

### Solution: Locking

```typescript
async function getWithLock(key: string, fetchFn: () => Promise<any>, ttl: number) {
    // 1. Check cache
    const cached = await redis.get(key)
    if (cached) return JSON.parse(cached)

    // 2. Try to acquire lock
    const lockKey = `lock:${key}`
    const acquired = await redis.set(lockKey, '1', 'EX', 10, 'NX')

    if (!acquired) {
        // Another request is fetching — wait and retry
        await new Promise(resolve => setTimeout(resolve, 100))
        return getWithLock(key, fetchFn, ttl)  // Recursive retry
    }

    try {
        // 3. Fetch from source
        const data = await fetchFn()
        await redis.set(key, JSON.stringify(data), 'EX', ttl)
        return data
    } finally {
        await redis.del(lockKey)
    }
}

// Usage
const products = await getWithLock(
    'products:all',
    () => db.select().from(products),
    300
)
```

---

## 8. Redis as Session Store

Ties back to Part 4 auth — store sessions in Redis for speed.

```typescript
// lib/sessions.ts
import { redis } from './redis'

export async function createSession(sessionId: string, userId: number) {
    await redis.set(
        `session:${sessionId}`,
        JSON.stringify({ userId, createdAt: Date.now() }),
        'EX',
        7 * 24 * 60 * 60  // 7 days
    )
}

export async function getSession(sessionId: string) {
    const data = await redis.get(`session:${sessionId}`)
    return data ? JSON.parse(data) : null
}

export async function deleteSession(sessionId: string) {
    await redis.del(`session:${sessionId}`)
}
```

---

## 9. Rate Limiting with Redis

```typescript
async function isRateLimited(key: string, limit: number, windowSeconds: number) {
    const current = await redis.incr(key)

    if (current === 1) {
        await redis.expire(key, windowSeconds)
    }

    return current > limit
}

// Usage in middleware
app.post('/auth/login', async (c) => {
    const ip = c.req.header('X-Forwarded-For') || 'unknown'

    if (await isRateLimited(`ratelimit:login:${ip}`, 5, 900)) {
        return c.json({ error: 'Too many attempts. Try again in 15 minutes.' }, 429)
    }

    // ... handle login
})
```

---

## Quick Reference

| Task | How |
|------|-----|
| Connect | `new Redis(process.env.REDIS_URL)` |
| Get | `await redis.get('key')` |
| Set with TTL | `await redis.set('key', 'val', 'EX', 300)` |
| Delete | `await redis.del('key')` |
| Cache-aside | Check cache → miss → query DB → store in cache |
| Invalidate | `await redis.del(key)` on data change |
| Rate limit | `await redis.incr(key)` + `redis.expire(key, window)` |
| Session store | `redis.set('session:id', data, 'EX', 604800)` |

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Systems & Robotics Visualizer for **Chapter 2: Redis Caching Patterns**
- **Live Architecture & Data-Flow Sandbox:**
  - Render an interactive system pipeline and state inspector for **chapter3 redis caching**, animating data packets, telemetry frames, validation boundaries, and execution states across each stage.
  - Display live latency, throughput, validation status (`<Badge>` in emerald for valid, rose for rejected/fault), and memory/state transitions as parameters change.
- **Step-by-Step Execution & Failure-Mode Inspector:**
  - Allow the user to inject both valid telemetry payloads and fault scenarios (malformed schemas, timeouts, out-of-range sensor spikes) and watch the system recover or trigger deterministic fallbacks in a live `<Table>` audit log.

### 2. Required `shadcn/ui` Controls
- **Simulation Controls:** `<Button>` triggers for **Run Step**, **Inject Fault / Anomaly**, and **Reset State**; `<Slider>` for request rate, timeout threshold, or physical parameter bounds.
- **Mode & Configuration Toggles:** `<Switch>` to toggle strict validation / guardrails ON vs. OFF, and `<Tabs>` to switch between *Architecture View*, *Live Payload Inspector*, and *Production Code Breakdown*.


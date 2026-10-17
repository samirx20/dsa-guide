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

## Practice & Self-Check

### Predict the Output / Trace by Hand

**Q1. Return values (Section 4, ioredis).** Starting from an empty Redis, what does each `await` return?

```typescript
await redis.set('user:42', JSON.stringify({ name: 'Alice' }))   // 1
await redis.exists('user:42')                                   // 2
await redis.incr('page_views:/home')                            // 3
await redis.incr('page_views:/home')                            // 4
await redis.set('lock:job:123', '1', 'EX', 30, 'NX')            // 5
await redis.set('lock:job:123', '1', 'EX', 30, 'NX')            // 6
await redis.del('user:42')                                      // 7
await redis.del('user:42')                                      // 8
await redis.get('user:42')                                      // 9
```

**Q2. Cache-aside timeline (Section 5).** `getProduct(7)` uses `EX 300`. The requests below arrive at the given second marks, and nothing else touches Redis. Mark each as HIT or MISS and count the database queries.

| t (s) | request |
|------:|---------|
| 0 | `GET /products/7` |
| 100 | `GET /products/7` |
| 299 | `GET /products/7` |
| 301 | `GET /products/7` |
| 350 | `PUT /products/7` (Section 6 event-based handler) |
| 360 | `GET /products/7` |

**Q3. Rate limiter trace (Section 9).** `isRateLimited(key, 5, 900)` is called for the same IP at $t = 0, 1, 2, 3, 4, 5, 6$ s and again at $t = 901$ s. What does each call return? Then: the limiter claims "5 per 15 minutes". What is the **maximum** number of attempts an attacker can get through within a span of about 2 seconds?

**Q4. Cache penetration.** A scraper requests `GET /products/999` 1,000 times per second, and product 999 does not exist. Using the chapter's `getProduct`, how many database queries per second does this cause, and why?

**Q5. Stampede lock (Section 7).** Three requests (A, B, C) call `getWithLock('products:all', fetchFn, 300)` at $t = 0$ on a cold cache. A wins the lock. Ignore Redis latency.
- (a) `fetchFn` takes 250 ms. How many times is `fetchFn` called, and roughly when do B and C return?
- (b) `fetchFn` takes **12 s** (the lock TTL is 10 s). What goes wrong?

### Coding Exercises

**E1 (Easy).** The middleware's key is built from `c.req.url`, so `?limit=10&sort=price` and `?sort=price&limit=10` become two different cache entries. Write
`cacheKeyFor(method: string, path: string, query: Record<string, string>): string`,
which sorts the query keys and upper-cases the method.
- `cacheKeyFor('get', '/products', { sort: 'price', limit: '10' })` returns `'cache:GET:/products?limit=10&sort=price'`
- `cacheKeyFor('GET', '/products', {})` returns `'cache:GET:/products'`

**E2 (Easy–Medium).** Fix Q4 with **negative caching**. Write `getProductCached(id: number)`, which caches found products for 300 s and caches a sentinel `'__missing__'` for 30 s when the product does not exist (returning `null`).
- With only product 1 in the DB: `getProductCached(1)` twice uses 1 DB query in total. `getProductCached(999)` twice adds **1** more query (2 in total). After 31 s, `getProductCached(999)` queries again (3 in total).

**E3 (Medium).** Rewrite the Section 9 limiter so that **a crash can never leave a key without a TTL**, and so it reports useful headers:

```typescript
async function rateLimit(key: string, limit: number, windowSeconds: number):
    Promise<{ allowed: boolean; remaining: number; retryAfter: number }>
```

- With `limit = 3, window = 60`, four calls at $t = 0$ return `remaining` 2, 1, 0 (allowed) and then `{ allowed: false, remaining: 0, retryAfter: 60 }`.
- A call at $t = 45$ returns `retryAfter: 15`. At $t = 60$ the window has reset, so the call is allowed with `remaining: 2`.

#### Dry-Run: Answers

**Q1.**

| # | returns | why |
|--:|---------|-----|
| 1 | `'OK'` | |
| 2 | `1` | `EXISTS` returns the **count** of existing keys, not a boolean |
| 3 | `1` | a missing key counts as 0 before `INCR` |
| 4 | `2` | |
| 5 | `'OK'` | lock acquired |
| 6 | `null` | `NX` and the key already exists, so it is not set |
| 7 | `1` | one key deleted |
| 8 | `0` | nothing left to delete |
| 9 | `null` | |

**Q2.**

| t (s) | result | DB queries so far |
|------:|--------|------------------:|
| 0 | MISS: query, then `SET … EX 300` (expires at 300) | 1 |
| 100 | HIT | 1 |
| 299 | HIT | 1 |
| 301 | MISS (expired at 300): query, re-cache until 601 | 2 |
| 350 | `UPDATE` in DB, then `DEL product:7` and `DEL products:all` | 2 (+1 write) |
| 360 | MISS (deleted): query, re-cache until 660 | 3 |

That is **3** read queries. Without the event-based `DEL`, the request at 360 would have been a HIT serving the **stale** pre-update product until $t = 601$.

**Q3.**

| t | `INCR` result | returns |
|--:|--------------:|---------|
| 0 | 1 (and `EXPIRE 900`, so the key dies at 900) | `false` |
| 1–4 | 2, 3, 4, 5 | `false` |
| 5 | 6 | **`true`** |
| 6 | 7 | `true` |
| 901 | 1 (old key expired at 900, so a fresh window starts) | `false` |

Fixed-window burst: **9**. An attacker makes 1 attempt at time $T$, which creates the key with a TTL that ends at $T + 900$. They save the other 4 attempts for $T + 899$ (counts 2–5, all allowed). The key expires at $T + 900$, and 5 more attempts are allowed immediately (a new window, counts 1–5). That is $4 + 5 = 9$ attempts within about 1 second, even though the limit says 5 per 15 minutes. A fixed window limits *per window*, not *per any 15-minute span*. With windows aligned to the clock instead of to the first request, the worst case reaches $2 \times$ the limit. Sliding-window algorithms fix this.

**Q4.** **About 1,000 queries per second**, which is every single request. `getProduct` only caches when `if (product)` is truthy. A missing product is never cached, so every request misses Redis and goes to Postgres. Caching is useless against requests for keys that do not exist (see E2).

**Q5.**
- (a) **1 call.** A holds `lock:products:all` from 0 to 250 ms and writes the cache at about 250 ms. B and C find no cache, fail `SET NX`, and sleep 100 ms. They retry at 100 and 200 ms (still locked, no cache), and at about **300 ms** they find a cache HIT and return.
- (b) The lock **expires at 10 s while A is still fetching**. The next retrying request (B, say) acquires a fresh lock and *also* calls `fetchFn`, so the database gets a second query. Worse, when A finishes at 12 s, its `finally` deletes `lock:products:all`, which is now **B's** lock, so C can start a third fetch. The fix is to make the lock TTL longer than the worst-case fetch time, and to store a unique token as the lock value so that you only delete your own lock (compare-and-delete).

**E1 — reference solution**

```typescript
export function cacheKeyFor(method: string, path: string,
                            query: Record<string, string>): string {
    const qs = Object.keys(query)
        .sort()
        .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(query[k])}`)
        .join('&')
    return `cache:${method.toUpperCase()}:${path}${qs ? '?' + qs : ''}`
}
```

Sorting makes the key **canonical**: equivalent requests map to one entry, so the hit rate goes up. `encodeURIComponent` keeps `&` or `=` inside values from producing ambiguous keys. The cost is $O(k \log k)$ for $k$ query parameters.

**E2 — reference solution**

```typescript
const MISSING = '__missing__'

export async function getProductCached(id: number) {
    const key = `product:${id}`
    const cached = await redis.get(key)
    if (cached === MISSING) return null              // negative hit
    if (cached !== null) return JSON.parse(cached)   // positive hit

    const product = await findProduct(id)            // DB query
    if (product) await redis.set(key, JSON.stringify(product), 'EX', 300)
    else         await redis.set(key, MISSING, 'EX', 30)   // short TTL: it may be created soon
    return product
}
```

Trace: `get(1)` misses, so it queries (1). `get(1)` hits (1). `get(999)` misses, queries (2), and stores the sentinel. `get(999)` hits the sentinel (2). At 31 s the sentinel has expired, so it queries again (3). Compare against `null` explicitly rather than relying on truthiness, so that a cached empty string or sentinel cannot be confused with a miss. If product 999 is created later, also `DEL product:999` in the create handler.

**E3 — reference solution**

```typescript
export async function rateLimit(key: string, limit: number, windowSeconds: number) {
    // 1. Create the key WITH its TTL in one atomic command (no-op if it exists)
    await redis.set(key, '0', 'EX', windowSeconds, 'NX')
    // 2. INCR keeps the existing TTL
    const count = await redis.incr(key)
    const allowed = count <= limit
    return {
        allowed,
        remaining: Math.max(0, limit - count),
        retryAfter: allowed ? 0 : await redis.ttl(key),   // seconds until the window resets
    }
}
```

In the chapter's version, a crash between `INCR` and `EXPIRE` leaves a counter with **no TTL**, which locks that IP out forever. Here the TTL is attached when the key is created, so every key that exists already has an expiry. Trace (`limit = 3`): counts 1, 2, 3 are allowed with `remaining` 2, 1, 0. Count 4 is blocked with `TTL = 60`. At $t = 45$ the TTL is $60 - 45 = 15$. At $t = 60$ the key has expired, so `SET NX` recreates it, `INCR` gives 1, and `remaining` is 2. Send `retryAfter` as the `Retry-After` header with the `429`.

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


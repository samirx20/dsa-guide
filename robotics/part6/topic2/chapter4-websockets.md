# Part 6, Topic 2: Real-time Communication
## Chapter 1: WebSocket Protocol

### What You'll Learn
- Why HTTP can't do real-time
- How WebSockets work
- How to build a WebSocket server with Hono
- Rooms, broadcasting, and heartbeat
- Scaling WebSockets

---

## 1. The HTTP Problem

HTTP is request-response only. The server can never push data to the client.

```text
HTTP polling (wasteful):
┌──────────┐     ┌──────────┐
│ Client   │ ──→ │  Server  │  "Any new messages?"
│          │ ←── │          │  "No"
│ (wait 2s)│     │          │
│          │ ──→ │  Server  │  "Any new messages?"
│          │ ←── │          │  "No"
│ (wait 2s)│     │          │
│          │ ──→ │  Server  │  "Any new messages?"
│          │ ←── │          │  "Yes! Here's one"
└──────────┘     └──────────┘

99% of requests return nothing. Wastes bandwidth and battery.
```

### The Solution: WebSockets

```text
WebSocket (persistent connection):
┌──────────┐     ┌──────────┐
│ Client   │ ══→ │  Server  │  Open connection ONCE
│          │ ←══ │          │
│          │     │          │  Server pushes when data arrives
│          │ ←══ │          │  "New message from Alice"
│          │     │          │  "New message from Bob"
│          │ ←══ │          │  (whenever, no polling)
└──────────┘     └──────────┘

One connection, bidirectional, instant delivery.
```

---

## 2. WebSocket Handshake

WebSockets start as HTTP, then upgrade.

```text
Step 1: HTTP request with upgrade header
┌──────────┐     ┌──────────┐
│ Client   │ ──→ │  Server  │
│          │     │          │
│ GET /ws  │     │          │
│ Upgrade: │     │          │
│ websocket│     │          │
└──────────┘     └──────────┘

Step 2: Server responds with 101 Switching Protocols
┌──────────┐     ┌──────────┐
│ Client   │ ←── │  Server  │
│          │     │          │
│ 101      │     │          │
│ Switching│     │          │
│ Protocols│     │          │
└──────────┘     └──────────┘

Step 3: TCP connection stays open, both sides can send anytime
```

---

## 3. WebSocket Server with Hono

```bash
npm install hono @hono/node-server @hono/node-ws
```

```typescript
// server.ts
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { createNodeWebSocket } from '@hono/node-ws'

const app = new Hono()
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app })

// WebSocket route
app.get('/ws', upgradeWebSocket((c) => ({
    onOpen(event, ws) {
        console.log('Client connected')
        ws.send(JSON.stringify({ type: 'welcome', message: 'Connected!' }))
    },

    onMessage(event, ws) {
        const data = JSON.parse(event.data.toString())
        console.log('Received:', data)

        // Echo back
        ws.send(JSON.stringify({ type: 'echo', data }))
    },

    onClose() {
        console.log('Client disconnected')
    },

    onError(event, ws) {
        console.error('WebSocket error:', event)
    },
})))

const server = serve({ fetch: app.fetch, port: 3000 }, (info) => {
    console.log(`Server running on port ${info.port}`)
})

injectWebSocket(server)
```

---

## 4. Broadcasting

Send messages to all connected clients.

```typescript
const clients = new Set<WSContext>()

app.get('/ws', upgradeWebSocket((c) => ({
    onOpen(event, ws) {
        clients.add(ws)
    },

    onMessage(event, ws) {
        const data = JSON.parse(event.data.toString())

        // Broadcast to ALL clients
        for (const client of clients) {
            client.send(JSON.stringify({
                type: 'broadcast',
                from: data.username,
                message: data.message,
            }))
        }
    },

    onClose(event, ws) {
        clients.delete(ws)
    },
})))
```

---

## 5. Rooms / Channels

Group connections so messages only go to relevant clients.

```typescript
const rooms = new Map<string, Set<WSContext>>()

app.get('/ws/:roomId', upgradeWebSocket((c) => {
    const roomId = c.req.param('roomId')

    return {
        onOpen(event, ws) {
            // Join room
            if (!rooms.has(roomId)) {
                rooms.set(roomId, new Set())
            }
            rooms.get(roomId)!.add(ws)

            // Notify room
            broadcast(roomId, {
                type: 'user_joined',
                users: rooms.get(roomId)!.size,
            })
        },

        onMessage(event, ws) {
            const data = JSON.parse(event.data.toString())

            // Send to everyone in the same room (including sender)
            broadcast(roomId, {
                type: 'message',
                message: data.message,
            })
        },

        onClose(event, ws) {
            rooms.get(roomId)?.delete(ws)

            broadcast(roomId, {
                type: 'user_left',
                users: rooms.get(roomId)?.size || 0,
            })
        },
    }
}))

function broadcast(roomId: string, data: object) {
    const message = JSON.stringify(data)
    for (const client of rooms.get(roomId) || []) {
        client.send(message)
    }
}
```

---

## 6. Heartbeat / Ping

Detect dead connections.

```typescript
// Server: ping every 30 seconds
const intervals = new Map<WSContext, NodeJS.Timeout>()

app.get('/ws', upgradeWebSocket((c) => ({
    onOpen(event, ws) {
        const interval = setInterval(() => {
            try {
                ws.send(JSON.stringify({ type: 'ping' }))
            } catch {
                clearInterval(interval)
            }
        }, 30000)
        intervals.set(ws, interval)
    },

    onMessage(event, ws) {
        const data = JSON.parse(event.data.toString())

        if (data.type === 'pong') {
            // Client is alive, do nothing
            return
        }

        // Handle other messages...
    },

    onClose(event, ws) {
        clearInterval(intervals.get(ws))
        intervals.delete(ws)
    },
})))
```

### Client-Side Reconnection

```typescript
// Frontend
function connectWebSocket(roomId: string) {
    const ws = new WebSocket(`ws://localhost:3000/ws/${roomId}`)

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data)

        if (data.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong' }))
            return
        }

        // Handle messages...
    }

    ws.onclose = () => {
        // Reconnect after 2 seconds
        setTimeout(() => connectWebSocket(roomId), 2000)
    }

    ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        ws.close()
    }
}
```

---

## 7. JSON Message Protocol

Structure your messages with a type field.

```typescript
// Message types
type WSMessage =
    | { type: 'chat'; message: string; username: string }
    | { type: 'typing'; username: string }
    | { type: 'user_joined'; username: string }
    | { type: 'user_left'; username: string }
    | { type: 'ping' }
    | { type: 'pong' }

// Server handler
onMessage(event, ws) {
    const msg: WSMessage = JSON.parse(event.data.toString())

    switch (msg.type) {
        case 'chat':
            broadcast(roomId, msg)
            break
        case 'typing':
            broadcast(roomId, msg)  // Notify others someone is typing
            break
        case 'pong':
            // Connection alive
            break
    }
}
```

---

## 8. Scaling WebSockets

Single server works for development. Production needs multiple servers.

```text
Problem: 2 servers, user on Server A sends to user on Server B
┌──────────┐     ┌──────────┐
│ Server A │ ←══ │ User 1   │
│          │     └──────────┘
│          │     ┌──────────┐
│          │ ←══ │ User 2   │  ← Both on Server A, works fine
└──────────┘     └──────────┘

┌──────────┐     ┌──────────┐
│ Server A │ ←══ │ User 1   │
└──────────┘     └──────────┘
┌──────────┐     ┌──────────┐
│ Server B │ ←══ │ User 2   │  ← Different servers, can't reach each other!
└──────────┘     └──────────┘
```

### Solution: Redis Pub/Sub

```typescript
// Publisher (Server A)
import Redis from 'ioredis'

const pub = new Redis()
const sub = new Redis()

// Subscribe to a channel
sub.subscribe('room:general')
sub.on('message', (channel, message) => {
    // Forward to local WebSocket clients in that room
    for (const client of rooms.get(channel.replace('room:', '')) || []) {
        client.send(message)
    }
})

// When a message arrives on Server A
function broadcastToRoom(roomId: string, data: object) {
    // Publish to Redis (all servers receive it)
    pub.publish(`room:${roomId}`, JSON.stringify(data))
}
```

```text
With Redis Pub/Sub:
┌──────────┐     ┌──────────┐     ┌──────────┐
│ Server A │ ←══ │ User 1   │     │          │
│          │ ──→ │  Redis   │ ←── │ Server B │ ←══ │ User 2 │
│          │ ←── │ Pub/Sub  │ ──→ │          │     │        │
└──────────┘     └──────────┘     └──────────┘

1. User 1 sends message on Server A
2. Server A publishes to Redis
3. Server B receives from Redis
4. Server B delivers to User 2
```

---

## Quick Reference

| Task | How |
|------|-----|
| WebSocket route | `app.get('/ws', upgradeWebSocket(...))` |
| Send message | `ws.send(JSON.stringify(data))` |
| Broadcast | Loop over `clients` Set and send to each |
| Rooms | `Map<string, Set<WSContext>>` |
| Heartbeat | Server pings every 30s, client responds with pong |
| Reconnect | `ws.onclose = () => setTimeout(connect, 2000)` |
| Scale | Redis Pub/Sub between servers |

---

## Practice & Self-Check

### Predict the Output / Trace by Hand

**Q1. Room trace (Section 5).** Three robot dashboards connect to the chapter's `/ws/:roomId` server in this order, and then the listed events happen. Write down every message **each** client receives, in order.

1. X connects to `/ws/cell-1`
2. Y connects to `/ws/cell-1`
3. Z connects to `/ws/cell-2`
4. X sends `{"message": "e-stop cleared"}`
5. Y disconnects

**Q2. Polling cost (Section 1).** A dashboard polls `GET /messages` every 2 s for one hour, and exactly 3 new messages arrive during that hour. How many requests are sent, and what percentage return nothing? On average, how long after a message arrives does the client see it, and what is the worst case? What is the answer for a WebSocket?

**Q3. Spot the bug (Section 8).** The servers use the Section 5 `rooms` map, keyed by `roomId` such as `'general'`. Server B runs the Section 8 subscriber code. User 1 on server A triggers `broadcastToRoom('general', {...})`. Does user 2 on server B receive it? Trace the channel name through `publish`, `subscribe`, and `rooms.get(channel)`.

**Q4. Reconnect timing (Section 6 client).** The server goes down at $t = 0$ and comes back at $t = 9$ s. Assume a refused connection fails instantly and fires `onclose` exactly once. At what times does the client try to reconnect, how many attempts fail, and when is it connected again? If 10,000 dashboards were connected, what would the server see at each of those instants?

**Q5. Heartbeat gap (Section 6 server).** A tablet loses Wi-Fi without closing the TCP connection (no close frame is ever sent). The server keeps pinging every 30 s. Does the Section 6 server code ever remove this client? What is missing?

### Coding Exercises

**E1 (Easy).** `JSON.parse(event.data.toString())` crashes on bad input, and the `WSMessage` type is never actually checked at runtime. Write `parseMessage(raw: string): WSMessage | null` for the union `chat | typing | ping | pong` from Section 7. It should return a clean object for valid input and `null` for invalid JSON, a missing or unknown `type`, or missing or wrong-typed fields.
- `parseMessage('{"type":"chat","message":"hi","username":"x"}')` returns `{ type: 'chat', message: 'hi', username: 'x' }`
- `parseMessage('{"type":"chat","message":"hi"}')`, `parseMessage('not json')`, `parseMessage('null')`, and `parseMessage('{"type":"reboot"}')` all return `null`

**E2 (Easy–Medium).** Write a `RoomRegistry` with `join(roomId, client): number` (returns the new room size), `leaveAll(client): string[]` (removes the client from **every** room, deletes rooms that become empty, and returns the room ids it left), and `broadcast(roomId, data, except?): number` (returns how many clients were sent to, skipping `except`). Clients are anything with `send(msg: string): void`.
- X and Y join `cell-1`, and Y and Z join `cell-2`. `broadcast('cell-1', {...}, X)` returns `1`. `leaveAll(Y)` returns `['cell-1', 'cell-2']`. After `leaveAll(Z)`, `cell-2` no longer exists and `broadcast('cell-2', {})` returns `0`.

**E3 (Medium).** Fix the thundering herd from Q4. Write
`reconnectDelay(attempt: number, baseMs = 1000, maxMs = 30000, random = Math.random): number`
using exponential backoff with **full jitter**: a random delay in $[0, \min(\text{max}, \text{base} \cdot 2^{\text{attempt}}))$. Then show how `connectWebSocket` would use it, resetting the attempt counter on a successful open.
- With `random = () => 0.5`, attempts 0–6 give `[500, 1000, 2000, 4000, 8000, 15000, 15000]`.

#### Dry-Run: Answers

**Q1.**

| step | room state | X receives | Y receives | Z receives |
|-----:|-----------|------------|------------|------------|
| 1 | cell-1 = {X} | `user_joined, users: 1` | — | — |
| 2 | cell-1 = {X, Y} | `user_joined, users: 2` | `user_joined, users: 2` | — |
| 3 | cell-2 = {Z} | — | — | `user_joined, users: 1` |
| 4 | — | `message: "e-stop cleared"` | `message: "e-stop cleared"` | — |
| 5 | cell-1 = {X} | `user_left, users: 1` | — (gone) | — |

In total, X receives **4** messages, Y receives **2**, and Z receives **1**. The sender X gets its own message back, because `broadcast` loops over the whole room. Rooms are isolated, so Z sees nothing from `cell-1`.

**Q2.** $3600 / 2 = 1800$ requests, of which $1800 - 3 = 1797$ are empty: $\frac{1797}{1800} \approx 99.8\%$. A message arrives at a uniformly random point in a 2 s gap, so the **average** delay is about $1$ s and the worst case about $2$ s (plus request latency). With a WebSocket there is 1 handshake for the whole hour, 3 pushes, and the delay is roughly one network trip.

**Q3.** **No.** Server A publishes to the channel `room:general`, and server B subscribes to `room:general`, so the Redis part works. But the handler does `rooms.get(channel)` with `channel === 'room:general'`, while the map key is `'general'`. The lookup returns `undefined`, so the loop runs over `[]` and **nobody** gets the message. Fix it by stripping the prefix (`rooms.get(channel.slice('room:'.length))`) or by keying the map with the prefixed name. In practice you would also `psubscribe('room:*')` (and handle `pmessage`) instead of subscribing to one hard-coded room.

**Q4.** Each failure schedules the next try 2 s later. Attempts at $t = 2, 4, 6, 8$ s all **fail** (4 failures). The attempt at $t = 10$ s **succeeds**, so the client is connected at about 10 s, 1 s after the server is back. With 10,000 clients that dropped at the same instant, the server sees 10,000 simultaneous connection attempts at every 2 s tick, including the moment it restarts. This is a self-inflicted load spike (a thundering herd). See E3.

**Q5.** **Not reliably.** The server sends pings but never checks whether a `pong` came back, because `onMessage` just `return`s on `pong`. On a half-open TCP connection, `ws.send` usually does **not** throw (the data is buffered by the OS), so `clearInterval` never runs and the client stays in `clients`/`rooms` until the OS TCP timeout eventually closes the socket, which can take many minutes. What is missing is a liveness deadline: record `lastPong` per socket and, on each ping tick, close any socket whose last pong is older than about 2 intervals (for example 60 s).

**E1 — reference solution**

```typescript
type WSMessage =
    | { type: 'chat'; message: string; username: string }
    | { type: 'typing'; username: string }
    | { type: 'ping' }
    | { type: 'pong' }

export function parseMessage(raw: string): WSMessage | null {
    let msg: any
    try { msg = JSON.parse(raw) } catch { return null }
    if (typeof msg !== 'object' || msg === null) return null      // 'null', '42', '"hi"'
    switch (msg.type) {
        case 'chat':
            return typeof msg.message === 'string' && typeof msg.username === 'string'
                ? { type: 'chat', message: msg.message, username: msg.username }
                : null
        case 'typing':
            return typeof msg.username === 'string' ? { type: 'typing', username: msg.username } : null
        case 'ping': return { type: 'ping' }
        case 'pong': return { type: 'pong' }
        default:     return null
    }
}
```

TypeScript types disappear at runtime, so a cast like `const msg: WSMessage = JSON.parse(...)` checks nothing. Building a *new* object also drops any extra fields a client sneaks in. In `onMessage`, `if (!msg) return` replaces a crash with a quiet ignore. This is the same idea as Pydantic validation at the API boundary.

**E2 — reference solution**

```typescript
interface Client { send(msg: string): void }

export class RoomRegistry {
    private rooms = new Map<string, Set<Client>>()

    join(roomId: string, client: Client): number {
        let set = this.rooms.get(roomId)
        if (!set) { set = new Set(); this.rooms.set(roomId, set) }
        set.add(client)
        return set.size
    }

    leaveAll(client: Client): string[] {
        const left: string[] = []
        for (const [roomId, set] of this.rooms) {
            if (set.delete(client)) {
                left.push(roomId)
                if (set.size === 0) this.rooms.delete(roomId)   // no empty-room leak
            }
        }
        return left
    }

    broadcast(roomId: string, data: object, except?: Client): number {
        const message = JSON.stringify(data)                    // serialize once
        let sent = 0
        for (const c of this.rooms.get(roomId) ?? []) {
            if (c === except) continue
            c.send(message)
            sent++
        }
        return sent
    }
}
```

The chapter's `onClose` leaves empty `Set`s in the map forever. Over days of reconnects with unique room ids, that is a memory leak, and deleting empty rooms fixes it. Deleting entries from a `Map` while iterating over it with `for…of` is safe in JavaScript. `leaveAll` is $O(R)$ in the number of rooms. Keep a reverse map `client → Set<roomId>` if you need $O(\text{rooms joined})$.

**E3 — reference solution**

```typescript
export function reconnectDelay(attempt: number, baseMs = 1000, maxMs = 30000,
                               random: () => number = Math.random): number {
    const ceiling = Math.min(maxMs, baseMs * 2 ** attempt)
    return Math.floor(random() * ceiling)          // full jitter in [0, ceiling)
}

function connectWebSocket(roomId: string, attempt = 0) {
    const ws = new WebSocket(`ws://localhost:3000/ws/${roomId}`)
    ws.onopen = () => { attempt = 0 }              // healthy again: reset backoff
    ws.onclose = () => {
        setTimeout(() => connectWebSocket(roomId, attempt + 1), reconnectDelay(attempt))
    }
    // ... onmessage / onerror as in Section 6
}
```

With `random = () => 0.5`, the ceilings $1000 \cdot 2^a$ are $1000, 2000, 4000, 8000, 16000$, then $32000 \to 30000$ and $64000 \to 30000$, and half of each gives `[500, 1000, 2000, 4000, 8000, 15000, 15000]`. With 10,000 clients, the random factor spreads reconnects across the whole window instead of producing 10,000 at the same millisecond. The cap keeps an offline dashboard retrying at least every 30 s.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Systems & Robotics Visualizer for **Chapter 1: WebSocket Protocol**
- **Live Architecture & Data-Flow Sandbox:**
  - Render an interactive system pipeline and state inspector for **chapter4 websockets**, animating data packets, telemetry frames, validation boundaries, and execution states across each stage.
  - Display live latency, throughput, validation status (`<Badge>` in emerald for valid, rose for rejected/fault), and memory/state transitions as parameters change.
- **Step-by-Step Execution & Failure-Mode Inspector:**
  - Allow the user to inject both valid telemetry payloads and fault scenarios (malformed schemas, timeouts, out-of-range sensor spikes) and watch the system recover or trigger deterministic fallbacks in a live `<Table>` audit log.

### 2. Required `shadcn/ui` Controls
- **Simulation Controls:** `<Button>` triggers for **Run Step**, **Inject Fault / Anomaly**, and **Reset State**; `<Slider>` for request rate, timeout threshold, or physical parameter bounds.
- **Mode & Configuration Toggles:** `<Switch>` to toggle strict validation / guardrails ON vs. OFF, and `<Tabs>` to switch between *Architecture View*, *Live Payload Inspector*, and *Production Code Breakdown*.


# Part 5, Topic 4: Real-time Communication
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
npm install hono @hono/node-server
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
    for (const client of rooms.get(channel) || []) {
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


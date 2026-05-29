const EDGE_CURRICULUM = [
  {
    id: "e-p1", phase: 1, title: "TypeScript & Vite SDK Design", accent: "#3178C6",
    subtitle: "Building the open-source Tracker: Ship lightweight, type-safe code to the world",
    topics: [
      {
        id: "e-p1t1", title: "Advanced TypeScript & Library Authoring",
        items: [
          { id: "e-p1t1c1", type: "concept", text: "Generics & Mapped Types — building strictly typed SDK APIs that infer user data shapes" },
          { id: "e-p1t1c2", type: "concept", text: "Vite Library Mode & tsup — bundling for ESM/CJS, tree-shaking, and externalizing dependencies" },
          { id: "e-p1t1c3", type: "concept", text: "The Beacon API & Fetch Keepalive — guaranteeing telemetry delivery during page unloads/tab closures" },
          { id: "e-p1t1c4", type: "concept", text: "Browser Performance APIs — Navigation Timing, Resource Timing, and Long Tasks for real-user monitoring (RUM)" },
          { id: "e-p1t1p1", type: "task", num: 1, title: "Build the core Tracker SDK: <10kb, zero-dependency, fully typed batched event queue", difficulty: "Hard" },
          { id: "e-p1t1p2", type: "task", num: 2, title: "Write a custom Vite plugin to inject git-commit-hash and build-id into the tracker at compile time", difficulty: "Medium" },
        ]
      },
      {
        id: "e-p1t2", title: "SPA Architecture & State",
        items: [
          { id: "e-p1t2c1", type: "concept", text: "Micro-frontends & Module Federation — when a monolithic Vite SPA becomes too large" },
          { id: "e-p1t2c2", type: "concept", text: "Zustand Internals — selectors, transient updates, and persisting state without re-render hell" },
          { id: "e-p1t2p1", type: "task", num: 3, title: "Build a custom, type-safe file-system based router for your Vite SPA from scratch", difficulty: "Hard" },
        ]
      },
    ]
  },
  {
    id: "e-p2", phase: 2, title: "PostgreSQL & Data Integrity (Beyond the BaaS)", accent: "#336791",
    subtitle: "Supabase is just the host; Postgres is the engine. Master the raw SQL.",
    topics: [
      {
        id: "e-p2t1", title: "Advanced SQL & Concurrency",
        items: [
          { id: "e-p2t1c1", type: "concept", text: "MVCC (Multi-Version Concurrency Control) — how Postgres handles simultaneous reads/writes without locking" },
          { id: "e-p2t1c2", type: "concept", text: "Row-Level Locking — SELECT ... FOR UPDATE to prevent double-spending in your Razorpay ledger" },
          { id: "e-p2t1c3", type: "concept", text: "CTEs (Common Table Expressions) & Window Functions — running totals, rankings, and time-series analytics" },
          { id: "e-p2t1c4", type: "concept", text: "Postgres Triggers & NOTIFY/LISTEN — pushing database events to Node.js in real-time without polling" },
          { id: "e-p2t1p1", type: "task", num: 1, title: "Write a raw SQL migration for a double-entry accounting ledger with strict CHECK constraints", difficulty: "Hard" },
          { id: "e-p2t1p2", type: "task", num: 2, title: "Build a Materialized View to aggregate millions of tracker events into hourly rollups", difficulty: "Medium" },
        ]
      },
      {
        id: "e-p2t2", title: "Indexing & Query Optimization",
        items: [
          { id: "e-p2t2c1", type: "concept", text: "B-Tree vs GIN vs GiST — indexing JSONB metadata and geospatial tracker data" },
          { id: "e-p2t2c2", type: "concept", text: "EXPLAIN ANALYZE — reading query plans, spotting sequential scans, and fixing nested loop joins" },
          { id: "e-p2t2c3", type: "concept", text: "Connection Pooling — why Supavisor/PgBouncer is mandatory for serverless edge functions" },
          { id: "e-p2t2p1", type: "task", num: 3, title: "Take a 10M row telemetry table and optimize a complex filtering query from 4s to <50ms", difficulty: "Hard" },
        ]
      },
    ]
  },
  {
    id: "e-p3", phase: 3, title: "The 'From Scratch' Backend (Hono & Drizzle)", accent: "#FF6A00",
    subtitle: "No Supabase magic. Build the ingestion server for your open-source tracker raw.",
    topics: [
      {
        id: "e-p3t1", title: "Modern Edge Backend (Hono.js)",
        items: [
          { id: "e-p3t1c1", type: "concept", text: "The Web Standards API — Request, Response, Headers, and Streams (the foundation of Hono/Edge)" },
          { id: "e-p3t1c2", type: "concept", text: "Middleware Chains — writing raw CORS, Rate Limiting (Token Bucket), and Auth middleware" },
          { id: "e-p3t1c3", type: "concept", text: "Drizzle ORM — the modern, type-safe SQL mapper that feels like writing raw SQL but stays in TS" },
          { id: "e-p3t1c4", type: "concept", text: "Manual Cryptography — using Node crypto / Web Crypto API to verify Razorpay/Stripe HMAC signatures" },
          { id: "e-p3t1p1", type: "task", num: 1, title: "Build a high-throughput Hono API to receive, validate (Zod), and batch-insert tracker events", difficulty: "Hard" },
          { id: "e-p3t1p2", type: "task", num: 2, title: "Write a raw Express/Hono webhook receiver that manually verifies RSA/HMAC signatures and handles idempotency", difficulty: "Hard" },
        ]
      },
      {
        id: "e-p3t2", title: "Real-Time & Background Workers",
        items: [
          { id: "e-p3t2c1", type: "concept", text: "WebSockets vs Server-Sent Events (SSE) — pushing live dashboard updates from your raw Node server" },
          { id: "e-p3t2c2", type: "concept", text: "BullMQ & Redis — decoupling the ingestion API from the heavy database writes using background queues" },
          { id: "e-p3t2p1", type: "task", num: 3, title: "Offload tracker event processing to a BullMQ worker to prevent API timeouts during traffic spikes", difficulty: "Medium" },
        ]
      },
    ]
  },
  {
    id: "e-p4", phase: 4, title: "Edge Infrastructure & Media Pipelines", accent: "#F48120",
    subtitle: "Leveraging Cloudflare, R2, and Docker for heavy compute and global distribution.",
    topics: [
      {
        id: "e-p4t1", title: "Object Storage & Edge Compute",
        items: [
          { id: "e-p4t1c1", type: "concept", text: "S3 Multipart Protocol — the raw XML/REST API behind resumable uploads (bypassing AWS SDK bloat)" },
          { id: "e-p4t1c2", type: "concept", text: "Cloudflare Workers & KV — running ultra-low latency middleware at the edge before hitting your origin" },
          { id: "e-p4t1c3", type: "concept", text: "Signed URLs & CORS — the exact cryptography of S3/R2 presigned URLs and configuring CORS for direct browser uploads" },
          { id: "e-p4t1p1", type: "task", num: 1, title: "Deploy a Cloudflare Worker to act as a secure proxy for your R2 bucket, hiding the origin IP", difficulty: "Medium" },
        ]
      },
      {
        id: "e-p4t2", title: "Containerized Media Workers",
        items: [
          { id: "e-p4t2c1", type: "concept", text: "Docker Multi-stage Builds — creating tiny, secure Alpine Linux images for your FFmpeg workers" },
          { id: "e-p4t2c2", type: "concept", text: "Node.js Child Processes & Streams — piping FFmpeg stdout/stderr without blowing up container RAM" },
          { id: "e-p4t2p1", type: "task", num: 2, title: "Connect your Dockerized FFmpeg worker to Redis to process video watermarks asynchronously", difficulty: "Hard" },
        ]
      },
    ]
  },
  {
    id: "e-p5", phase: 5, title: "System Design for Telemetry & Scale", accent: "#8A2BE2",
    subtitle: "How to architect your open-source tracker to handle 100,000 requests per second.",
    topics: [
      {
        id: "e-p5t1", title: "High-Write Architecture",
        items: [
          { id: "e-p5t1c1", type: "concept", text: "OLTP vs OLAP — why Postgres will eventually choke on analytics, and when to introduce ClickHouse" },
          { id: "e-p5t1c2", type: "concept", text: "The Write-Ahead Log (WAL) & Batch Insertion — maximizing disk I/O throughput for telemetry" },
          { id: "e-p5t1c3", type: "concept", text: "Rate Limiting & DDoS Mitigation — protecting your open-source ingestion endpoint from abuse" },
          { id: "e-p5t1p1", type: "task", num: 1, title: "Write an RFC/Architecture doc for scaling the Tracker to 1M daily active users (Caching, Queues, Sharding)", difficulty: "Hard" },
          { id: "e-p5t1p2", type: "task", num: 2, title: "Use k6 or Artillery to load-test your raw Hono ingestion API and identify the exact bottleneck", difficulty: "Medium" },
        ]
      },
    ]
  },
];

export default EDGE_CURRICULUM;

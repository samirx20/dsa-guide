const EDGE_CURRICULUM = [
  {
    id: "p1",
    phase: 1,
    title: "Foundations: The Web & TypeScript",
    accent: "#3178C6",
    subtitle: "Before building the Edge, you must understand the browser and the language.",
    topics: [
      {
        id: "p1t1",
        title: "JavaScript & Browser Basics",
        items: [
          { id: "p1t1c1", type: "concept", text: "The DOM & Events — how the browser renders HTML and handles clicks/inputs" },
          { id: "p1t1c2", type: "concept", text: "Asynchronous JS — Callbacks, Promises, and Async/Await (fetching data without freezing the UI)" },
          { id: "p1t1c3", type: "concept", text: "Local Storage & Session Storage — persisting simple data in the browser" },
          { id: "p1t1c4", type: "concept", text: "The Fetch API — making GET/POST requests to external APIs" },
          { id: "p1t1p1", type: "project", num: 1, slug: "weather-dashboard", title: "Build a Weather Dashboard using Fetch and LocalStorage", difficulty: "Easy" }
        ]
      },
      {
        id: "p1t2",
        title: "TypeScript Essentials",
        items: [
          { id: "p1t2c1", type: "concept", text: "Types vs Interfaces — defining shapes for your data to prevent runtime errors" },
          { id: "p1t2c2", type: "concept", text: "Union Types & Enums — handling strict states (e.g., 'loading' | 'success' | 'error')" },
          { id: "p1t2c3", type: "concept", text: "Generics Basics — writing reusable functions that adapt to different data types" },
          { id: "p1t2p1", type: "project", num: 2, slug: "typed-todo-list", title: "Refactor a messy JS Todo List into strictly typed TypeScript", difficulty: "Easy" }
        ]
      }
    ]
  },
  {
    id: "p2",
    phase: 2,
    title: "Modern Frontend: React, Vite & Next.js",
    accent: "#61DAFB",
    subtitle: "Building the user interface: from fast Single Page Apps to Server-Rendered SaaS.",
    topics: [
      {
        id: "p2t1",
        title: "React & Vite (The SPA)",
        items: [
          { id: "p2t1c1", type: "concept", text: "Components & Props — building reusable UI blocks" },
          { id: "p2t1c2", type: "concept", text: "State & Effects — useState, useEffect, and the component lifecycle" },
          { id: "p2t1c3", type: "concept", text: "Vite Internals — why it's faster than Webpack and how to configure it" },
          { id: "p2t1p1", type: "project", num: 1, slug: "vite-analytics-ui", title: "Build the frontend dashboard for the Tracker using Vite + React + Tailwind", difficulty: "Medium" }
        ]
      },
      {
        id: "p2t2",
        title: "Next.js App Router (The SaaS)",
        items: [
          { id: "p2t2c1", type: "concept", text: "Server vs Client Components — when to render on the server vs the browser" },
          { id: "p2t2c2", type: "concept", text: "Routing & Layouts — file-based routing and nested layouts" },
          { id: "p2t2c3", type: "concept", text: "Server Actions — mutating data without building a separate API route" },
          { id: "p2t2p1", type: "project", num: 2, slug: "saas-dashboard", title: "Build a multi-tenant SaaS dashboard with Next.js App Router", difficulty: "Medium" }
        ]
      }
    ]
  },
  {
    id: "p3",
    phase: 3,
    title: "Data & The BaaS: SQL & Supabase",
    accent: "#3ECF8E",
    subtitle: "Storing data securely using the modern Backend-as-a-Service standard.",
    topics: [
      {
        id: "p3t1",
        title: "Relational Databases & SQL",
        items: [
          { id: "p3t1c1", type: "concept", text: "Tables, Rows, & Columns — designing a normalized relational schema" },
          { id: "p3t1c2", type: "concept", text: "SQL Queries — SELECT, INSERT, UPDATE, DELETE, and basic JOINs" },
          { id: "p3t1c3", type: "concept", text: "Foreign Keys & Constraints — enforcing data integrity at the database level" },
          { id: "p3t1p1", type: "project", num: 1, slug: "raw-sql-schema", title: "Design and query a relational schema for Users, Posts, and Comments", difficulty: "Easy" }
        ]
      },
      {
        id: "p3t2",
        title: "Supabase & Security",
        items: [
          { id: "p3t2c1", type: "concept", text: "Supabase Auth — handling signups, logins, and JWT sessions" },
          { id: "p3t2c2", type: "concept", text: "Row Level Security (RLS) — writing policies so users only see their own data" },
          { id: "p3t2c3", type: "concept", text: "The Supabase Client — querying your DB safely from the frontend" },
          { id: "p3t2p1", type: "project", num: 2, slug: "secure-saas-db", title: "Connect your Next.js SaaS to Supabase and secure it with RLS", difficulty: "Medium" }
        ]
      }
    ]
  },
  {
    id: "p4",
    phase: 4,
    title: "Backend From Scratch (The Black Box Cure)",
    accent: "#FF6A00",
    subtitle: "No Supabase magic. Learn how HTTP, APIs, and ORMs actually work under the hood.",
    topics: [
      {
        id: "p4t1",
        title: "HTTP & Hono.js",
        items: [
          { id: "p4t1c1", type: "concept", text: "The HTTP Protocol — Methods (GET/POST), Headers, Status Codes, and CORS" },
          { id: "p4t1c2", type: "concept", text: "Hono.js Basics — building a blazing-fast, type-safe web server" },
          { id: "p4t1c3", type: "concept", text: "Middleware — intercepting requests for logging, auth, and rate-limiting" },
          { id: "p4t1p1", type: "project", num: 1, slug: "raw-rest-api", title: "Build a raw REST API for a Blog using Hono.js (No BaaS allowed)", difficulty: "Medium" }
        ]
      },
      {
        id: "p4t2",
        title: "Drizzle ORM & Raw Postgres",
        items: [
          { id: "p4t2c1", type: "concept", text: "ORMs vs Raw SQL — mapping TypeScript objects to database tables" },
          { id: "p4t2c2", type: "concept", text: "Drizzle Schema — defining tables, relations, and migrations in code" },
          { id: "p4t2c3", type: "concept", text: "Transactions — grouping multiple DB operations so they succeed or fail together" },
          { id: "p4t2p1", type: "project", num: 2, slug: "hono-drizzle-db", title: "Connect your Hono API to raw Postgres using Drizzle ORM", difficulty: "Hard" }
        ]
      }
    ]
  },
  {
    id: "p5",
    phase: 5,
    title: "Cloud Infrastructure & Heavy Lifting",
    accent: "#F48120",
    subtitle: "Handling files, media, and background tasks that crash normal web servers.",
    topics: [
      {
        id: "p5t1",
        title: "Object Storage (S3 / R2)",
        items: [
          { id: "p5t1c1", type: "concept", text: "Buckets & Objects — why we don't store images/videos in Postgres" },
          { id: "p5t1c2", type: "concept", text: "Presigned URLs — generating secure, time-limited links for private files" },
          { id: "p5t1c3", type: "concept", text: "Multipart Uploads — handling massive files by breaking them into chunks" },
          { id: "p5t1p1", type: "project", num: 1, slug: "secure-file-gateway", title: "Build a secure file upload/download gateway using Cloudflare R2", difficulty: "Hard" }
        ]
      },
      {
        id: "p5t2",
        title: "Docker & Background Workers",
        items: [
          { id: "p5t2c1", type: "concept", text: "Containers — packaging your code with its exact environment using Docker" },
          { id: "p5t2c2", type: "concept", text: "Background Queues — offloading heavy tasks (like video processing) so the API doesn't freeze" },
          { id: "p5t2c3", type: "concept", text: "Webhooks — letting external services (like Stripe/Razorpay) notify your server" },
          { id: "p5t2p1", type: "project", num: 2, slug: "media-worker", title: "Build a Dockerized background worker that processes images/videos asynchronously", difficulty: "Hard" }
        ]
      }
    ]
  },
  {
    id: "p6",
    phase: 6,
    title: "Capstone: The Open Source Tracker SDK",
    accent: "#8A2BE2",
    subtitle: "Package your knowledge into a library for the world to use.",
    topics: [
      {
        id: "p6t1",
        title: "SDK Design & Distribution",
        items: [
          { id: "p6t1c1", type: "concept", text: "Vite Library Mode — bundling TypeScript code for NPM distribution" },
          { id: "p6t1c2", type: "concept", text: "The Beacon API — sending analytics data even if the user closes the tab" },
          { id: "p6t1c3", type: "concept", text: "Batching & Queuing — grouping network requests to save battery and bandwidth" },
          { id: "p6t1p1", type: "project", num: 1, slug: "tracker-sdk", title: "Build, bundle, and publish the Open Source Edge Tracker SDK to NPM", difficulty: "Expert" },
          { id: "p6t1p2", type: "project", num: 2, slug: "ingestion-engine", title: "Build the high-scale Hono + Drizzle backend to ingest millions of tracker events", difficulty: "Expert" }
        ]
      }
    ]
  }
];

export default EDGE_CURRICULUM;

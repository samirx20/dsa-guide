const ROBOTICS_CURRICULUM = [
  {
    id: "p0",
    phase: 0,
    title: "Prerequisites: Linux, Git & Modern Python From Scratch",
    accent: "#38BDF8",
    subtitle: "Master the terminal, POSIX processes, Git snapshots, and strictly-typed Python before touching hardware or math.",
    topics: [
      {
        id: "p0t1",
        title: "The Command Line, Linux Processes & Git Internals",
        items: [
          {
            id: "p0t1c1",
            type: "concept",
            text: "The Command Line, POSIX Filesystem (/dev, /proc), Streams (stdin/stdout/stderr), Pipes & SSH",
            docPath: "/robotics/part0/topic1/chapter1-the-cli-and-linux.md"
          },
          {
            id: "p0t1c2",
            type: "concept",
            text: "Git Internals — Snapshots, Staging Index, Branch Pointers, Merging vs. Rebasing & Conflict Resolution",
            docPath: "/robotics/part0/topic1/chapter2-git-and-github-workflows.md"
          }
        ]
      },
      {
        id: "p0t2",
        title: "Modern Strictly-Typed Python Foundations",
        items: [
          {
            id: "p0t2c1",
            type: "concept",
            text: "Introduction to Type Hinting — Explicitly declaring function inputs, outputs, and collection types",
            docPath: "/robotics/part0/topic2/chapter1-intro-type-hinting.md"
          },
          {
            id: "p0t2c2",
            type: "concept",
            text: "Understanding APIs & JSON — Serialization, deserialization, and network payload structures",
            docPath: "/robotics/part0/topic2/chapter2-apis-and-json.md"
          },
          {
            id: "p0t2c3",
            type: "concept",
            text: "Classes & Objects Refresher — Encapsulating state and behavior for sensors and controllers",
            docPath: "/robotics/part0/topic2/chapter3-class-refresher.md"
          },
          {
            id: "p0t2c4",
            type: "concept",
            text: "Virtual Environments — Isolating project dependencies with venv, pyproject.toml, and uv",
            docPath: "/robotics/part0/topic2/chapter4-virtual-environments.md"
          },
          {
            id: "p0t2c5",
            type: "concept",
            text: "Advanced Type Hinting — Generics, Unions, Optional, Callable, TypedDict & Protocols",
            docPath: "/robotics/part0/topic2/chapter5-advanced-type-hinting.md"
          },
          {
            id: "p0t2c6",
            type: "concept",
            text: "Industrial Error Handling — Custom exception hierarchies, context managers, Result pattern & structured logging",
            docPath: "/robotics/part0/topic2/chapter6-error-handling.md"
          },
          {
            id: "p0t2p1",
            type: "project",
            num: 1,
            slug: "strict-python-cli",
            title: "Build a Strictly Typed CLI Tool for Parsing Factory & Robot Log Files",
            difficulty: "Easy",
            docPath: "/robotics/part0/topic2/project-strict-python-cli.md"
          }
        ]
      }
    ]
  },
  {
    id: "p1",
    phase: 1,
    title: "Spatial Mathematics From Zero: Trigonometry, Vectors & Transforms",
    accent: "#6366F1",
    subtitle: "Build complete geometric intuition from angles and vectors up to SO(3) rotations, quaternions, and SE(3) homogeneous matrices.",
    topics: [
      {
        id: "p1t1",
        title: "Angles, Radians, Unit Circle & Vector Algebra",
        items: [
          {
            id: "p1t1c1",
            type: "concept",
            text: "Coordinates, Right-Hand Rule (REP-103), Radians vs. Degrees, Unit Circle, atan2(y, x) & Angle Wrapping",
            docPath: "/robotics/part1/topic1/chapter1-coordinates-radians-and-trig.md"
          },
          {
            id: "p1t1c2",
            type: "concept",
            text: "Vectors From Scratch — Addition, Normalization, Dot Product (Projection/FOV) & Cross Product (Torque/Signed Steering)",
            docPath: "/robotics/part1/topic1/chapter2-vectors-dot-and-cross-products.md"
          }
        ]
      },
      {
        id: "p1t2",
        title: "Matrices, Rotations, Quaternions & Homogeneous Transforms",
        items: [
          {
            id: "p1t2c1",
            type: "concept",
            text: "Matrices as Geometric Space Transformers — Basis Vector Columns, Multiplication, Determinant & Inverse",
            docPath: "/robotics/part1/topic2/chapter1-matrices-as-space-transformers.md"
          },
          {
            id: "p1t2c2",
            type: "concept",
            text: "Rotation Matrices SO(2) & SO(3), Orthogonality (R⁻¹ = Rᵀ), Euler Angles, Gimbal Lock & Unit Quaternions",
            docPath: "/robotics/part1/topic2/chapter2-rotation-matrices-euler-and-quaternions.md"
          },
          {
            id: "p1t2c3",
            type: "concept",
            text: "Homogeneous Transformations SE(2) & SE(3) — Combining Rotation + Translation & Chaining Sensor-to-World Frames",
            docPath: "/robotics/part1/topic2/chapter3-homogeneous-transforms-se2-se3.md"
          },
          {
            id: "p1t2p1",
            type: "project",
            num: 2,
            slug: "transform-tree-engine",
            title: "Build a tf2-Style Coordinate Frame Tree Engine in C++ & Python",
            difficulty: "Medium",
            docPath: "/robotics/part1/topic2/project-transform-tree-engine.md"
          }
        ]
      }
    ]
  },
  {
    id: "p2",
    phase: 2,
    title: "Discrete Calculus, Physics Loops & Robot Kinematics",
    accent: "#F59E0B",
    subtitle: "How derivatives and integrals work inside a 100Hz while-loop, 2-DOF manipulator Forward/Inverse Kinematics, and Differential Drive Odometry.",
    topics: [
      {
        id: "p2t1",
        title: "Calculus in Code & Physics Simulation Foundations",
        items: [
          {
            id: "p2t1c1",
            type: "concept",
            text: "Discrete Time (Δt), Numerical Derivatives (Noise Amplification & Low-Pass Filters), Euler vs. RK2 Integration & F=ma",
            docPath: "/robotics/part2/topic1/chapter1-derivatives-and-integrals-in-code.md"
          }
        ]
      },
      {
        id: "p2t2",
        title: "Manipulator Arms & Mobile Robot Kinematics",
        items: [
          {
            id: "p2t2c1",
            type: "concept",
            text: "Forward & Analytical Inverse Kinematics (Law of Cosines, Elbow-Up/Down) + Manipulator Jacobian & Singularities",
            docPath: "/robotics/part2/topic2/chapter1-forward-and-inverse-kinematics.md"
          },
          {
            id: "p2t2c2",
            type: "concept",
            text: "Differential Drive Kinematics (v, ω ↔ ω_L, ω_R), Non-Holonomic Constraints & Wheel Encoder Odometry Drift",
            docPath: "/robotics/part2/topic2/chapter2-differential-drive-and-odometry.md"
          }
        ]
      }
    ]
  },
  {
    id: "p3",
    phase: 3,
    title: "Closed-Loop Control Systems & Probabilistic State Estimation",
    accent: "#10B981",
    subtitle: "PID control from first principles, cascaded loops, state-space LQR intuition, Gaussian sensor noise, and the Kalman Filter.",
    topics: [
      {
        id: "p3t1",
        title: "Feedback Control Theory & PID Mastery",
        items: [
          {
            id: "p3t1c1",
            type: "concept",
            text: "PID Control From Scratch — Virtual Spring (P), Virtual Damper (D), Anti-Windup Integrator (I) & Derivative-on-Measurement",
            docPath: "/robotics/part3/topic1/chapter1-pid-control-from-scratch.md"
          },
          {
            id: "p3t1c2",
            type: "concept",
            text: "Cascaded Control Loops (Position → Velocity → Torque), Physics Feedforward & State-Space (LQR) Intuition",
            docPath: "/robotics/part3/topic1/chapter2-cascaded-and-state-space-control.md"
          }
        ]
      },
      {
        id: "p3t2",
        title: "Probabilistic Robotics, Sensor Noise & The Kalman Filter",
        items: [
          {
            id: "p3t2c1",
            type: "concept",
            text: "Sensor Noise From Zero — Bias vs. White Noise, Gaussian Distributions N(μ, σ²), Variance Propagation & Covariance Ellipses",
            docPath: "/robotics/part3/topic2/chapter1-probability-gaussians-and-sensor-noise.md"
          },
          {
            id: "p3t2c2",
            type: "concept",
            text: "The Kalman Filter — Adding vs. Multiplying Gaussians, Kalman Gain K = P/(P+R), Matrix KF & Extended Kalman Filter (EKF)",
            docPath: "/robotics/part3/topic2/chapter2-kalman-filter-and-sensor-fusion.md"
          },
          {
            id: "p3t2p1",
            type: "project",
            num: 3,
            slug: "closed-loop-waypoint-follower",
            title: "Build a 100Hz Closed-Loop Waypoint Follower with Kalman State Estimation",
            difficulty: "Hard",
            docPath: "/robotics/part3/topic2/project-closed-loop-waypoint-follower.md"
          }
        ]
      }
    ]
  },
  {
    id: "p4",
    phase: 4,
    title: "Real-Time C++ Systems, Path Planning & ROS2 Simulation",
    accent: "#EC4899",
    subtitle: "Deterministic memory, lock-safe ring buffers, 100Hz threads, A* & RRT motion planning, ROS2 middleware, and MuJoCo physics.",
    topics: [
      {
        id: "p4t1",
        title: "Deterministic Real-Time C++ Engineering",
        items: [
          {
            id: "p4t1c1",
            type: "concept",
            text: "Real-Time Determinism, Stack vs. Heap Jitter, CPU Cache Lines, RAII, Smart Pointers & Move Semantics",
            docPath: "/robotics/part4/topic1/chapter1-modern-cpp-memory-raii-and-smart-pointers.md"
          },
          {
            id: "p4t1c2",
            type: "concept",
            text: "Fixed-Capacity Ring Buffers (Overwrite-Oldest), Multithreading (std::mutex / atomic) & Jitter-Free sleep_until Loops",
            docPath: "/robotics/part4/topic1/chapter2-ring-buffers-threads-and-deterministic-loops.md"
          }
        ]
      },
      {
        id: "p4t2",
        title: "Autonomous Motion Planning, ROS2 & MuJoCo",
        items: [
          {
            id: "p4t2c1",
            type: "concept",
            text: "Occupancy Grids, C-Space Obstacle Inflation, Dijkstra vs. A* Heuristic Search & High-DOF RRT Planning",
            docPath: "/robotics/part4/topic2/chapter1-occupancy-grids-astar-and-rrt.md"
          },
          {
            id: "p4t2c2",
            type: "concept",
            text: "ROS2 Computation Graph (Nodes, DDS Topics, Services, Actions, URDF, TF2) & MuJoCo Physics Simulation",
            docPath: "/robotics/part4/topic2/chapter2-ros2-architecture-and-mujoco-simulation.md"
          },
          {
            id: "p4t2p1",
            type: "project",
            num: 4,
            slug: "cpp-autonomous-robot-daemon",
            title: "Build a Multithreaded C++ Autonomous Robot Daemon with A* & UDP Telemetry",
            difficulty: "Hard",
            docPath: "/robotics/part4/topic2/project-cpp-autonomous-robot-daemon.md"
          }
        ]
      }
    ]
  },
  {
    id: "p5",
    phase: 5,
    title: "Async Python & High-Throughput FastAPI Telemetry Servers",
    accent: "#06B6D4",
    subtitle: "Non-blocking event loops, concurrent sensor polling, and production FastAPI machine telemetry ingestion.",
    topics: [
      {
        id: "p5t1",
        title: "Asynchronous Python & Concurrent I/O",
        items: [
          {
            id: "p5t1c1",
            type: "concept",
            text: "The Event Loop — How single-threaded async/await schedules thousands of concurrent network streams",
            docPath: "/robotics/part5/topic1/chapter1-the-event-loop.md"
          },
          {
            id: "p5t1c2",
            type: "concept",
            text: "Concurrent Execution — asyncio.gather, create_task & TaskGroups for parallel sensor polling",
            docPath: "/robotics/part5/topic1/chapter2-concurrent-execution.md"
          },
          {
            id: "p5t1c3",
            type: "concept",
            text: "Async HTTP — Connection pooling, timeouts & exponential backoff retries with httpx.AsyncClient",
            docPath: "/robotics/part5/topic1/chapter3-async-http.md"
          },
          {
            id: "p5t1p1",
            type: "project",
            num: 5,
            slug: "async-data-fetcher",
            title: "Build an Async Telemetry Poller Fetching 3 Concurrent Sensor Streams",
            difficulty: "Easy",
            docPath: "/robotics/part5/topic1/project-async-data-fetcher.md"
          }
        ]
      },
      {
        id: "p5t2",
        title: "FastAPI Telemetry Development & Dependency Injection",
        items: [
          {
            id: "p5t2c1",
            type: "concept",
            text: "FastAPI Basics — Routing, path/query parameters, request validation & OpenAPI schemas",
            docPath: "/robotics/part5/topic2/chapter1-fastapi-basics.md"
          },
          {
            id: "p5t2c2",
            type: "concept",
            text: "Dependency Injection — Yield dependencies, resource cleanup & test overrides with Depends()",
            docPath: "/robotics/part5/topic2/chapter2-dependency-injection.md"
          },
          {
            id: "p5t2p1",
            type: "project",
            num: 6,
            slug: "telemetry-api",
            title: "Build a High-Performance Async FastAPI Machine Telemetry Server",
            difficulty: "Medium",
            docPath: "/robotics/part5/topic2/project-telemetry-api.md"
          }
        ]
      }
    ]
  },
  {
    id: "p6",
    phase: 6,
    title: "Fleet Cloud Infrastructure: SQL, Docker, Redis & WebSockets",
    accent: "#14B8A6",
    subtitle: "Persisting time-series telemetry in PostgreSQL, containerizing with Docker, caching state in Redis, and streaming live 20Hz WebSockets.",
    topics: [
      {
        id: "p6t1",
        title: "Relational Schemas & Advanced SQL for Telemetry",
        items: [
          {
            id: "p6t1c1",
            type: "concept",
            text: "Tables, Rows & Normalized Schemas — Designing relational tables for robot fleets and sensor logs",
            docPath: "/robotics/part6/topic1/chapter1-tables-and-schema.md"
          },
          {
            id: "p6t1c2",
            type: "concept",
            text: "SQL Queries — SELECT, INSERT, UPDATE, DELETE, filtering & multi-table JOINs",
            docPath: "/robotics/part6/topic1/chapter2-sql-queries.md"
          },
          {
            id: "p6t1c3",
            type: "concept",
            text: "Foreign Keys, Constraints & Indexes — Enforcing data integrity at the database engine level",
            docPath: "/robotics/part6/topic1/chapter3-foreign-keys-constraints.md"
          },
          {
            id: "p6t1c4",
            type: "concept",
            text: "Advanced SQL — CTEs, Window Functions (LAG/LEAD for sensor deltas), UPSERT & EXPLAIN ANALYZE",
            docPath: "/robotics/part6/topic1/chapter4-advanced-sql.md"
          }
        ]
      },
      {
        id: "p6t2",
        title: "Docker Containers, Queues, Redis & Real-Time WebSockets",
        items: [
          {
            id: "p6t2c1",
            type: "concept",
            text: "Docker & Compose — Multi-stage Dockerfiles and orchestrating API + Postgres + Redis stacks",
            docPath: "/robotics/part6/topic2/chapter1-docker-containers.md"
          },
          {
            id: "p6t2c2",
            type: "concept",
            text: "Background Queues & Workers — Offloading heavy telemetry and media jobs asynchronously",
            docPath: "/robotics/part6/topic2/chapter2-background-queues.md"
          },
          {
            id: "p6t2c3",
            type: "concept",
            text: "Redis Caching & Pub/Sub — Sub-millisecond key-value state and stampede protection",
            docPath: "/robotics/part6/topic2/chapter3-redis-caching.md"
          },
          {
            id: "p6t2c4",
            type: "concept",
            text: "The WebSocket Protocol — Full-duplex persistent connections, heartbeats & rooms for live fleet dashboards",
            docPath: "/robotics/part6/topic2/chapter4-websockets.md"
          },
          {
            id: "p6t2c5",
            type: "concept",
            text: "CI/CD with GitHub Actions — Automated linting, typechecking, testing & deployment pipelines",
            docPath: "/robotics/part6/topic2/chapter5-cicd.md"
          }
        ]
      }
    ]
  },
  {
    id: "p7",
    phase: 7,
    title: "Deterministic Guardrails & Physics-First Rule Engines",
    accent: "#F43F5E",
    subtitle: "Enforcing strict Pydantic schemas and physics-first safety interceptors between untrusted AI/network inputs and physical actuators.",
    topics: [
      {
        id: "p7t1",
        title: "Pydantic Data Validation & Plausibility Checks",
        items: [
          {
            id: "p7t1c1",
            type: "concept",
            text: "Pydantic BaseModels — Defining strict typed schemas at system trust boundaries",
            docPath: "/robotics/part7/topic1/chapter1-basemodels.md"
          },
          {
            id: "p7t1c2",
            type: "concept",
            text: "Field Constraints — Enforcing numeric physical bounds, string regexes & Literal enums",
            docPath: "/robotics/part7/topic1/chapter2-field-constraints.md"
          },
          {
            id: "p7t1c3",
            type: "concept",
            text: "Custom Validators — Single-field and cross-field physical law validation (@model_validator)",
            docPath: "/robotics/part7/topic1/chapter3-custom-validators.md"
          },
          {
            id: "p7t1p1",
            type: "project",
            num: 7,
            slug: "sensor-schema-validator",
            title: "Build a Validation Layer That Catches & Rejects Anomalous Sensor Readings",
            difficulty: "Medium",
            docPath: "/robotics/part7/topic1/project-sensor-schema-validator.md"
          }
        ]
      },
      {
        id: "p7t2",
        title: "Physics-First Rule Engines & Safety Interceptors",
        items: [
          {
            id: "p7t2c1",
            type: "concept",
            text: "Middleware Interceptors — Pre-execution validation and post-execution drift sanity checks",
            docPath: "/robotics/part7/topic2/chapter1-middleware-interceptors.md"
          },
          {
            id: "p7t2c2",
            type: "concept",
            text: "Deterministic Fallbacks — Physics Rules > Equipment Safety Rules > AI Recommendations",
            docPath: "/robotics/part7/topic2/chapter2-deterministic-fallbacks.md"
          },
          {
            id: "p7t2p1",
            type: "project",
            num: 8,
            slug: "thermal-guardrail",
            title: "Build a Physics-First Rule Engine Blocking Unsafe Thermal & Motor Commands",
            difficulty: "Hard",
            docPath: "/robotics/part7/topic2/project-thermal-guardrail.md"
          }
        ]
      }
    ]
  },
  {
    id: "p8",
    phase: 8,
    title: "Physical AI: Tool Calling, Industrial RAG & Multi-Agent Fleet OS",
    accent: "#A855F7",
    subtitle: "Connecting LLM reasoning engines, technical manual RAG, and self-correcting state machines to deterministic robotics pipelines.",
    topics: [
      {
        id: "p8t1",
        title: "Sandboxed Tool Calling & Dynamic Execution",
        items: [
          {
            id: "p8t1c1",
            type: "concept",
            text: "The Chat Completions API — System, User & Assistant roles and deterministic temperature",
            docPath: "/robotics/part8/topic1/chapter1-chat-completions-api.md"
          },
          {
            id: "p8t1c2",
            type: "concept",
            text: "Context Windows — Token counting, sliding windows, summarization & latency budgeting",
            docPath: "/robotics/part8/topic1/chapter2-context-windows.md"
          },
          {
            id: "p8t1c3",
            type: "concept",
            text: "The Tool Message Role — Multi-call tool lifecycles and tool_call_id correlation",
            docPath: "/robotics/part8/topic1/chapter3-tool-message-role.md"
          },
          {
            id: "p8t1c4",
            type: "concept",
            text: "JSON Schema Generation — Introspecting Python type hints into LLM tool schemas automatically",
            docPath: "/robotics/part8/topic1/chapter4-json-schema-generation.md"
          },
          {
            id: "p8t1c5",
            type: "concept",
            text: "Dynamic Execution — Allowlisted function registries, timeout guards & safe argument unpacking",
            docPath: "/robotics/part8/topic1/chapter5-dynamic-execution.md"
          },
          {
            id: "p8t1c6",
            type: "concept",
            text: "The Real Agent Loop — Multi-step Reason → Act → Observe loops with termination guards",
            docPath: "/robotics/part8/topic1/chapter6-real-agent-loop.md"
          },
          {
            id: "p8t1p1",
            type: "project",
            num: 9,
            slug: "tool-calling-bot",
            title: "Build a Sandboxed Diagnostic Tool-Calling Agent for Machine Telemetry",
            difficulty: "Medium",
            docPath: "/robotics/part8/topic1/project-tool-calling-bot.md"
          }
        ]
      },
      {
        id: "p8t2",
        title: "Industrial RAG, State Machines & Capstone Fleet OS",
        items: [
          {
            id: "p8t2c1",
            type: "concept",
            text: "Vector Embeddings — Semantic representation, batching & SHA-256 embedding caches",
            docPath: "/robotics/part8/topic2/chapter1-embeddings.md"
          },
          {
            id: "p8t2c2",
            type: "concept",
            text: "Cosine Similarity — Dot products, vector norms & Top-K semantic ranking",
            docPath: "/robotics/part8/topic2/chapter2-cosine-similarity.md"
          },
          {
            id: "p8t2c3",
            type: "concept",
            text: "Chunking Strategies — Recursive character splitting, overlap & machine metadata attachment",
            docPath: "/robotics/part8/topic2/chapter3-chunking-strategies.md"
          },
          {
            id: "p8t2c4",
            type: "concept",
            text: "Vector Databases — In-memory numpy stores, PostgreSQL pgvector (ivfflat/HNSW) & Pinecone",
            docPath: "/robotics/part8/topic2/chapter4-vector-databases.md"
          },
          {
            id: "p8t2c5",
            type: "concept",
            text: "Metadata Filtering & Hybrid Search — Pre-filtering by machine_id and section_type",
            docPath: "/robotics/part8/topic2/chapter5-metadata-filtering.md"
          },
          {
            id: "p8t2p1",
            type: "project",
            num: 10,
            slug: "industrial-rag-pipeline",
            title: "Build an Industrial Maintenance Manual RAG Pipeline with Metadata Filtering",
            difficulty: "Hard",
            docPath: "/robotics/part8/topic2/project-industrial-rag-pipeline.md"
          },
          {
            id: "p8t2c6",
            type: "concept",
            text: "State Dictionary Pattern — TypedDict state machines, phase transitions & deep-copy forking",
            docPath: "/robotics/part8/topic2/chapter6-state-dictionary.md"
          },
          {
            id: "p8t2c7",
            type: "concept",
            text: "Session Management — Redis-backed TTL state persistence across stateless HTTP calls",
            docPath: "/robotics/part8/topic2/chapter7-session-management.md"
          },
          {
            id: "p8t2c8",
            type: "concept",
            text: "Self-Correction Loops — Feeding Pydantic validation errors back to the LLM with retry caps",
            docPath: "/robotics/part8/topic2/chapter8-self-correction-loops.md"
          },
          {
            id: "p8t2c9",
            type: "concept",
            text: "5-Stage Production Pipeline Architecture — Planner → Retriever → Executor → Physics Validator → Synthesizer",
            docPath: "/robotics/part8/topic2/chapter9-architecture-review.md"
          },
          {
            id: "p8t2c10",
            type: "concept",
            text: "Observability — Structured JSON logging, @timed decorators, token cost tracking & trace spans",
            docPath: "/robotics/part8/topic2/chapter10-observability.md"
          },
          {
            id: "p8t2p2",
            type: "project",
            num: 11,
            slug: "factory-agent-os",
            title: "Capstone: Build the 5-Stage Autonomous Factory & Robot Fleet Diagnostic OS",
            difficulty: "Hard",
            docPath: "/robotics/part8/topic2/project-factory-agent-os.md"
          }
        ]
      }
    ]
  }
];

export default ROBOTICS_CURRICULUM;

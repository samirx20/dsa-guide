# CLAUDE.md — Project Instructions for Interactive Robotics & DSA Web Platform

When working in this repository (`Learning`), follow [`CLAUDE_VISUALIZATION_SPEC.md`](./CLAUDE_VISUALIZATION_SPEC.md) as the authoritative blueprint.

## 1. Repository Overview
This repository contains **156 comprehensive, self-contained markdown chapters and projects (75,000+ lines)** across two unified tracks:
- **`robotics/`** (Index: [`robotics/ROBOTICS.js`](./robotics/ROBOTICS.js)) — **Phases 0 to 8:** Linux/Git & Modern Python $\to$ Spatial Math, Rotations, Quaternions & $SE(2)/SE(3)$ Homogeneous Transforms $\to$ Discrete Calculus, Physics Loops & Manipulator/Diff-Drive Kinematics $\to$ PID Control, Cascaded/LQR Control & Kalman Filter Sensor Fusion $\to$ Real-Time C++ Memory/RAII, Ring Buffers, $A^*$/RRT Motion Planning & ROS2/MuJoCo $\to$ Asyncio & FastAPI Telemetry $\to$ SQL, Docker, Redis & WebSockets $\to$ Pydantic Guardrails & Physics Rule Engines $\to$ Physical AI & Multi-Agent Fleet OS.
- **`dsa/`** (Index: [`dsa/DSA.js`](./dsa/DSA.js)) — **Phases 0 to 14:** C++ Memory, Pointers & Structs/RAII from scratch $\to$ C++ STL & Big-O $\to$ Arrays, Prefix Sums, Two Pointers & Sliding Window $\to$ Sorting $\to$ Binary Search $\to$ Strings & KMP $\to$ Recursion & Backtracking $\to$ Linked Lists $\to$ Stacks, Monotonic Stacks & Queues $\to$ Hashing $\to$ Trees, BSTs, Heaps & Tries $\to$ Graphs, Topo Sort, Dijkstra & Union-Find $\to$ 1D/2D Dynamic Programming $\to$ Greedy $\to$ Bit Manipulation & Matrix Math.

Every `.md` chapter ends with a dedicated **`## Interactive Visualization & shadcn/ui Specification`** section specifying the exact interactive visualizers and controls to build for that chapter.

## 2. Non-Negotiable UI & Visualization Rules
1. **Strictly Use `shadcn/ui` Primitives (`@radix-ui/*` + Tailwind CSS):**
   - **NEVER** use raw browser-default controls (`<input type="range">`, `<select>`, `<input type="checkbox">`, `<details>`, native scrollbars, or native tooltips).
   - Use `<Slider>`, `<Switch>`, `<Checkbox>`, `<Select>`, `<Tabs>`, `<ToggleGroup>`, `<Accordion>` / `<Collapsible>`, `<Card>`, `<Table>`, `<Badge>`, `<Button>`, `<Tooltip>`, and `<ScrollArea>` from `shadcn/ui`.
2. **Preserve All Markdown Content:**
   - Do **not** summarize, truncate, or delete any of the 156 markdown files in `robotics/` or `dsa/`.
   - Render all Markdown with **KaTeX** (`$$...$$` display math and `$...$` inline math), syntax-highlighted code blocks, dry-run tables, and interactive visualizers embedded directly inside the lessons.
3. **GitHub Pages Deployment:**
   - Keep `.github/workflows/deploy.yml` configured so `npm run build` outputs to `dist/` and deploys automatically to GitHub Pages (`base: '/dsa-guide/'` when not on Vercel).

# Part 6, Topic 2: SDK Design & Distribution
## Chapter 4: CI/CD with GitHub Actions

### What You'll Learn
- What CI/CD is and why it matters
- How to write GitHub Actions workflows
- How to automate testing, linting, and building
- How to set up continuous deployment
- How to automate NPM publishing

---

## 1. What is CI/CD?

```text
CI (Continuous Integration):
  Every time you push code → automatically test, lint, build
  Catches bugs before they reach production

CD (Continuous Deployment):
  Every time code is merged to main → automatically deploy
  No manual deploy steps

Without CI/CD:
  Push code → Hope it works → Manual test → Manual deploy → 💥 broken

With CI/CD:
  Push code → Auto test → Auto lint → Auto build → Auto deploy → ✅
```

---

## 2. GitHub Actions Basics

GitHub Actions runs workflows (YAML files) in response to events.

```text
Workflow structure:
┌─────────────────────────────────────────────────┐
│  .github/workflows/ci.yml                       │
│                                                 │
│  name: CI                                       │
│  on: [push, pull_request]  ← triggers           │
│                                                 │
│  jobs:                                          │
│    test:                   ← job name           │
│      runs-on: ubuntu-latest ← runner            │
│      steps:                ← what to do         │
│        - checkout code                          │
│        - install deps                           │
│        - run tests                              │
└─────────────────────────────────────────────────┘
```

---

## 3. CI Pipeline

Test, lint, and build on every push and PR.

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npm run typecheck

      - name: Test
        run: npm test

      - name: Build
        run: npm run build
```

### What Each Step Does

```yaml
steps:
  - uses: actions/checkout@v4
    # Downloads your repo code to the runner

  - uses: actions/setup-node@v4
    # Installs Node.js on the runner

  - run: npm ci
    # Installs dependencies (clean install, uses package-lock.json)

  - run: npm run lint
    # Checks code style

  - run: npm run typecheck
    # Checks TypeScript types

  - run: npm test
    # Runs your test suite

  - run: npm run build
    # Builds your project
```

---

## 4. Caching in CI

Speed up workflows by caching npm's download cache (`~/.npm`).

```yaml
jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'  # ← Caches npm dependencies automatically

      - run: npm ci
        # If package-lock.json hasn't changed, restores the cached ~/.npm (npm ci still rebuilds node_modules)
```

```text
Without cache:
  npm ci: ~60 seconds

With cache:
  npm ci: ~10 seconds (90% faster)
```

---

## 5. CI Pipeline with Matrix (Multiple Node Versions)

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - run: npm ci
      - run: npm test

  # Tests run on Node 18, 20, AND 22 in parallel
```

---

## 6. CD Pipeline (Auto-Deploy)

### Vercel

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### Railway

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Railway
        uses: bervProject/railway-deploy@main
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
```

---

## 7. Environment Secrets

Store sensitive values in GitHub, not in code.

```text
Settings → Secrets and variables → Actions → New repository secret

┌─────────────────────────┬──────────────────────────┐
│ Name                    │ Value                    │
├─────────────────────────┼──────────────────────────┤
│ VERCEL_TOKEN            │ xxxxxxx                  │
│ VERCEL_ORG_ID           │ xxxxxxx                  │
│ VERCEL_PROJECT_ID       │ xxxxxxx                  │
│ NPM_TOKEN               │ npm_xxxxx                │
│ STRIPE_SECRET_KEY       │ sk_live_xxxxx            │
└─────────────────────────┴──────────────────────────┘
```

### Access in Workflow

```yaml
steps:
  - run: echo "Deploying..."
    env:
      STRIPE_KEY: ${{ secrets.STRIPE_SECRET_KEY }}
```

---

## 8. NPM Publish Automation

Publish to NPM when you create a git tag.

```yaml
# .github/workflows/publish.yml
name: Publish to NPM

on:
  push:
    tags:
      - 'v*'  # Triggers on tags like v1.0.0, v2.1.3

jobs:
  publish:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: 'https://registry.npmjs.org'
          cache: 'npm'

      - run: npm ci
      - run: npm test
      - run: npm run build

      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Publishing Flow

```bash
# 1. Update version in package.json
npm version patch   # 1.0.0 → 1.0.1
# or
npm version minor   # 1.0.1 → 1.1.0
# or
npm version major   # 1.1.0 → 2.0.0

# 2. Push with tags
git push && git push --tags

# 3. GitHub Actions automatically:
#    → Runs tests
#    → Builds
#    → Publishes to NPM
```

---

## 9. Branch Protection

Require CI to pass before merging to main.

```text
Settings → Branches → Add rule:
┌────────────────────────────────────────────────────┐
│ Branch name pattern: main                          │
│                                                    │
│ ✅ Require a pull request before merging            │
│ ✅ Require status checks to pass                   │
│   → Require: CI                                   │
│ ✅ Require branches to be up to date               │
│ ✅ Require conversation resolution                 │
└────────────────────────────────────────────────────┘

Now PRs can't merge unless:
  1. CI passes (lint, test, build all green)
  2. Someone reviews the PR
```

---

## 10. Full Example: Edge Tracker SDK

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
```

```yaml
# .github/workflows/publish.yml
name: Publish

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: 'https://registry.npmjs.org'
          cache: 'npm'

      - run: npm ci
      - run: npm test
      - run: npm run build
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## Quick Reference

| Task | How |
|------|-----|
| Trigger on push | `on: push: branches: [main]` |
| Setup Node | `uses: actions/setup-node@v4` |
| Cache deps | `cache: 'npm'` in setup-node |
| Run command | `run: npm test` |
| Use secret | `${{ secrets.SECRET_NAME }}` |
| Matrix strategy | `strategy: matrix: node-version: [18, 20]` |
| Publish on tag | `on: push: tags: ['v*']` |
| Branch protection | Settings → Branches → Require status checks |

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Systems & Robotics Visualizer for **Chapter 4: CI/CD with GitHub Actions**
- **Live Architecture & Data-Flow Sandbox:**
  - Render an interactive system pipeline and state inspector for **chapter5 cicd**, animating data packets, telemetry frames, validation boundaries, and execution states across each stage.
  - Display live latency, throughput, validation status (`<Badge>` in emerald for valid, rose for rejected/fault), and memory/state transitions as parameters change.
- **Step-by-Step Execution & Failure-Mode Inspector:**
  - Allow the user to inject both valid telemetry payloads and fault scenarios (malformed schemas, timeouts, out-of-range sensor spikes) and watch the system recover or trigger deterministic fallbacks in a live `<Table>` audit log.

### 2. Required `shadcn/ui` Controls
- **Simulation Controls:** `<Button>` triggers for **Run Step**, **Inject Fault / Anomaly**, and **Reset State**; `<Slider>` for request rate, timeout threshold, or physical parameter bounds.
- **Mode & Configuration Toggles:** `<Switch>` to toggle strict validation / guardrails ON vs. OFF, and `<Tabs>` to switch between *Architecture View*, *Live Payload Inspector*, and *Production Code Breakdown*.


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

## Practice & Self-Check

### Predict the Output / Trace by Hand

**Q1. Which workflows run?** The repo contains the Section 10 `ci.yml` (`push` and `pull_request` on `main`) and `publish.yml` (`push` of tags `v*`). For each event, say which workflow(s) start.
- (a) `git push origin feature/gripper` (a new branch, no PR yet)
- (b) Open a PR from `feature/gripper` into `main`
- (c) Push another commit to `feature/gripper` while that PR is open
- (d) Merge the PR into `main`
- (e) `git push origin v1.2.0`
- (f) Open a PR from `feature/lidar` into `develop`

**Q2. Failure propagation.**
- (a) In the Section 3 job, `npm run lint` exits with code 1. Which of the remaining steps run, and what status does the job get?
- (b) In the Section 5 matrix `[18, 20, 22]`, the tests fail on Node 18 while the 20 and 22 jobs are still running. With default settings, what happens to those two jobs?
- (c) How many jobs would `matrix: { os: [ubuntu-latest, windows-latest], node-version: [18, 20, 22] }` create?

**Q3. Version bumps (Section 8).** `package.json` is at `1.4.9`. You run `npm version patch`, `npm version patch`, `npm version minor`, `npm version patch`, and `npm version major` in sequence. What version and git tag does each command produce? Then you run only `git push`. Does `publish.yml` run?

**Q4. What does `cache: 'npm'` really cache?** The comment in Section 4 says "uses cached node_modules". What does `actions/setup-node` with `cache: 'npm'` actually store and restore, what is the cache keyed on, and what does `npm ci` do to `node_modules` every time?

**Q5. Secrets on forks.** An outside contributor opens a PR **from a fork**, and the workflow is triggered by `pull_request`. A step runs `echo "Deploying..."` with `STRIPE_KEY: ${{ secrets.STRIPE_SECRET_KEY }}` (Section 7). What value does `STRIPE_KEY` have? In a run where the secret *is* available, what appears in the log if a step accidentally runs `echo $STRIPE_KEY`?

### Coding Exercises

**E1 (Easy).** Write `.github/workflows/ci.yml` for the Python robotics telemetry service (FastAPI + pytest). On pushes and PRs to `main`, it should check out the code, set up Python 3.12 **with pip caching**, install `requirements.txt`, run `ruff check .`, and then run `pytest -q`.

**E2 (Easy–Medium).** Extend E1:
- run on Python `3.11`, `3.12`, and `3.13`, and let every version finish even if one fails;
- start a **Postgres 16 service container** for the integration tests, wait until it is healthy, and pass `DATABASE_URL` to `pytest`.

**E3 (Medium).** Add a `deploy` job to the same workflow that:
- runs **only** after all `test` matrix jobs pass, and **only** for pushes to `main` (never for PRs);
- builds the Dockerfile from the Docker chapter and pushes it to GitHub Container Registry as `ghcr.io/<owner>/<repo>:<commit-sha>` and `:latest`;
- uses the built-in `GITHUB_TOKEN` (no personal token) with the minimum extra permission it needs.

#### Dry-Run: Answers

**Q1.**

| event | ci.yml | publish.yml | why |
|-------|:------:|:-----------:|-----|
| (a) push to `feature/gripper` | no | no | `push` is filtered to `branches: [main]` |
| (b) open PR → `main` | **yes** | no | `pull_request` with base `main` |
| (c) new commit on the PR branch | **yes** | no | `pull_request` runs again (`synchronize`) |
| (d) merge into `main` | **yes** | no | the merge is a `push` to `main` |
| (e) push tag `v1.2.0` | no | **yes** | the tag matches `v*`. A tag push is not a branch push, so the `branches` filter on `ci.yml` does not match |
| (f) PR → `develop` | no | no | base branch is not `main` |

**Q2.**
- (a) `Type check`, `Test`, and `Build` are **skipped**. Steps run in order, and the default condition (`success()`) is false after a failure. The job, and so the workflow run, is marked **failed**. A required status check would block the merge.
- (b) They are **cancelled**. A matrix defaults to `fail-fast: true`, so the first failing job cancels the in-progress and queued siblings. Set `strategy.fail-fast: false` to see every version's result.
- (c) $2 \times 3 = 6$ jobs, one for each combination.

**Q3.**

| command | version | git tag |
|---------|---------|---------|
| `npm version patch` | 1.4.10 | `v1.4.10` |
| `npm version patch` | 1.4.11 | `v1.4.11` |
| `npm version minor` | 1.5.0 | `v1.5.0` |
| `npm version patch` | 1.5.1 | `v1.5.1` |
| `npm version major` | 2.0.0 | `v2.0.0` |

Versions are numbers, not decimals: `1.4.9 → 1.4.10` (not `1.5.0`). A minor bump resets the patch number, and a major bump resets both. A plain `git push` sends commits but **not tags**, so `publish.yml` does **not** run. That is why the chapter adds `git push --tags`.

**Q4.** It caches npm's **download cache** (`~/.npm`, the package tarballs), **not** `node_modules`. The cache key includes a hash of `package-lock.json`, so changing the lockfile produces a new cache entry. `npm ci` **deletes `node_modules` and reinstalls** from the lockfile on every run. The cache only saves the network downloads, which is where most of the time goes, hence the speedup.

**Q5.** On a `pull_request` from a fork, repository secrets are **not passed** to the run (only a read-only `GITHUB_TOKEN`), so `STRIPE_KEY` is an **empty string**. This prevents a malicious PR from stealing secrets by editing the workflow. When the secret *is* available, GitHub **masks** it in logs, so `echo $STRIPE_KEY` prints `***`. Masking is best-effort (an encoded or split value can slip through), so never print secrets.

**E1 — reference solution**

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
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: "pip"                 # keyed on requirements*.txt hashes

      - run: pip install -r requirements.txt
      - run: ruff check .
      - run: pytest -q
```

This mirrors Section 3, with the fastest check (lint) first so that cheap failures stop the job early (Q2a). Quote `"3.12"`, because YAML would otherwise parse `3.10` as the number `3.1`.

**E2 — reference solution**

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false                     # let every version report (Q2b)
      matrix:
        python-version: ["3.11", "3.12", "3.13"]

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: telemetry_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U test -d telemetry_test"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 10

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}
          cache: "pip"
      - run: pip install -r requirements.txt
      - run: ruff check .
      - run: pytest -q
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/telemetry_test
```

This creates 3 jobs, each with its own fresh database. Because the job runs **directly on the runner** (not in a container), the service is reached through the published port at `localhost:5432`. Inside a Compose network it would be `db:5432`, as in the Docker chapter. The health options make GitHub wait for `pg_isready` before running the steps, which is the CI equivalent of `condition: service_healthy`.

**E3 — reference solution**

```yaml
  deploy:
    needs: test                                   # waits for ALL matrix jobs
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write                             # push to ghcr.io
    steps:
      - uses: actions/checkout@v4

      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: |
            ghcr.io/${{ github.repository }}:${{ github.sha }}
            ghcr.io/${{ github.repository }}:latest
```

`needs: test` depends on the whole matrix, so one failing Python version blocks the deploy. The `if:` keeps PR runs (Q1 b and c) from deploying even though they run the same workflow. Tagging with the commit SHA gives an immutable image that you can roll back to, while `latest` is a convenience pointer. Note that GHCR requires lowercase image names, so add a lowercase step if the owner or repo name has capitals. Setting `permissions:` on the job narrows the token to what this job needs.

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


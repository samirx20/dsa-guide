# Part 3, Topic 1: Relational Databases & SQL
## Chapter 3: Foreign Keys & Constraints

### What You'll Learn
- How foreign keys enforce relationships
- What happens when you delete referenced data
- How to use cascading deletes
- How indexes improve performance

---

## 1. Why Constraints Matter

Constraints protect your data at the database level. Even if your code has bugs, the database rejects invalid data.

```text
Without constraints:
┌─────────────────────────────────────────────────────────┐
│  1. Your code has a bug                                  │
│  2. Tries to create order for user_id = 9999            │
│  3. User 9999 doesn't exist                             │
│  4. Order is created anyway!                            │
│  5. Now you have an "orphaned" order                    │
│  6. App crashes when trying to show the user's name     │
└─────────────────────────────────────────────────────────┘

With constraints:
┌─────────────────────────────────────────────────────────┐
│  1. Your code has a bug                                  │
│  2. Tries to create order for user_id = 9999            │
│  3. Database checks: does user 9999 exist?              │
│  4. NO → Database REJECTS the insert                    │
│  5. Your app gets an error, you fix the bug             │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Basic Constraints

```sql
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    sku VARCHAR(20) UNIQUE NOT NULL,
    price INTEGER NOT NULL CHECK (price >= 0),
    is_active BOOLEAN DEFAULT true
);
```

**Each constraint explained:**
```sql
id SERIAL PRIMARY KEY
-- ↑ Auto-increment, unique identifier for each row

name VARCHAR(100) NOT NULL
-- ↑ Max 100 chars, cannot be empty

sku VARCHAR(20) UNIQUE NOT NULL
-- ↑ Max 20 chars, no two products can have same SKU

price INTEGER NOT NULL CHECK (price >= 0)
-- ↑ Must be a number, cannot be empty, must be 0 or positive

is_active BOOLEAN DEFAULT true
-- ↑ true/false, defaults to true if not provided
```

### Constraint Types

| Constraint | Purpose | Example |
|-----------|---------|---------|
| `PRIMARY KEY` | Unique identifier | `id SERIAL PRIMARY KEY` |
| `NOT NULL` | Cannot be empty | `name VARCHAR(100) NOT NULL` |
| `UNIQUE` | No duplicates | `email VARCHAR(255) UNIQUE` |
| `DEFAULT` | Auto-fill if empty | `is_active BOOLEAN DEFAULT true` |
| `CHECK` | Custom validation | `price INTEGER CHECK (price > 0)` |

---

## 3. Foreign Keys (The Most Important)

Foreign keys enforce relationships between tables.

### Basic Foreign Key

```sql
CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    author_id INTEGER NOT NULL,

    -- This line creates the relationship
    FOREIGN KEY (author_id) REFERENCES users(id)
);
```

**What's happening:**
```sql
FOREIGN KEY (author_id) REFERENCES users(id)
--         ↑              ↑           ↑
--         |              |           └── References the 'id' column in users table
--         |              └── This keyword links to another table
--         └── The column in THIS table that references the other table

-- This means:
-- The author_id in posts MUST exist as an id in users
-- You CANNOT create a post with author_id = 999 if user 999 doesn't exist
```

### Referential Integrity in Action

```sql
-- This WORKS (user 1 exists)
INSERT INTO posts (title, author_id) VALUES ('Hello World', 1);

-- This FAILS (user 999 doesn't exist)
INSERT INTO posts (title, author_id) VALUES ('Hello World', 999);
-- ERROR: insert or update on table "posts" violates foreign key constraint
-- DETAIL: Key (author_id)=(999) is not present in table "users"
```

---

## 4. Delete Behavior

What happens when you try to delete a user who has posts?

### Default: RESTRICT (Block)

```sql
-- If user 1 has posts, this FAILS
DELETE FROM users WHERE id = 1;
-- ERROR: update or delete on table "users" violates foreign key constraint
-- DETAIL: Key (id)=(1) is referenced by table "posts"

-- The database protects you from creating orphaned posts
```

### Option 1: CASCADE (Delete related)

```sql
CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author_id INTEGER NOT NULL,
    FOREIGN KEY (author_id) REFERENCES users(id)
        ON DELETE CASCADE  -- If user is deleted, delete their posts too
);

-- Now if user 1 is deleted:
DELETE FROM users WHERE id = 1;
-- Also deletes: DELETE FROM posts WHERE author_id = 1;
```

**Visual:**
```text
Before DELETE:
users:              posts:
┌────┬────────┐   ┌────┬─────────┬───────────┐
│ id │ name   │   │ id │ title   │ author_id │
├────┼────────┤   ├────┼─────────┼───────────┤
│ 1  │ Alice  │   │ 1  │ Hello   │ 1         │
│ 2  │ Bob    │   │ 2  │ World   │ 1         │
└────┴────────┘   └────┴─────────┴───────────┘

DELETE FROM users WHERE id = 1;
                 ↓
                 CASCADE
                 ↓
After DELETE:
users:              posts:
┌────┬────────┐   ┌────┬─────────┬───────────┐
│ id │ name   │   │ id │ title   │ author_id │
├────┼────────┤   ├────┼─────────┼───────────┤
│ 2  │ Bob    │   │ (posts by Alice deleted!) │
└────┴────────┘   └────┴──────────────────────┘
```

### Option 2: SET NULL

```sql
CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author_id INTEGER,  -- Can be NULL
    FOREIGN KEY (author_id) REFERENCES users(id)
        ON DELETE SET NULL  -- If user is deleted, set author_id to NULL
);

-- Now if user 1 is deleted:
DELETE FROM users WHERE id = 1;
-- Posts stay, but author_id becomes NULL
```

**Visual:**
```text
After DELETE with SET NULL:
posts:
┌────┬─────────┬───────────┐
│ id │ title   │ author_id │
├────┼─────────┼───────────┤
│ 1  │ Hello   │ NULL      │  ← Post kept, author anonymized
│ 2  │ World   │ NULL      │
└────┴─────────┴───────────┘
```

### Delete Options Summary

| Option | Behavior | Use Case |
|--------|----------|----------|
| `RESTRICT` | Block deletion | Most cases (default) |
| `CASCADE` | Delete related rows | User's posts, comments |
| `SET NULL` | Set foreign key to NULL | Keep content, anonymize |
| `SET DEFAULT` | Set to default value | Rare |

---

## 5. Indexes (Performance)

Without an index, finding a row requires scanning every row.

```text
Without Index:
┌─────────────────────────────────────────────────────────┐
│  SELECT * FROM users WHERE email = 'alice@email.com'    │
│                                                         │
│  Database scans:                                        │
│    Row 1: Is this alice@email.com? No                  │
│    Row 2: Is this alice@email.com? No                  │
│    Row 3: Is this alice@email.com? No                  │
│    ...                                                  │
│    Row 1,000,000: Is this alice@email.com? YES         │
│                                                         │
│  Time: O(n) - linear with table size                    │
└─────────────────────────────────────────────────────────┘

With Index:
┌─────────────────────────────────────────────────────────┐
│  Database has a sorted lookup structure:                │
│    a@... → Row 5                                       │
│    b@... → Row 12                                      │
│    ...                                                  │
│    alice@email.com → Row 847                           │
│                                                         │
│  Time: O(log n) - almost instant even with millions    │
└─────────────────────────────────────────────────────────┘
```

### Creating Indexes

```sql
-- Index on foreign key (most common)
CREATE INDEX idx_posts_author_id ON posts(author_id);

-- Index on frequently searched column
CREATE INDEX idx_users_email ON users(email);

-- Composite index (multiple columns)
CREATE INDEX idx_posts_author_created ON posts(author_id, created_at);
```

### When to Create Indexes

```text
Create indexes on:
  ✓ Foreign key columns (always!)
  ✓ Columns used in WHERE clauses
  ✓ Columns used in JOIN conditions
  ✓ Columns used in ORDER BY

Don't index:
  ✗ Columns with few unique values (like boolean)
  ✗ Tables with few rows
  ✗ Columns that are rarely queried
```

---

## Quick Reference

| Task | SQL |
|------|-----|
| Foreign key | `FOREIGN KEY (col) REFERENCES other_table(id)` |
| Cascade delete | `ON DELETE CASCADE` |
| Set null | `ON DELETE SET NULL` |
| Block delete | `ON DELETE RESTRICT` (default) |
| Create index | `CREATE INDEX idx_name ON table(column)` |
| Check constraint | `CHECK (column > 0)` |
| Unique constraint | `UNIQUE` |
| Not null | `NOT NULL` |

---

## Practice & Self-Check

### Predict the Output / Trace by Hand

**Q1. Constraint trace on `products` (Section 2).** Starting from an empty table, run these in order. For each, say OK or name the constraint that rejects it.

```sql
INSERT INTO products (name, sku, price) VALUES ('Gripper', 'GR-01', 0);     -- 1
INSERT INTO products (name, sku, price) VALUES ('Arm',     'GR-01', 500);   -- 2
INSERT INTO products (name, sku, price) VALUES ('Wrist',   'WR-01', -5);    -- 3
INSERT INTO products (name, sku, price) VALUES ('Wrist',   'WR-01', NULL);  -- 4
INSERT INTO products (sku, price)       VALUES ('WR-01', 120);              -- 5
```

**Q2. Two-level cascade.** Use this schema and data:

```sql
CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author_id INTEGER NOT NULL,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    body TEXT,
    post_id   INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_id INTEGER NOT NULL REFERENCES users(id)          -- default: block
);
-- users:    (1, Alice), (2, Bob)
-- posts:    (1, 'Hello', 1), (2, 'World', 1), (3, 'Gripper', 2)
-- comments: (1, 'nice', post 1, by Bob), (2, '+1', post 2, by Bob)
```

- (a) What is left in each table after `DELETE FROM users WHERE id = 1;`?
- (b) Start over, but first add comment `(3, 'cool', post 3, by Alice)`. What happens now when you run the same `DELETE`? How many posts and comments exist afterwards?

**Q3. SET NULL meets NOT NULL.** Someone writes `author_id INTEGER NOT NULL` **and** `ON DELETE SET NULL` on the same column. What happens when a user who has posts is deleted?

**Q4. Index math and the composite index (Section 5).** The `users` table has $1{,}000{,}000$ rows.
- (a) Roughly how many comparisons does a full scan need in the worst case, compared with a balanced B-tree lookup (count it like a binary search)?
- (b) With `idx_posts_author_created ON posts(author_id, created_at)`, which of these filters can use the index **efficiently**?
  1. `WHERE author_id = 5`
  2. `WHERE author_id = 5 ORDER BY created_at DESC`
  3. `WHERE created_at > '2024-01-01'`

### Coding Exercises

**E1 (Easy).** Create `robots(id, name UNIQUE NOT NULL)` and `telemetry(id, robot_id, battery_pct, recorded_at)` where:
- every telemetry row must belong to an existing robot;
- deleting a robot deletes its telemetry;
- `battery_pct` is required and between 0 and 100 inclusive;
- lookups by `robot_id` are indexed.

With robot 1 present: `(robot_id=1, battery_pct=87)` succeeds, `(1, 101)` fails the CHECK, `(2, 50)` fails the FK, and `DELETE FROM robots WHERE id = 1` leaves `telemetry` empty.

**E2 (Easy–Medium).** A `missions` table has an optional `assigned_robot_id`. When a robot is scrapped, its missions must **stay** but become unassigned. Write the `missions` table and predict the result of deleting the assigned robot.

**E3 (Medium).** Build the many-to-many `robot_missions(robot_id, mission_id, role)` junction with:
- a composite primary key;
- `role IN ('leader', 'follower', 'observer')`;
- deleting a robot removes its assignments;
- a mission **cannot** be deleted while robots are still assigned to it;
- an index that supports "which robots are on mission X?".

Given robots `(1, 'atlas')`, `(2, 'spot')`, mission `7`, and assignments `(1, 7, 'leader')`, `(2, 7, 'follower')`, predict the outcome of: `INSERT (1, 7, 'observer')`, `INSERT (3, 7, 'observer')`, `INSERT (2, 7, 'pilot')`, `DELETE mission 7`, `DELETE robot 2`.

#### Dry-Run: Answers

**Q1.**

| # | Result | Reason |
|--:|--------|--------|
| 1 | OK | `CHECK (price >= 0)` allows 0 |
| 2 | rejected, `UNIQUE (sku)` | `GR-01` is taken |
| 3 | rejected, `CHECK (price >= 0)` | $-5 < 0$ |
| 4 | rejected, `NOT NULL (price)` | the CHECK alone would have let `NULL` through, but `NOT NULL` stops it |
| 5 | rejected, `NOT NULL (name)` | `name` was omitted and has no default |

**Q2.**
- (a) `users`: only `(2, Bob)`. `posts`: only `(3, 'Gripper', 2)`. `comments`: **empty**. Deleting Alice cascades to her posts 1 and 2, and deleting those posts cascades to comments 1 and 2 (both on Alice's posts, even though Bob wrote them).
- (b) The `DELETE` **fails**, and nothing is deleted. Comment 3 references Alice through `comments.author_id`, which has no `ON DELETE` action (the default blocks the delete). PostgreSQL raises `update or delete on table "users" violates foreign key constraint … on table "comments"`, and because a statement is atomic the cascaded deletes are rolled back too. Afterwards there are still **3 posts** and **3 comments**.

**Q3.** The delete fails. The `SET NULL` action tries to write `NULL` into `author_id`, which violates `NOT NULL` (`null value in column "author_id" … violates not-null constraint`), so the whole `DELETE` is rolled back. `SET NULL` only makes sense on a **nullable** column, as in the chapter's Option 2.

**Q4.**
- (a) Full scan: up to $1{,}000{,}000$ comparisons. B-tree lookup: about $\lceil \log_2 10^6 \rceil = 20$ comparisons (real B-trees have high fan-out, so only 3–4 page reads). That is about $50{,}000\times$ fewer comparisons.
- (b) 1 **yes**, because it uses the leftmost column. 2 **yes**: inside one `author_id`, entries are already sorted by `created_at`, so the index serves both the filter and the sort (scanning backwards for `DESC`). 3 **no, not efficiently**: `created_at` is the *second* column, so matching rows are spread across every `author_id` (the leftmost-prefix rule). Give it its own index if you query it alone.

**E1 — reference solution**

```sql
CREATE TABLE robots (
    id   SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE telemetry (
    id          SERIAL PRIMARY KEY,
    robot_id    INTEGER NOT NULL,
    battery_pct INTEGER NOT NULL CHECK (battery_pct BETWEEN 0 AND 100),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (robot_id) REFERENCES robots(id) ON DELETE CASCADE
);

CREATE INDEX idx_telemetry_robot_id ON telemetry(robot_id);
```

PostgreSQL does **not** index the referencing column automatically. Without the index, every `DELETE FROM robots` has to scan all of `telemetry` to find the rows to cascade. `BETWEEN 0 AND 100` is inclusive at both ends.

**E2 — reference solution**

```sql
CREATE TABLE missions (
    id                SERIAL PRIMARY KEY,
    title             VARCHAR(255) NOT NULL,
    assigned_robot_id INTEGER,                        -- nullable on purpose
    FOREIGN KEY (assigned_robot_id) REFERENCES robots(id) ON DELETE SET NULL
);
CREATE INDEX idx_missions_robot ON missions(assigned_robot_id);

-- robots: (1, 'atlas');  missions: (7, 'inspect bay 3', 1)
DELETE FROM robots WHERE id = 1;
-- missions now: (7, 'inspect bay 3', NULL)   ← mission kept, unassigned
```

Unassigned missions can then be found with `WHERE assigned_robot_id IS NULL`. Note that `= NULL` never matches.

**E3 — reference solution**

```sql
CREATE TABLE robot_missions (
    robot_id   INTEGER     NOT NULL,
    mission_id INTEGER     NOT NULL,
    role       VARCHAR(10) NOT NULL
               CHECK (role IN ('leader', 'follower', 'observer')),
    PRIMARY KEY (robot_id, mission_id),
    FOREIGN KEY (robot_id)   REFERENCES robots(id)   ON DELETE CASCADE,
    FOREIGN KEY (mission_id) REFERENCES missions(id) ON DELETE RESTRICT
);

-- PK (robot_id, mission_id) already serves "missions of robot R";
-- "robots on mission M" needs mission_id as a leading column:
CREATE INDEX idx_robot_missions_mission ON robot_missions(mission_id);
```

| Statement | Outcome |
|-----------|---------|
| `INSERT (1, 7, 'observer')` | rejected: duplicate primary key `(1, 7)` |
| `INSERT (3, 7, 'observer')` | rejected: FK, robot 3 does not exist |
| `INSERT (2, 7, 'pilot')` | rejected: CHECK on `role` (it would also duplicate `(2, 7)`, but the CHECK is evaluated first) |
| `DELETE mission 7` | rejected: RESTRICT, two assignments still reference it |
| `DELETE robot 2` | OK: cascade removes `(2, 7, 'follower')`, leaving `(1, 7, 'leader')` |

This reuses Q4's leftmost-prefix rule. The composite PK index cannot efficiently answer `WHERE mission_id = 7`, which is why the second index exists.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Systems & Robotics Visualizer for **Chapter 3: Foreign Keys & Constraints**
- **Live Architecture & Data-Flow Sandbox:**
  - Render an interactive system pipeline and state inspector for **chapter3 foreign keys constraints**, animating data packets, telemetry frames, validation boundaries, and execution states across each stage.
  - Display live latency, throughput, validation status (`<Badge>` in emerald for valid, rose for rejected/fault), and memory/state transitions as parameters change.
- **Step-by-Step Execution & Failure-Mode Inspector:**
  - Allow the user to inject both valid telemetry payloads and fault scenarios (malformed schemas, timeouts, out-of-range sensor spikes) and watch the system recover or trigger deterministic fallbacks in a live `<Table>` audit log.

### 2. Required `shadcn/ui` Controls
- **Simulation Controls:** `<Button>` triggers for **Run Step**, **Inject Fault / Anomaly**, and **Reset State**; `<Slider>` for request rate, timeout threshold, or physical parameter bounds.
- **Mode & Configuration Toggles:** `<Switch>` to toggle strict validation / guardrails ON vs. OFF, and `<Tabs>` to switch between *Architecture View*, *Live Payload Inspector*, and *Production Code Breakdown*.


# Part 3, Topic 1: Relational Databases & SQL
## Chapter 4: Advanced SQL

### What You'll Learn
- How to use subqueries for complex filtering
- How to write CTEs for readable multi-step queries
- How to use window functions for analytics
- How to do upserts and bulk operations
- How to read query plans with EXPLAIN ANALYZE

---

## 1. Subqueries

A subquery is a query inside another query. Use them when a simple WHERE clause isn't enough.

### Scalar Subquery (returns one value)

```sql
-- Find users with more posts than the average
SELECT username, post_count
FROM (
    SELECT user_id, COUNT(*) AS post_count
    FROM posts
    GROUP BY user_id
) AS user_posts
WHERE post_count > (
    SELECT AVG(post_count)
    FROM (
        SELECT COUNT(*) AS post_count
        FROM posts
        GROUP BY user_id
    ) AS avg_posts
);
```

### Subquery in WHERE

```sql
-- Find all posts by users who joined in 2024
SELECT * FROM posts
WHERE user_id IN (
    SELECT id FROM users
    WHERE created_at >= '2024-01-01'
    AND created_at < '2025-01-01'
);

-- Find posts that have at least one comment
SELECT * FROM posts
WHERE id IN (
    SELECT DISTINCT post_id FROM comments
);
```

### Correlated Subquery (references outer query)

```sql
-- For each user, find their most recent post
SELECT u.username, p.title, p.created_at
FROM users u
JOIN posts p ON p.user_id = u.id
WHERE p.created_at = (
    SELECT MAX(p2.created_at)
    FROM posts p2
    WHERE p2.user_id = u.id
);
```

### Subquery in FROM (Derived Table)

```sql
-- Rank users by post count
SELECT
    username,
    post_counts.total_posts,
    CASE
        WHEN total_posts >= 10 THEN 'power_user'
        WHEN total_posts >= 3 THEN 'active'
        ELSE 'new'
    END AS tier
FROM users
JOIN (
    SELECT user_id, COUNT(*) AS total_posts
    FROM posts
    GROUP BY user_id
) AS post_counts ON users.id = post_counts.user_id;
```

---

## 2. Common Table Expressions (CTEs)

CTEs do the same thing as subqueries but are **much easier to read**. Use the `WITH` keyword.

### Basic CTE

```sql
-- Same query as above, but readable
WITH post_counts AS (
    SELECT user_id, COUNT(*) AS total_posts
    FROM posts
    GROUP BY user_id
)
SELECT u.username, pc.total_posts
FROM users u
JOIN post_counts pc ON u.id = pc.user_id
WHERE pc.total_posts >= 3;
```

### Multiple CTEs

```sql
-- Chain multiple steps together
WITH
active_users AS (
    SELECT id, username
    FROM users
    WHERE is_active = true
),
user_posts AS (
    SELECT user_id, COUNT(*) AS post_count
    FROM posts
    GROUP BY user_id
),
user_comments AS (
    SELECT user_id, COUNT(*) AS comment_count
    FROM comments
    GROUP BY user_id
)
SELECT
    au.username,
    COALESCE(up.post_count, 0) AS posts,
    COALESCE(uc.comment_count, 0) AS comments
FROM active_users au
LEFT JOIN user_posts up ON au.id = up.user_id
LEFT JOIN user_comments uc ON au.id = uc.user_id;
```

### Recursive CTE (Hierarchical Data)

```sql
-- Comment tree: parent comments with nested replies
WITH RECURSIVE comment_tree AS (
    -- Base: top-level comments (no parent)
    SELECT id, parent_id, user_id, content, 0 AS depth
    FROM comments
    WHERE parent_id IS NULL

    UNION ALL

    -- Recurse: replies to each comment
    SELECT c.id, c.parent_id, c.user_id, c.content, ct.depth + 1
    FROM comments c
    JOIN comment_tree ct ON c.parent_id = ct.id
)
SELECT * FROM comment_tree
ORDER BY depth, id;
```

**What's happening:**
```text
comment_tree CTE:
┌─────────────────────────────────────────┐
│  depth 0: "Great post!" (top-level)     │
│  depth 1: "Thanks!" (reply to above)   │
│  depth 2: "You're welcome" (reply)      │
│  depth 0: "Nice work" (another top)     │
└─────────────────────────────────────────┘

The recursion stops when no more replies exist.
```

---

## 3. Window Functions

Window functions calculate across a set of rows **without collapsing them** (unlike GROUP BY).

### ROW_NUMBER

```sql
-- Number all posts per user, ordered by date
SELECT
    user_id,
    title,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS row_num
FROM posts;

-- Result:
-- user_id | title       | created_at | row_num
-- 1       | Latest Post | 2024-03-01 | 1
-- 1       | Old Post    | 2024-01-15 | 2
-- 2       | Hello       | 2024-02-20 | 1
```

### RANK vs DENSE_RANK

```sql
-- Rank posts by likes
SELECT
    title,
    likes,
    RANK() OVER (ORDER BY likes DESC) AS rank,         -- gaps in ranking
    DENSE_RANK() OVER (ORDER BY likes DESC) AS dense_rank, -- no gaps
    ROW_NUMBER() OVER (ORDER BY likes DESC) AS row_num  -- always unique
FROM posts;

-- likes | rank | dense_rank | row_num
-- 100   | 1    | 1          | 1
-- 100   | 1    | 1          | 2
-- 50    | 3    | 2          | 3   ← RANK skips 2, DENSE_RANK doesn't
```

### LAG and LEAD (Previous/Next Row)

```sql
-- Compare each post's likes to the previous post
SELECT
    title,
    likes,
    LAG(likes, 1) OVER (ORDER BY created_at) AS prev_likes,
    likes - LAG(likes, 1) OVER (ORDER BY created_at) AS likes_change
FROM posts;

-- title       | likes | prev_likes | likes_change
-- First Post  | 10    | NULL       | NULL
-- Second Post | 25    | 10         | 15
-- Third Post  | 30    | 25         | 5
```

### Running Totals

```sql
-- Cumulative likes over time
SELECT
    title,
    likes,
    SUM(likes) OVER (ORDER BY created_at) AS running_total,
    AVG(likes) OVER (ORDER BY created_at ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS moving_avg
FROM posts;
```

### Window Functions with Partitions

```sql
-- Top 3 posts per user
SELECT *
FROM (
    SELECT
        user_id,
        title,
        likes,
        ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY likes DESC) AS rank
    FROM posts
) ranked
WHERE rank <= 3;
```

---

## 4. UPSERT

An upsert inserts a row if it doesn't exist, or updates it if it does.

### INSERT ... ON CONFLICT

```sql
-- Insert user, but if username already exists, update the email
INSERT INTO users (username, email)
VALUES ('alice', 'newalice@email.com')
ON CONFLICT (username)
DO UPDATE SET email = EXCLUDED.email;

-- EXCLUDED refers to the row you tried to insert
```

### Upsert with Multiple Columns

```sql
-- Insert a post view record, update count if exists
INSERT INTO post_views (post_id, user_id, view_count)
VALUES (1, 42, 1)
ON CONFLICT (post_id, user_id)
DO UPDATE SET view_count = post_views.view_count + 1;
```

### ON CONFLICT DO NOTHING

```sql
-- Just ignore the conflict, don't update
INSERT INTO users (username, email)
VALUES ('alice', 'alice@email.com')
ON CONFLICT (username)
DO NOTHING;
```

---

## 5. Bulk Operations

### Multi-Row INSERT

```sql
-- Insert 1000 users in one query (much faster than 1000 separate INSERTs)
INSERT INTO users (username, email)
VALUES
    ('user1', 'user1@email.com'),
    ('user2', 'user2@email.com'),
    ('user3', 'user3@email.com');
-- ... up to thousands of rows
```

### Batch UPDATE

```sql
-- Update multiple rows with different values in one query
UPDATE posts
SET status = CASE
    WHEN created_at < '2023-01-01' THEN 'archived'
    WHEN created_at < '2024-01-01' THEN 'old'
    ELSE 'current'
END
WHERE user_id = 42;
```

### Bulk DELETE

```sql
-- Delete old sessions in batches (avoid locking the table)
DELETE FROM sessions
WHERE id IN (
    SELECT id FROM sessions
    WHERE expires_at < NOW()
    LIMIT 1000
);
```

---

## 6. EXPLAIN ANALYZE

This is how you figure out why a query is slow.

### Basic Usage

```sql
EXPLAIN ANALYZE
SELECT * FROM posts WHERE user_id = 42;

-- Output:
-- Seq Scan on posts  (cost=0.00..1520.00 rows=100 width=...)
--   Filter: (user_id = 42)
--   Rows Removed by Filter: 9900
-- Planning Time: 0.1ms
-- Execution Time: 3.2ms
```

### Reading the Output

```text
Seq Scan on posts              ← Full table scan (BAD for large tables)
  Filter: (user_id = 42)
  Rows Removed: 9900           ← Checked 10,000 rows to find 100

Index Scan on posts_user_id    ← Uses an index (GOOD)
  Index Cond: (user_id = 42)
  Rows Removed: 0              ← Found exactly what it needed
```

### Adding an Index to Fix a Slow Query

```sql
-- Before: Seq Scan, 3.2ms
EXPLAIN ANALYZE SELECT * FROM posts WHERE user_id = 42;

-- Create an index
CREATE INDEX idx_posts_user_id ON posts (user_id);

-- After: Index Scan, 0.1ms
EXPLAIN ANALYZE SELECT * FROM posts WHERE user_id = 42;
```

### When to Use EXPLAIN ANALYZE

- Query is slow in production
- You added an index but aren't sure it's being used
- You're writing a complex JOIN and want to verify performance
- Before deploying a query that will run on millions of rows

---

## Quick Reference

| Task | SQL |
|------|-----|
| Subquery in WHERE | `WHERE col IN (SELECT ...)` |
| Scalar subquery | `WHERE col > (SELECT AVG(...) ...)` |
| CTE | `WITH name AS (SELECT ...) SELECT ... FROM name` |
| Recursive CTE | `WITH RECURSIVE name AS (...) SELECT ... FROM name` |
| Row number | `ROW_NUMBER() OVER (PARTITION BY ... ORDER BY ...)` |
| Rank | `RANK() OVER (ORDER BY ...)` |
| Previous row | `LAG(col, 1) OVER (ORDER BY ...)` |
| Running total | `SUM(col) OVER (ORDER BY ...)` |
| Upsert | `INSERT ... ON CONFLICT (...) DO UPDATE SET ...` |
| Ignore conflict | `INSERT ... ON CONFLICT DO NOTHING` |
| Read query plan | `EXPLAIN ANALYZE SELECT ...` |

---

## Practice & Self-Check

All questions run against this data (PostgreSQL), which extends the chapter's `posts` and comment-tree examples:

```sql
-- users: (1, 'alice'), (2, 'bob'), (3, 'carol'), (4, 'dave')

-- posts
-- id | user_id | title        | likes | created_at
-- 1  | 1       | First Post   | 10    | 2024-01-15
-- 2  | 2       | Hello        | 25    | 2024-02-20
-- 3  | 1       | Gripper Demo | 30    | 2024-03-01
-- 4  | 2       | Arm Calib    | 30    | 2024-03-05
-- 5  | 1       | Latest       | 5     | 2024-03-10
-- 6  | 3       | Lidar        | 50    | 2024-03-12

-- comments (id, parent_id, content)
-- (1, NULL, 'Great post!'), (2, 1, 'Thanks!'), (3, NULL, 'Nice work'),
-- (4, 2, 'You''re welcome'), (5, 3, 'Cheers'), (6, 1, '+1')
```

### Predict the Output / Trace by Hand

**Q1. RANK vs DENSE_RANK vs ROW_NUMBER.** Fill in the three ranking columns.

```sql
SELECT title, likes,
       RANK()       OVER (ORDER BY likes DESC)     AS rnk,
       DENSE_RANK() OVER (ORDER BY likes DESC)     AS drnk,
       ROW_NUMBER() OVER (ORDER BY likes DESC, id) AS rn
FROM posts
ORDER BY rn;
```

**Q2. LAG, running total, moving average.** Fill in `prev`, `chg`, `run`, and `mavg` for every row.

```sql
SELECT title, likes,
       LAG(likes, 1) OVER (ORDER BY created_at)          AS prev,
       likes - LAG(likes, 1) OVER (ORDER BY created_at)  AS chg,
       SUM(likes) OVER (ORDER BY created_at)             AS run,
       ROUND(AVG(likes) OVER (ORDER BY created_at
             ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS mavg
FROM posts
ORDER BY created_at;
```

**Q3. Most recent post per user.** What rows does this return? Would Dave appear?

```sql
SELECT user_id, title, created_at
FROM (
    SELECT user_id, title, created_at,
           ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
    FROM posts
) r
WHERE rn = 1
ORDER BY user_id;
```

**Q4. "More posts than average" (Section 1).** Using the logic of the chapter's scalar-subquery example (counts per `user_id`, compared with the average of those counts), which `user_id`s qualify, and what is the average being compared against?

**Q5. UPSERT trace.** `post_views` has primary key `(post_id, user_id)` and starts empty. Run Section 4's upsert five times with these `(post_id, user_id)` pairs: `(1, 42)`, `(1, 42)`, `(2, 42)`, `(1, 7)`, `(1, 42)`. What does the table contain at the end?

**Q6. Recursive CTE.** Run the chapter's `comment_tree` query (`ORDER BY depth, id`) on the comments above. List `(id, depth)` in output order.

### Coding Exercises

**E1 (Easy).** Using a CTE, return `username`, number of `posts`, and `total_likes` for users whose total likes are **at least 50**. Sort by `total_likes` descending.
Expected: `('bob', 2, 55)`, `('carol', 1, 50)`. Alice only has $10 + 30 + 5 = 45$.

**E2 (Easy–Medium).** For every post, show `user_id, title, likes, change_vs_prev`, where `change_vs_prev` is the change in likes compared with **the same user's** previous post (NULL for a user's first post). Order by `user_id, created_at`.
Expected for alice: `First Post 10 NULL`, `Gripper Demo 30 20`, `Latest 5 -25`.

**E3 (Medium).** A robot bill of materials is stored as a tree:

```sql
-- parts(id, parent_id, name VARCHAR(50), qty)
-- (1, NULL, 'arm', 1), (2, 1, 'shoulder', 1), (3, 1, 'wrist', 1),
-- (4, 3, 'gripper', 1), (5, 4, 'finger', 2), (6, 2, 'motor', 2), (7, NULL, 'base', 1)
```

Write a recursive CTE that starts at `'arm'` and returns, for every part underneath it (including `arm`), the `path` (for example `arm > wrist > gripper`), its `depth`, and `total_qty`, the product of `qty` along the path (how many of that part one arm needs). Sort by `path`. `base` must not appear.

#### Dry-Run: Answers

**Q1.**

| title | likes | rnk | drnk | rn |
|-------|------:|----:|-----:|---:|
| Lidar | 50 | 1 | 1 | 1 |
| Gripper Demo | 30 | 2 | 2 | 2 |
| Arm Calib | 30 | 2 | 2 | 3 |
| Hello | 25 | **4** | **3** | 4 |
| First Post | 10 | 5 | 4 | 5 |
| Latest | 5 | 6 | 5 | 6 |

The tie at 30 shares rank 2. `RANK` then jumps to $1 + 2 + 1 = 4$ (it counts the rows ahead of it), while `DENSE_RANK` continues with 3. `ROW_NUMBER` breaks the tie with `id` (3 before 4).

**Q2.**

| title | likes | prev | chg | run | mavg (last ≤3 rows) |
|-------|------:|-----:|----:|----:|-----:|
| First Post | 10 | NULL | NULL | 10 | $10/1 = 10.00$ |
| Hello | 25 | 10 | 15 | 35 | $35/2 = 17.50$ |
| Gripper Demo | 30 | 25 | 5 | 65 | $65/3 = 21.67$ |
| Arm Calib | 30 | 30 | 0 | 95 | $85/3 = 28.33$ |
| Latest | 5 | 30 | -25 | 100 | $65/3 = 21.67$ |
| Lidar | 50 | 5 | 45 | 150 | $85/3 = 28.33$ |

The moving window holds the current row and up to two before it. For example, at `Arm Calib` it covers $25 + 30 + 30 = 85$. The first rows simply have smaller windows.

**Q3.** `(1, 'Latest', 2024-03-10)`, `(2, 'Arm Calib', 2024-03-05)`, `(3, 'Lidar', 2024-03-12)`. Dave has no posts, so he has no row in `posts` to number and does **not** appear.

**Q4.** Counts per user: $\{1: 3,\ 2: 2,\ 3: 1\}$. The average is $\frac{3 + 2 + 1}{3} = 2$ (users without posts are not in the inner `GROUP BY`, so Dave does not pull the average down). Only `user_id = 1` (3 posts) is strictly greater than 2. Bob ties and does not qualify. (Joining `users` for the username is left out here, because the chapter's version selects `username` from a derived table that lacks that column.)

**Q5.**

| step | pair | action | table afterwards |
|-----:|------|--------|------------------|
| 1 | (1, 42) | insert | (1, 42, 1) |
| 2 | (1, 42) | conflict, so `1 + 1` | (1, 42, **2**) |
| 3 | (2, 42) | insert | + (2, 42, 1) |
| 4 | (1, 7) | insert (different key) | + (1, 7, 1) |
| 5 | (1, 42) | conflict, so `2 + 1` | (1, 42, **3**) |

Final rows: `(1, 7, 1)`, `(1, 42, 3)`, `(2, 42, 1)`. `post_views.view_count` is the **existing** row's value, while `EXCLUDED.view_count` would be the attempted `1`.

**Q6.** `(1, 0)`, `(3, 0)`, `(2, 1)`, `(5, 1)`, `(6, 1)`, `(4, 2)`.

| iteration | rows added | why |
|-----------|-----------|-----|
| base | 1, 3 | `parent_id IS NULL` |
| 1 | 2, 6 (parent 1), 5 (parent 3) | depth 1 |
| 2 | 4 (parent 2) | depth 2 |
| 3 | none | recursion stops |

`ORDER BY depth, id` then interleaves the two threads, which is why `5` (a reply to "Nice work") sits between `2` and `6`.

**E1 — reference solution**

```sql
WITH totals AS (
    SELECT user_id, COUNT(*) AS posts, SUM(likes) AS total_likes
    FROM posts
    GROUP BY user_id
)
SELECT u.username, t.posts, t.total_likes
FROM users u
JOIN totals t ON t.user_id = u.id
WHERE t.total_likes >= 50
ORDER BY t.total_likes DESC, u.username;
```

Totals: alice 45, bob $25 + 30 = 55$, carol 50. Because the aggregate is computed inside the CTE, the outer query can filter it with a plain `WHERE` instead of `HAVING`.

**E2 — reference solution**

```sql
SELECT user_id, title, likes,
       likes - LAG(likes) OVER (PARTITION BY user_id ORDER BY created_at) AS change_vs_prev
FROM posts
ORDER BY user_id, created_at;
```

| user_id | title | likes | change_vs_prev |
|--------:|-------|------:|---------------:|
| 1 | First Post | 10 | NULL |
| 1 | Gripper Demo | 30 | 20 |
| 1 | Latest | 5 | -25 |
| 2 | Hello | 25 | NULL |
| 2 | Arm Calib | 30 | 5 |
| 3 | Lidar | 50 | NULL |

`PARTITION BY user_id` restarts `LAG` for each user. Without it, Bob's `Hello` would be compared with Alice's `First Post`. This is a single sort-based pass, $O(n \log n)$.

**E3 — reference solution**

```sql
WITH RECURSIVE tree AS (
    SELECT id, name,
           CAST(name AS TEXT) AS path,    -- TEXT, so the recursive term's type matches
           0                  AS depth,
           qty                AS total_qty
    FROM parts
    WHERE name = 'arm'

    UNION ALL

    SELECT p.id, p.name,
           t.path || ' > ' || p.name,
           t.depth + 1,
           t.total_qty * p.qty
    FROM parts p
    JOIN tree t ON p.parent_id = t.id
)
SELECT path, depth, total_qty
FROM tree
ORDER BY path;
```

| path | depth | total_qty |
|------|------:|----------:|
| arm | 0 | 1 |
| arm > shoulder | 1 | 1 |
| arm > shoulder > motor | 2 | 2 |
| arm > wrist | 1 | 1 |
| arm > wrist > gripper | 2 | 1 |
| arm > wrist > gripper > finger | 3 | $1 \cdot 1 \cdot 1 \cdot 2 = 2$ |

`base` is never reached because the anchor starts at `arm` and recursion only follows `parent_id` downward. The `CAST` matters in PostgreSQL. Without it, the anchor column is `VARCHAR(50)` but `||` produces `TEXT`, and PostgreSQL rejects the CTE because the non-recursive and recursive column types differ.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Systems & Robotics Visualizer for **Chapter 4: Advanced SQL**
- **Live Architecture & Data-Flow Sandbox:**
  - Render an interactive system pipeline and state inspector for **chapter4 advanced sql**, animating data packets, telemetry frames, validation boundaries, and execution states across each stage.
  - Display live latency, throughput, validation status (`<Badge>` in emerald for valid, rose for rejected/fault), and memory/state transitions as parameters change.
- **Step-by-Step Execution & Failure-Mode Inspector:**
  - Allow the user to inject both valid telemetry payloads and fault scenarios (malformed schemas, timeouts, out-of-range sensor spikes) and watch the system recover or trigger deterministic fallbacks in a live `<Table>` audit log.

### 2. Required `shadcn/ui` Controls
- **Simulation Controls:** `<Button>` triggers for **Run Step**, **Inject Fault / Anomaly**, and **Reset State**; `<Slider>` for request rate, timeout threshold, or physical parameter bounds.
- **Mode & Configuration Toggles:** `<Switch>` to toggle strict validation / guardrails ON vs. OFF, and `<Tabs>` to switch between *Architecture View*, *Live Payload Inspector*, and *Production Code Breakdown*.


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


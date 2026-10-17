# Part 3, Topic 1: Relational Databases & SQL
## Chapter 2: SQL Queries (CRUD & JOINs)

### What You'll Learn
- How to CREATE, READ, UPDATE, DELETE data
- How to filter and sort results
- How to combine data from multiple tables with JOINs

---

## 1. CRUD Operations

SQL has four fundamental operations: **C**reate, **R**ead, **U**pdate, **D**elete.

### CREATE (INSERT)

```sql
-- Insert a single row
INSERT INTO users (username, email)
VALUES ('alice', 'alice@email.com');

-- Insert multiple rows
INSERT INTO users (username, email)
VALUES
    ('bob', 'bob@email.com'),
    ('carol', 'carol@email.com');

-- Insert with all columns (not recommended - order matters)
INSERT INTO users
VALUES (DEFAULT, 'dave', 'dave@email.com', DEFAULT, DEFAULT, DEFAULT);
```

**What's happening:**
```sql
INSERT INTO users (username, email)
VALUES ('alice', 'alice@email.com');
--      ↑              ↑
--      |              └── Value for email column
--      └── Value for username column
--
-- id: auto-generated (SERIAL)
-- created_at: auto-filled (DEFAULT CURRENT_TIMESTAMP)
```

### READ (SELECT)

```sql
-- Get all columns (avoid in large apps)
SELECT * FROM users;

-- Get specific columns (best practice)
SELECT id, username, email FROM users;

-- Get with alias
SELECT id AS user_id, username AS name FROM users;
```

### Filtering with WHERE

```sql
-- Exact match
SELECT * FROM users WHERE id = 1;

-- Multiple conditions
SELECT * FROM users WHERE is_active = true AND email LIKE '%@gmail.com';

-- Not equal
SELECT * FROM users WHERE username != 'admin';

-- IN (match any in list)
SELECT * FROM users WHERE id IN (1, 2, 3);

-- BETWEEN (range)
SELECT * FROM users WHERE id BETWEEN 10 AND 20;

-- LIKE (pattern matching)
SELECT * FROM users WHERE email LIKE '%@gmail.com';  -- Ends with @gmail.com
SELECT * FROM users WHERE username LIKE 'a%';         -- Starts with 'a'
SELECT * FROM users WHERE username LIKE '%bob%';      -- Contains 'bob'
```

### Ordering Results

```sql
-- Ascending (A-Z, 1-9) - default
SELECT * FROM users ORDER BY username ASC;

-- Descending (Z-A, 9-1)
SELECT * FROM users ORDER BY created_at DESC;

-- Multiple sort keys
SELECT * FROM users ORDER BY is_active DESC, username ASC;
```

### Limiting Results

```sql
-- Get first 10 users
SELECT * FROM users LIMIT 10;

-- Get users 11-20 (pagination)
SELECT * FROM users LIMIT 10 OFFSET 10;

-- Get the most recent post
SELECT * FROM posts ORDER BY created_at DESC LIMIT 1;
```

### UPDATE

```sql
-- Update a specific row
UPDATE users
SET email = 'new_email@email.com'
WHERE id = 1;

-- Update multiple columns
UPDATE users
SET email = 'new@email.com', is_active = false
WHERE id = 1;

-- ⚠️ DANGER: Without WHERE, updates ALL rows!
UPDATE users SET is_active = false;  -- Updates EVERY user!
```

### DELETE

```sql
-- Delete a specific row
DELETE FROM users WHERE id = 999;

-- Delete with multiple conditions
DELETE FROM posts WHERE author_id = 5 AND is_published = false;

-- ⚠️ DANGER: Without WHERE, deletes ALL rows!
DELETE FROM users;  -- Deletes EVERY user!
```

---

## 2. JOINs: Combining Tables

JOINs let you query data from multiple tables at once.

### The Problem

```text
You want to show:
  Post title + Author name

But post title is in `posts` table:
┌────────┬─────────┬────────────┐
│ post_id│ title   │ author_id  │
├────────┼─────────┼────────────┤
│ 1      │ Hello   │ 101        │
└────────┴─────────┴────────────┘

And author name is in `users` table:
┌────────┬──────────┐
│ user_id│ username │
├────────┼──────────┤
│ 101    │ Alice    │
└────────┴──────────┘

How do you get both?
```

### INNER JOIN

Returns rows that have matches in **both** tables.

```sql
SELECT
    posts.title,
    users.username AS author
FROM posts
INNER JOIN users ON posts.author_id = users.id;
```

**Visual:**
```text
posts:                    users:
┌────┬─────────┐        ┌────┬──────────┐
│ id │ author  │        │ id │ username │
├────┼─────────┤        ├────┼──────────┤
│ 1  │ 101     │   ──→  │ 101│ Alice    │  ← Match!
│ 2  │ 102     │   ──→  │ 102│ Bob      │  ← Match!
│ 3  │ 999     │        │ 103│ Carol    │
└────┴─────────┘        └────┴──────────┘
       ↑                       ↑
   No user 999            No posts from Carol

Result of INNER JOIN:
┌─────────┬──────────┐
│ title   │ author   │
├─────────┼──────────┤
│ Hello   │ Alice    │  ← User 101 has posts
│ World   │ Bob      │  ← User 102 has posts
│ (post 3 excluded - no matching user)
│ (Carol excluded - no matching posts)
└─────────┴──────────┘
```

### LEFT JOIN

Returns **all** rows from the left table, and matching rows from the right table.

```sql
-- Find users who have NEVER posted
SELECT
    users.username,
    posts.id AS post_id
FROM users
LEFT JOIN posts ON users.id = posts.author_id
WHERE posts.id IS NULL;
```

**Visual:**
```text
users (LEFT):              posts (RIGHT):
┌────┬──────────┐         ┌────┬──────────┐
│ id │ username │         │ id │ author   │
├────┼──────────┤         ├────┼──────────┤
│ 101│ Alice    │   ──→   │ 1  │ 101      │  ← Match
│ 102│ Bob      │   ──→   │ 2  │ 102      │  ← Match
│ 103│ Carol    │         │ (no posts)   │  ← No match
└────┴──────────┘         └────┴──────────┘

LEFT JOIN Result:
┌──────────┬──────────┐
│ username │ post_id  │
├──────────┼──────────┤
│ Alice    │ 1        │
│ Bob      │ 2        │
│ Carol    │ NULL     │  ← No match, but included!
└──────────┴──────────┘

WHERE post_id IS NULL → Only Carol (user with no posts)
```

### JOIN Types Summary

```text
INNER JOIN: Only matching rows from BOTH tables
┌────────────────────────┐
│    Only A ∩ B          │
└────────────────────────┘

LEFT JOIN: All from LEFT, matching from RIGHT
┌────────────────────────┐
│  All A + matching B    │
└────────────────────────┘

RIGHT JOIN: All from RIGHT, matching from LEFT
┌────────────────────────┐
│  All B + matching A    │
└────────────────────────┘

FULL JOIN: All rows from both tables
┌────────────────────────┐
│      All A ∪ B         │
└────────────────────────┘
```

---

## 3. Aggregate Functions

```sql
-- Count rows
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM posts WHERE author_id = 1;

-- Sum
SELECT SUM(price) FROM orders WHERE user_id = 101;

-- Average
SELECT AVG(price) FROM products;

-- Min/Max
SELECT MIN(price) FROM products;
SELECT MAX(price) FROM products;

-- Group by
SELECT author_id, COUNT(*) AS post_count
FROM posts
GROUP BY author_id;

-- Having (filter after grouping)
SELECT author_id, COUNT(*) AS post_count
FROM posts
GROUP BY author_id
HAVING COUNT(*) > 5;
```

---

## 4. Real-World Example

```sql
-- Get a user's posts with comment counts
SELECT
    posts.id,
    posts.title,
    posts.created_at,
    COUNT(comments.id) AS comment_count
FROM posts
LEFT JOIN comments ON posts.id = comments.post_id
WHERE posts.author_id = 1
GROUP BY posts.id
ORDER BY posts.created_at DESC;

-- Result:
┌────┬─────────┬─────────────┬─────────────────┐
│ id │ title   │ created_at  │ comment_count   │
├────┼─────────┼─────────────┼─────────────────┤
│ 5  │ Latest  │ 2024-01-20  │ 12              │
│ 3  │ Middle  │ 2024-01-18  │ 5               │
│ 1  │ First   │ 2024-01-15  │ 0               │
└────┴─────────┴─────────────┴─────────────────┘
```

---

## Quick Reference

| Task | SQL |
|------|-----|
| Insert | `INSERT INTO table (col) VALUES (val)` |
| Select all | `SELECT * FROM table` |
| Select specific | `SELECT col1, col2 FROM table` |
| Filter | `WHERE condition` |
| Multiple conditions | `AND` / `OR` |
| Sort | `ORDER BY col ASC/DESC` |
| Limit | `LIMIT n OFFSET m` |
| Update | `UPDATE table SET col = val WHERE condition` |
| Delete | `DELETE FROM table WHERE condition` |
| Join | `INNER JOIN table2 ON table1.col = table2.col` |
| Left join | `LEFT JOIN table2 ON table1.col = table2.col` |
| Count | `COUNT(*)` |
| Group by | `GROUP BY col` |

> **Next:** For advanced SQL — subqueries, CTEs, window functions, UPSERT, and EXPLAIN ANALYZE — see [Chapter 4: Advanced SQL](chapter4-advanced-sql.md).

---

## Practice & Self-Check

All questions use this small dataset, which extends the chapter's Alice/Bob/Carol example (post 3 still points at the non-existent user 999):

```sql
-- users
-- id  | username | email            | is_active
-- 101 | alice    | alice@email.com  | true
-- 102 | bob      | bob@gmail.com    | true
-- 103 | carol    | carol@gmail.com  | false
-- 104 | dave     | dave@email.com   | true

-- posts
-- id | title   | author_id | is_published
-- 1  | Hello   | 101       | true
-- 2  | World   | 102       | true
-- 3  | Orphan  | 999       | false
-- 4  | Again   | 101       | false
-- 5  | Gripper | 101       | true

-- comments
-- id | post_id | author_id
-- 1  | 1       | 102
-- 2  | 1       | 103
-- 3  | 2       | 101
-- 4  | 5       | 102
```

### Predict the Output / Trace by Hand

**Q1. INNER JOIN.** Which rows come back, in order?

```sql
SELECT posts.title, users.username
FROM posts
INNER JOIN users ON posts.author_id = users.id
ORDER BY posts.id;
```

**Q2. `COUNT(*)` vs `COUNT(column)` after a LEFT JOIN.** Fill in both count columns.

```sql
SELECT users.username,
       COUNT(*)        AS c_star,
       COUNT(posts.id) AS c_posts
FROM users
LEFT JOIN posts ON users.id = posts.author_id
GROUP BY users.id, users.username
ORDER BY users.id;
```

**Q3. WHERE vs ON in a LEFT JOIN.** How many rows does each query return, and do Carol and Dave appear?

```sql
-- (a)
SELECT users.username, posts.title
FROM users LEFT JOIN posts ON users.id = posts.author_id
WHERE posts.is_published = true;

-- (b)
SELECT users.username, posts.title
FROM users LEFT JOIN posts ON users.id = posts.author_id
                          AND posts.is_published = true;
```

**Q4. Sorting and paging.** What does this return?

```sql
SELECT username FROM users
ORDER BY is_active DESC, username DESC
LIMIT 2 OFFSET 1;
```

**Q5. The chapter's "Real-World Example" on this data.** Run Section 4's query (posts by `author_id = 101` with comment counts), but with `ORDER BY posts.id DESC`. Fill in the result table.

| id | title | comment_count |
|---:|-------|--------------:|
| ? | ? | ? |

### Coding Exercises

**E1 (Easy).** Return `username, email` for **active** users whose email ends in `@gmail.com`, sorted by username.
Expected output: `('bob', 'bob@gmail.com')`. Carol has a gmail address but is inactive.

**E2 (Easy–Medium).** For **every** user, return `username` and `published`, the number of **published** posts they wrote. Users with zero must still appear. Sort by `published` descending, then `username` ascending.
Expected: `alice 2`, `bob 1`, `carol 0`, `dave 0`.

**E3 (Medium).** Return each author who has received **at least 2 comments in total across all of their posts**, with the total as `comments_received`.
Expected: `alice 3` (posts 1 and 5 have $2 + 1$ comments). Bob's single comment does not qualify.

#### Dry-Run: Answers

**Q1.** Four rows: `('Hello', 'alice')`, `('World', 'bob')`, `('Again', 'alice')`, `('Gripper', 'alice')`. Post 3 (`Orphan`, author 999) has no matching user, so INNER JOIN drops it. Carol and Dave have no posts, so they never appear.

**Q2.**

| username | c_star | c_posts | why |
|----------|-------:|--------:|-----|
| alice | 3 | 3 | posts 1, 4, 5 |
| bob | 1 | 1 | post 2 |
| carol | **1** | **0** | the LEFT JOIN emits one row with `posts.*` all `NULL`, which `COUNT(*)` counts and `COUNT(posts.id)` skips |
| dave | **1** | **0** | same |

Always count a column from the right-hand table when you mean "how many matches".

**Q3.**
- (a) **3 rows**: `alice/Hello`, `alice/Gripper`, `bob/World`. Carol and Dave's rows have `posts.is_published = NULL`, and `NULL = true` is not true, so the `WHERE` removes them. The LEFT JOIN has effectively become an INNER JOIN.
- (b) **5 rows**: the same 3, plus `carol/NULL` and `dave/NULL`. A condition in `ON` only decides which posts *match*. Every left-side user is still kept.

**Q4.** The sort order is: active users first (`true` sorts above `false` in `DESC`), and within each group usernames go Z→A. That gives `dave, bob, alice, carol`. `OFFSET 1` skips `dave`, and `LIMIT 2` keeps `bob` and `alice`. Result: `bob`, `alice`.

**Q5.**

| id | title | comment_count |
|---:|-------|--------------:|
| 5 | Gripper | 1 |
| 4 | Again | 0 |
| 1 | Hello | 2 |

Alice's posts are 1, 4, and 5. Comments 1 and 2 belong to post 1, comment 4 to post 5, and none to post 4. Post 4 still appears with `0` because of the LEFT JOIN plus `COUNT(comments.id)`.

**E1 — reference solution**

```sql
SELECT username, email
FROM users
WHERE is_active = true
  AND email LIKE '%@gmail.com'
ORDER BY username;
```

`%` matches any prefix. Both conditions must hold, so `carol` (`is_active = false`) is excluded.

**E2 — reference solution**

```sql
SELECT users.username,
       COUNT(posts.id) AS published
FROM users
LEFT JOIN posts
       ON posts.author_id = users.id
      AND posts.is_published = true          -- filter in ON, not WHERE (see Q3)
GROUP BY users.id, users.username
ORDER BY published DESC, users.username ASC;
```

Putting the published filter in `ON` keeps users with no published posts, and `COUNT(posts.id)` turns their NULL row into `0` (see Q2). Alice's unpublished post 4 is excluded from her count, so she has 2.

**E3 — reference solution**

```sql
SELECT users.username,
       COUNT(comments.id) AS comments_received
FROM users
JOIN posts    ON posts.author_id = users.id
JOIN comments ON comments.post_id = posts.id
GROUP BY users.id, users.username
HAVING COUNT(comments.id) >= 2;
```

Trace before `HAVING`:

| author | (post, comment) pairs | count |
|--------|-----------------------|------:|
| alice | (1, 1), (1, 2), (5, 4) | 3 |
| bob | (2, 3) | 1 |

`HAVING` filters groups *after* aggregation (`WHERE COUNT(...) >= 2` fails with "aggregate functions are not allowed in WHERE"), which leaves `alice | 3`. Inner joins are fine here because authors with zero comments cannot reach 2 anyway.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Systems & Robotics Visualizer for **Chapter 2: SQL Queries (CRUD & JOINs)**
- **Live Architecture & Data-Flow Sandbox:**
  - Render an interactive system pipeline and state inspector for **chapter2 sql queries**, animating data packets, telemetry frames, validation boundaries, and execution states across each stage.
  - Display live latency, throughput, validation status (`<Badge>` in emerald for valid, rose for rejected/fault), and memory/state transitions as parameters change.
- **Step-by-Step Execution & Failure-Mode Inspector:**
  - Allow the user to inject both valid telemetry payloads and fault scenarios (malformed schemas, timeouts, out-of-range sensor spikes) and watch the system recover or trigger deterministic fallbacks in a live `<Table>` audit log.

### 2. Required `shadcn/ui` Controls
- **Simulation Controls:** `<Button>` triggers for **Run Step**, **Inject Fault / Anomaly**, and **Reset State**; `<Slider>` for request rate, timeout threshold, or physical parameter bounds.
- **Mode & Configuration Toggles:** `<Switch>` to toggle strict validation / guardrails ON vs. OFF, and `<Tabs>` to switch between *Architecture View*, *Live Payload Inspector*, and *Production Code Breakdown*.


# Part 6, Topic 1: Relational Databases & SQL
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

### Default: NO ACTION (Block, like RESTRICT)

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
| `RESTRICT` | Block deletion | Most cases (default `NO ACTION` also blocks) |
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
| Block delete | `ON DELETE RESTRICT` (default `NO ACTION` also blocks) |
| Create index | `CREATE INDEX idx_name ON table(column)` |
| Check constraint | `CHECK (column > 0)` |
| Unique constraint | `UNIQUE` |
| Not null | `NOT NULL` |

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


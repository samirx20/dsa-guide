# Part 3, Topic 1: Relational Databases & SQL
## Chapter 1: Tables, Rows, & Columns

### What You'll Learn
- What a relational database is
- How tables, rows, and columns work
- Data types and primary keys
- Why normalization matters

---

## 1. What is a Database?

A database is a structured way to store and retrieve data. While localStorage is limited to ~5MB and only stores strings, databases can store millions of records with strict types.

```text
localStorage:                          Database:
┌────────────────────────┐            ┌────────────────────────┐
│  "user": "{...}"      │            │  id | name  | email    │
│  Limit: 5MB           │            │  1  | Alice | a@b.com  │
│  Strings only         │            │  2  | Bob   | b@c.com  │
│  Single domain        │            │  3  | Carol | c@d.com  │
│  No relationships     │            │  ...                   │
└────────────────────────┘            │  Millions of rows      │
                                      │  Relationships         │
                                      │  Enforced types        │
                                      └────────────────────────┘
```

---

## 2. The Relational Model

A relational database stores data in **tables** that can be **related** to each other.

### Tables, Rows, Columns

```text
Users Table:
┌────┬──────────┬─────────────────┬────────────────────┐
│ id │ username │ email           │ created_at         │
├────┼──────────┼─────────────────┼────────────────────┤
│ 1  │ alice    │ alice@email.com │ 2024-01-15 10:30   │  ← Row 1
│ 2  │ bob      │ bob@email.com   │ 2024-01-16 14:22   │  ← Row 2
│ 3  │ carol    │ carol@email.com │ 2024-01-17 09:15   │  ← Row 3
└────┴──────────┴─────────────────┴────────────────────┘
   ↑        ↑          ↑                 ↑
 Column  Column     Column            Column
(id)  (username)   (email)        (created_at)

Table = Collection of related data
Row = One record (one user)
Column = One attribute of the data
```

### Schema: Define Before You Insert

Unlike JavaScript objects, you must define the structure **before** adding data.

```sql
-- Create the table with its schema
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Now you can insert data
INSERT INTO users (username, email) VALUES ('alice', 'alice@email.com');
```

---

## 3. Data Types

Each column must have a specific data type:

```sql
-- String types
username VARCHAR(50)      -- Variable length, max 50 characters
bio TEXT                  -- Variable length, unlimited

-- Number types
age INTEGER               -- Whole numbers (-2 billion to 2 billion)
price DECIMAL(10, 2)      -- Exact decimal (for money)
count BIGINT              -- Very large whole numbers

-- Boolean
is_active BOOLEAN         -- true or false

-- Date/Time
created_at TIMESTAMP      -- Date and time
birthday DATE             -- Date only

-- Special
id UUID                   -- Universally unique identifier
```

**Choosing the right type:**
```text
┌─────────────────────────────────────────────────────────┐
│  Data            │  Best Type                           │
├─────────────────────────────────────────────────────────┤
│  Username        │  VARCHAR(50)                         │
│  Email           │  VARCHAR(255)                        │
│  Blog content    │  TEXT                                │
│  Price           │  DECIMAL(10, 2)                      │
│  User ID         │  SERIAL (auto-increment) or UUID     │
│  Is published?   │  BOOLEAN                             │
│  Created at      │  TIMESTAMP DEFAULT CURRENT_TIMESTAMP │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Primary Keys

Every table needs a **Primary Key** - a unique identifier for each row.

```sql
-- Option 1: Auto-incrementing integer
CREATE TABLE users (
    id SERIAL PRIMARY KEY,  -- Auto-increments: 1, 2, 3, ...
    name VARCHAR(100)
);

-- Option 2: UUID (more secure, no predictable IDs)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100)
);
```

**Why primary keys matter:**
```text
Without Primary Key:
┌─────────────────────────────────────────┐
│  How do you update Alice's email?       │
│  WHERE name = 'Alice'                   │
│  What if there are two Alices?          │
│  What if Alice changes her name?        │
└─────────────────────────────────────────┘

With Primary Key:
┌─────────────────────────────────────────┐
│  Update user 101's email                │
│  WHERE id = 101                         │
│  Always unique, never changes           │
└─────────────────────────────────────────┘
```

---

## 5. Normalization: Why Split Tables?

Normalization means splitting data into separate tables to avoid duplication.

### The Problem: Unnormalized Data

```text
Orders Table (BAD - duplicated data):
┌─────────┬──────────┬─────────────────┬───────────┬───────┐
│ OrderID │ UserName │ UserEmail       │ Product   │ Price │
├─────────┼──────────┼─────────────────┼───────────┼───────┤
│ 1       │ Alice    │ alice@email.com │ Laptop    │ 1000  │
│ 2       │ Alice    │ alice@email.com │ Mouse     │ 50    │
│ 3       │ Bob      │ bob@email.com   │ Keyboard  │ 75    │
└─────────┴──────────┴─────────────────┴───────────┴───────┘
           ↑
           Alice's data duplicated!
           If she changes email, must update ALL rows
```

### The Solution: Normalized Data

```text
Users Table (store each user ONCE):
┌────────┬──────────┬─────────────────┐
│ UserID │ UserName │ UserEmail       │
├────────┼──────────┼─────────────────┤
│ 101    │ Alice    │ alice@email.com │
│ 102    │ Bob      │ bob@email.com   │
└────────┴──────────┴─────────────────┘

Products Table (store each product ONCE):
┌────────────┬───────────┬───────┐
│ ProductID  │ Product   │ Price │
├────────────┼───────────┼───────┤
│ 901        │ Laptop    │ 1000  │
│ 902        │ Mouse     │ 50    │
│ 903        │ Keyboard  │ 75    │
└────────────┴───────────┴───────┘

Orders Table (link to users and products):
┌─────────┬──────────┬────────────┐
│ OrderID │ UserID   │ ProductID  │
├─────────┼──────────┼────────────┤
│ 1       │ 101      │ 901        │
│ 2       │ 101      │ 902        │
│ 3       │ 102      │ 903        │
└─────────┴──────────┴────────────┘
            ↑    ↑
            Links to Users and Products tables

Now if Alice changes email:
  UPDATE users SET email = 'new@email.com' WHERE id = 101
  Only ONE row to update!
```

---

## 6. Creating Tables in SQL

### Complete Table Creation

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    bio TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    author_id INTEGER NOT NULL,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    body TEXT NOT NULL,
    post_id INTEGER NOT NULL,
    author_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Constraint Summary

| Constraint | Purpose | Example |
|-----------|---------|---------|
| `PRIMARY KEY` | Unique identifier | `id SERIAL PRIMARY KEY` |
| `NOT NULL` | Cannot be empty | `name VARCHAR(100) NOT NULL` |
| `UNIQUE` | No duplicates | `email VARCHAR(255) UNIQUE` |
| `DEFAULT` | Auto-fill if empty | `is_active BOOLEAN DEFAULT true` |
| `CHECK` | Custom validation | `price INTEGER CHECK (price > 0)` |

---

## Quick Reference

| Task | SQL |
|------|-----|
| Create table | `CREATE TABLE name (col TYPE constraints, ...)` |
| String | `VARCHAR(255)` or `TEXT` |
| Integer | `INTEGER` or `SERIAL` (auto-increment) |
| Boolean | `BOOLEAN` |
| Timestamp | `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` |
| Primary key | `id SERIAL PRIMARY KEY` |
| Not null | `NOT NULL` |
| Unique | `UNIQUE` |
| Default | `DEFAULT value` |

---

## Practice & Self-Check

### Predict the Output / Trace by Hand

Assume PostgreSQL and the Section 6 `users` table (`id SERIAL PRIMARY KEY`, `username VARCHAR(50) NOT NULL UNIQUE`, `email VARCHAR(255) NOT NULL UNIQUE`, `is_active BOOLEAN DEFAULT true`, …), starting empty with a fresh sequence.

**Q1. Constraint trace.** Run these statements one by one. For each, say "OK (id = ?)" or name the constraint that rejects it. Then give the result of the final `SELECT`.

```sql
INSERT INTO users (username, email) VALUES ('alice', 'alice@email.com');  -- 1
INSERT INTO users (username, email) VALUES ('bob',   'alice@email.com');  -- 2
INSERT INTO users (username, email) VALUES ('bob',   'bob@email.com');    -- 3
INSERT INTO users (username)        VALUES ('carol');                     -- 4
SELECT id, username, is_active FROM users ORDER BY id;                    -- 5
```

**Q2. Normalization count (Section 5).** In the **unnormalized** Orders table, how many cells contain `alice@email.com`? How many rows must an `UPDATE` touch when Alice changes her email, in the unnormalized design and in the normalized one? Now Bob buys a Laptop. List every row that gets **inserted** in each design.

**Q3. Data types.** Using the Section 3 types, predict what PostgreSQL does for each insert. Is it stored as-is, stored as a changed value, or rejected?
- (a) `'carol_the_robot_arm'` into a `VARCHAR(10)` column
- (b) `1234.567` into a `DECIMAL(10, 2)` column
- (c) `123456789.5` into a `DECIMAL(10, 2)` column
- (d) `3000000000` into an `INTEGER` column

**Q4. CHECK and DEFAULT gotchas.** Given

```sql
CREATE TABLE parts (
    id SERIAL PRIMARY KEY,
    price INTEGER CHECK (price > 0),
    is_active BOOLEAN DEFAULT true
);
```

what happens with each of these, and what value ends up in `is_active`?

```sql
INSERT INTO parts (price) VALUES (0);                       -- a
INSERT INTO parts (price) VALUES (NULL);                    -- b
INSERT INTO parts (price, is_active) VALUES (10, NULL);     -- c
INSERT INTO parts (price) VALUES (10);                      -- d
```

### Coding Exercises

**E1 (Easy).** Write `CREATE TABLE sensors` for a robot cell with:
- an auto-increment primary key `id`;
- `serial_number`, at most 32 characters, required and unique;
- `kind`, at most 20 characters, required;
- `location`, optional text up to 100 characters;
- `is_active`, required and defaulting to `true`;
- `installed_at`, defaulting to the current timestamp.

`INSERT INTO sensors (serial_number, kind) VALUES ('IMU-0001', 'imu');` must succeed and produce `is_active = true`. Inserting `'IMU-0001'` again must fail.

**E2 (Easy–Medium).** A logger currently writes one flat table:

```text
readings_flat:
| sensor_serial | sensor_kind | sensor_location | recorded_at       | value |
| IMU-0001      | imu         | arm-1 wrist     | 2024-01-15 10:30  | 0.98  |
| IMU-0001      | imu         | arm-1 wrist     | 2024-01-15 10:31  | 1.02  |
| TMP-0007      | temperature | motor bay       | 2024-01-15 10:30  | 41.5  |
```

Normalize it into `sensors` (reuse E1) plus a `readings` table. A reading stores a link to its sensor, a required timestamp, and a required `DECIMAL(10, 3)` value. Then write the `INSERT`s that reproduce the three rows above. (Plain integer link columns are fine. `REFERENCES` arrives in Chapter 3.)

**E3 (Medium).** Robots can be assigned to many missions and a mission uses many robots. Design `robots`, `missions`, and a junction table `robot_missions`, where each robot appears **at most once per mission**, has a `role` that must be one of `'leader'`, `'follower'`, `'observer'`, and gets an `assigned_at` timestamp. Use a composite primary key on the junction table.

#### Dry-Run: Answers

**Q1.**

| # | Result | Why |
|--:|--------|-----|
| 1 | OK, `id = 1` | |
| 2 | **rejected**: `UNIQUE` violation on `email` (`duplicate key value violates unique constraint`) | `alice@email.com` already exists |
| 3 | OK, **`id = 3`** | statement 2 already called `nextval()` for its default (value 2) before the constraint check failed, and sequences never roll back |
| 4 | **rejected**: `NOT NULL` violation on `email` | no default exists, so `email` would be `NULL` |
| 5 | `(1, 'alice', true)`, `(3, 'bob', true)` | `is_active` took its `DEFAULT true` |

`SERIAL` ids are unique, but they are **not guaranteed to be gap-free**.

**Q2.** Unnormalized: `alice@email.com` appears in **2** cells, so the email change must update **2 rows** (and missing one leaves the data inconsistent). Normalized: **1** row (`UPDATE users SET email = … WHERE id = 101`). For "Bob buys a Laptop":
- Unnormalized: one new row `(4, 'Bob', 'bob@email.com', 'Laptop', 1000)`, which copies Bob's email and the laptop price yet again.
- Normalized: one new row in Orders only, `(4, 102, 901)`. Users and Products are unchanged.

**Q3.**
- (a) **Rejected**: `value too long for type character varying(10)`. The string has 19 characters. PostgreSQL does not silently truncate on insert.
- (b) Stored as **`1234.57`**. `DECIMAL(10, 2)` keeps 2 fractional digits and rounds the rest.
- (c) **Rejected**: numeric field overflow. Precision 10 with scale 2 leaves $10 - 2 = 8$ digits before the decimal point (max `99999999.99`), and `123456789` has 9.
- (d) **Rejected**: `integer out of range`. `INTEGER` is 32-bit signed, max $2^{31} - 1 = 2\,147\,483\,647$. Use `BIGINT`.

**Q4.**
- (a) Rejected, because the check constraint fails ($0 > 0$ is false).
- (b) **Accepted** with `price = NULL`. A `CHECK` only rejects rows where the expression is **false**. `NULL > 0` is `NULL` (unknown), which passes. Add `NOT NULL` if price is mandatory. `is_active = true`.
- (c) Accepted with `is_active = NULL`. An explicit `NULL` is a value, so the `DEFAULT` only applies when the column is **omitted** (or written as `DEFAULT`).
- (d) Accepted, with `price = 10` and `is_active = true`.

**E1 — reference solution**

```sql
CREATE TABLE sensors (
    id            SERIAL PRIMARY KEY,
    serial_number VARCHAR(32)  NOT NULL UNIQUE,
    kind          VARCHAR(20)  NOT NULL,
    location      VARCHAR(100),
    is_active     BOOLEAN      NOT NULL DEFAULT true,
    installed_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO sensors (serial_number, kind) VALUES ('IMU-0001', 'imu');  -- id 1, is_active true
INSERT INTO sensors (serial_number, kind) VALUES ('IMU-0001', 'imu');  -- ERROR: unique violation
```

`NOT NULL DEFAULT true` closes the Q4(c) loophole: an explicit `NULL` is now rejected instead of stored. `UNIQUE` creates an index, so lookups by serial number are fast.

**E2 — reference solution**

```sql
CREATE TABLE readings (
    id          SERIAL PRIMARY KEY,
    sensor_id   INTEGER        NOT NULL,          -- link to sensors.id
    recorded_at TIMESTAMP      NOT NULL,
    value       DECIMAL(10, 3) NOT NULL
);

INSERT INTO sensors (serial_number, kind, location) VALUES
    ('IMU-0001', 'imu',         'arm-1 wrist'),   -- id 1
    ('TMP-0007', 'temperature', 'motor bay');     -- id 2

INSERT INTO readings (sensor_id, recorded_at, value) VALUES
    (1, '2024-01-15 10:30', 0.98),
    (1, '2024-01-15 10:31', 1.02),
    (2, '2024-01-15 10:30', 41.5);
```

Sensor facts (`kind`, `location`) are now stored once per sensor instead of once per reading. Moving `IMU-0001` to a new location is a one-row `UPDATE`, however many readings it has. (The ids 1 and 2 assume a freshly created `sensors` table. In real code, look them up or use `RETURNING id`.)

**E3 — reference solution**

```sql
CREATE TABLE robots (
    id   SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE missions (
    id         SERIAL PRIMARY KEY,
    title      VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE robot_missions (
    robot_id    INTEGER     NOT NULL,
    mission_id  INTEGER     NOT NULL,
    role        VARCHAR(10) NOT NULL
                CHECK (role IN ('leader', 'follower', 'observer')),
    assigned_at TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (robot_id, mission_id)            -- one row per (robot, mission)
);
```

The composite primary key makes a second `(robot 1, mission 7)` row a duplicate-key error, while robot 1 can still join mission 8 and mission 7 can still add robot 2. That is exactly "many-to-many, at most once per pair". The `role` column lives on the junction table because it describes the *pairing*, not the robot or the mission alone.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Systems & Robotics Visualizer for **Chapter 1: Tables, Rows, & Columns**
- **Live Architecture & Data-Flow Sandbox:**
  - Render an interactive system pipeline and state inspector for **chapter1 tables and schema**, animating data packets, telemetry frames, validation boundaries, and execution states across each stage.
  - Display live latency, throughput, validation status (`<Badge>` in emerald for valid, rose for rejected/fault), and memory/state transitions as parameters change.
- **Step-by-Step Execution & Failure-Mode Inspector:**
  - Allow the user to inject both valid telemetry payloads and fault scenarios (malformed schemas, timeouts, out-of-range sensor spikes) and watch the system recover or trigger deterministic fallbacks in a live `<Table>` audit log.

### 2. Required `shadcn/ui` Controls
- **Simulation Controls:** `<Button>` triggers for **Run Step**, **Inject Fault / Anomaly**, and **Reset State**; `<Slider>` for request rate, timeout threshold, or physical parameter bounds.
- **Mode & Configuration Toggles:** `<Switch>` to toggle strict validation / guardrails ON vs. OFF, and `<Tabs>` to switch between *Architecture View*, *Live Payload Inspector*, and *Production Code Breakdown*.


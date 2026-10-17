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


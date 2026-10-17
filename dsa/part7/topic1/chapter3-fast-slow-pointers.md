# Part 7, Topic 1: Linked List Operations
## Chapter 3: Fast & Slow Pointers

We covered the "Slow and Fast" Two Pointer technique for arrays in Phase 2. For Linked Lists, this technique goes by a specific name: **Floyd's Tortoise and Hare Algorithm**.

It solves two very specific, very common problems in $O(N)$ time and $O(1)$ space.

---

## 1. Finding the Middle of a Linked List

If you have an array, finding the middle is easy: `array[size / 2]`.
In a Linked List, you don't know the size! You would have to traverse the entire list to count the nodes ($O(N)$), and then traverse it *again* to reach the middle ($O(N/2)$).

### The Naive Approach (Two Passes)

```cpp
ListNode* middleNodeNaive(ListNode* head) {
    // Pass 1: Count nodes
    int count = 0;
    ListNode* curr = head;
    while (curr != nullptr) {
        count++;
        curr = curr->next;
    }

    // Pass 2: Go to middle
    curr = head;
    for (int i = 0; i < count / 2; i++) {
        curr = curr->next;
    }
    return curr;
}
// Time: O(N) + O(N/2) = O(N)
// Space: O(1)
// Works, but requires TWO passes.
```

**What's happening:**
```
List: 1 -> 2 -> 3 -> 4 -> 5 -> nullptr

Pass 1: Count nodes
    curr=1 (count=1), curr=2 (count=2), curr=3 (count=3), curr=4 (count=4), curr=5 (count=5), curr=nullptr (stop)
    count = 5

Pass 2: Go to middle (5/2 = 2 steps)
    curr = head (node 1)
    Step 1: curr = node 2
    Step 2: curr = node 3
    Return node 3

    Works! But we traversed the list twice.
```

### The Fast/Slow Solution (One Pass)

```cpp
ListNode* middleNode(ListNode* head) {
    ListNode* slow = head;
    ListNode* fast = head;

    // While fast hasn't reached the end, AND fast can safely take 2 steps
    while (fast != nullptr && fast->next != nullptr) {
        slow = slow->next;       // 1 step
        fast = fast->next->next; // 2 steps
    }

    return slow; // The middle node
}
```

**What's happening:**
```
Key insight: If slow moves 1 step and fast moves 2 steps,
when fast reaches the end, slow has covered exactly HALF the distance.

Think of it like a race:
    - Slow runs at speed 1
    - Fast runs at speed 2
    - When the fast runner finishes the track,
      the slow runner is exactly halfway.

For odd-length lists (1 -> 2 -> 3 -> 4 -> 5):
    fast reaches node(5) (end), slow is at node(3) (middle)

For even-length lists (1 -> 2 -> 3 -> 4):
    fast reaches nullptr (past the end), slow is at node(3)
    (LeetCode convention: for even, return the SECOND middle node)
```

### Dry-Run Table: Finding Middle

List: `1 -> 2 -> 3 -> 4 -> 5 -> nullptr`

| Iteration | `slow` | `fast` | `slow` action | `fast` action |
|-----------|--------|--------|---------------|---------------|
| Start | node(1) | node(1) | - | - |
| 1 | node(2) | node(3) | slow=slow->next | fast=fast->next->next |
| 2 | node(3) | node(5) | slow=slow->next | fast=fast->next->next |
| 3 | node(3) | node(5) | fast->next is nullptr, STOP | - |

Loop ends. Return `slow` = node(3). Middle found!

### Dry-Run Table: Even-Length List

List: `1 -> 2 -> 3 -> 4 -> nullptr`

| Iteration | `slow` | `fast` | `slow` action | `fast` action |
|-----------|--------|--------|---------------|---------------|
| Start | node(1) | node(1) | - | - |
| 1 | node(2) | node(3) | slow=slow->next | fast=fast->next->next |
| 2 | node(3) | nullptr | fast==nullptr, STOP | - |

Loop ends. Return `slow` = node(3). (Second middle for even-length.)

---

## 2. Detecting a Cycle

Sometimes, a Linked List is broken. The `tail->next` doesn't point to `nullptr`; instead, it points back to a node in the middle of the list.
If you try to write `while(curr != nullptr)`, you will enter an infinite loop!

### The Problem Visualized

```
Normal list:       1 -> 2 -> 3 -> 4 -> nullptr

List with cycle:   1 -> 2 -> 3 -> 4
                   ^             |
                   |             |
                   +-------------+

node(4)->next = node(2), creating a cycle: 2 -> 3 -> 4 -> 2 -> 3 -> 4 -> ...

If you traverse with 'while(curr != nullptr)', you loop FOREVER:
    curr = 1, 2, 3, 4, 2, 3, 4, 2, 3, 4, ... (never reaches nullptr)
```

### The Naive Approach (Hash Set)

```cpp
bool hasCycleNaive(ListNode *head) {
    unordered_set<ListNode*> visited;
    ListNode* curr = head;

    while (curr != nullptr) {
        if (visited.count(curr)) {
            return true;  // We've seen this node before!
        }
        visited.insert(curr);
        curr = curr->next;
    }
    return false;
}
// Time: O(N)
// Space: O(N) - stores every node in the set
```

**What's happening:**
```
This works but uses O(N) extra space.
    We store every node's address in a hash set.
    If we encounter a node we've already stored, it's a cycle.

    Problem: What if the list has 1 million nodes?
    We need 1 million entries in our hash set. O(N) space.
```

### The Fast/Slow Solution (Floyd's Algorithm)

```cpp
bool hasCycle(ListNode *head) {
    if (head == nullptr) return false;

    ListNode* slow = head;
    ListNode* fast = head;

    while (fast != nullptr && fast->next != nullptr) {
        slow = slow->next;
        fast = fast->next->next;

        // If they ever stand on the exact same node, there IS a cycle!
        if (slow == fast) {
            return true;
        }
    }

    // If fast reaches nullptr, there is an end to the list (no cycle)
    return false;
}
// Time: O(N)
// Space: O(1) - just two pointers!
```

**What's happening:**
```
Key insight: If two runners are on a circular track, and one is running
twice as fast as the other, the fast runner will eventually "lap"
(catch up to) the slow runner.

Analogy:
    - Two runners on a 400m track
    - Slow jogs at 1 lap per minute
    - Fast sprints at 2 laps per minute
    - If there's a track (cycle), fast WILL catch slow from behind
    - If it's a straight line (no cycle), fast reaches the end first

Why does this work?
    In each step, the DISTANCE between fast and slow either:
    - Decreases by 1 (fast catches up), or
    - Decreases by 1 (wrapping around a cycle)
    So eventually, fast catches slow by exactly 1 step = they meet.
```

### Dry-Run Table: Cycle Detection

List: `1 -> 2 -> 3 -> 4 -> (back to 2)`

| Iteration | `slow` | `fast` | Distance between | Meet? |
|-----------|--------|--------|------------------|-------|
| Start | node(1) | node(1) | 0 | No (same, but check after move) |
| 1 | node(2) | node(3) | 1 | No |
| 2 | node(3) | node(2) | -1 (fast wrapped) | No |
| 3 | node(4) | node(4) | 0 | **Yes!** |

Cycle detected at iteration 3.

---

## 3. Finding the START of the Cycle

A harder variation of the problem asks: *"Return the exact node where the cycle begins."*

### The Naive Approach

```cpp
ListNode *detectCycleNaive(ListNode *head) {
    unordered_set<ListNode*> visited;
    ListNode* curr = head;

    while (curr != nullptr) {
        if (visited.count(curr)) {
            return curr;  // This is the start of the cycle
        }
        visited.insert(curr);
        curr = curr->next;
    }
    return nullptr;
}
// Time: O(N), Space: O(N)
```

### The Mathematical Trick (Floyd's Algorithm)

```cpp
ListNode *detectCycle(ListNode *head) {
    ListNode* slow = head;
    ListNode* fast = head;
    bool has_cycle = false;

    // 1. Find intersection
    while (fast != nullptr && fast->next != nullptr) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) {
            has_cycle = true;
            break;
        }
    }

    if (!has_cycle) return nullptr;

    // 2. Reset slow to head
    slow = head;

    // 3. Move both by 1 step until they collide
    while (slow != fast) {
        slow = slow->next;
        fast = fast->next;
    }

    // They collide at the cycle start
    return slow;
}
// Time: O(N), Space: O(1)
```

**What's happening:**
```
The Math (you don't need to prove this in an interview, just know the trick):

Let:
    a = distance from head to cycle start
    b = distance from cycle start to meeting point
    c = length of the cycle

After Phase 1 (finding meeting point):
    slow traveled: a + b
    fast traveled: a + b + (some full laps of c)
    Since fast = 2 * slow:
        2(a + b) = a + b + nc
        a + b = nc
        a = nc - b

    This means: if you start from head and walk 'a' steps,
    and start from the meeting point and walk 'a' steps,
    you BOTH arrive at the cycle start!

    That's why we reset slow to head and move both by 1.
```

### Visual Walkthrough

```
List: 1 -> 2 -> 3 -> 4 -> 5 -> 6
                       ^         |
                       +----7----+

    a = distance from head to cycle start = 3 (nodes 1,2,3)
    b = distance from cycle start to meeting = 1 (4 -> 5)
    c = cycle length = 4 (nodes 4,5,6,7)

Phase 1: Find meeting point
    slow: 1 -> 2 -> 3 -> 4 -> 5
    fast: 1 -> 3 -> 5 -> 7 -> 5
    Meet at node(5)

Phase 2: Find cycle start
    slow = head (node 1)
    fast = meeting point (node 5)

    slow=1, fast=5 -> not equal, advance both
    slow=2, fast=6 -> not equal, advance both
    slow=3, fast=7 -> not equal, advance both
    slow=4, fast=4 -> EQUAL! Cycle start = node(4)
```

### Dry-Run Table: Finding Cycle Start

List: `1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> (back to 4)`

**Phase 1: Find intersection**

| Iteration | `slow` | `fast` | Meet? |
|-----------|--------|--------|-------|
| 1 | node(2) | node(3) | No |
| 2 | node(3) | node(5) | No |
| 3 | node(4) | node(7) | No |
| 4 | node(5) | node(5) | **Yes** |

**Phase 2: Find start (reset slow to head)**

| Iteration | `slow` | `fast` | Equal? |
|-----------|--------|--------|--------|
| Reset | node(1) | node(5) | No |
| 1 | node(2) | node(6) | No |
| 2 | node(3) | node(7) | No |
| 3 | node(4) | node(4) | **Yes!** |

Cycle starts at node(4). Correct!

---

## 4. Common Applications

| Problem | Technique | Time | Space |
|---------|-----------|------|-------|
| Find middle of list | Fast moves 2x slow | $O(N)$ | $O(1)$ |
| Detect cycle | Fast catches slow | $O(N)$ | $O(1)$ |
| Find cycle start | Floyd's Phase 1 + Phase 2 | $O(N)$ | $O(1)$ |
| Happy Number | Treat number as a "list" with cycle detection | $O(\log N)$ | $O(1)$ |
| Find duplicate number | Treat array values as "next pointers" | $O(N)$ | $O(1)$ |
| Palindrome check | Find middle, reverse second half, compare | $O(N)$ | $O(1)$ |

---

## Quick Reference Table

| Concept | Code Pattern | Key Detail |
|---------|-------------|------------|
| Find middle | `while (fast && fast->next) { slow=slow->next; fast=fast->next->next; }` | Return `slow` |
| Detect cycle | Same movement, check `if (slow == fast)` inside loop | Return `true` if meet |
| Find cycle start | Phase 1: find meeting point. Phase 2: reset slow to head, both move 1 step | Return meeting point |
| Loop condition | `while (fast != nullptr && fast->next != nullptr)` | Ensures safe 2-step |

| Edge Case | How to Handle |
|-----------|---------------|
| Empty list (`head == nullptr`) | Return `nullptr` / `false` immediately |
| Single node | `fast->next == nullptr`, loop doesn't execute, return head |
| Cycle at head | Phase 2: slow=head, fast=meeting, they meet at head immediately |
| Even-length list (middle) | Returns the SECOND middle node (LeetCode convention) |

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Chapter 3: Fast & Slow Pointers**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **chapter3 fast slow pointers** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.


# Part 8, Topic 2: Queue & Monotonic Deque
## Chapter 1: Queue and Deque Fundamentals

While a Stack is LIFO, a **Queue** is **First In, First Out (FIFO)**.

Think of it like a line at a store. The first person in line is the first person to be served. You join at the back (enqueue) and leave from the front (dequeue).

---

### 1. Standard Queues

Queues are primarily used in scheduling algorithms and, most importantly, **Breadth-First Search (BFS)** for Trees and Graphs.
*(We will cover BFS heavily in Phase 11).*

**Implementation Note:**
Unlike Stacks, you **cannot** use a `std::vector` to simulate a Queue efficiently.
To remove the first element from a vector (`erase(begin)`), it takes $O(N)$ time because all subsequent elements must be shifted left.

You must use `std::queue`.

```cpp
#include <queue>

queue<int> q;
q.push(10); // Adds to the back: O(1)
q.push(20);

int first = q.front(); // Looks at the front (10): O(1)
q.pop();               // Removes the front (10): O(1)
```

**What's happening:**
```
q.push(10):
    Queue: [10]  <- front
           [10]  <- back

q.push(20):
    Queue: [10, 20]
            ^    ^
          front  back

q.front() returns 10:
    Queue: [10, 20]  (peek only, no removal)

q.pop() removes 10:
    Queue: [20]  <- front = back = 20
```

---

### 2. Enqueue/Dequeue Visualization: Step by Step

Let's trace a sequence of operations:

```
Operations: push(1) -> push(2) -> push(3) -> pop() -> push(4) -> pop()

Step 1: push(1)
    FRONT                         BACK
    | 1 |
    |___|

Step 2: push(2)
    FRONT                         BACK
    | 1 | 2 |
    |_______|

Step 3: push(3)
    FRONT                         BACK
    | 1 | 2 | 3 |
    |___________|

Step 4: pop() -> returns 1 (FIRST in, FIRST out)
    FRONT                         BACK
    | 2 | 3 |
    |_______|

Step 5: push(4)
    FRONT                         BACK
    | 2 | 3 | 4 |
    |___________|

Step 6: pop() -> returns 2
    FRONT                         BACK
    | 3 | 4 |
    |_______|

Final queue: [3, 4]  (front to back)
```

**Key insight:** The queue processes elements in the order they arrived. Perfect for BFS and scheduling.

---

### 3. Dry-Run Table: Queue State Tracking

| Operation | Action | Queue (front→back) | Return Value |
|-----------|--------|-------------------|--------------|
| push(A)   | Enqueue | [A]              | -            |
| push(B)   | Enqueue | [A, B]           | -            |
| push(C)   | Enqueue | [A, B, C]        | -            |
| front()   | Peek    | [A, B, C]        | A            |
| pop()     | Dequeue | [B, C]           | A            |
| front()   | Peek    | [B, C]           | B            |
| push(D)   | Enqueue | [B, C, D]        | -            |
| pop()     | Dequeue | [C, D]           | B            |
| empty()   | Check   | [C, D]           | false        |

---

### 4. Double-Ended Queues (`std::deque`)

A Deque (pronounced "deck") allows you to push and pop from **both** the front and the back in $O(1)$ time. It also allows you to access elements by index `[i]` in $O(1)$ time.

```cpp
#include <deque>

deque<int> dq;
dq.push_back(20);
dq.push_front(10); // dq is now [10, 20]

dq.pop_back();  // removes 20
dq.pop_front(); // removes 10
```

**What's happening:**
```
dq.push_back(20):
    Deque: [20]  <- front = back

dq.push_front(10):
    Deque: [10, 20]
            ^    ^
          front  back

dq.pop_back() removes 20:
    Deque: [10]  <- front = back

dq.pop_front() removes 10:
    Deque: []  <- empty
```

**Why deque over queue?**
```cpp
// queue only has push/pop/front/back (plus empty/size)
// deque has ALL of these:
dq.push_back(val);    // O(1)
dq.push_front(val);   // O(1)  <- queue can't do this
dq.pop_back();        // O(1)  <- queue can't do this
dq.pop_front();       // O(1)
dq.front();           // O(1)
dq.back();            // O(1)
dq[i];                // O(1)  <- random access!
dq.size();            // O(1)
```

---

### 5. Queue vs Deque vs Vector

| Feature | `std::queue` | `std::deque` | `std::vector` |
|---------|-------------|-------------|---------------|
| Push back | O(1) | O(1) | O(1) amortized |
| Push front | Not supported | O(1) | O(n) |
| Pop back | Not supported | O(1) | O(1) |
| Pop front | O(1) | O(1) | O(n) |
| Access [i] | Not supported | O(1) | O(1) |
| Iterate | Not supported | O(n) | O(n) |
| Use case | BFS, scheduling | Sliding window, Monotonic | Stack, random access |

**When to use what:**
- **Queue:** Simple FIFO, BFS, when you only need front/back access
- **Deque:** Sliding window, monotonic deque, when you need both ends
- **Vector:** Stack simulation, when you need indexing and iteration

---

### 6. BFS with Queue: The Classic Use Case

BFS explores level by level. A queue makes this natural.

```cpp
// BFS on a binary tree
void bfs(TreeNode* root) {
    if (!root) return;

    queue<TreeNode*> q;
    q.push(root);

    while (!q.empty()) {
        TreeNode* node = q.front();
        q.pop();

        cout << node->val << " ";

        if (node->left) q.push(node->left);
        if (node->right) q.push(node->right);
    }
}
```

**What's happening with tree:**
```
        1
       / \
      2   3
     / \   \
    4   5   6

q.push(1):        q: [1]
Process 1:         q: [], push 2,3 -> q: [2,3]
Process 2:         q: [3], push 4,5 -> q: [3,4,5]
Process 3:         q: [4,5], push 6 -> q: [4,5,6]
Process 4:         q: [5,6]
Process 5:         q: [6]
Process 6:         q: []

Output: 1 2 3 4 5 6  (level by level)
```

---

### 7. The Monotonic Deque (Advanced)

Just like the Monotonic Stack solves "Next Greater Element" efficiently, the **Monotonic Deque** solves a very specific, notoriously difficult problem:
**"Find the Maximum (or Minimum) element inside a Sliding Window."**

**The Problem (Sliding Window Maximum):**
Given an array `[1, 3, -1, -3, 5, 3, 6, 7]` and a window of size `k = 3`, slide the window from left to right and return the maximum value in the window at each step.
`[1,  3, -1] -> max is 3`
`[3, -1, -3] -> max is 3`
`[-1, -3,  5] -> max is 5`

**The Brute Force:**
For every step, scan the $K$ elements in the window to find the max. Time: $O(N \times K)$. TLE on LeetCode.

**The Monotonic Deque Insight:**
We want to keep track of the maximums. If we encounter a `5`, and the previous elements in the window were `-1` and `-3`, those previous elements are now completely useless! They are smaller than `5`, and because they are older, they will fall out of the window *before* `5` does. We can safely throw them away.

We maintain a **Decreasing Deque** (non-increasing: the code pops only smaller values, so equal values stay).
The front of the deque will ALWAYS hold the maximum element for the current window.

---

### 8. Full Walkthrough: Sliding Window Maximum

Let's trace `[1, 3, -1, -3, 5, 3, 6, 7]` with `k = 3`.

**Expected answer:** `[3, 3, 5, 5, 6, 7]`

**Step-by-step:**

| Step | i | Value | Deque (indices) | Deque Values | Action | Result |
|------|---|-------|-----------------|--------------|--------|--------|
| 1 | 0 | 1 | [0] | [1] | Push 0 | [] |
| 2 | 1 | 3 | [1] | [3] | Pop 0 (1<3), Push 1 | [] |
| 3 | 2 | -1 | [1, 2] | [3, -1] | Push 2 | [3] |
| 4 | 3 | -3 | [1, 2, 3] | [3, -1, -3] | Push 3 | [3, 3] |
| 5 | 4 | 5 | [4] | [5] | Pop 3,2,1 (all<5), Push 4 | [3, 3, 5] |
| 6 | 5 | 3 | [4, 5] | [5, 3] | Push 5 | [3, 3, 5, 5] |
| 7 | 6 | 6 | [6] | [6] | Pop 5,4 (both<6), Push 6 | [3, 3, 5, 5, 6] |
| 8 | 7 | 7 | [7] | [7] | Pop 6 (6<7), Push 7 | [3, 3, 5, 5, 6, 7] |

**Final result:** `[3, 3, 5, 5, 6, 7]` ✓

---

### 9. The Golden Template

```cpp
vector<int> maxSlidingWindow(vector<int>& nums, int k) {
    vector<int> result;
    deque<int> dq; // Stores INDICES, not values!

    for (int i = 0; i < nums.size(); i++) {

        // 1. Maintain Decreasing Monotonicity
        // Remove smaller elements from the back because they are useless now
        while (!dq.empty() && nums[dq.back()] < nums[i]) {
            dq.pop_back();
        }

        // 2. Add the current element's index
        dq.push_back(i);

        // 3. Remove elements from the front if they fall outside the window
        // The window bounds are from (i - k + 1) to i.
        if (dq.front() < i - k + 1) {
            dq.pop_front();
        }

        // 4. Record the answer (only after the window has reached size K)
        if (i >= k - 1) {
            result.push_back(nums[dq.front()]);
        }
    }

    return result;
}
```

**What's happening:**
```
For every new element at index i:
  1. CLEAN BACK: Remove all elements from back that are smaller than current.
     Why? They are useless - current is bigger AND newer.
  2. PUSH: Add current index to back of deque.
  3. CLEAN FRONT: If front index is outside window, remove it.
     Why? It's too old, no longer in the window.
  4. RECORD: Front of deque is always the max for current window.

The deque maintains decreasing order of values.
Front = current window maximum.
```

---

### 10. Edge Cases

| Edge Case | Behavior |
|-----------|----------|
| k = 1 | Every element is its own max, result = input |
| k = n | Only one window, result = [global max] |
| All same values | All results are that value |
| Strictly increasing | Max is always the rightmost element |
| Strictly decreasing | Max is always the leftmost element |
| Single element | Return that element |

---

### 11. Common Mistakes

**Mistake 1: Storing values instead of indices**
```cpp
// WRONG - can't check if index is out of window
deque<int> dq;
dq.push_back(nums[i]);

// RIGHT - store indices
deque<int> dq;
dq.push_back(i);
```

**Mistake 2: Wrong window bounds check**
```cpp
// WRONG
if (dq.front() < i - k) {

// RIGHT - off by one
if (dq.front() < i - k + 1) {
```

**Mistake 3: Recording result before window is full**
```cpp
// WRONG - records garbage for first k-1 steps
result.push_back(nums[dq.front()]);

// RIGHT - only record when window is complete
if (i >= k - 1) {
    result.push_back(nums[dq.front()]);
}
```

---

### Quick Reference Table

| Operation | `std::queue` | `std::deque` | Time |
|-----------|-------------|-------------|------|
| Push back | `q.push(val)` | `dq.push_back(val)` | O(1) |
| Push front | Not supported | `dq.push_front(val)` | O(1) |
| Pop front | `q.pop()` | `dq.pop_front()` | O(1) |
| Pop back | Not supported | `dq.pop_back()` | O(1) |
| Front | `q.front()` | `dq.front()` | O(1) |
| Back | `q.back()` | `dq.back()` | O(1) |
| Access [i] | Not supported | `dq[i]` | O(1) |
| Empty | `q.empty()` | `dq.empty()` | O(1) |
| Size | `q.size()` | `dq.size()` | O(1) |

**Key Takeaways:**
- Queue = FIFO, use for BFS and scheduling
- Deque = double-ended, O(1) push/pop from both sides
- Monotonic Deque = decreasing/increasing order, for sliding window max/min
- Always store indices (not values) for window boundary checks
- Amortized O(n) because each element pushed/popped at most once

---

## Practice & Self-Check

Draw the container front→back at every step, as in the dry-run table of Section 3 and the walkthrough of Section 8.

### Predict the Output / Trace by Hand

**Q1. Queue sequence.** Starting from an empty `queue<int> q`, run:
`push(7) -> push(3) -> pop() -> push(9) -> front() -> push(1) -> pop() -> pop()`.
What values do `pop()`/`front()` return, and what is the final queue (front→back)?

**Q2. Both ends of a deque.** Starting from an empty `deque<int> dq`, run:
`push_back(5) -> push_front(2) -> push_back(8) -> push_front(1) -> pop_back()`.
What is `dq` now, and what is `dq[1]`? Then after one `pop_front()`, what is `dq.front()`?

**Q3. BFS order.** Run the chapter's `bfs` on this tree. Give the queue contents after each node is processed and the printed output.

```
        8
       / \
      3   10
     / \    \
    1   6    14
```

**Q4. Sliding Window Maximum on a new input.** Run the Golden Template `maxSlidingWindow` on `[4, 2, 12, 3, 8, 1, 7]` with `k = 3`. Give the deque (indices) at the end of each iteration and the result. At which `i` does the **front-eviction** step (step 3) actually remove something?

**Q5. Mistake 3 in action.** If the `if (i >= k - 1)` guard is deleted from the template, what does the same call from Q4 return?

### Coding Exercises

**E1 (Easy). First Negative in Every Window.** For each window of size `k`, return its first (leftmost) negative number, or `0` if it has none.

```cpp
vector<int> firstNegative(const vector<int>& nums, int k);
// [12, -1, -7, 8, -15, 30, 16, 28], k = 3 -> [-1, -1, -7, -15, -15, 0]
// [5, 6, 7], k = 2                        -> [0, 0]
```

**E2 (Easy–Medium). Sliding Window Minimum.** Adapt the Golden Template to return the minimum of each window.

```cpp
vector<int> minSlidingWindow(const vector<int>& nums, int k);
// [1, 3, -1, -3, 5, 3, 6, 7], k = 3 -> [-1, -3, -3, -3, 3, 3]
```

**E3 (Medium). Longest Subarray with Bounded Spread.** Return the length of the longest contiguous subarray in which `max - min <= limit`.

```cpp
int longestSubarray(const vector<int>& nums, int limit);
// [8, 2, 4, 7], limit = 4         -> 2   ([2, 4] or [4, 7])
// [10, 1, 2, 4, 7, 2], limit = 5  -> 4   ([2, 4, 7, 2])
```

#### Dry-Run: Answers

**Q1.** Returns: `pop()` → 7, `front()` → 3, `pop()` → 3, `pop()` → 9. Final queue `[1]`.

| Operation | Queue (front→back) | Return |
|-----------|-------------------|--------|
| push(7) | [7] | - |
| push(3) | [7, 3] | - |
| pop() | [3] | 7 |
| push(9) | [3, 9] | - |
| front() | [3, 9] | 3 |
| push(1) | [3, 9, 1] | - |
| pop() | [9, 1] | 3 |
| pop() | [1] | 9 |

**Q2.** After the five operations `dq = [1, 2, 5]` and `dq[1] = 2`. After `pop_front()`, `dq = [2, 5]` and `dq.front() = 2`.

| Operation | Deque (front→back) |
|-----------|-------------------|
| push_back(5) | [5] |
| push_front(2) | [2, 5] |
| push_back(8) | [2, 5, 8] |
| push_front(1) | [1, 2, 5, 8] |
| pop_back() | [1, 2, 5] |

**Q3.** Output `8 3 10 1 6 14`.

| Process | Queue after pushing children |
|---------|------------------------------|
| start | [8] |
| 8 | [3, 10] |
| 3 | [10, 1, 6] |
| 10 | [1, 6, 14] |
| 1 | [6, 14] |
| 6 | [14] |
| 14 | [] |

**Q4.** Result `[12, 12, 12, 8, 8]`. Front-eviction removes something only at **i = 5** (index 2, value 12, falls out since $2 < 5 - 3 + 1 = 3$).

| i | Value | Back pops | Deque after | Window max |
|---|-------|-----------|-------------|------------|
| 0 | 4 | — | [0] | (not recorded) |
| 1 | 2 | — | [0, 1] | (not recorded) |
| 2 | 12 | 1, 0 | [2] | 12 |
| 3 | 3 | — | [2, 3] | 12 |
| 4 | 8 | 3 | [2, 4] | 12 |
| 5 | 1 | — (then front 2 evicted) | [4, 5] | 8 |
| 6 | 7 | 5 | [4, 6] | 8 |

**Q5.** `[4, 4, 12, 12, 12, 8, 8]` — two extra "garbage" entries at i = 0 and i = 1, where the front of the deque is index 0 (value 4) for a window that is not full yet.

**E1 — reference solution.** A queue of indices of negatives only; the front is the leftmost negative still inside the window.

```cpp
vector<int> firstNegative(const vector<int>& nums, int k) {
    vector<int> result;
    deque<int> dq;                                   // indices of negatives
    for (int i = 0; i < (int)nums.size(); i++) {
        if (nums[i] < 0) dq.push_back(i);
        if (!dq.empty() && dq.front() < i - k + 1) dq.pop_front();
        if (i >= k - 1) result.push_back(dq.empty() ? 0 : nums[dq.front()]);
    }
    return result;
}
```
Time $O(n)$, space $O(k)$. A plain `queue<int>` also works, since only the back is pushed and only the front is popped.

**E2 — reference solution.** Flip the comparison so the deque is **increasing**; the front is the minimum.

```cpp
vector<int> minSlidingWindow(const vector<int>& nums, int k) {
    vector<int> result;
    deque<int> dq;                                   // increasing values
    for (int i = 0; i < (int)nums.size(); i++) {
        while (!dq.empty() && nums[dq.back()] > nums[i]) dq.pop_back();
        dq.push_back(i);
        if (dq.front() < i - k + 1) dq.pop_front();
        if (i >= k - 1) result.push_back(nums[dq.front()]);
    }
    return result;
}
```
Time $O(n)$ amortized (each index pushed and popped at most once), space $O(k)$.

**E3 — reference solution.** A variable-size window with **two** monotonic deques: decreasing for the max, increasing for the min. Shrink from the left while the spread is too large.

```cpp
int longestSubarray(const vector<int>& nums, int limit) {
    deque<int> maxDq, minDq;
    int left = 0, best = 0;
    for (int right = 0; right < (int)nums.size(); right++) {
        while (!maxDq.empty() && nums[maxDq.back()] < nums[right]) maxDq.pop_back();
        while (!minDq.empty() && nums[minDq.back()] > nums[right]) minDq.pop_back();
        maxDq.push_back(right);
        minDq.push_back(right);
        while (nums[maxDq.front()] - nums[minDq.front()] > limit) {
            left++;                                  // shrink the window
            if (maxDq.front() < left) maxDq.pop_front();
            if (minDq.front() < left) minDq.pop_front();
        }
        best = max(best, right - left + 1);
    }
    return best;
}
```
Time $O(n)$ (each pointer only moves right, each index enters/leaves each deque once), space $O(n)$.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Chapter 1: Queue and Deque Fundamentals**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **chapter1 queue and deque** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.


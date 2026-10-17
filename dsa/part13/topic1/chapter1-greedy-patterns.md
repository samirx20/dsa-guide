# Part 13, Topic 1: Greedy Algorithms
## Chapter 1: Greedy Patterns & Interval Scheduling

A Greedy Algorithm builds up a solution piece by piece, always choosing the next piece that offers the most immediate benefit.

---

## 1. The Greedy Choice Property

A problem can be solved with a greedy algorithm if it exhibits the **Greedy Choice Property**: A global (overall) optimum can be arrived at by selecting a local optimum.

### Greedy vs DP vs Backtracking

| Aspect | Greedy | DP | Backtracking |
|---|---|---|---|
| **Decision** | Always pick local best | Consider all options | Try all, backtrack |
| **Look Ahead?** | No | No (reuses cached results) | Yes (explores all) |
| **Proof Needed?** | Yes (exchange argument) | No (optimal substructure) | No |
| **Time** | O(N) or O(N log N) | Usually polynomial | Exponential |
| **Space** | O(1) to O(N) | O(N) to O(N^2) | O(N) stack |

### When to Use Greedy

**Use Greedy when:**
- The problem asks for "maximum" or "minimum" AND has the greedy choice property
- You can prove that making the locally optimal choice leads to a globally optimal solution
- The problem involves scheduling, intervals, or selecting items
- There is no need to reconsider past choices once they are made

**Don't Use Greedy when:**
- The problem requires considering all combinations (use DP or Backtracking)
- Making the "best" choice now might hurt you later (use DP)
- The problem has overlapping subproblems that need memoization

---

## 2. Proving Greedy (The Exchange Argument)

In an interview, proposing a greedy solution is dangerous because if your greedy assumption is wrong, your entire algorithm fails.

You can mentally prove a greedy strategy using an **Exchange Argument**:

**The Proof Template:**
1. Assume there is an optimal solution that differs from my greedy choice
2. Identify where they first differ
3. Show that swapping the optimal's choice with your greedy choice doesn't make the result worse
4. Therefore, a greedy choice can be part of some optimal solution

**Example: Activity Selection (pick max non-overlapping intervals)**

```
Greedy choice: Always pick the interval that ENDS earliest.

Proof by exchange argument:
- Assume optimal solution O picks interval A (ends at time 5)
- My greedy choice G picks interval B (ends at time 3, the earliest)
- If A != B, then B ends before A
- Swap A with B in O → O'
- O' is still valid (B ends no later than A, and every other interval in O starts after A ends, so no new overlaps)
- O' has the same count as O
- Therefore, greedy choice B can be in an optimal solution
```

**What's happening:**
```
The exchange argument shows that for ANY optimal solution that doesn't
use the greedy choice, we can swap in the greedy choice without making
things worse. This proves the greedy choice is always safe.
```

---

## 3. Interval Scheduling Pattern

One of the most heavily tested greedy patterns involves overlapping intervals (e.g., scheduling meetings in a conference room).

### The Problem

Given an array of meetings `[start, end]`, find the maximum number of non-overlapping meetings you can attend.

### The Greedy Choice

Always pick the meeting that **ends earliest**.

### Choice Visualization: Why Sorting by Start Time Fails

```
Meetings: [[1,10], [2,3], [4,5]]

Sorted by start: [[1,10], [2,3], [4,5]]
- Pick [1,10] (starts first) → end time = 10
- [2,3] overlaps with 10 → skip
- [4,5] overlaps with 10 → skip
- Result: 1 meeting (WRONG!)

Sorted by end: [[2,3], [4,5], [1,10]]
- Pick [2,3] (ends first) → end time = 3
- [4,5] starts after 3 → pick it! end time = 5
- [1,10] overlaps with 5 → skip
- Result: 2 meetings (CORRECT!)
```

```
Visual Timeline (Sort by Start - WRONG):

|-------- [1,10] --------|
    |-- [2,3] --|
        |-- [4,5] --|
^ Picked 1 meeting. The long one blocks everything.

Visual Timeline (Sort by End - CORRECT):

|-- [2,3] --|
        |-- [4,5] --|
                              |-- [1,10] --------|
^ Picked 2 meetings. Short ones leave room for more.
```

**What's happening:**
- Sorting by start time picks long meetings that block everything
- Sorting by end time picks short meetings that free up your schedule fastest

### Why Sorting by End Time Works

```
The meeting that finishes earliest:
1. Frees up your schedule the fastest
2. Leaves the maximum possible remaining time for other meetings
3. Never hurts your ability to pick future meetings
```

### Code: Basic Version

```cpp
bool compareByEnd(const vector<int>& a, const vector<int>& b) {
    return a[1] < b[1]; // Sort by the end time!
}

int maxNonOverlappingMeetings(vector<vector<int>>& intervals) {
    if (intervals.empty()) return 0;
    
    // Sort by end time
    sort(intervals.begin(), intervals.end(), compareByEnd);
    
    int count = 1;
    int currentEnd = intervals[0][1];
    
    for (int i = 1; i < intervals.size(); i++) {
        // If the next meeting starts AFTER our current meeting ends
        if (intervals[i][0] >= currentEnd) {
            count++;
            currentEnd = intervals[i][1]; // Update our ending time
        }
    }
    
    return count;
}
```

**What's happening:**
```cpp
sort(intervals.begin(), intervals.end(), compareByEnd);
//  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//  Sort intervals by their END time (ascending)
//  This puts the earliest-ending meeting first

int count = 1;
int currentEnd = intervals[0][1];
//  ^^^^^^^^^^^     ^^^^^^^^^^^^^^^
//  |               └── End time of the first meeting (we always pick it)
//  └── We can always attend at least 1 meeting

for (int i = 1; i < intervals.size(); i++) {
    if (intervals[i][0] >= currentEnd) {
    //  ^^^^^^^^^^^^^^     ^^^^^^^^^^^
    //  |                  └── End of last meeting we attended
    //  └── Start of next meeting
    //  If next meeting starts AFTER our last one ends → no overlap!
        
        count++;
        currentEnd = intervals[i][1];
        //  ^^^^^^^^^^^     ^^^^^^^^^^^^^^^
        //  |               └── Update to end time of newly picked meeting
        //  └── We picked one more meeting
    }
}
```

### Dry-Run: Interval Scheduling

```
Input: [[1,3], [2,4], [3,5], [0,6], [5,7], [8,9], [5,9]]

Step 1: Sort by end time
[[1,3], [2,4], [3,5], [0,6], [5,7], [5,9], [8,9]]
  ↑ sorted order: end times are 3, 4, 5, 6, 7, 9, 9

Step 2: Iterate
i=0: Pick [1,3], count=1, currentEnd=3
i=1: [2,4] starts at 2 < 3 → overlap, skip
i=2: [3,5] starts at 3 >= 3 → pick! count=2, currentEnd=5
i=3: [0,6] starts at 0 < 5 → overlap, skip
i=4: [5,7] starts at 5 >= 5 → pick! count=3, currentEnd=7
i=5: [5,9] starts at 5 < 7 → overlap, skip
i=6: [8,9] starts at 8 >= 7 → pick! count=4, currentEnd=9

Answer: 4 meetings
```

### Dry-Run Table: Variable State at Each Step

| Step | i | intervals[i] | start >= currentEnd? | count | currentEnd |
|---|---|---|---|---|---|
| 0 | — | [1,3] | — (always pick first) | 1 | 3 |
| 1 | 1 | [2,4] | 2 >= 3? NO | 1 | 3 |
| 2 | 2 | [3,5] | 3 >= 3? YES | 2 | 5 |
| 3 | 3 | [0,6] | 0 >= 5? NO | 2 | 5 |
| 4 | 4 | [5,7] | 5 >= 5? YES | 3 | 7 |
| 5 | 5 | [5,9] | 5 >= 7? NO | 3 | 7 |
| 6 | 6 | [8,9] | 8 >= 7? YES | 4 | 9 |

---

## 4. Common Greedy Patterns

### Pattern 1: Sort by End Time
- **When:** Maximizing count of non-overlapping intervals
- **Examples:** Non-overlapping Intervals, Maximum Number of Events, Activity Selection

### Pattern 2: Sort by Start Time
- **When:** Merging overlapping intervals
- **Examples:** Merge Intervals, Insert Interval

### Pattern 3: Sort by Value/Weight
- **When:** Maximizing value with constraints
- **Examples:** Fractional Knapsack (sort by value/weight ratio), Boats to Save People, Task Scheduler

### Pattern 4: Priority Queue (Heap)
- **When:** Need to always pick the "best" from a dynamic set
- **Examples:** Huffman Coding, Dijkstra's, Meeting Rooms II

---

## 5. Interval Merging Pattern

When you need to MERGE overlapping intervals (not select non-overlapping ones), sort by START time.

```cpp
vector<vector<int>> merge(vector<vector<int>>& intervals) {
    sort(intervals.begin(), intervals.end());
    
    vector<vector<int>> merged;
    merged.push_back(intervals[0]);
    
    for (int i = 1; i < intervals.size(); i++) {
        if (intervals[i][0] <= merged.back()[1]) {
            // Overlapping: merge by extending the end
            merged.back()[1] = max(merged.back()[1], intervals[i][1]);
        } else {
            // Non-overlapping: add new interval
            merged.push_back(intervals[i]);
        }
    }
    return merged;
}
```

**What's happening:**
```cpp
sort(intervals.begin(), intervals.end());
// Sort by start time (default comparison)

for (int i = 1; i < intervals.size(); i++) {
    if (intervals[i][0] <= merged.back()[1]) {
    //  ^^^^^^^^^^^^^^     ^^^^^^^^^^^^^^^^
    //  |                  └── End of last merged interval
    //  └── Start of current interval
    //  If current starts before last ends → they overlap
        
        merged.back()[1] = max(merged.back()[1], intervals[i][1]);
        // Extend the end to cover both intervals
    } else {
        merged.push_back(intervals[i]);
        // No overlap → start a new merged interval
    }
}
```

### Dry-Run: Merge Intervals

```
Input: [[1,3], [2,6], [8,10], [15,18]]

Sorted: [[1,3], [2,6], [8,10], [15,18]]

Step 1: merged = [[1,3]]
i=1: [2,6] starts at 2 <= 3 → merge! merged = [[1,6]]
i=2: [8,10] starts at 8 > 6 → no overlap. merged = [[1,6],[8,10]]
i=3: [15,18] starts at 15 > 10 → no overlap. merged = [[1,6],[8,10],[15,18]]
```

| Step | i | Current | Overlap? | merged |
|---|---|---|---|---|
| 1 | — | [1,3] | — | [[1,3]] |
| 2 | 1 | [2,6] | 2 <= 3 YES | [[1,6]] |
| 3 | 2 | [8,10] | 8 > 6 NO | [[1,6],[8,10]] |
| 4 | 3 | [15,18] | 15 > 10 NO | [[1,6],[8,10],[15,18]] |

---

## 6. Greedy Patterns Comparison

| Pattern | Sort By | Loop Action | Time |
|---|---|---|---|
| Max Non-Overlapping | End time | Pick if starts after current ends | O(N log N) |
| Merge Intervals | Start time | Merge if overlaps | O(N log N) |
| Jump Game | Index (backwards) | Update goal | O(N) |
| Gas Station | Index (circular) | Track tank, reset on negative | O(N) |
| Task Scheduler | Frequency | Use max-heap | O(N log N) |

---

## Quick Reference

| Concept | Formula/Pattern | Time | Space |
|---|---|---|---|
| **Interval Scheduling** | Sort by end, pick non-overlapping | O(N log N) | O(1) |
| **Merge Intervals** | Sort by start, merge overlaps | O(N log N) | O(N) |
| **Greedy Proof** | Exchange Argument | — | — |
| **Greedy vs DP** | Greedy: local best. DP: all options | — | — |
| **Sort by End** | Maximizing count | O(N log N) | O(1) |
| **Sort by Start** | Merging/covering | O(N log N) | O(N) |
| **Heap Pattern** | Dynamic best selection | O(N log N) | O(N) |
| **Greedy Trigger** | "Maximum/minimum count", "schedule" | — | — |
| **Exchange Proof** | Swap optimal with greedy, show no worse | — | — |

---

## Practice & Self-Check

### Predict the Output / Trace by Hand

**Q1.** Run the chapter's `maxNonOverlappingMeetings` on a new input:

```cpp
vector<vector<int>> m = {{5,8}, {1,2}, {2,5}, {3,4}, {6,7}, {4,6}};
cout << maxNonOverlappingMeetings(m);
```

Write the sorted-by-end order, then fill in the trace table (`i`, interval, `start >= currentEnd?`, `count`, `currentEnd`). What is printed?

**Q2.** Run the chapter's `merge` on `[[1,4], [0,2], [3,5], [6,7], [7,8]]`. What is the sorted order, and what does `merged` contain after each iteration? Pay attention to the interval that only *touches* the previous one.

**Q3.** Suppose someone writes `compareByEnd` incorrectly as `return a[0] < b[0];` (sort by **start**) but keeps the rest of `maxNonOverlappingMeetings` unchanged. What does the function return for `[[1,10], [2,3], [4,5], [6,7]]`, and what is the correct answer?

**Q4.** In `maxNonOverlappingMeetings`, the overlap test is `intervals[i][0] >= currentEnd`. If it is changed to `intervals[i][0] > currentEnd`, what does the function return for `[[1,2], [2,3], [3,4]]`? What does the original version return?

**Q5.** In `merge`, the overlapping branch is `merged.back()[1] = max(merged.back()[1], intervals[i][1]);`. If the `max` is dropped and the line becomes `merged.back()[1] = intervals[i][1];`, what is returned for `[[1,10], [2,3], [4,12]]`? What is the correct answer?

### Coding Exercises

**E1 (Easy).** Meeting conflict check. Return `true` if a person can attend **all** meetings (no two overlap; touching endpoints such as `[1,2]` and `[2,3]` are fine).

```cpp
bool canAttendAll(vector<vector<int>>& intervals);
// [[0,30],[5,10],[15,20]] -> false
// [[7,10],[2,4]]          -> true
```

**E2 (Easy–Medium).** Insert Interval. `intervals` is already sorted by start and non-overlapping. Insert `newInterval`, merging where necessary, and return the result (still sorted, non-overlapping). Aim for $O(N)$ — no re-sort.

```cpp
vector<vector<int>> insertInterval(vector<vector<int>>& intervals, vector<int> newInterval);
// [[1,3],[6,9]], [2,5]                        -> [[1,5],[6,9]]
// [[1,2],[3,5],[6,7],[8,10],[12,16]], [4,8]   -> [[1,2],[3,10],[12,16]]
```

**E3 (Medium).** Meeting Rooms II (the "Priority Queue" pattern from Section 4). Return the minimum number of conference rooms needed so that every meeting can be held. A room freed at time `t` can be reused by a meeting starting at `t`.

```cpp
int minMeetingRooms(vector<vector<int>>& intervals);
// [[0,30],[5,10],[15,20]] -> 2
// [[7,10],[2,4]]          -> 1
```

#### Dry-Run: Answers

**Q1 — prints `4`.** Sorted by end: `[1,2], [3,4], [2,5], [4,6], [6,7], [5,8]` (end times 2, 4, 5, 6, 7, 8).

| i | interval | start >= currentEnd? | count | currentEnd |
|---|---|---|---|---|
| 0 | [1,2] | — (always pick first) | 1 | 2 |
| 1 | [3,4] | 3 >= 2? YES | 2 | 4 |
| 2 | [2,5] | 2 >= 4? NO | 2 | 4 |
| 3 | [4,6] | 4 >= 4? YES | 3 | 6 |
| 4 | [6,7] | 6 >= 6? YES | 4 | 7 |
| 5 | [5,8] | 5 >= 7? NO | 4 | 7 |

Chosen meetings: `[1,2], [3,4], [4,6], [6,7]`.

**Q2 — returns `[[0,5], [6,8]]`.** Sorted by start: `[0,2], [1,4], [3,5], [6,7], [7,8]`.

| i | current | overlap test | merged |
|---|---|---|---|
| — | [0,2] | — | [[0,2]] |
| 1 | [1,4] | 1 <= 2 YES | [[0,4]] |
| 2 | [3,5] | 3 <= 4 YES | [[0,5]] |
| 3 | [6,7] | 6 <= 5 NO | [[0,5],[6,7]] |
| 4 | [7,8] | 7 <= 7 YES | [[0,5],[6,8]] |

The test is `<=`, so `[6,7]` and `[7,8]` (touching at 7) are merged.

**Q3 — buggy version returns `1`; correct answer is `3`.** Sorted by start: `[1,10], [2,3], [4,5], [6,7]`. `count = 1`, `currentEnd = 10`; then `2 >= 10`, `4 >= 10`, `6 >= 10` are all NO, so the long meeting blocks everything (exactly the "Why Sorting by Start Time Fails" picture). Sorted by end: `[2,3], [4,5], [6,7], [1,10]` → pick `[2,3]` (end 3), `[4,5]` (4 >= 3), `[6,7]` (6 >= 5), skip `[1,10]` (1 >= 7 NO) → 3.

**Q4 — with `>` it returns `2`; the original `>=` returns `3`.** Sorted order is unchanged: `[1,2], [2,3], [3,4]`.

| i | interval | `>` version | count | currentEnd | `>=` version | count | currentEnd |
|---|---|---|---|---|---|---|---|
| 0 | [1,2] | pick first | 1 | 2 | pick first | 1 | 2 |
| 1 | [2,3] | 2 > 2? NO | 1 | 2 | 2 >= 2? YES | 2 | 3 |
| 2 | [3,4] | 3 > 2? YES | 2 | 4 | 3 >= 3? YES | 3 | 4 |

With `>`, meetings that merely touch are wrongly treated as overlapping.

**Q5 — buggy version returns `[[1,3], [4,12]]`; correct answer is `[[1,12]]`.** Sorted: `[1,10], [2,3], [4,12]`. Start `merged = [[1,10]]`. `i=1`: `2 <= 10` → end becomes `3` (should stay 10) → `[[1,3]]`. `i=2`: `4 <= 3`? NO → push → buggy result `[[1,3],[4,12]]`. Correct version: `i=1` end stays `max(10,3)=10`; `i=2`: `4 <= 10` → end `max(10,12)=12` → `[[1,12]]`. A short interval nested inside a long one *shrinks* the merged end without `max`.

**E1 — reference solution.** Sort by start; any meeting that starts before the previous one ends is a conflict.

```cpp
bool canAttendAll(vector<vector<int>>& intervals) {
    sort(intervals.begin(), intervals.end());           // by start
    for (size_t i = 1; i < intervals.size(); i++) {
        if (intervals[i][0] < intervals[i - 1][1]) return false; // strict: touching is OK
    }
    return true;
}
```

Time $O(N \log N)$ for the sort, $O(1)$ extra space. After sorting by start, only neighbours can be the first overlap.

**E2 — reference solution.** Three phases over the already-sorted list: copy everything that ends before the new interval, absorb everything that overlaps it, copy the rest.

```cpp
vector<vector<int>> insertInterval(vector<vector<int>>& intervals, vector<int> newInterval) {
    vector<vector<int>> res;
    size_t i = 0, n = intervals.size();
    while (i < n && intervals[i][1] < newInterval[0]) res.push_back(intervals[i++]); // left of new
    while (i < n && intervals[i][0] <= newInterval[1]) {                            // overlapping
        newInterval[0] = min(newInterval[0], intervals[i][0]);
        newInterval[1] = max(newInterval[1], intervals[i][1]);
        i++;
    }
    res.push_back(newInterval);
    while (i < n) res.push_back(intervals[i++]);                                     // right of new
    return res;
}
```

Time $O(N)$, $O(N)$ output. Trace of example 2: `[1,2]` copied (2 < 4); `[3,5]`, `[6,7]`, `[8,10]` absorbed (starts 3, 6, 8 are all `<=` the growing end 8 → 8 → 10), new interval becomes `[3,10]`; `[12,16]` copied.

**E3 — reference solution.** Sort by start; keep a min-heap of end times of rooms in use. If the earliest-ending room is free by the time the next meeting starts, reuse it.

```cpp
int minMeetingRooms(vector<vector<int>>& intervals) {
    sort(intervals.begin(), intervals.end());                 // by start
    priority_queue<int, vector<int>, greater<int>> ends;      // min-heap of end times
    for (auto& m : intervals) {
        if (!ends.empty() && ends.top() <= m[0]) ends.pop();  // reuse the room that frees earliest
        ends.push(m[1]);
    }
    return (int)ends.size();
}
```

Time $O(N \log N)$, space $O(N)$. Trace on `[[0,30],[5,10],[15,20]]`: push 30 → heap {30}; `5`: top 30 > 5, push → {10,30}; `15`: top 10 <= 15, pop and push 20 → {20,30}. Heap size `2`.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Chapter 1: Greedy Patterns & Interval Scheduling**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **chapter1 greedy patterns** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.


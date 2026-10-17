# Part 13, Topic 1: Greedy Algorithms
## Interview Problems Walkthrough

These problems test your ability to find the underlying greedy heuristic.

---

## Problem Classification Table

| # | Problem | Greedy Heuristic | Key Insight | Difficulty |
|---|---|---|---|---|
| 1 | Jump Game | Backward goal | Move goalpost toward start | Medium |
| 2 | Jump Game II | Forward window | Expand reach each jump | Medium |
| 3 | Gas Station | Tank tracking | Reset on negative, unique solution | Medium |
| 4 | Non-overlapping Intervals | Sort by end | Max non-overlapping = total - remove | Medium |
| 5 | Min Arrows to Burst Balloons | Sort by end | Arrows at balloon ends | Medium |
| 6 | Partition Labels | Last index tracking | Close partition when all seen chars done | Medium |
| 7 | Hand of Straights | Sorted map | Form C groups starting from smallest | Medium |

---

## Solution Approach Comparison

| Approach | Time | Space | When to Use |
|---|---|---|---|
| Greedy | O(N log N) or O(N) | O(1) to O(N) | When greedy choice property holds |
| DP | O(N^2) | O(N) | When greedy doesn't work |
| Brute Force | O(2^N) | O(N) | Never in interviews |

---

## Step-by-Step Walkthroughs

### 1. Jump Game (Medium)

**Trigger:** Given an array of max jump lengths, can you reach the last index?

**Step-by-Step Walkthrough:**

**DP Approach:** From index `i`, try all jumps up to `nums[i]`. O(N^2).

**Greedy Approach:** Work backwards! The "goal" is initially the last index. If you are at `i`, and `i + nums[i] >= goal`, it means you can reach the goal from `i`. If so, `i` becomes the NEW goal! If the goal eventually reaches index 0, return `true`.

**Visual:**
```
nums = [2, 3, 1, 1, 4]

Index:    0   1   2   3   4
Value:    2   3   1   1   4
          ↑               ↑
       start           goal=4

Step 1: i=3, 3+1=4 >= 4 → goal=3
Step 2: i=2, 2+1=3 >= 3 → goal=2
Step 3: i=1, 1+3=4 >= 2 → goal=1
Step 4: i=0, 0+2=2 >= 1 → goal=0
Goal reached 0 → true!
```

**Dry-Run Table:**

| i | nums[i] | i + nums[i] | >= goal? | New goal |
|---|---|---|---|---|
| 3 | 1 | 4 | 4 >= 4 ✓ | 3 |
| 2 | 1 | 3 | 3 >= 3 ✓ | 2 |
| 1 | 3 | 4 | 4 >= 2 ✓ | 1 |
| 0 | 2 | 2 | 2 >= 1 ✓ | 0 |

```cpp
bool canJump(vector<int>& nums) {
    int goal = nums.size() - 1;
    
    for (int i = nums.size() - 2; i >= 0; i--) {
        if (i + nums[i] >= goal) {
            goal = i; // Shift the goal post closer to the start
        }
    }
    
    return goal == 0;
}
```

**What's happening:**
```cpp
int goal = nums.size() - 1;
//  ^^^^     ^^^^^^^^^^^^^^^
//  |        └── Initially, the goal is the last index
//  └── We want to see if we can "pull" the goal to index 0

for (int i = nums.size() - 2; i >= 0; i--) {
//  ^^^                                ^^^^
//  |                                  └── Work backwards from second-to-last
//  └── Start from the end, move toward start
    
    if (i + nums[i] >= goal) {
    //  ^^^^^^^^^^     ^^^^^
    //  |              └── Current goal position
    //  └── Maximum reach from index i
    //  If we can reach the goal from i, then i becomes the new goal
        
        goal = i; // Pull the goal closer to start
    }
}
return goal == 0;
//  ^^^^     ^
//  |        └── If goal is 0, we can reach the end from the start!
//  └── Check if we made it all the way back
```

---

### 2. Jump Game II (Medium)

**Trigger:** Return the *minimum* number of jumps to reach the last index.

**Step-by-Step Walkthrough:**

**Intuition:** This is a forward greedy search. Maintain a "window" of indices you can reach with your current number of jumps. 
Scan the current window to find the absolute `farthest` index you could possibly reach with one more jump.
Once you reach the end of the current window, you MUST make a jump, and your new window expands to `farthest`. Increment your jump count.

**Visual:**
```
nums = [2, 3, 1, 1, 4]

Window 0 (0 jumps): [0, 0]     → farthest = 0+2 = 2
Window 1 (1 jump):  [1, 2]     → farthest = max(1+3, 2+1) = 4
Window 2 (2 jumps): [3, 4]     → farthest = 4 (reached end!)

Answer: 2 jumps
```

**Dry-Run Table:**

| i | nums[i] | i + nums[i] | currentEnd | farthest | jumps |
|---|---|---|---|---|---|
| 0 | 2 | 2 | 0 | 2 | 0 |
| 1 | 3 | 4 | 2 | 4 | 1 (hit currentEnd) |
| 2 | 1 | 3 | 4 | 4 | — |
| 3 | 1 | 4 | 4 | 4 | 2 (hit currentEnd) |

```cpp
int jump(vector<int>& nums) {
    int jumps = 0;
    int currentEnd = 0;
    int farthest = 0;
    
    for (int i = 0; i < nums.size() - 1; i++) {
        farthest = max(farthest, i + nums[i]);
        
        if (i == currentEnd) {
            jumps++;
            currentEnd = farthest;
            
            if (currentEnd >= nums.size() - 1) break;
        }
    }
    
    return jumps;
}
```

**What's happening:**
```cpp
int jumps = 0, currentEnd = 0, farthest = 0;
//  ^^^^^^      ^^^^^^^^^^^^     ^^^^^^^^^^
//  |           |                └── Farthest index reachable with current jumps
//  |           └── End of current "window" (indices reachable with current jumps)
//  └── Number of jumps taken

for (int i = 0; i < nums.size() - 1; i++) {
    farthest = max(farthest, i + nums[i]);
    //  ^^^^^^^^     ^^^^^^^^  ^^^^^^^^^^
    //  |            |         └── Max reach from current position
    //  |            └── Previous farthest
    //  └── Update: can we reach further?
    
    if (i == currentEnd) {
    //  ^^^   ^^^^^^^^^^^
    //  |     └── We've reached the end of our current window
    //  |         MUST make a jump now
    //  └── Are we at the boundary?
        
        jumps++;
        currentEnd = farthest;
        //  ^^^^^^^^^^^^     ^^^^^^^^
        //  |                └── New window extends to farthest
        //  └── We jumped! New window starts
    }
}
```

---

### 3. Gas Station (Medium)

**Trigger:** Can you complete a circular route around gas stations?

**Step-by-Step Walkthrough:**

**Intuition:** 
1. If the total gas is less than the total cost, it's impossible. Return `-1`.
2. If a solution exists, it is guaranteed to be unique.
Maintain a `currentTank`. If at any station `i`, `currentTank` drops below 0, it means you cannot reach `i` from ANY starting point before it. Therefore, the greedy choice is to assume the *next* station `i + 1` is the starting point, and reset `currentTank` to 0.

**Visual:**
```
gas  = [1, 2, 3, 4, 5]
cost = [3, 4, 5, 1, 2]

diff = gas - cost = [-2, -2, -2, 3, 3]
total = -2 + -2 + -2 + 3 + 3 = 0 ≥ 0 → solution exists!

Start at station 0:
  tank = -2 (< 0) → can't start here, try station 1
Start at station 1:
  tank = -2 (< 0) → can't start here, try station 2
Start at station 2:
  tank = -2 (< 0) → can't start here, try station 3
Start at station 3:
  tank = 3 (≥ 0) → continue
  tank = 3 + 3 = 6 (≥ 0) → continue
  station 4: tank = 6 + (-2) = 4 (≥ 0) → done!

Answer: station 3
```

**Dry-Run Table:**

| i | gas[i] | cost[i] | diff | totalTank | currentTank | currentTank < 0? | start |
|---|---|---|---|---|---|---|---|
| 0 | 1 | 3 | -2 | -2 | -2 | YES | 1 |
| 1 | 2 | 4 | -2 | -4 | -2 | YES | 2 |
| 2 | 3 | 5 | -2 | -6 | -2 | YES | 3 |
| 3 | 4 | 1 | 3 | -3 | 3 | NO | 3 |
| 4 | 5 | 2 | 3 | 0 | 6 | NO | 3 |

```cpp
int canCompleteCircuit(vector<int>& gas, vector<int>& cost) {
    int totalTank = 0;
    int currentTank = 0;
    int start = 0;
    
    for (int i = 0; i < gas.size(); i++) {
        int diff = gas[i] - cost[i];
        totalTank += diff;
        currentTank += diff;
        
        if (currentTank < 0) {
            start = i + 1;  // Try next station
            currentTank = 0;  // Reset tank
        }
    }
    
    return totalTank >= 0 ? start : -1;
}
```

**What's happening:**
```cpp
for (int i = 0; i < gas.size(); i++) {
    int diff = gas[i] - cost[i];
    //  ^^^^     ^^^^^     ^^^^^^
    //  |        |         └── Cost to travel to next station
    //  |        └── Gas at current station
    //  └── Net gain/loss at this station
    
    totalTank += diff;    // Check if total gas ≥ total cost
    currentTank += diff;  // Check if we can reach from current start
    
    if (currentTank < 0) {
    //  ^^^^^^^^^^^^
    //  └── If tank goes negative, we can't reach the next station
    //      from ANY starting point in [start, i]
        
        start = i + 1;   // Greedy: start from the next station
        currentTank = 0;  // Reset: fresh start
    }
}
return totalTank >= 0 ? start : -1;
//  ^^^^^^^^^^^^         ^^^^^
//  |                    └── If total gas ≥ total cost, start is valid
//  └── Global check: is there enough gas overall?
```

---

### 4. Non-overlapping Intervals (Medium)

**Trigger:** Find the *minimum number of intervals you need to remove* to make the rest non-overlapping.

**Step-by-Step Walkthrough:**

**Intuition:** This is exactly the Interval Scheduling pattern in disguise!
Find the *maximum* number of non-overlapping intervals (by sorting by end time). 
The minimum to remove is simply `total_intervals - maximum_non_overlapping`.

**Visual:**
```
intervals = [[1,2], [2,3], [1,3], [3,4]]

Sorted by end: [[1,2], [2,3], [1,3], [3,4]]

Greedy selection:
- Pick [1,2] → end=2, count=1
- [2,3] starts at 2 ≥ 2 → pick, end=3, count=2
- [1,3] starts at 1 < 3 → overlap, skip
- [3,4] starts at 3 ≥ 3 → pick, end=4, count=3

Maximum non-overlapping = 3
Minimum to remove = 4 - 3 = 1
```

**Dry-Run Table:**

| i | intervals[i] | start >= currentEnd? | count | currentEnd |
|---|---|---|---|---|
| 0 | [1,2] | — (pick first) | 1 | 2 |
| 1 | [2,3] | 2 >= 2? YES | 2 | 3 |
| 2 | [1,3] | 1 >= 3? NO | 2 | 3 |
| 3 | [3,4] | 3 >= 3? YES | 3 | 4 |

```cpp
int eraseOverlapIntervals(vector<vector<int>>& intervals) {
    if (intervals.empty()) return 0;
    
    sort(intervals.begin(), intervals.end(), 
         [](const auto& a, const auto& b) { return a[1] < b[1]; });
    
    int count = 1;
    int currentEnd = intervals[0][1];
    
    for (int i = 1; i < intervals.size(); i++) {
        if (intervals[i][0] >= currentEnd) {
            count++;
            currentEnd = intervals[i][1];
        }
    }
    
    return intervals.size() - count;
}
```

---

### 5. Minimum Number of Arrows to Burst Balloons (Medium)

**Trigger:** Burst overlapping balloons with minimum arrows.

**Step-by-Step Walkthrough:**

**Intuition:** Another Interval Scheduling disguise!
Sort the balloons by their **end coordinate**. Shoot an arrow at the very end of the first balloon (this greedy choice maximizes the chance of bursting subsequent balloons). 
As you iterate, if the next balloon starts *before or exactly at* your arrow position, it pops! If it starts *after* your arrow position, you must shoot a new arrow at its end coordinate.

**Visual:**
```
balloons = [[10,16], [2,8], [1,6], [7,12]]

Sorted by end: [[1,6], [2,8], [7,12], [10,16]]

Arrow 1: Shoot at x=6 (end of [1,6])
  [2,8] starts at 2 ≤ 6 → burst!
  [7,12] starts at 7 > 6 → not burst

Arrow 2: Shoot at x=12 (end of [7,12])
  [10,16] starts at 10 ≤ 12 → burst!

Answer: 2 arrows
```

**Dry-Run Table:**

| i | balloon | start > currentEnd? | arrows | currentEnd |
|---|---|---|---|---|
| 0 | [1,6] | — (pick first) | 1 | 6 |
| 1 | [2,8] | 2 > 6? NO | 1 | 6 |
| 2 | [7,12] | 7 > 6? YES | 2 | 12 |
| 3 | [10,16] | 10 > 12? NO | 2 | 12 |

```cpp
int findMinArrowShots(vector<vector<int>>& points) {
    if (points.empty()) return 0;
    
    sort(points.begin(), points.end(), 
         [](const auto& a, const auto& b) { return a[1] < b[1]; });
    
    int arrows = 1;
    int currentEnd = points[0][1];
    
    for (int i = 1; i < points.size(); i++) {
        if (points[i][0] > currentEnd) {
            arrows++;
            currentEnd = points[i][1];
        }
    }
    
    return arrows;
}
```

---

### 6. Partition Labels (Medium)

**Trigger:** Partition a string into as many parts as possible so that each letter appears in at most one part.

**Step-by-Step Walkthrough:**

**Intuition:** First, use a Hash Map to record the **last index** of every character in the string.
Iterate through the string. Maintain a `size` and an `end` boundary. 
As you see a character, update `end = max(end, last_index_of_character)`. 
If your current index `i` equals `end`, it means all characters seen so far do not appear anywhere past `i`. You can safely close the partition, record the `size`, and start a new one!

**Visual:**
```
s = "ababcbacadefegdehijhklij"

Last indices: a=8, b=5, c=7, d=14, e=15, f=11, g=13, h=19, i=22, j=23, k=20, l=21

Partition 1: "ababcbaca" (indices 0-8)
  All chars a,b,c have last index ≤ 8 → partition here!

Partition 2: "defegde" (indices 9-15)
  All chars d,e,f,g have last index ≤ 15 → partition here!

Partition 3: "hijhklij" (indices 16-23)
  All chars h,i,j,k,l have last index ≤ 23 → partition here!

Result: [9, 7, 8]
```

**Dry-Run Table (key steps):**

| i | char | last[char] | end | i == end? | Action |
|---|---|---|---|---|---|
| 0 | a | 8 | 8 | NO | — |
| 1 | b | 5 | 8 | NO | — |
| 2 | a | 8 | 8 | NO | — |
| 7 | a | 8 | 8 | NO | — |
| 8 | d | 14 | 14 | NO | — |
| ... | ... | ... | ... | ... | — |
| 14 | e | 15 | 15 | NO | — |
| 15 | d | 14 | 15 | YES | partition! size=7 |

```cpp
vector<int> partitionLabels(string s) {
    unordered_map<char, int> last;
    for (int i = 0; i < s.length(); i++) {
        last[s[i]] = i;
    }
    
    vector<int> result;
    int start = 0, end = 0;
    
    for (int i = 0; i < s.length(); i++) {
        end = max(end, last[s[i]]);
        
        if (i == end) {
            result.push_back(end - start + 1);
            start = i + 1;
        }
    }
    
    return result;
}
```

**What's happening:**
```cpp
unordered_map<char, int> last;
for (int i = 0; i < s.length(); i++) {
    last[s[i]] = i;  // Record last occurrence of each character
}

int start = 0, end = 0;
//  ^^^^^     ^^^^
//  |         └── Current partition boundary (must include all seen chars)
//  └── Start of current partition

for (int i = 0; i < s.length(); i++) {
    end = max(end, last[s[i]]);
    //  ^^^     ^^^  ^^^^^^^^^^
    //  |        |    └── Last index of current character
    //  |        └── Current partition end
    //  └── Extend partition if current char appears later
    
    if (i == end) {
    //  ^^^   ^^^
    //  |     └── We've reached the partition boundary
    //  |         All chars in [start, end] don't appear after end
    //  └── Time to close this partition
        
        result.push_back(end - start + 1);
        //  ^^^^^^^^^^^   ^^^^^^^^^^^^
        //  |             └── Size of this partition
        //  └── Record the partition size
        
        start = i + 1;
        //  ^^^^     ^^^
        //  |        └── Next partition starts after current
        //  └── Move to next partition
    }
}
```

---

### 7. Hand of Straights (Medium)

**Trigger:** Can an array be rearranged into groups of size `groupSize`, where each group consists of consecutive cards?

**Step-by-Step Walkthrough:**

**Intuition:** 
1. If `size % groupSize != 0`, return false.
2. Use a `map` (which keeps keys sorted!) to count the frequencies of all cards.
3. Iterate through the map. If you find a card with count > 0 (let's say it's `X` and count is `C`), you MUST form `C` groups starting with `X`.
4. Therefore, you must decrement the count of `X`, `X+1`, `X+2`... up to `X + groupSize - 1` by exactly `C`. If any of those cards don't have enough count to support this, return false!

**Visual:**
```
hand = [1, 2, 3, 6, 2, 3, 4, 7, 8], groupSize = 3

Map: {1:1, 2:2, 3:2, 4:1, 6:1, 7:1, 8:1}

Form groups starting from smallest:
- Start with 1 (count=1): form group [1,2,3]
  Decrement: 1→0, 2→1, 3→1
- Start with 2 (count=1): form group [2,3,4]
  Decrement: 2→0, 3→0, 4→0
- Start with 6 (count=1): form group [6,7,8]
  Decrement: 6→0, 7→0, 8→0

All counts zero → true!
```

**Dry-Run Table:**

| Iteration | start | Group Formed | Map After |
|---|---|---|---|
| 1 | 1 | [1,2,3] | {2:1, 3:1, 4:1, 6:1, 7:1, 8:1} |
| 2 | 2 | [2,3,4] | {3:0→erased, 4:0→erased, 6:1, 7:1, 8:1} |
| 3 | 6 | [6,7,8] | {} (empty) |

```cpp
bool isNStraightHand(vector<int>& hand, int groupSize) {
    if (hand.size() % groupSize != 0) return false;
    
    map<int, int> count;  // map keeps keys sorted!
    for (int card : hand) count[card]++;
    
    while (!count.empty()) {
        int start = count.begin()->first;  // Smallest card
        
        for (int i = 0; i < groupSize; i++) {
            int card = start + i;
            if (count[card] == 0) return false;
            
            count[card]--;
            if (count[card] == 0) count.erase(card);
        }
    }
    
    return true;
}
```

**What's happening:**
```cpp
map<int, int> count;
//  ^^^  ^^^^  ^^^^^
//  |    |     └── Frequency of each card
//  |    └── Card value (sorted by map!)
//  └── Sorted map: always process smallest card first

while (!count.empty()) {
    int start = count.begin()->first;
    //  ^^^^^     ^^^^^^^^^^^
    //  |          └── First (smallest) key in the map
    //  └── We must start a group from the smallest remaining card
    
    for (int i = 0; i < groupSize; i++) {
        int card = start + i;
        //  ^^^^     ^^^^^  ^
        //  |        |      └── Consecutive cards: start, start+1, start+2...
        //  |        └── Base card
        //  └── We need cards: start, start+1, ..., start+groupSize-1
        
        if (count[card] == 0) return false;
        //  ^^^^^^^^^
        //  └── If any required card is missing → can't form group
        
        count[card]--;
        if (count[card] == 0) count.erase(card);
        // Remove from map if count reaches 0
    }
}
```

---

## Quick Reference

| Problem | Greedy Heuristic | Sort By | Time | Space |
|---|---|---|---|---|
| Jump Game | Backward goal | None | O(N) | O(1) |
| Jump Game II | Forward window | None | O(N) | O(1) |
| Gas Station | Tank reset | None | O(N) | O(1) |
| Non-overlapping Intervals | Max non-overlapping | End time | O(N log N) | O(1) |
| Min Arrows | Burst at end | End time | O(N log N) | O(1) |
| Partition Labels | Close when all seen | None (precompute last) | O(N) | O(1) |
| Hand of Straights | Form from smallest | Map (sorted) | O(N log N) | O(N) |

### Key Greedy Triggers in Problem Statements

| Trigger Phrase | Pattern | Action |
|---|---|---|
| "Maximum number of non-overlapping" | Interval scheduling | Sort by end time |
| "Minimum removals to make non-overlapping" | Interval scheduling | total - max non-overlapping |
| "Can you reach the end?" | Jump/reach | Greedy or DP |
| "Minimum jumps to reach end" | Jump with counting | Forward window |
| "Partition into groups" | Consecutive grouping | Sorted map, form groups |
| "Circular route" | Tank tracking | Reset on negative |

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Interview Problems Walkthrough**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **interview problems greedy** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.


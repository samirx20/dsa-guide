# Part 4, Topic 1: Binary Search Patterns
## Interview Problems Walkthrough

Master these specific problems, as they represent the core variations of Binary Search.

---

### Problem Classification Table

| Problem | Difficulty | Pattern | Key Insight |
|---------|-----------|---------|-------------|
| Search Insert Position | Easy | Classic BS | Return `left` when not found |
| Find First and Last Position | Medium | Boundary BS | Don't stop at first match, keep searching |
| Find Minimum in Rotated Array | Medium | Rotated BS | Compare with `nums[right]` |
| Search in Rotated Array | Medium | Modified Classic | Check which half is sorted |
| Koko Eating Bananas | Medium | Answer Space | Monotonic feasibility check |
| Capacity to Ship Packages | Medium | Answer Space | Minimize max capacity |
| Split Array Largest Sum | Hard | Answer Space | Minimize largest subarray sum |
| Aggressive Cows | Medium | Answer Space | Maximize minimum distance |
| Search 2D Matrix | Medium | 2D Flatten BS | `row = mid/cols, col = mid%cols` |
| Find Peak Element | Medium | Modified BS | `nums[mid] > nums[mid+1]` → go left |

---

### Solution Approach Comparison

| Approach | When to Use | Time | Space |
|----------|------------|------|-------|
| Classic Binary Search | Sorted array, find target | $O(\log N)$ | $O(1)$ |
| Boundary Binary Search | Find first/last occurrence | $O(\log N)$ | $O(1)$ |
| Rotated Array Search | Sorted but rotated | $O(\log N)$ | $O(\log N)$ |
| 2D Matrix Search | Sorted rows + columns | $O(\log(MN))$ | $O(1)$ |
| Answer Space Search | "Min max" / "Max min" problems | $O(N \log M)$ | $O(1)$ |

---

### 1. Search Insert Position (Easy)

**Trigger:** Find target, or return the index where it *would* be if inserted in order.
**Pattern:** Classic Binary Search
**Key Insight:** When the `while(left <= right)` loop finishes without finding the target, `left` always points to the correct insertion index.

```cpp
int searchInsert(vector<int>& nums, int target) {
    int left = 0, right = nums.size() - 1;
    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (nums[mid] == target) return mid;
        else if (nums[mid] < target) left = mid + 1;
        else right = mid - 1;
    }
    return left; // The insertion point!
}
// Time: O(log N), Space: O(1)
```

**What's happening:**
```cpp
// When the loop exits:
// - left > right
// - left points to the first element > target
// - right points to the last element < target
// - Therefore, left = correct insertion index
//
// Example: nums=[1,3,5,7], target=6
// Loop ends: left=3, right=2
// Insert at index 3 (between 5 and 7) ✓
```

**Dry-Run: Insert 6 into [1, 3, 5, 7]**

| Iteration | left | right | mid | nums[mid] | Action |
|-----------|------|-------|-----|-----------|--------|
| 1 | 0 | 3 | 1 | 3 | 3 < 6 → `left = 2` |
| 2 | 2 | 3 | 2 | 5 | 5 < 6 → `left = 3` |
| 3 | 3 | 3 | 3 | 7 | 7 > 6 → `right = 2` |
| — | 3 | 2 | — | — | **left > right → return left = 3** |

```
[1, 3, 5, 7]
        ↑
     insert here (index 3)
```

---

### 2. Find First and Last Position of Element (Medium)

**Trigger:** Array has duplicates. Find the start and end indices of a target.
**Pattern:** Boundary Binary Search
**Key Insight:** Do NOT find the target and then do a linear scan (`while(nums[i]==target)`) to find the edges. In the worst case (array is all `5`s), that becomes $O(N)$. Instead, do two Binary Searches: one biased left, one biased right.

```cpp
int binarySearchEdges(vector<int>& nums, int target, bool searchLeft) {
    int left = 0, right = nums.size() - 1;
    int bound = -1;
    
    while (left <= right) {
        int mid = left + (right - left) / 2;
        
        if (nums[mid] > target) {
            right = mid - 1;
        } else if (nums[mid] < target) {
            left = mid + 1;
        } else {
            // We found the target! Record the index.
            bound = mid;
            // Force the search to keep going to find the absolute edge
            if (searchLeft) right = mid - 1;  // Bias LEFT: keep searching left
            else left = mid + 1;               // Bias RIGHT: keep searching right
        }
    }
    return bound;
}

vector<int> searchRange(vector<int>& nums, int target) {
    int leftIdx = binarySearchEdges(nums, target, true);   // Find FIRST
    int rightIdx = binarySearchEdges(nums, target, false);  // Find LAST
    return {leftIdx, rightIdx};
}
// Time: O(log N), Space: O(1)
```

**What's happening:**
```cpp
// When nums[mid] == target, instead of returning immediately:
// - Record mid as a potential answer (bound = mid)
// - Then CONTINUE searching:
//   - If searchLeft: go LEFT (right = mid - 1) to find earlier occurrences
//   - If searchRight: go RIGHT (left = mid + 1) to find later occurrences
//
// The loop continues until left > right
// The LAST recorded 'bound' is the answer
```

**Dry-Run: Find range of 5 in [2, 5, 5, 5, 5, 9]**

| Iteration | left | right | mid | nums[mid] | Action |
|-----------|------|-------|-----|-----------|--------|
| **Left search** | | | | | |
| 1 | 0 | 5 | 2 | 5 | Found! `bound=2, right=1` |
| 2 | 0 | 1 | 0 | 2 | 2 < 5 → `left=1` |
| 3 | 1 | 1 | 1 | 5 | Found! `bound=1, right=0` |
| — | 1 | 0 | — | — | **return bound = 1** (first 5) |
| **Right search** | | | | | |
| 1 | 0 | 5 | 2 | 5 | Found! `bound=2, left=3` |
| 2 | 3 | 5 | 4 | 5 | Found! `bound=4, left=5` |
| 3 | 5 | 5 | 5 | 9 | 9 > 5 → `right=4` |
| — | 5 | 4 | — | — | **return bound = 4** (last 5) |

```
[2, 5, 5, 5, 5, 9]
    ↑           ↑
  first=1    last=4
```

---

### 3. Find Minimum in Rotated Sorted Array (Medium)

**Trigger:** Array was rotated. Find the smallest element in $O(\log N)$ time.
**Pattern:** Modified Binary Search
**Key Insight:** The minimum element is the only element *smaller* than its previous element (the "drop-off" point). Compare `nums[mid]` to `nums[right]`.

```cpp
int findMin(vector<int>& nums) {
    int left = 0, right = nums.size() - 1;
    
    while (left < right) {
        int mid = left + (right - left) / 2;
        
        if (nums[mid] > nums[right]) {
            // The minimum MUST be to the right
            left = mid + 1;
        } else {
            // The minimum is mid, or to the left of mid
            // Don't exclude mid — it might BE the minimum!
            right = mid;
        }
    }
    // When left == right, we have found the minimum
    return nums[left]; 
}
// Time: O(log N), Space: O(1)
```

**What's happening:**
```cpp
// Why compare with nums[right] instead of nums[left]?
// nums[right] is more reliable — it's always in the "lower" section.
// nums[left] might be in the rotated part.
//
// Why left < right (not left <= right)?
// When left == right, we've narrowed to exactly ONE element.
// That element IS the minimum. No need to check further.
//
// Why right = mid (not mid - 1)?
// mid COULD be the minimum. Excluding it might skip the answer.
```

**Dry-Run: Find minimum in [4, 5, 6, 7, 0, 1, 2]**

| Iteration | left | right | mid | nums[mid] | nums[right] | Action |
|-----------|------|-------|-----|-----------|-------------|--------|
| 1 | 0 | 6 | 3 | 7 | 2 | 7 > 2 → `left = 4` |
| 2 | 4 | 6 | 5 | 1 | 2 | 1 ≤ 2 → `right = 5` |
| 3 | 4 | 5 | 4 | 0 | 1 | 0 ≤ 1 → `right = 4` |
| — | 4 | 4 | — | — | — | **return nums[4] = 0** |

```
[4, 5, 6, 7, 0, 1, 2]
              ↑
           minimum = 0
```

---

### 4. Search in Rotated Sorted Array (Medium)

**Trigger:** Find a target in a rotated array.
**Pattern:** Modified Classic Binary Search
**Key Insight:** At least one half is always sorted. Check which half is sorted, then check if the target falls within that sorted half's range.

```cpp
int searchRotated(vector<int>& nums, int target) {
    int left = 0, right = nums.size() - 1;
    
    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (nums[mid] == target) return mid;
        
        // Left half is sorted
        if (nums[left] <= nums[mid]) {
            if (target >= nums[left] && target < nums[mid]) {
                right = mid - 1;  // Target is in sorted left half
            } else {
                left = mid + 1;   // Target is in unsorted right half
            }
        } 
        // Right half is sorted
        else {
            if (target > nums[mid] && target <= nums[right]) {
                left = mid + 1;   // Target is in sorted right half
            } else {
                right = mid - 1;  // Target is in unsorted left half
            }
        }
    }
    return -1;
}
// Time: O(log N), Space: O(1)
```

**What's happening:**
```cpp
// Key check: nums[left] <= nums[mid]
// If true: left half [left..mid] is perfectly sorted
// If false: right half [mid..right] is perfectly sorted
//
// Then check: is target within the sorted half's range?
// If yes: search there. If no: search the other half.
```

**Dry-Run: Search for 0 in [4, 5, 6, 7, 0, 1, 2]**

| Iteration | left | right | mid | nums[mid] | Left Sorted? | Target in Range? | Action |
|-----------|------|-------|-----|-----------|-------------|-----------------|--------|
| 1 | 0 | 6 | 3 | 7 | Yes (4≤7) | No (0∉[4,7)) | `left = 4` |
| 2 | 4 | 6 | 5 | 1 | Yes (0≤1) | Yes (0∈[0,1)) | `right = 4` |
| 3 | 4 | 4 | 4 | 0 | — | — | **return 4** |

---

### 5. Koko Eating Bananas (Medium)

**Trigger:** Find the minimum speed/capacity/size to achieve a goal.
**Pattern:** Binary Search on Answer Space
**Key Insight:** The input array is unsorted, but the answer range is bounded and monotonic. If speed k works, speed k+1 also works.

```cpp
bool canFinish(vector<int>& piles, int k, int h) {
    long long hoursNeeded = 0;
    for (int pile : piles) {
        hoursNeeded += (pile + k - 1) / k;  // Ceiling division
    }
    return hoursNeeded <= h;
}

int minEatingSpeed(vector<int>& piles, int h) {
    int left = 1;
    int right = *max_element(piles.begin(), piles.end());
    
    while (left < right) {
        int mid = left + (right - left) / 2;
        if (canFinish(piles, mid, h)) {
            right = mid;      // Works! Try slower
        } else {
            left = mid + 1;   // Too slow! Try faster
        }
    }
    return left;
}
// Time: O(N * log(max(piles))), Space: O(1)
```

**What's happening:**
```cpp
// Answer range: [1, max(piles)]
//   - Minimum speed: 1 banana/hour
//   - Maximum speed: largest pile (eating faster doesn't help)
//
// Feasibility check: For each pile, hours = ceil(pile / speed)
//   Sum all hours. If total ≤ h, speed is feasible.
//
// Binary search for FIRST feasible speed
//   When feasible: right = mid (try slower)
//   When not feasible: left = mid + 1 (try faster)
```

---

### 6. Capacity to Ship Packages Within D Days (Medium)

**Trigger:** Minimize the maximum capacity of a ship.
**Pattern:** Binary Search on Answer Space
**Key Insight:** Larger capacity → fewer days needed. Monotonic.

```cpp
bool canShip(vector<int>& weights, int capacity, int days) {
    int currentLoad = 0;
    int daysNeeded = 1;
    
    for (int w : weights) {
        if (currentLoad + w > capacity) {
            daysNeeded++;
            currentLoad = 0;
        }
        currentLoad += w;
    }
    return daysNeeded <= days;
}

int shipWithinDays(vector<int>& weights, int days) {
    int left = *max_element(weights.begin(), weights.end());
    int right = accumulate(weights.begin(), weights.end(), 0);
    
    while (left < right) {
        int mid = left + (right - left) / 2;
        if (canShip(weights, mid, days)) {
            right = mid;
        } else {
            left = mid + 1;
        }
    }
    return left;
}
// Time: O(N * log(sum)), Space: O(1)
```

**What's happening:**
```cpp
// Answer range: [max(weights), sum(weights)]
//   - Minimum capacity: heaviest single package
//   - Maximum capacity: carry everything in one trip
//
// Feasibility check: Simulate loading
//   Greedily fill ships. Count how many ships (days) needed.
//   If daysNeeded ≤ days, capacity is feasible.
```

---

### 7. Split Array Largest Sum (Hard)

**Trigger:** Split array into m subarrays to minimize the largest sum.
**Pattern:** Binary Search on Answer Space
**Key Insight:** Same feasibility logic as ship packages — "can we split with max sum ≤ mid?"

```cpp
bool canSplit(vector<int>& nums, int m, int maxSum) {
    int subarrays = 1;
    int currentSum = 0;
    
    for (int num : nums) {
        if (currentSum + num > maxSum) {
            subarrays++;
            currentSum = 0;
        }
        currentSum += num;
    }
    return subarrays <= m;
}

int splitArray(vector<int>& nums, int m) {
    int left = *max_element(nums.begin(), nums.end());
    int right = accumulate(nums.begin(), nums.end(), 0);
    
    while (left < right) {
        int mid = left + (right - left) / 2;
        if (canSplit(nums, m, mid)) {
            right = mid;
        } else {
            left = mid + 1;
        }
    }
    return left;
}
// Time: O(N * log(sum)), Space: O(1)
```

---

### 8. Aggressive Cows (Medium)

**Trigger:** Place cows to maximize the minimum distance between any two.
**Pattern:** Binary Search on Answer Space (Maximize pattern)
**Key Insight:** This is the MAXIMIZE variant — when feasible, try LARGER distance.

```cpp
bool canPlace(vector<int>& pos, int m, int minForce) {
    int count = 1;
    int lastPos = pos[0];
    
    for (int i = 1; i < pos.size(); i++) {
        if (pos[i] - lastPos >= minForce) {
            count++;
            lastPos = pos[i];
        }
    }
    return count >= m;
}

int maxDistance(vector<int>& position, int m) {
    sort(position.begin(), position.end());
    
    int left = 1;
    int right = position.back() - position.front();
    
    while (left < right) {
        int mid = left + (right - left + 1) / 2;  // Upper mid!
        if (canPlace(position, m, mid)) {
            left = mid;      // Feasible! Try LARGER distance
        } else {
            right = mid - 1; // Not feasible! Try smaller
        }
    }
    return left;
}
// Time: O(N * log(max_dist)), Space: O(1)
```

**What's happening:**
```cpp
// MAXIMIZE pattern (opposite of Koko):
//   When feasible → go RIGHT (left = mid)
//   When not feasible → go LEFT (right = mid - 1)
//
// Note: mid = left + (right - left + 1) / 2  (UPPER mid)
// Without +1, when left = right - 1:
//   mid = left + 0 = left
//   If feasible: left = mid = left → INFINITE LOOP!
// With +1: mid = right, which makes progress.
```

---

### 9. Find Peak Element (Medium)

**Trigger:** Array where `nums[i] > nums[i-1]` and `nums[i] > nums[i+1]`. Find any peak.
**Pattern:** Modified Binary Search
**Key Insight:** If `nums[mid] > nums[mid+1]`, a peak exists in the left half (including mid). If `nums[mid] < nums[mid+1]`, a peak exists in the right half.

```cpp
int findPeakElement(vector<int>& nums) {
    int left = 0, right = nums.size() - 1;
    
    while (left < right) {
        int mid = left + (right - left) / 2;
        
        if (nums[mid] > nums[mid + 1]) {
            // Peak is in left half (including mid)
            right = mid;
        } else {
            // Peak is in right half
            left = mid + 1;
        }
    }
    return left;
}
// Time: O(log N), Space: O(1)
```

**What's happening:**
```cpp
// We compare nums[mid] with nums[mid+1]:
//   If nums[mid] > nums[mid+1]: going DOWN, peak is to the LEFT
//   If nums[mid] < nums[mid+1]: going UP, peak is to the RIGHT
//
// When left == right, that's a peak.
// Guaranteed because nums[-1] = nums[n] = -∞
```

**Dry-Run: Find peak in [1, 2, 3, 1]**

| Iteration | left | right | mid | nums[mid] vs nums[mid+1] | Action |
|-----------|------|-------|-----|--------------------------|--------|
| 1 | 0 | 3 | 1 | 2 < 3 (going up) | `left = 2` |
| 2 | 2 | 3 | 2 | 3 > 1 (going down) | `right = 2` |
| — | 2 | 2 | — | — | **return 2** (peak = 3) |

```
[1, 2, 3, 1]
      ↑
   peak at index 2
```

---

### 10. Step-by-Step Problem Selection Guide

When you see a binary search problem, ask yourself:

```
1. Is the array sorted?
   ├── YES → Classic Binary Search (Problem 1)
   │         ├── Find exact target → return index
   │         ├── Find insertion point → return left
   │         └── Find first/last occurrence → Boundary BS (Problem 2)
   │
   └── NO, but rotated → Rotated Array BS (Problems 3, 4)
       │
       └── Find minimum → compare with nums[right]
       └── Find target → check which half is sorted

2. Is the array unsorted but answer is bounded?
   └── YES → Binary Search on Answer Space (Problems 5, 6, 7, 8)
       ├── "Minimum maximum" → minimize pattern
       └── "Maximum minimum" → maximize pattern

3. Is the matrix sorted?
   └── YES → 2D Matrix BS (row = mid/cols, col = mid%cols)

4. Is there a "mountain" / "valley" shape?
   └── YES → Peak/Valley BS (Problem 9)
       └── Compare nums[mid] with nums[mid+1]
```

---

### 11. Quick Reference

| Concept | Detail |
|---------|--------|
| **Classic BS** | `while(left <= right)`, return `mid` or `-1` |
| **Insert position** | Return `left` after loop exits |
| **Boundary BS** | When `nums[mid] == target`, don't stop — keep searching |
| **Rotated BS** | One half is always sorted — check which one |
| **Find minimum** | Compare `nums[mid]` with `nums[right]`, use `left < right` |
| **Answer space** | Define range, write feasibility check, binary search |
| **Minimize pattern** | `right = mid` when feasible, track `best` |
| **Maximize pattern** | `left = mid` when feasible, use upper mid |
| **Peak element** | Compare `nums[mid]` with `nums[mid+1]` |
| **Ceiling division** | `(a + b - 1) / b` |
| **Overflow safe mid** | `left + (right - left) / 2` |

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Interview Problems Walkthrough**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **interview problems binary search** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.


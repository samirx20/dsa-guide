# Part 4, Topic 1: Binary Search Patterns
## Chapter 3: Binary Search on Answer Space

This is the most powerful and counter-intuitive application of Binary Search. It separates junior developers from senior developers in technical interviews.

**Trigger:** The problem asks you to find the "minimum maximum", "maximum minimum", or "minimum time/capacity to achieve a goal". The array is **NOT SORTED**, but the **answer space is bounded**.

---

### 1. The Intuition
Imagine a problem: *"Koko loves to eat bananas. Given an array of piles of bananas, and H hours before the guards return, what is the **minimum eating speed** Koko needs to eat all the bananas within H hours?"*

The input array `piles = [3, 6, 7, 11]` is **not sorted**. You cannot Binary Search the array.

But think about the *Answer Space* (Koko's eating speed `k`):
- Could she eat them at `k = 1` banana/hour? No, it would take too long.
- Could she eat them at `k = 1000000` bananas/hour? Yes, she'd finish instantly.
- What about `k = 4`? Yes, she finishes in 8 hours.

Notice a pattern in the feasibility of speeds:
```
Speed:     [1, 2, 3, 4, 5, 6, 7, 8, ... 1000000]
Feasible?: [F, F, F, T, T, T, T, T, ... T]
                    ↑
                    First True = Answer
```

Because the validity of the answer is monotonic (once a speed is valid, every faster speed is also valid), **the Answer Space is sorted: `False, False, True, True`**. 
We can Binary Search the Answer Space to find the FIRST `True`!

---

### 2. The Monotonicity Principle

The core requirement for Binary Search on Answer Space is **monotonicity**:

```
If speed k works, then speed k+1 also works.
If speed k doesn't work, then speed k-1 also doesn't work.

Feasibility: F F F F T T T T T T T T
                      ↑
              First True = Optimal Answer

This is the SAME pattern as Binary Search on a sorted array!
The "array" is just the answer space [1, 2, 3, ... max], 
and the "values" are True/False feasibility.
```

**When is monotonicity guaranteed?**
- "Minimum speed to finish" → faster speed always finishes sooner ✓
- "Maximum capacity to ship within D days" → larger capacity always needs fewer days ✓
- "Minimum distance between max M gas stations" → larger distance always needs fewer stations ✓

---

### 3. The Strategy (The 3 Steps)

To solve these problems, you always write two functions:
1. **Define the answer range** `[left, right]` — the lowest and highest possible answers
2. **Write a feasibility check** `canAchieve(mid)` — a helper that takes a guessed answer and checks if it works in $O(N)$ time
3. **Binary search for the optimal answer** — when the guess works, record it and try smaller; when it doesn't, try larger

---

### 4. The Implementation (Koko Eating Bananas)

```cpp
// 1. The Feasibility Check
// If Koko eats at speed 'k', can she finish all piles within 'h' hours?
bool canFinish(vector<int>& piles, int k, int h) {
    long long hoursNeeded = 0; // Use long long to prevent overflow
    for (int pile : piles) {
        // Math trick to do ceiling division: ceil(pile / k)
        hoursNeeded += (pile + k - 1) / k; 
    }
    return hoursNeeded <= h;
}

// 2. The Binary Search on the Answer Space
int minEatingSpeed(vector<int>& piles, int h) {
    // The absolute minimum speed is 1 banana per hour
    int left = 1; 
    
    // The absolute maximum speed needed is the largest pile 
    // (eating faster than the largest pile doesn't save any time)
    int right = *max_element(piles.begin(), piles.end()); 
    
    int bestSpeed = right;
    
    while (left <= right) {
        int mid = left + (right - left) / 2; // Our 'guess' for the speed
        
        if (canFinish(piles, mid, h)) {
            // If mid works, it's a valid answer. Record it!
            bestSpeed = mid;
            
            // But can we do BETTER? Can we eat SLOWER?
            // Search the lower half of the answer space.
            right = mid - 1; 
        } else {
            // If mid doesn't work, Koko is eating too slow.
            // We MUST search the higher half of the answer space.
            left = mid + 1;
        }
    }
    
    return bestSpeed;
}
```

**What's happening:**
```cpp
// Step 1: Define answer range
// left = 1 (minimum possible speed)
// right = max(piles) (maximum speed needed)
//
// Step 2: Feasibility check
// For each pile, calculate hours needed = ceil(pile / k)
// Sum all hours. If total <= h, speed k is feasible.
//
// Step 3: Binary search
// When mid IS feasible → record it, try smaller (right = mid - 1)
// When mid is NOT feasible → try larger (left = mid + 1)
// When loop ends, bestSpeed holds the minimum feasible speed.
```

---

### 5. Dry-Run: Koko Eating Bananas

`piles = [3, 6, 7, 11]`, `h = 8`

**Answer space:** left=1, right=11

| Iteration | left | right | mid | canFinish(mid)? | Action |
|-----------|------|-------|-----|-----------------|--------|
| 1 | 1 | 11 | 6 | hours = ceil(3/6)+ceil(6/6)+ceil(7/6)+ceil(11/6) = 1+1+2+2=6 ≤ 8 → **Yes** | `bestSpeed=6, right=5` |
| 2 | 1 | 5 | 3 | hours = 1+2+3+4=10 > 8 → **No** | `left=4` |
| 3 | 4 | 5 | 4 | hours = 1+2+2+3=8 ≤ 8 → **Yes** | `bestSpeed=4, right=3` |
| — | 4 | 3 | — | — | **left > right → done** |

**Answer: bestSpeed = 4**

**Feasibility Visualization:**
```
Speed:   1    2    3    4    5    6    7    8    9   10   11
Hours:  27   15   10    8    8    6    5    5    5    5    4
Valid?:  F    F    F    T    T    T    T    T    T    T    T
                         ↑
                    First True = 4
```

---

### 6. Ceiling Division Explained

The formula `(pile + k - 1) / k` computes ceiling division without using floating point.

```cpp
// Normal integer division truncates (rounds down):
// 7 / 3 = 2  (but we need 3 hours!)

// Ceiling division: ceil(7/3) = 3
// Formula: (7 + 3 - 1) / 3 = 9 / 3 = 3 ✓

// Another example: ceil(11/4) = 3
// (11 + 4 - 1) / 4 = 14 / 4 = 3 ✓

// Why it works:
// (pile + k - 1) / k = ceil(pile / k)
// Adding k-1 before dividing ensures we round up
```

**What's happening:**
```cpp
// ceil(pile / k) means: how many batches of size k to cover pile?
// If pile = 7, k = 3:
//   Batch 1: 3 bananas (4 remaining)
//   Batch 2: 3 bananas (1 remaining)
//   Batch 3: 1 banana  (0 remaining)
//   Total: 3 batches = 3 hours
//
// Integer division: 7/3 = 2 (rounds down, WRONG)
// Ceiling formula: (7+3-1)/3 = 9/3 = 3 (CORRECT)
```

---

### 7. Alternative: Using `left < right` Loop

Some problems use `left < right` instead of `left <= right`. The difference is subtle but important:

```cpp
// Version with left < right (finds answer directly)
int minEatingSpeed(vector<int>& piles, int h) {
    int left = 1;
    int right = *max_element(piles.begin(), piles.end());
    
    while (left < right) {
        int mid = left + (right - left) / 2;
        
        if (canFinish(piles, mid, h)) {
            right = mid;      // mid might BE the answer, don't exclude it
        } else {
            left = mid + 1;   // mid definitely doesn't work
        }
    }
    
    return left;  // When left == right, that's the answer
}
```

**Key difference:**
| | `left <= right` | `left < right` |
|--|----------------|----------------|
| Loop ends when | `left > right` | `left == right` |
| Answer is | `bestSpeed` (tracked separately) | `left` (or `right`) |
| When feasibility = true | `right = mid - 1` | `right = mid` |
| More natural for | Finding ANY valid answer | Finding FIRST valid answer |

---

### 8. More Answer-Space Problems

**Problem: Capacity to Ship Packages Within D Days**
```
Given weights = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] and D = 5
Find the minimum capacity of a ship to ship all packages in D days.

Answer space: [max(weights), sum(weights)] = [10, 55]
Feasibility:  Can we ship all packages with capacity mid in ≤ D days?
```

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
```

**What's happening:**
```cpp
// Answer range:
//   left = max(weights) → ship must hold at least the heaviest package
//   right = sum(weights) → worst case: one ship carries everything
//
// Feasibility check:
//   Simulate loading packages onto ships with given capacity
//   Count how many ships (days) are needed
//   If daysNeeded ≤ D, capacity is feasible
```

---

**Problem: Split Array Largest Sum**
```
Given nums = [7, 2, 5, 10, 8] and m = 2
Split into m subarrays to minimize the largest subarray sum.

Answer space: [max(nums), sum(nums)] = [10, 32]
Feasibility:  Can we split into ≤ m subarrays with max sum ≤ mid?
```

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
```

---

**Problem: Magnetic Force Between Two Balls**
```
Given position = [1, 2, 4, 8, 16] and m = 3
Place m balls to maximize the minimum magnetic force.

Answer space: [1, max(position) - min(position)] = [1, 15]
Feasibility:  Can we place m balls with minimum force ≥ mid?
```

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
        int mid = left + (right - left + 1) / 2;  // Note: +1 for upper mid
        if (canPlace(position, m, mid)) {
            left = mid;    // Try to maximize force
        } else {
            right = mid - 1;
        }
    }
    return left;
}
```

**What's happening:**
```cpp
// This problem maximizes instead of minimizes!
// So when feasible → go RIGHT (try larger force)
// When not feasible → go LEFT (try smaller force)
//
// Note the mid calculation: (left + right + 1) / 2
// This is "upper mid" to avoid infinite loop when left = right - 1
```

---

### 9. Pattern Summary: Minimize Maximum vs Maximize Minimum

| Pattern | Feasibility = True | Feasibility = False | Search Direction |
|---------|-------------------|--------------------|--------------------|
| **Minimize** the maximum | `right = mid - 1` | `left = mid + 1` | Find first True from left |
| **Maximize** the minimum | `left = mid` | `right = mid - 1` | Find last True from left |

---

### 10. Common Answer-Space Problems

| Problem | Answer Range | Feasibility Check |
|---------|-------------|-------------------|
| Koko Eating Bananas | [1, max(piles)] | Hours needed ≤ H? |
| Ship Packages | [max(weights), sum(weights)] | Days needed ≤ D? |
| Split Array Largest Sum | [max(nums), sum(nums)] | Subarrays ≤ m? |
| Magnetic Force Balls | [1, max_pos - min_pos] | Can place m balls? |
| Minimize Max Distance to Gas Station | [0, max_distance] | Stations ≤ k? |
| Aggressive Cows | [1, max_pos - min_pos] | Can place cows? |
| Woodcutting | [1, max_length] | Total pieces ≥ k? |

---

### 11. Time Complexity Analysis

For all answer-space problems:
- **Binary search iterations:** $O(\log M)$ where $M$ = size of answer space
- **Feasibility check:** $O(N)$ where $N$ = size of input array
- **Total:** $O(N \log M)$
- **Space:** $O(1)$

Example: Koko Eating Bananas with `piles` of size 10,000 and answer space up to 1,000,000,000:
- Binary search iterations: $\log_2(1,000,000,000) \approx 30$
- Each iteration scans all 10,000 piles
- Total: $10,000 \times 30 = 300,000$ operations (very fast!)

---

### 12. Quick Reference

| Concept | Detail |
|---------|--------|
| **Trigger** | "Minimum maximum", "Maximum minimum", "Minimum time/capacity" |
| **Key requirement** | Monotonic feasibility (if k works, k+1 works) |
| **Answer range** | Usually `[min_possible, max_possible]` |
| **Feasibility function** | O(N) check if a given answer works |
| **Time** | $O(N \log M)$ where N = array size, M = answer range |
| **Space** | $O(1)$ |
| **Minimize pattern** | When feasible: `right = mid - 1`, track `best` |
| **Maximize pattern** | When feasible: `left = mid` |
| **Ceiling division** | `(a + b - 1) / b` |
| **Upper mid** | `left + (right - left + 1) / 2` for maximize problems |

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Chapter 3: Binary Search on Answer Space**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **chapter3 search on answer space** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.


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

## Practice & Self-Check

### Predict the Output / Trace by Hand

**Q1. Koko, new input.** Trace the chapter's `minEatingSpeed` (the `left <= right` version) on `piles = [30, 11, 23, 4, 20]`, `h = 6`. For each iteration give `left`, `right`, `mid`, the hours computed by `canFinish`, and the action. What is returned?

**Q2. Ship packages.** Trace `shipWithinDays` on the chapter's `weights = [1, 2, ..., 10]`, `D = 5`. For each iteration give `mid` and the number of days `canShip` needs. What is returned, and what are the five day-loads at that capacity?

**Q3. Split Array Largest Sum.** Trace `splitArray` on the chapter's `nums = [7, 2, 5, 10, 8]`, `m = 2`. For each iteration give `mid` and the number of subarrays `canSplit` creates. What is returned?

**Q4. Magnetic force (maximize).** Trace `maxDistance` on the chapter's `position = [1, 2, 4, 8, 16]`, `m = 3`. For each iteration give `mid`, the balls `canPlace` places greedily, and the action. What is returned?

**Q5. Why the upper mid?** In Q4's trace there is a moment where `left = 6`, `right = 7`. If `maxDistance` used the ordinary lower mid `left + (right - left) / 2` instead, what would happen from that state?

### Coding Exercises

**E1 (Easy).** *Integer square root.* Return $\lfloor \sqrt{x} \rfloor$ for `0 <= x <= INT_MAX` by searching the answer space (no `sqrt`). Avoid overflow when squaring `mid`.

```cpp
int mySqrt(int x);
```

- `x = 8` → `2`;  `x = 16` → `4`
- `x = 2147395599` → `46339`

**E2 (Easy–Medium).** *Minimum days to make bouquets.* `bloomDay[i]` is the day flower `i` blooms. A bouquet needs `k` **adjacent** bloomed flowers. Return the minimum day on which you can make `m` bouquets, or `-1` if impossible. (Minimize pattern; the feasibility check is a linear scan.)

```cpp
int minDays(vector<int>& bloomDay, int m, int k);
```

- `bloomDay = [1, 10, 3, 10, 2], m = 3, k = 1` → `3`;  with `k = 2` → `-1`
- `bloomDay = [7, 7, 7, 7, 12, 7, 7], m = 2, k = 3` → `12`

**E3 (Medium).** *Cutting ribbons (Woodcutting).* Cut ribbons into pieces of one common integer length `L` (leftovers are discarded). Return the **maximum** `L` that yields at least `k` pieces, or `0` if even `L = 1` is not enough. (Maximize pattern — think about which mid you need.)

```cpp
int maxLength(vector<int>& ribbons, int k);
```

- `ribbons = [9, 7, 5], k = 3` → `5`
- `ribbons = [7, 5, 9], k = 4` → `4`;  `ribbons = [5, 7, 9], k = 22` → `0`

#### Dry-Run: Answers

**Q1.** Returns **23**. Answer space `[1, 30]`.

| Iter | left | right | mid | hours = sum of ceil(pile / mid) | <= 6? | Action |
|------|------|-------|-----|----------------------------------|-------|--------|
| 1 | 1 | 30 | 15 | 2+1+2+1+2 = 8 | no | `left = 16` |
| 2 | 16 | 30 | 23 | 2+1+1+1+1 = 6 | yes | `best = 23, right = 22` |
| 3 | 16 | 22 | 19 | 2+1+2+1+2 = 8 | no | `left = 20` |
| 4 | 20 | 22 | 21 | 2+1+2+1+1 = 7 | no | `left = 22` |
| 5 | 22 | 22 | 22 | 2+1+2+1+1 = 7 | no | `left = 23` |
| — | 23 | 22 | — | — | — | loop ends, return `best = 23` |

With 5 piles and only 6 hours, at most one pile may take 2 hours, and it has to be the 30-pile; every other pile — including 23 — must fit in one hour, so the speed must be at least 23.

**Q2.** Returns **15**. Answer space `[10, 55]`.

| Iter | left | right | mid | days needed | <= 5? | Action |
|------|------|-------|-----|-------------|-------|--------|
| 1 | 10 | 55 | 32 | 2 | yes | `right = 32` |
| 2 | 10 | 32 | 21 | 3 | yes | `right = 21` |
| 3 | 10 | 21 | 15 | 5 | yes | `right = 15` |
| 4 | 10 | 15 | 12 | 6 | no | `left = 13` |
| 5 | 13 | 15 | 14 | 6 | no | `left = 15` |
| — | 15 | 15 | — | — | — | return 15 |

At capacity 15 the greedy loads are `[1,2,3,4,5] = 15`, `[6,7] = 13`, `[8] = 8`, `[9] = 9`, `[10] = 10` → exactly 5 days. At 14, `[1..4] = 10`, `[5,6] = 11`, `[7]`, `[8]`, `[9]`, `[10]` → 6 days.

**Q3.** Returns **18**. Answer space `[10, 32]`.

| Iter | left | right | mid | greedy subarrays | count <= 2? | Action |
|------|------|-------|-----|------------------|-------------|--------|
| 1 | 10 | 32 | 21 | `[7,2,5]` `[10,8]` | 2 yes | `right = 21` |
| 2 | 10 | 21 | 15 | `[7,2,5]` `[10]` `[8]` | 3 no | `left = 16` |
| 3 | 16 | 21 | 18 | `[7,2,5]` `[10,8]` | 2 yes | `right = 18` |
| 4 | 16 | 18 | 17 | `[7,2,5]` `[10]` `[8]` | 3 no | `left = 18` |
| — | 18 | 18 | — | — | — | return 18 |

**Q4.** Returns **7**. Answer space `[1, 15]`, upper mid.

| Iter | left | right | mid | balls placed (greedy) | count >= 3? | Action |
|------|------|-------|-----|-----------------------|-------------|--------|
| 1 | 1 | 15 | 8 | 1, 16 | 2 no | `right = 7` |
| 2 | 1 | 7 | 4 | 1, 8, 16 | 3 yes | `left = 4` |
| 3 | 4 | 7 | 6 | 1, 8, 16 | 3 yes | `left = 6` |
| 4 | 6 | 7 | 7 | 1, 8, 16 | 3 yes | `left = 7` |
| — | 7 | 7 | — | — | — | return 7 |

Placement 1, 8, 16 has gaps 7 and 8, so the minimum force is 7.

**Q5.** An **infinite loop**. Lower mid gives `mid = 6 + (7 - 6) / 2 = 6`; `canPlace(6)` is true, so `left = mid = 6` — the state `left = 6, right = 7` never changes. Upper mid gives `mid = 7`, which always moves `left` or `right`.

**E1 — reference solution**

```cpp
int mySqrt(int x) {
    long long left = 0, right = x, ans = 0;
    while (left <= right) {
        long long mid = left + (right - left) / 2;
        if (mid * mid <= x) {        // feasible: mid is not too big
            ans = mid;
            left = mid + 1;          // try a larger root
        } else {
            right = mid - 1;
        }
    }
    return (int)ans;
}
```

Time $O(\log x)$, space $O(1)$. "Largest `mid` with $mid^2 \le x$" is a maximize problem; tracking `ans` with `left <= right` avoids the upper-mid subtlety. `long long` matters: for `x = INT_MAX` the first `mid` is about $1.07 \times 10^9$ and its square overflows `int`.

**E2 — reference solution**

```cpp
bool canMake(const vector<int>& bloomDay, int day, int m, int k) {
    int bouquets = 0, run = 0;
    for (int d : bloomDay) {
        if (d <= day) {
            if (++run == k) { bouquets++; run = 0; }
        } else {
            run = 0;                 // adjacency broken
        }
    }
    return bouquets >= m;
}

int minDays(vector<int>& bloomDay, int m, int k) {
    if ((long long)m * k > (long long)bloomDay.size()) return -1;
    int left = *min_element(bloomDay.begin(), bloomDay.end());
    int right = *max_element(bloomDay.begin(), bloomDay.end());
    while (left < right) {
        int mid = left + (right - left) / 2;
        if (canMake(bloomDay, mid, m, k)) right = mid;
        else left = mid + 1;
    }
    return left;
}
```

Time $O(N \log(\max - \min))$, space $O(1)$. Monotonic because waiting longer never un-blooms a flower. Second example: on day 7 the bloomed runs are length 4 and 2 → only 1 bouquet of 3; on day 12 the whole run of 7 gives 2.

**E3 — reference solution**

```cpp
bool canCut(const vector<int>& ribbons, int len, int k) {
    long long pieces = 0;
    for (int r : ribbons) pieces += r / len;
    return pieces >= k;
}

int maxLength(vector<int>& ribbons, int k) {
    int left = 0;                                    // 0 = "impossible"
    int right = *max_element(ribbons.begin(), ribbons.end());
    while (left < right) {
        int mid = left + (right - left + 1) / 2;     // upper mid, mid >= 1
        if (canCut(ribbons, mid, k)) left = mid;     // feasible -> try longer
        else right = mid - 1;
    }
    return left;
}
```

Time $O(N \log(\max))$, space $O(1)$. Starting `left` at 0 encodes "no valid length", and the upper mid keeps `mid >= 1`, so `r / mid` never divides by zero. Example 2: `L = 4` gives `1 + 1 + 2 = 4` pieces; `L = 5` gives `1 + 1 + 1 = 3`.

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


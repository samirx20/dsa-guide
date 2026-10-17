# Part 2, Topic 1: Array Basics & Kadane's Algorithm
## Chapter 3: Kadane's Algorithm

Kadane's Algorithm is one of the most famous algorithms in computer science. It solves a very specific problem in $O(N)$ time and $O(1)$ space: **Finding the Maximum Subarray Sum.**

### 1. The Problem
Given an integer array `nums`, find the contiguous subarray (containing at least one number) which has the largest sum and return its sum.

`nums = [-2, 1, -3, 4, -1, 2, 1, -5, 4]`

A brute-force approach would check every possible subarray ($O(N^2)$). Kadane's algorithm does it in one pass ($O(N)$).

**ASCII Diagram of Subarrays:**
```
Array: [-2, 1, -3, 4, -1, 2, 1, -5, 4]

Possible contiguous subarrays:
[-2] [-2,1] [-2,1,-3] ... [-2,1,-3,4,-1,2,1,-5,4]
[1] [1,-3] [1,-3,4] ...
[-3] [-3,4] [-3,4,-1] ...
[4] [4,-1] [4,-1,2] ...
[-1] [-1,2] [-1,2,1] ...
[2] [2,1] [2,1,-5] ...
[1] [1,-5] [1,-5,4] ...
[-5] [-5,4]
[4]

Maximum subarray: [4, -1, 2, 1] with sum = 6
```

#### Why Not Brute Force?
```
For array of size N, there are N*(N+1)/2 subarrays.

N=9: 9*10/2 = 45 subarrays to check
N=1000: 1000*1001/2 = 500,500 subarrays
N=100,000: ~5 billion subarrays → TLE!

Kadane's: O(N) = 9 operations, 1000 operations, 100,000 operations
```

### 2. The Intuition
Imagine walking through the array and keeping a running tally of the sum. 
When you hit a negative number, your sum drops. That's okay, because the *next* number might be a massive positive number that makes up for it.

**However, if your running sum ever drops below zero, the subarray you are currently building is completely worthless.** 

Think about it: If your current sum is `-5`, and the next number is `10`, attaching the `-5` to the `10` gives you `5`. You are actively hurting the `10`! You would be better off throwing away the `-5` and starting a brand new subarray directly at the `10`.

**ASCII Diagram of the Intuition:**
```
Current subarray sum: -5
Next element: 10

Option A: Extend subarray
[-5] + [10] = 5

Option B: Start fresh at 10
[10] = 10

10 > 5, so Option B is better!
```

#### ASCII Diagram: Greedy Decision
```
At each position, we face a choice:

┌─────────────────────────────────────────┐
│  Current subarray ending at i-1:        │
│  sum = currentSum                       │
│                                         │
│  Option 1: Extend                       │
│  newSum = currentSum + nums[i]          │
│                                         │
│  Option 2: Start fresh                  │
│  newSum = nums[i]                       │
│                                         │
│  Decision: max(Option 1, Option 2)      │
└─────────────────────────────────────────┘
```

### 3. The Core Logic

At every step, you make a greedy choice:
*Do I extend the previous subarray by adding the current element, or do I start a brand new subarray at the current element?*

You choose whichever gives you the larger sum:
`currentSum = max(currentElement, currentSum + currentElement)`

**ASCII Diagram of Decision Process:**
```
At each element, compare:
┌─────────────────────────────────────┐
│  Start fresh: nums[i]               │
│  Extend: currentSum + nums[i]       │
│  Choose: max(start fresh, extend)   │
└─────────────────────────────────────┘
```

#### Why This Works
```
Invariant: currentSum always holds the maximum sum of any subarray ending at position i

Base case: i=0, currentSum = nums[0] (only one subarray ending at 0)

Inductive step:
- If currentSum + nums[i] > nums[i], extending is better
- Otherwise, starting fresh at nums[i] is better
- This ensures currentSum is always the best we can do ending at i

globalMax tracks the best currentSum seen across all i
```

### 4. The Template

This 5-line snippet is Kadane's Algorithm. Memorize it.

```cpp
int maxSubArray(vector<int>& nums) {
    int globalMax = nums[0]; // The best sum we've ever seen
    int currentSum = nums[0]; // The sum of the current subarray we are building
    
    for (int i = 1; i < nums.size(); i++) {
        // GREEDY CHOICE: Start fresh from nums[i], OR extend the current subarray?
        currentSum = max(nums[i], currentSum + nums[i]);
        
        // Update the global maximum if our current streak is the best yet
        globalMax = max(globalMax, currentSum);
    }
    
    return globalMax;
}
```

**What's happening:**
- `globalMax`: tracks the best sum found so far (initialized to first element)
- `currentSum`: tracks the sum of the current subarray being built (initialized to first element)
- Loop starts at index 1 (we already initialized with index 0)
- For each element: choose to start fresh or extend
- Update `globalMax` if `currentSum` is better
- Return `globalMax` at end

**Time Complexity:** O(N) - single pass through array
**Space Complexity:** O(1) - only two variables

### 5. Why it Works (Trace)

`nums = [-2, 1, -3, 4, -1, 2, 1, -5, 4]`

**ASCII Diagram of Algorithm Execution:**
```
Index:    0     1     2     3     4     5     6     7     8
Array:  [-2 ] [ 1 ] [-3 ] [ 4 ] [-1 ] [ 2 ] [ 1 ] [-5 ] [ 4 ]

i=0: globalMax=-2, currentSum=-2
     [-2] ← start

i=1: currentSum = max(1, -2+1) = max(1, -1) = 1
     globalMax = max(-2, 1) = 1
     [1] ← start fresh (dropped -2)

i=2: currentSum = max(-3, 1+(-3)) = max(-3, -2) = -2
     globalMax = max(1, -2) = 1
     [1,-3] ← extended (still better than starting fresh)

i=3: currentSum = max(4, -2+4) = max(4, 2) = 4
     globalMax = max(1, 4) = 4
     [4] ← start fresh (dropped [1,-3])

i=4: currentSum = max(-1, 4+(-1)) = max(-1, 3) = 3
     globalMax = max(4, 3) = 4
     [4,-1] ← extended

i=5: currentSum = max(2, 3+2) = max(2, 5) = 5
     globalMax = max(4, 5) = 5
     [4,-1,2] ← extended

i=6: currentSum = max(1, 5+1) = max(1, 6) = 6
     globalMax = max(5, 6) = 6
     [4,-1,2,1] ← extended (PEAK!)

i=7: currentSum = max(-5, 6+(-5)) = max(-5, 1) = 1
     globalMax = max(6, 1) = 6
     [4,-1,2,1,-5] ← extended

i=8: currentSum = max(4, 1+4) = max(4, 5) = 5
     globalMax = max(6, 5) = 6
     [4,-1,2,1,-5,4] ← extended

Final Answer: 6 (from subarray [4, -1, 2, 1])
```

**Dry-Run Table:**
| i | nums[i] | currentSum (before) | Decision | currentSum (after) | globalMax |
|---|---------|---------------------|----------|--------------------|-----------|
| 0 | -2      | -2                  | Start    | -2                 | -2        |
| 1 | 1       | -2                  | Start fresh | 1              | 1         |
| 2 | -3      | 1                   | Extend   | -2                 | 1         |
| 3 | 4       | -2                  | Start fresh | 4              | 4         |
| 4 | -1      | 4                   | Extend   | 3                  | 4         |
| 5 | 2       | 3                   | Extend   | 5                  | 5         |
| 6 | 1       | 5                   | Extend   | 6                  | 6         |
| 7 | -5      | 6                   | Extend   | 1                  | 6         |
| 8 | 4       | 1                   | Extend   | 5                  | 6         |

### 6. Edge Cases and Variations

**Edge Case 1: All Negative Numbers**
```cpp
vector<int> nums = {-5, -3, -1, -4};
// Expected: -1 (the largest single element)
```

**What's happening:** The algorithm still works because we always compare `nums[i]` vs `currentSum + nums[i]`. When all are negative, the best we can do is the least negative single element.

#### Dry-Run: All Negatives
```
nums = [-5, -3, -1, -4]

i=0: currentSum=-5, globalMax=-5
i=1: currentSum = max(-3, -5+(-3)) = max(-3, -8) = -3
     globalMax = max(-5, -3) = -3
i=2: currentSum = max(-1, -3+(-1)) = max(-1, -4) = -1
     globalMax = max(-3, -1) = -1
i=3: currentSum = max(-4, -1+(-4)) = max(-4, -5) = -4
     globalMax = max(-1, -4) = -1

Final: -1 (correct!)
```

**Edge Case 2: Single Element**
```cpp
vector<int> nums = {42};
// Expected: 42
```

**What's happening:** Loop doesn't execute (starts at i=1), returns initialized `globalMax = 42`.

**Edge Case 3: All Positive Numbers**
```cpp
vector<int> nums = {1, 2, 3, 4};
// Expected: 10 (sum of entire array)
```

**What's happening:** We always extend because extending always gives a larger sum.

#### Dry-Run: All Positives
```
nums = [1, 2, 3, 4]

i=0: currentSum=1, globalMax=1
i=1: currentSum = max(2, 1+2) = 3
     globalMax = max(1, 3) = 3
i=2: currentSum = max(3, 3+3) = 6
     globalMax = max(3, 6) = 6
i=3: currentSum = max(4, 6+4) = 10
     globalMax = max(6, 10) = 10

Final: 10 (entire array sum)
```

**Edge Case 4: Alternating Signs**
```cpp
vector<int> nums = {1, -1, 1, -1, 1};
// Expected: 1 (any single positive element)
```

#### Dry-Run: Alternating Signs
```
nums = [1, -1, 1, -1, 1]

i=0: currentSum=1, globalMax=1
i=1: currentSum = max(-1, 1+(-1)) = max(-1, 0) = 0
     globalMax = max(1, 0) = 1
i=2: currentSum = max(1, 0+1) = 1
     globalMax = max(1, 1) = 1
i=3: currentSum = max(-1, 1+(-1)) = max(-1, 0) = 0
     globalMax = max(1, 0) = 1
i=4: currentSum = max(1, 0+1) = 1
     globalMax = max(1, 1) = 1

Final: 1
```

### 7. Multiple Code Variations

**Variation 1: Return Start and End Indices**
```cpp
vector<int> maxSubArrayWithIndices(vector<int>& nums) {
    int globalMax = nums[0];
    int currentSum = nums[0];
    int start = 0, end = 0, tempStart = 0;
    
    for (int i = 1; i < nums.size(); i++) {
        if (nums[i] > currentSum + nums[i]) {
            currentSum = nums[i];
            tempStart = i;  // Start fresh here
        } else {
            currentSum += nums[i];  // Extend
        }
        
        if (currentSum > globalMax) {
            globalMax = currentSum;
            start = tempStart;
            end = i;
        }
    }
    
    return {globalMax, start, end};
}
```

**What's happening:**
- Track `tempStart` when we start fresh
- Update `start` and `end` when we find new maximum
- Returns [maxSum, startIndex, endIndex]

#### Dry-Run: With Indices
```
nums = [-2, 1, -3, 4, -1, 2, 1, -5, 4]

i=0: globalMax=-2, currentSum=-2, start=0, end=0
i=1: Start fresh at 1, tempStart=1
     globalMax=1, start=1, end=1
i=2: Extend, globalMax=1, start=1, end=1
i=3: Start fresh at 4, tempStart=3
     globalMax=4, start=3, end=3
i=4: Extend, globalMax=4, start=3, end=3
i=5: Extend, globalMax=5, start=3, end=5
i=6: Extend, globalMax=6, start=3, end=6
i=7: Extend, globalMax=6, start=3, end=6
i=8: Extend, globalMax=6, start=3, end=6

Result: maxSum=6, start=3, end=6
Subarray: [4, -1, 2, 1]
```

**Variation 2: Handle Empty Array**
```cpp
int maxSubArray(vector<int>& nums) {
    if (nums.empty()) return 0;  // Or throw exception
    
    int globalMax = nums[0];
    int currentSum = nums[0];
    
    for (int i = 1; i < nums.size(); i++) {
        currentSum = max(nums[i], currentSum + nums[i]);
        globalMax = max(globalMax, currentSum);
    }
    
    return globalMax;
}
```

**What's happening:** Added empty array check at start.

**Variation 3: Maximum Subarray Product**
```cpp
int maxProduct(vector<int>& nums) {
    int globalMax = nums[0];
    int currentMin = nums[0];
    int currentMax = nums[0];
    
    for (int i = 1; i < nums.size(); i++) {
        // Negative number swaps min and max
        if (nums[i] < 0) {
            swap(currentMin, currentMax);
        }
        
        currentMax = max(nums[i], currentMax * nums[i]);
        currentMin = min(nums[i], currentMin * nums[i]);
        
        globalMax = max(globalMax, currentMax);
    }
    
    return globalMax;
}
```

**What's happening:**
- For product, we need both min and max (negative × negative = positive)
- When we see negative, swap min and max
- Track both running min and running max

#### Dry-Run: Max Product
```
nums = [2, 3, -2, 4]

i=0: globalMax=2, currentMin=2, currentMax=2
i=1: currentMax = max(3, 2*3) = 6
     currentMin = min(3, 2*3) = 3
     globalMax = max(2, 6) = 6
i=2: nums[2]=-2 < 0, swap → currentMin=6, currentMax=3
     currentMax = max(-2, 3*(-2)) = max(-2, -6) = -2
     currentMin = min(-2, 6*(-2)) = min(-2, -12) = -12
     globalMax = max(6, -2) = 6
i=3: currentMax = max(4, -2*4) = max(4, -8) = 4
     currentMin = min(4, -12*4) = min(4, -48) = -48
     globalMax = max(6, 4) = 6

Final: 6 (from [2, 3])
```

### 8. Common Mistakes and Error Scenarios

**Mistake 1: Forgetting to Initialize with First Element**
```cpp
// WRONG: Initializing with 0
int globalMax = 0;
int currentSum = 0;

// PROBLEM: Fails for all-negative arrays
// nums = [-5, -3, -1] → returns 0 instead of -1

// CORRECT:
int globalMax = nums[0];
int currentSum = nums[0];
```

**What's happening:** Initializing with 0 doesn't work when all elements are negative.

#### Dry-Run: Wrong Initialization
```
nums = [-5, -3, -1]

WRONG (initialized with 0):
i=0: currentSum = max(-5, 0+(-5)) = -5
     globalMax = max(0, -5) = 0
i=1: currentSum = max(-3, -5+(-3)) = -3
     globalMax = max(0, -3) = 0
i=2: currentSum = max(-1, -3+(-1)) = -1
     globalMax = max(0, -1) = 0

Final: 0 (WRONG! Should be -1)

CORRECT (initialized with first element):
i=0: currentSum=-5, globalMax=-5
i=1: currentSum = max(-3, -5+(-3)) = -3
     globalMax = max(-5, -3) = -3
i=2: currentSum = max(-1, -3+(-1)) = -1
     globalMax = max(-3, -1) = -1

Final: -1 (CORRECT!)
```

**Mistake 2: Starting Loop at Index 0**
```cpp
// WRONG: Starting at i=0
for (int i = 0; i < nums.size(); i++) {
    currentSum = max(nums[i], currentSum + nums[i]);
    globalMax = max(globalMax, currentSum);
}

// PROBLEM: currentSum + nums[0] = nums[0] + nums[0] = 2*nums[0]
// CORRECT:
for (int i = 1; i < nums.size(); i++) {
    currentSum = max(nums[i], currentSum + nums[i]);
    globalMax = max(globalMax, currentSum);
}
```

**What's happening:** If we start at i=0 with `currentSum = nums[0]`, we compare `nums[0]` vs `nums[0] + nums[0]`, which double-counts the first element whenever it is positive (e.g. `[5]` would return 10). However, if we initialize `currentSum = 0`, then starting at i=0 would compare `nums[0]` vs `0 + nums[0]`, always choosing `nums[0]`. It's cleaner to start at i=1.

**Mistake 3: Not Updating globalMax in Loop**
```cpp
// WRONG: Forgetting to update globalMax
for (int i = 1; i < nums.size(); i++) {
    currentSum = max(nums[i], currentSum + nums[i]);
    // Missing: globalMax = max(globalMax, currentSum);
}

// CORRECT:
for (int i = 1; i < nums.size(); i++) {
    currentSum = max(nums[i], currentSum + nums[i]);
    globalMax = max(globalMax, currentSum);
}
```

**What's happening:** Without updating `globalMax`, we lose track of the best sum seen so far.

**Mistake 4: Using `if` Instead of `max`**
```cpp
// WRONG: Using if statement
if (nums[i] > currentSum + nums[i]) {
    currentSum = nums[i];
} else {
    currentSum = currentSum + nums[i];
}

// CORRECT: Using max (cleaner)
currentSum = max(nums[i], currentSum + nums[i]);
```

**What's happening:** Both work, but `max` is cleaner and more idiomatic. The `if` version is more verbose but shows the same logic.

### 9. Comparison Table: Kadane's vs Brute Force

| Aspect | Kadane's Algorithm | Brute Force |
|--------|-------------------|-------------|
| Time Complexity | O(N) | O(N²) |
| Space Complexity | O(1) | O(1) |
| Approach | Greedy, single pass | Check all subarrays |
| Handles Negatives | Yes | Yes |
| Returns Indices | Can be extended | Easy |
| Code Simplicity | Simple | Nested loops |

### 10. Comparison: Kadane's vs Divide and Conquer

| Aspect | Kadane's | Divide and Conquer |
|--------|----------|-------------------|
| Time | O(N) | O(N log N) |
| Space | O(1) | O(log N) stack |
| Approach | Greedy | Split, solve, combine |
| Complexity | Simple | More complex |
| Best For | Linear scan | Parallelizable |

### 11. Real-World Applications

**Application 1: Stock Trading**
- Maximum profit from buying and selling once
- Convert prices to daily gains: `gains[i] = prices[i] - prices[i-1]`
- Apply Kadane's to find maximum profit period

#### ASCII Diagram: Stock Trading
```
Prices:    [7, 1, 5, 3, 6, 4]
Gains:     [_, -4, 4, -2, 3, -2]
                  ↑         ↑
               Buy=1    Sell=6
               Profit = 6-1 = 5

Kadane's on gains: [-4, 4, -2, 3, -2]
Max subarray: [4, -2, 3] = 5
Buy at index 1 (price=1), sell at index 4 (price=6)
```

**Application 2: Image Processing**
- Find brightest contiguous region in a grayscale image
- Apply Kadane's to each row, then combine results

**Application 3: Gene Sequence Analysis**
- Find contiguous sequence with maximum score
- Each gene has a score, find best contiguous segment

### 12. Advanced: Circular Array Variant

```cpp
int maxSubarraySumCircular(vector<int>& nums) {
    // Case 1: Normal Kadane's (max subarray NOT wrapping around)
    int globalMax = nums[0];
    int currentSum = nums[0];
    
    for (int i = 1; i < nums.size(); i++) {
        currentSum = max(nums[i], currentSum + nums[i]);
        globalMax = max(globalMax, currentSum);
    }
    
    // Case 2: Max subarray wraps around
    // This equals total sum - min subarray
    int totalSum = nums[0];
    int globalMin = nums[0];
    currentSum = nums[0];
    
    for (int i = 1; i < nums.size(); i++) {
        currentSum = min(nums[i], currentSum + nums[i]);
        globalMin = min(globalMin, currentSum);
        totalSum += nums[i];
    }
    
    // Edge case: all negative numbers
    if (globalMax < 0) return globalMax;
    
    return max(globalMax, totalSum - globalMin);
}
```

#### What's Happening
```
Circular array means we can "wrap around" from end to start.

Example: [5, -3, 5]
Normal Kadane's: max([5], [5,-3], [5,-3,5], [-3], [-3,5], [5]) = 7
Circular: totalSum - minSubarray = 7 - (-3) = 10
          (entire array minus the minimum middle part)
          
Wait, let me recalculate:
totalSum = 5 + (-3) + 5 = 7
minSubarray = -3
totalSum - minSubarray = 7 - (-3) = 10

But actual max is 5 + 5 = 10 (wrap around) ✓
```

### Summary

**Quick Reference Table:**
| Component | Value/Description |
|-----------|-------------------|
| Time Complexity | O(N) |
| Space Complexity | O(1) |
| Core Logic | `currentSum = max(nums[i], currentSum + nums[i])` |
| Initialization | `globalMax = currentSum = nums[0]` |
| Loop Start | Index 1 (not 0) |
| Handles All Negatives | Yes |
| Returns | Maximum subarray sum |

**Key Takeaways:**
- **Trigger:** "Find the maximum/minimum sum of a contiguous subarray."
- **Logic:** If your running sum becomes a liability (worse than just starting fresh), throw it away and restart.
- **Always initialize with first element** (not 0) to handle all-negative arrays.
- **Start loop at index 1** since we initialize with index 0.
- **Update globalMax every iteration** to track the best sum seen.
- **Variations:** Can return indices, handle products, or adapt for other contiguous subarray problems.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Chapter 3: Kadane's Algorithm**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **chapter3 kadanes algorithm** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.


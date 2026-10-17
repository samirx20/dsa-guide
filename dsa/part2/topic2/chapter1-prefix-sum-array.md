# Part 2, Topic 2: Prefix Sum
## Chapter 1: The Prefix Sum Array

A **Prefix Sum** is one of the most powerful and straightforward optimization techniques in algorithmic interviews.

---

## Approach Comparison

| Approach | Build Time | Query Time | Space | Best For |
|----------|-----------|------------|-------|----------|
| Brute Force | None | O(N) per query | O(1) | Single query |
| Prefix Sum Array | O(N) | O(1) per query | O(N) | Multiple queries |
| Prefix Sum (padded) | O(N) | O(1) per query | O(N+1) | Multiple queries, clean code |
| Segment Tree | O(N) | O(log N) per query | O(N) | Queries + updates |

---

### 1. The Problem it Solves
Imagine you have an array `nums = [2, 4, 1, 5, 3]`.
The interviewer asks you to write a function `getSum(left, right)` that returns the sum of the elements between index `left` and index `right`.

**Brute Force:**
```cpp
int getSum(int left, int right, vector<int>& nums) {
    int sum = 0;
    for (int i = left; i <= right; i++) {
        sum += nums[i];
    }
    return sum;
}
```

#### What's Happening
```
Query: getSum(1, 3) on [2, 4, 1, 5, 3]

i=1: sum += 4  → sum = 4
i=2: sum += 1  → sum = 5
i=3: sum += 5  → sum = 10

Result: 10
Time: O(right - left + 1) = O(N) worst case
```

#### ASCII Diagram: Brute Force Repeated Work
```
Array:    [ 2,  4,  1,  5,  3 ]
Index:      0   1   2   3   4

Query 1: getSum(0, 2) → sum = 2+4+1 = 7
Query 2: getSum(1, 3) → sum = 4+1+5 = 10  (recalculates 4+1!)
Query 3: getSum(0, 3) → sum = 2+4+1+5 = 12 (recalculates 2+4+1!)

Total work: O(3 × N) = O(3N)
With Q queries: O(Q × N)  ← Too slow!
```

If the interviewer calls this function $Q$ times (where $Q$ is 100,000 queries), your total time complexity is $O(Q \times N)$. This will cause a Time Limit Exceeded (TLE) error.

#### Dry-Run Table: Brute Force Queries
| Query | Left | Right | Elements | Sum | Iterations |
|-------|------|-------|----------|-----|------------|
| 1 | 0 | 2 | [2, 4, 1] | 7 | 3 |
| 2 | 1 | 3 | [4, 1, 5] | 10 | 3 |
| 3 | 0 | 3 | [2, 4, 1, 5] | 12 | 4 |
| **Total** | — | — | — | — | **10** |

---

### 2. The Prefix Sum Solution
Instead of recalculating the sum every time, we can **precompute** the running total of the array once.

A Prefix Sum array stores the sum of all elements from index `0` up to index `i`.

#### Code: Basic Prefix Sum
```cpp
vector<int> buildPrefix(vector<int>& nums) {
    vector<int> prefix(nums.size());
    prefix[0] = nums[0];
    
    for (int i = 1; i < nums.size(); i++) {
        prefix[i] = prefix[i - 1] + nums[i];
    }
    return prefix;
}
// Time: O(N), Space: O(N)
```

#### What's Happening
```
nums   = [2,  4,  1,  5,  3]
prefix = [?,  ?,  ?,  ?,  ?]

i=0: prefix[0] = 2
i=1: prefix[1] = prefix[0] + 4 = 6
i=2: prefix[2] = prefix[1] + 1 = 7
i=3: prefix[3] = prefix[2] + 5 = 12
i=4: prefix[4] = prefix[3] + 3 = 15

prefix = [2,  6,  7, 12, 15]
```

#### ASCII Diagram: Building Prefix Array
```
nums:    [ 2,  4,  1,  5,  3 ]
          ↓
prefix:  [ 2]
             ↓
prefix:  [ 2,  6 ]        (2+4)
                ↓
prefix:  [ 2,  6,  7 ]    (6+1)
                   ↓
prefix:  [ 2,  6,  7, 12 ] (7+5)
                      ↓
prefix:  [ 2,  6,  7, 12, 15] (12+3)

prefix[i] = sum of nums[0..i]
```

#### Dry-Run Table
| i | nums[i] | prefix[i-1] | prefix[i] = prefix[i-1] + nums[i] |
|---|---------|-------------|-----------------------------------|
| 0 | 2 | - | 2 |
| 1 | 4 | 2 | 6 |
| 2 | 1 | 6 | 7 |
| 3 | 5 | 7 | 12 |
| 4 | 3 | 12 | 15 |

Notice how `prefix[i] = prefix[i-1] + nums[i]`.

#### Code Variation: Negative Numbers
```cpp
vector<int> buildPrefix(vector<int>& nums) {
    vector<int> prefix(nums.size());
    prefix[0] = nums[0];
    
    for (int i = 1; i < nums.size(); i++) {
        prefix[i] = prefix[i - 1] + nums[i]; // Works with negatives!
    }
    return prefix;
}
// Example: nums = [3, -2, 5, -1]
// prefix = [3, 1, 6, 5]
// getSum(1, 3) = prefix[3] - prefix[0] = 5 - 3 = 2
// Verify: (-2) + 5 + (-1) = 2 ✓
```

#### What's Happening
```
The prefix sum handles negative numbers naturally.
Subtraction removes the unwanted prefix regardless of sign.

nums   = [3, -2,  5, -1]
prefix = [3,  1,  6,  5]

Query: getSum(1, 3)
prefix[3] - prefix[0] = 5 - 3 = 2
Elements: [-2, 5, -1] → -2+5-1 = 2 ✓
```

---

### 3. The Dummy Zero Trick (1-Based Indexing)
While the above code works, it introduces annoying edge cases. What if the interviewer asks for `getSum(0, 3)`? If you try to subtract `prefix[-1]`, your code will crash with an out-of-bounds error.

To avoid writing `if (left == 0)` checks everywhere, we pad the beginning of the prefix array with a `0`.

#### Code: Clean Padded Prefix Sum
```cpp
vector<int> buildPrefixClean(vector<int>& nums) {
    vector<int> prefix(nums.size() + 1, 0);
    
    for (int i = 0; i < nums.size(); i++) {
        prefix[i + 1] = prefix[i] + nums[i];
    }
    return prefix;
}
// Time: O(N), Space: O(N+1)
```

#### What's Happening
```
nums   = [   2,  4,  1,  5,  3]
prefix = [0, ?,  ?,  ?,  ?,  ?]

i=0: prefix[1] = prefix[0] + 2 = 2
i=1: prefix[2] = prefix[1] + 4 = 6
i=2: prefix[3] = prefix[2] + 1 = 7
i=3: prefix[4] = prefix[3] + 5 = 12
i=4: prefix[5] = prefix[4] + 3 = 15

prefix = [0, 2,  6,  7, 12, 15]
          ↑
       dummy zero
```

#### ASCII Diagram: Index Shift
```
Original:  nums[0]  nums[1]  nums[2]  nums[3]  nums[4]
               ↓        ↓        ↓        ↓        ↓
Padded:    prefix[1] prefix[2] prefix[3] prefix[4] prefix[5]
               ↑
          prefix[0] = 0 (dummy)

Mapping: prefix[i+1] = sum of nums[0..i]
```

#### Dry-Run Table (Padded)
| i | nums[i] | prefix[i] | prefix[i+1] = prefix[i] + nums[i] |
|---|---------|-----------|-----------------------------------|
| 0 | 2 | 0 | 2 |
| 1 | 4 | 2 | 6 |
| 2 | 1 | 6 | 7 |
| 3 | 5 | 7 | 12 |
| 4 | 3 | 12 | 15 |

---

### 4. Answering Range Queries in $O(1)$
Once you have the padded prefix array, answering ANY range query is simple math:

**`Sum(left, right) = prefix[right + 1] - prefix[left]`**

#### Code: Range Query Function
```cpp
int getSum(int left, int right, vector<int>& prefix) {
    return prefix[right + 1] - prefix[left];
}
// Time: O(1)
```

#### What's Happening
```
Query: getSum(1, 3) on [2, 4, 1, 5, 3]
prefix = [0, 2, 6, 7, 12, 15]

prefix[right+1] = prefix[4] = 12  (sum of nums[0..3])
prefix[left]    = prefix[1] = 2   (sum of nums[0..0])

Result = 12 - 2 = 10

Elements: [4, 1, 5] → 4+1+5 = 10 ✓
```

*Example:* Find the sum of elements from index `1` to `3` in `[2, 4, 1, 5, 3]`.
- The elements are `[4, 1, 5]`, which sum to `10`.
- Using our padded prefix array: `prefix[3 + 1] - prefix[1] = prefix[4] - prefix[1]`
- `12 - 2 = 10`. It works instantly!

#### ASCII Diagram: Range Sum Visualization
```
nums:    [ 2,  4,  1,  5,  3 ]
          0   1   2   3   4
          ↑           ↑
       left=1     right=3

prefix:  [ 0,  2,  6,  7, 12, 15]
               ↑           ↑
          prefix[1]    prefix[4]
             ↓            ↓
          sum(0..0)   sum(0..3)
          
          sum(1..3) = sum(0..3) - sum(0..0)
                    = 12 - 2
                    = 10
```

#### Code: Edge Case - Single Element Query
```cpp
int getSum(int left, int right, vector<int>& prefix) {
    // Works for single element: getSum(2, 2, prefix)
    // Returns prefix[3] - prefix[2] = 7 - 6 = 1 (nums[2])
    return prefix[right + 1] - prefix[left];
}
```

#### Dry-Run: Multiple Queries on Same Array
```
Array: [5, 3, -2, 8, 1]
Prefix: [0, 5, 8, 6, 14, 15]

Query 1: getSum(0, 4) = prefix[5] - prefix[0] = 15 - 0 = 15
Query 2: getSum(1, 3) = prefix[4] - prefix[1] = 14 - 5 = 9
Query 3: getSum(2, 2) = prefix[3] - prefix[2] = 6 - 8 = -2
Query 4: getSum(0, 1) = prefix[2] - prefix[0] = 8 - 0 = 8
```

---

### 5. Complete Working Example
```cpp
#include <vector>
#include <iostream>
using namespace std;

class PrefixSum {
private:
    vector<int> prefix;
    
public:
    PrefixSum(vector<int>& nums) {
        prefix.resize(nums.size() + 1, 0);
        for (int i = 0; i < nums.size(); i++) {
            prefix[i + 1] = prefix[i] + nums[i];
        }
    }
    
    int query(int left, int right) {
        return prefix[right + 1] - prefix[left];
    }
};

int main() {
    vector<int> nums = {2, 4, 1, 5, 3};
    PrefixSum ps(nums);
    
    cout << ps.query(0, 2) << endl;  // 7
    cout << ps.query(1, 3) << endl;  // 10
    cout << ps.query(0, 4) << endl;  // 15
    return 0;
}
```

#### What's Happening
```
Initialization:
  Build prefix array once: O(N)
  
Queries:
  Each query is O(1) arithmetic
  
Total for Q queries: O(N + Q)  ← Much better than O(Q × N)!
```

---

### 6. Common Error Scenarios

#### Error 1: Off-By-One in Query
```cpp
// ❌ WRONG: Off-by-one error
int getSum(int left, int right, vector<int>& prefix) {
    return prefix[right] - prefix[left]; // Wrong!
}

// ✅ CORRECT: Remember the +1 shift
int getSum(int left, int right, vector<int>& prefix) {
    return prefix[right + 1] - prefix[left];
}
```

#### What's Happening
```
The padded prefix has a +1 shift:
- prefix[0] = 0 (dummy)
- prefix[1] = nums[0]
- prefix[2] = nums[0] + nums[1]
- ...
- prefix[i] = sum of nums[0..i-1]

To get sum of nums[left..right]:
- We need sum of nums[0..right] minus sum of nums[0..left-1]
- = prefix[right+1] - prefix[left]
```

#### Error 2: Using Unpadded Prefix with Left=0
```cpp
// ❌ WRONG: Using unpadded prefix
vector<int> buildPrefix(vector<int>& nums) {
    vector<int> prefix(nums.size()); // No padding!
    prefix[0] = nums[0];
    for (int i = 1; i < nums.size(); i++) {
        prefix[i] = prefix[i-1] + nums[i];
    }
    return prefix;
}

int getSum(int left, int right, vector<int>& prefix) {
    return prefix[right] - (left > 0 ? prefix[left-1] : 0); // Messy!
}

// ✅ CORRECT: Use padded prefix
vector<int> buildPrefixClean(vector<int>& nums) {
    vector<int> prefix(nums.size() + 1, 0); // Padded!
    for (int i = 0; i < nums.size(); i++) {
        prefix[i+1] = prefix[i] + nums[i];
    }
    return prefix;
}
```

#### What's Happening
```
Unpadded prefix requires special case for left=0:
- If left=0, we need sum from start, so no subtraction
- This adds an if-check to EVERY query

Padded prefix eliminates the special case:
- prefix[0] = 0 (dummy)
- sum(left, right) = prefix[right+1] - prefix[left]
- Works uniformly for all left values including 0
```

#### Error 3: Not Precomputing (TLE)
```cpp
// ❌ WRONG: Recalculating each time
int query(int left, int right, vector<int>& nums) {
    int sum = 0;
    for (int i = left; i <= right; i++) sum += nums[i];
    return sum;
}
// With 100,000 queries on array of size 100,000: O(10^10) → TLE!

// ✅ CORRECT: Precompute once
PrefixSum ps(nums); // O(N) build
// Each query: O(1)
// With 100,000 queries: O(N + Q) = O(200,000) → Fast!
```

---

### 7. Comparison: Prefix Sum vs Alternatives

| Aspect | Prefix Sum | Brute Force | Segment Tree | Fenwick Tree |
|--------|-----------|-------------|--------------|--------------|
| Build Time | O(N) | O(1) | O(N) | O(N) |
| Query Time | O(1) | O(N) | O(log N) | O(log N) |
| Update Time | O(N) | O(1) | O(log N) | O(log N) |
| Space | O(N) | O(1) | O(N) | O(N) |
| Best For | Static array, multiple queries | Single query | Dynamic array, updates | Dynamic array, updates |
| Code Complexity | Simple | Simple | Moderate | Moderate |

**When to choose what:**
- **Prefix Sum**: Array is static, need O(1) queries
- **Segment Tree**: Need O(log N) updates AND queries
- **Brute Force**: Only 1-2 queries total

---

### 8. Advanced: Prefix Sum with Hash Map (Subarray Sum Equals K)

```cpp
int subarraySum(vector<int>& nums, int k) {
    unordered_map<int, int> prefixCount;
    prefixCount[0] = 1;
    
    int count = 0;
    int currentSum = 0;
    
    for (int num : nums) {
        currentSum += num;
        
        // If (currentSum - k) exists, we found a subarray
        if (prefixCount.count(currentSum - k)) {
            count += prefixCount[currentSum - k];
        }
        
        prefixCount[currentSum]++;
    }
    
    return count;
}
// Time: O(N), Space: O(N)
```

#### What's Happening
```
Key Insight: prefix[j] - prefix[i] = k means subarray i+1..j sums to k

Algorithm:
1. Track running sum (currentSum)
2. For each position, check if (currentSum - k) was seen before
3. If yes, we found subarrays that sum to k

Example: nums = [1, 1, 1], k = 2
prefix = [0, 1, 2, 3]

i=0: currentSum=1, target=1-2=-1 (not found), count=0
i=1: currentSum=2, target=2-2=0 (found!), count=1
i=2: currentSum=3, target=3-2=1 (found!), count=2

Result: 2 subarrays [1,1] at positions (0,1) and (1,2)
```

#### ASCII Diagram: Hash Map State
```
nums = [1, 1, 1], k = 2

i=0: currentSum=1
     prefixCount = {0:1, 1:1}
     Check: 1-2=-1 (not in map)

i=1: currentSum=2
     prefixCount = {0:1, 1:1, 2:1}
     Check: 2-2=0 (in map! count += 1)

i=2: currentSum=3
     prefixCount = {0:1, 1:1, 2:1, 3:1}
     Check: 3-2=1 (in map! count += 1)

Total: 2 subarrays
```

---

### Summary
- **Trigger:** "Find the sum of elements in a range multiple times."
- **Logic:** Precompute a running total array padded with a leading zero.
- **Complexity:** $O(N)$ Time to build, $O(1)$ Time per query. $O(N)$ Space.

---

## Quick Reference Table

| Concept | Formula/Code | Time | Space |
|---------|-------------|------|-------|
| Build prefix (basic) | `prefix[i] = prefix[i-1] + nums[i]` | O(N) | O(N) |
| Build prefix (padded) | `prefix[i+1] = prefix[i] + nums[i]` | O(N) | O(N+1) |
| Range query | `prefix[right+1] - prefix[left]` | O(1) | - |
| Total for Q queries | Build + Q×Query | O(N+Q) | O(N) |
| Subarray sum = K | Hash map + running sum | O(N) | O(N) |

---

## Error Scenarios

| Error | Cause | Fix |
|-------|-------|-----|
| Accessing prefix[-1] | Query starting at index 0 | Use padded prefix array |
| Wrong answer | Off-by-one in index math | Always use `right+1` and `left` |
| TLE | Not precomputing | Build prefix array once, query O(1) |
| Index out of bounds | Using unpadded prefix | Pad with leading zero |
| Wrong sum | Using `prefix[right] - prefix[left]` | Use `prefix[right+1] - prefix[left]` |

---

## Pattern Recognition

```
When to use Prefix Sum:
✓ Multiple range sum queries on same array
✓ Need O(1) per query after O(N) preprocessing
✓ Array is static (not modified between queries)
✓ Finding subarray sum equals K (combine with hash map)
✓ Need cumulative sum for each position

When NOT to use:
✗ Single query (brute force is fine)
✗ Array is modified between queries (need segment tree)
✗ Need range updates, not just queries
✗ Need to find maximum/minimum sum (use Kadane's)
```

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Chapter 1: The Prefix Sum Array**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **chapter1 prefix sum array** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.


# Part 2, Topic 1: Array Basics & Kadane's Algorithm
## Interview Problems Walkthrough

Here is the strategic intuition and optimal code for the core Array problems. Do not memorize the code; memorize the **Intuition** and the **Trigger**.

---

## Problem Classification Table

| Problem | Difficulty | Key Technique | Time | Space | Pattern |
|---------|-----------|---------------|------|-------|---------|
| Two Sum | Easy | Hash Map Lookup | O(N) | O(N) | Complement Search |
| Contains Duplicate | Easy | Hash Set | O(N) | O(N) | Membership Test |
| Best Time to Buy/Sell Stock | Easy | Greedy Single Pass | O(N) | O(1) | Min/Max Tracking |
| Maximum Subarray | Medium | Kadane's Algorithm | O(N) | O(1) | Running Decision |
| Product Except Self | Medium | Prefix/Suffix Products | O(N) | O(1) | Left/Right Decomposition |
| Max Product Subarray | Medium | Modified Kadane's | O(N) | O(1) | Dual Tracking (max/min) |

---

## Solution Approach Comparison

| Approach | Pros | Cons | When to Use |
|----------|------|------|-------------|
| Brute Force (nested loops) | Simple to understand, no extra space | O(N²) time, too slow | Only for N < 1000 |
| Hash Map/Set | O(N) time, flexible | O(N) space | Finding pairs, membership |
| Greedy (single pass) | O(N) time, O(1) space | Requires insight | Tracking running min/max |
| Kadane's Algorithm | O(N) time, O(1) space | Only for contiguous subarrays | Max/min subarray problems |

---

### 1. Two Sum (Easy)
**Trigger:** Find two numbers that add up to a target.
**Intuition:** The brute force is $O(N^2)$ (checking every pair). To optimize, use a Hash Map. As you iterate through the array, calculate the `complement = target - current_number`. If the complement is in the map, you found the pair. If not, store the current number in the map and keep going.

#### Code: Basic Solution
```cpp
vector<int> twoSum(vector<int>& nums, int target) {
    unordered_map<int, int> seen;
    
    for (int i = 0; i < nums.size(); i++) {
        int complement = target - nums[i];
        
        if (seen.count(complement)) {
            return {seen[complement], i};
        }
        seen[nums[i]] = i;
    }
    return {};
}
// Time: O(N), Space: O(N)
```

#### What's Happening
```
Example: nums = [2, 7, 11, 15], target = 9

Step 1: i=0, num=2, complement=7, map={2:0}
        → 7 not in map, store 2

Step 2: i=1, num=7, complement=2, map={2:0}
        → 2 IS in map at index 0!
        → Return [0, 1] ✓
```

#### ASCII Diagram: Hash Map Lookup
```
Iteration:    i=0         i=1 (FOUND)
              ↓           ↓
nums:    [ 2, 7, 11, 15 ]
              ↑
         complement=7 → check map → 7 not found
         
Second pass:
         complement=2 → check map → 2 FOUND at index 0!
```

#### Dry-Run Table
| i | nums[i] | complement | map state | found? | result |
|---|---------|------------|-----------|--------|--------|
| 0 | 2 | 9-2=7 | {2:0} | no | - |
| 1 | 7 | 9-7=2 | {2:0} | YES | [0,1] |

#### Code: Edge Case - Duplicates
```cpp
vector<int> twoSum(vector<int>& nums, int target) {
    unordered_map<int, int> seen;
    
    for (int i = 0; i < nums.size(); i++) {
        int complement = target - nums[i];
        
        if (seen.count(complement)) {
            return {seen[complement], i};
        }
        // Don't overwrite - we need the FIRST occurrence
        if (!seen.count(nums[i])) {
            seen[nums[i]] = i;
        }
    }
    return {};
}
```

#### Error Scenario: Off-by-One in Return
```cpp
// WRONG: Returning {i, seen[complement]} instead of {seen[complement], i}
return {i, seen[complement]}; // Indices in wrong order!
// The problem requires answer[0] < answer[1]
```

#### Edge Cases
- Array has exactly 2 elements
- Negative numbers
- Same element used twice: nums=[3,3], target=6 → must use different indices
- Target is sum of two far-apart elements

---

### 2. Contains Duplicate (Easy)
**Trigger:** Check if any element appears at least twice.
**Intuition:** A `set` only stores unique elements. If you try to insert an element and it's already in the set, you have a duplicate.

#### Code: Basic Solution
```cpp
bool containsDuplicate(vector<int>& nums) {
    unordered_set<int> seen;
    
    for (int num : nums) {
        if (seen.count(num)) return true;
        seen.insert(num);
    }
    return false;
}
// Time: O(N), Space: O(N)
```

#### What's Happening
```
Example: nums = [1, 2, 3, 1]

Step 1: num=1, set={}, check → not found, add 1, set={1}
Step 2: num=2, set={1}, check → not found, add 2, set={1,2}
Step 3: num=3, set={1,2}, check → not found, add 3, set={1,2,3}
Step 4: num=1, set={1,2,3}, check → FOUND! return true
```

#### ASCII Diagram: Set Insertion
```
nums: [ 1, 2, 3, 1 ]
       ↓  ↓  ↓  ↓
set:  {} → {1} → {1,2} → {1,2,3} → DUPLICATE DETECTED!
```

#### Dry-Run Table
| num | seen before? | set after |
|-----|-------------|-----------|
| 1 | no | {1} |
| 2 | no | {1,2} |
| 3 | no | {1,2,3} |
| 1 | YES | {1,2,3} → return true |

#### Code: Alternative - Sort First
```cpp
bool containsDuplicate(vector<int>& nums) {
    sort(nums.begin(), nums.end());
    for (int i = 1; i < nums.size(); i++) {
        if (nums[i] == nums[i-1]) return true;
    }
    return false;
}
// Time: O(N log N), Space: O(1) if sorting in-place
```

#### Code: Edge Case - Empty Array
```cpp
bool containsDuplicate(vector<int>& nums) {
    if (nums.empty()) return false; // Edge case
    unordered_set<int> seen(nums.begin(), nums.end());
    return seen.size() != nums.size();
}
```

---

### 3. Best Time to Buy and Sell Stock (Easy)
**Trigger:** Find the maximum profit from one buy and one sell.
**Intuition:** You must buy before you can sell. As you loop through the prices, keep track of the **lowest price seen so far**. The maximum profit at the current day is simply the `current price - lowest price seen so far`. Keep updating the global maximum profit.

#### Code: Basic Solution
```cpp
int maxProfit(vector<int>& prices) {
    int minPrice = prices[0];
    int maxProfit = 0;
    
    for (int i = 1; i < prices.size(); i++) {
        int currentProfit = prices[i] - minPrice;
        maxProfit = max(maxProfit, currentProfit);
        minPrice = min(minPrice, prices[i]);
    }
    return maxProfit;
}
// Time: O(N), Space: O(1)
```

#### What's Happening
```
Example: prices = [7, 1, 5, 3, 6, 4]

Day 0: minPrice=7, maxProfit=0
Day 1: minPrice=1, maxProfit=max(0, 1-7)=0
Day 2: minPrice=1, maxProfit=max(0, 5-1)=4
Day 3: minPrice=1, maxProfit=max(4, 3-1)=4
Day 4: minPrice=1, maxProfit=max(4, 6-1)=5
Day 5: minPrice=1, maxProfit=max(5, 4-1)=5

Answer: 5 (buy at 1, sell at 6)
```

#### ASCII Diagram: Price Tracking
```
prices: [ 7, 1, 5, 3, 6, 4 ]
          ↓  ↓  ↓  ↓  ↓  ↓
minPrice: 7  1  1  1  1  1
maxProfit:0  0  4  4  5  5
                 ↑        ↑
              profit=4  profit=5 (max)
```

#### Dry-Run Table
| i | price | minPrice | currentProfit | maxProfit |
|---|-------|----------|---------------|-----------|
| 0 | 7 | 7 | 0 | 0 |
| 1 | 1 | 1 | -6 | 0 |
| 2 | 5 | 1 | 4 | 4 |
| 3 | 3 | 1 | 2 | 4 |
| 4 | 6 | 1 | 5 | 5 |
| 5 | 4 | 1 | 3 | 5 |

#### Code: Edge Case - Declining Prices
```cpp
int maxProfit(vector<int>& prices) {
    if (prices.size() < 2) return 0; // Need at least 2 days
    
    int minPrice = INT_MAX;
    int maxProfit = 0;
    
    for (int price : prices) {
        minPrice = min(minPrice, price);
        maxProfit = max(maxProfit, price - minPrice);
    }
    return maxProfit;
}
// Returns 0 if prices only go down
```

#### Error Scenario: Starting at Index 0
```cpp
// WRONG: Not updating minPrice before calculating profit
for (int i = 0; i < prices.size(); i++) {
    int currentProfit = prices[i] - minPrice; // Bug: uses old minPrice
    maxProfit = max(maxProfit, currentProfit);
    minPrice = min(minPrice, prices[i]); // Should be BEFORE profit calc
}
```

---

### 4. Maximum Subarray (Medium)
**Trigger:** Largest sum of contiguous array.
**Intuition:** Use **Kadane's Algorithm**. At each step, decide whether to add the current number to the running sum, or start a new subarray from the current number.

#### Code: Kadane's Algorithm
```cpp
int maxSubArray(vector<int>& nums) {
    int currentSum = nums[0];
    int globalMax = nums[0];
    
    for (int i = 1; i < nums.size(); i++) {
        currentSum = max(nums[i], currentSum + nums[i]);
        globalMax = max(globalMax, currentSum);
    }
    return globalMax;
}
// Time: O(N), Space: O(1)
```

#### What's Happening
```
Example: nums = [-2, 1, -3, 4, -1, 2, 1, -5, 4]

Key insight: At each step, is it better to:
  A) Extend the current subarray? (currentSum + nums[i])
  B) Start fresh from current element? (nums[i])

i=0: currentSum=-2, globalMax=-2
i=1: max(1, -2+1)=1, globalMax=1
i=2: max(-3, 1-3)=-2, globalMax=1
i=3: max(4, -2+4)=4, globalMax=4
i=4: max(-1, 4-1)=3, globalMax=4
i=5: max(2, 3+2)=5, globalMax=5
i=6: max(1, 5+1)=6, globalMax=6
i=7: max(-5, 6-5)=1, globalMax=6
i=8: max(4, 1+4)=5, globalMax=6

Answer: 6 (subarray [4, -1, 2, 1])
```

#### ASCII Diagram: Kadane's Decision
```
nums:    [-2,  1, -3,  4, -1,  2,  1, -5,  4]
          ↓   ↓   ↓   ↓   ↓   ↓   ↓   ↓   ↓
         START NEW   ↓   ↓   ↓   ↓   ↓   ↓
              ↓      ↓   ↓   ↓   ↓   ↓   ↓
currentSum: -2 → 1 → -2 → 4 → 3 → 5 → 6 → 1 → 5
            ↓           ↑               ↑
         restart    restart          global max
         (negative) (negative)
```

#### Dry-Run Table
| i | nums[i] | extend? | currentSum | globalMax |
|---|---------|---------|------------|-----------|
| 0 | -2 | START | -2 | -2 |
| 1 | 1 | max(1, -2+1)=1 | 1 | 1 |
| 2 | -3 | max(-3, 1-3)=-2 | -2 | 1 |
| 3 | 4 | max(4, -2+4)=4 | 4 | 4 |
| 4 | -1 | max(-1, 4-1)=3 | 3 | 4 |
| 5 | 2 | max(2, 3+2)=5 | 5 | 5 |
| 6 | 1 | max(1, 5+1)=6 | 6 | 6 |
| 7 | -5 | max(-5, 6-5)=1 | 1 | 6 |
| 8 | 4 | max(4, 1+4)=5 | 5 | 6 |

#### Code: Edge Case - All Negatives
```cpp
int maxSubArray(vector<int>& nums) {
    // Kadane's handles all negatives correctly
    // Because max(nums[i], currentSum + nums[i]) will pick nums[i]
    // when currentSum becomes too negative
    int currentSum = nums[0];
    int globalMax = nums[0];
    
    for (int i = 1; i < nums.size(); i++) {
        currentSum = max(nums[i], currentSum + nums[i]);
        globalMax = max(globalMax, currentSum);
    }
    return globalMax;
}
// [-3, -1, -2] → returns -1 (single element)
```

#### Code: Return the Subarray Indices
```cpp
pair<int, pair<int,int>> maxSubArrayWithIndices(vector<int>& nums) {
    int currentSum = nums[0];
    int globalMax = nums[0];
    int start = 0, end = 0, tempStart = 0;
    
    for (int i = 1; i < nums.size(); i++) {
        if (nums[i] > currentSum + nums[i]) {
            currentSum = nums[i];
            tempStart = i; // New subarray starts here
        } else {
            currentSum += nums[i];
        }
        
        if (currentSum > globalMax) {
            globalMax = currentSum;
            start = tempStart;
            end = i;
        }
    }
    return {globalMax, {start, end}};
}
```

---

### 5. Product of Array Except Self (Medium)
**Trigger:** Multiply all elements except `nums[i]`, without using division.
**Intuition:** For any given index `i`, its answer is the product of all numbers to its **Left** multiplied by the product of all numbers to its **Right**.
1. Do a forward pass to calculate all the Left products.
2. Do a backward pass to calculate all the Right products and multiply them by the Left products.

#### Code: Two-Pass Solution
```cpp
vector<int> productExceptSelf(vector<int>& nums) {
    int n = nums.size();
    vector<int> result(n, 1);
    
    int leftPrefix = 1;
    for (int i = 0; i < n; i++) {
        result[i] = leftPrefix;
        leftPrefix *= nums[i];
    }
    
    int rightPostfix = 1;
    for (int i = n - 1; i >= 0; i--) {
        result[i] *= rightPostfix;
        rightPostfix *= nums[i];
    }
    
    return result;
}
// Time: O(N), Space: O(1) Auxiliary
```

#### What's Happening
```
Example: nums = [1, 2, 3, 4]

Pass 1 (Left Products):
i=0: result[0]=1, leftPrefix=1*1=1
i=1: result[1]=1, leftPrefix=1*2=2
i=2: result[2]=2, leftPrefix=2*3=6
i=3: result[3]=6, leftPrefix=6*4=24
result = [1, 1, 2, 6]

Pass 2 (Right Products × Left):
i=3: result[3]=6*1=6, rightPostfix=1*4=4
i=2: result[2]=2*4=8, rightPostfix=4*3=12
i=1: result[1]=1*12=12, rightPostfix=12*2=24
i=0: result[0]=1*24=24, rightPostfix=24*1=24
result = [24, 12, 8, 6]
```

#### ASCII Diagram: Left/Right Decomposition
```
nums:     [ 1,  2,  3,  4 ]
           ↓  ↓  ↓  ↓
Left:     [ -,  1,  1×2, 1×2×3 ]
           ↓  ↓  ↓  ↓
          = [ 1,  1,  2,  6 ]

Right:    [ 4×3×2,  4×3,  4,  - ]
           ↓  ↓  ↓  ↓
          = [ 24, 12,  4,  1 ]

Final:    [ 1×24, 1×12, 2×4, 6×1 ]
          = [ 24, 12, 8, 6 ]
```

#### Dry-Run Table
| i | nums[i] | leftPrefix | result[i] (after pass1) | rightPostfix | result[i] (after pass2) |
|---|---------|------------|------------------------|--------------|------------------------|
| 0 | 1 | 1 | 1 | 24 | 24 |
| 1 | 2 | 1 | 1 | 12 | 12 |
| 2 | 3 | 2 | 2 | 4 | 8 |
| 3 | 4 | 6 | 6 | 1 | 6 |

#### Code: Common Mistake - Using Division
```cpp
// WRONG: Cannot use division (violates problem constraint)
// Also fails when array contains zero!
vector<int> productExceptSelf(vector<int>& nums) {
    int totalProduct = 1;
    for (int num : nums) totalProduct *= num;
    
    vector<int> result(n);
    for (int i = 0; i < n; i++) {
        result[i] = totalProduct / nums[i]; // BUG: division by zero!
    }
    return result;
}
```

#### Edge Cases
- Array contains zero (division approach fails)
- Array contains one element
- All elements are 1
- Negative numbers

---

### 6. Maximum Product Subarray (Medium)
**Trigger:** Largest product of contiguous subarray (with negative numbers).
**Intuition:** Similar to Kadane's, but tricky because two negative numbers multiply to a positive number! A massive negative running product can instantly become a massive positive product if the next number is negative. Therefore, you must track BOTH the `currentMax` and the `currentMin` at every step.

#### Code: Dual Tracking Solution
```cpp
int maxProduct(vector<int>& nums) {
    int globalMax = nums[0];
    int currMax = nums[0];
    int currMin = nums[0];
    
    for (int i = 1; i < nums.size(); i++) {
        int val = nums[i];
        int tempMax = currMax;
        
        currMax = max({val, val * tempMax, val * currMin});
        currMin = min({val, val * tempMax, val * currMin});
        
        globalMax = max(globalMax, currMax);
    }
    return globalMax;
}
// Time: O(N), Space: O(1)
```

#### What's Happening
```
Example: nums = [2, 3, -2, 4]

The twist: -2 × currMin could become a large positive!

i=0: currMax=2, currMin=2, globalMax=2
i=1: currMax=max(3, 3×2, 3×2)=6, currMin=min(3, 6, 6)=3, globalMax=6
i=2: currMax=max(-2, -2×6, -2×3)=-2, currMin=min(-2, -12, -6)=-12, globalMax=6
i=3: currMax=max(4, 4×-2, 4×-12)=4, currMin=min(4, -8, -48)=-48, globalMax=6

Answer: 6 (subarray [2, 3])
```

#### ASCII Diagram: Why Track Min?
```
nums: [ 2,  3, -2,  4 ]
       ↓  ↓   ↓   ↓
currMax: 2  6  -2   4
currMin: 2  3  -12 -48
              ↑
         This -12 (min) could become
         the next max if we see another
         negative number!
```

#### Dry-Run Table
| i | val | tempMax | currMax | currMin | globalMax |
|---|-----|---------|---------|---------|-----------|
| 0 | 2 | - | 2 | 2 | 2 |
| 1 | 3 | 2 | max(3,6,6)=6 | min(3,6,6)=3 | 6 |
| 2 | -2 | 6 | max(-2,-12,-6)=-2 | min(-2,-12,-6)=-12 | 6 |
| 3 | 4 | -2 | max(4,-8,-48)=4 | min(4,-8,-48)=-48 | 6 |

#### Code: Edge Case - Single Negative
```cpp
int maxProduct(vector<int>& nums) {
    if (nums.size() == 1) return nums[0];
    
    int globalMax = nums[0];
    int currMax = nums[0];
    int currMin = nums[0];
    
    for (int i = 1; i < nums.size(); i++) {
        int val = nums[i];
        int tempMax = currMax;
        
        currMax = max({val, val * tempMax, val * currMin});
        currMin = min({val, val * tempMax, val * currMin});
        
        globalMax = max(globalMax, currMax);
    }
    return globalMax;
}
// [-2] → returns -2 (not 0!)
```

#### Error Scenario: Forgetting tempMax
```cpp
// WRONG: Updating currMax before using it for currMin
currMax = max({val, val * currMax, val * currMin});
currMin = min({val, val * currMax, val * currMin}); // Bug: currMax already changed!
// Must use tempMax to preserve old value
```

#### Comparison: Max Subarray Sum vs Max Subarray Product
| Aspect | Max Subarray Sum | Max Subarray Product |
|--------|-----------------|---------------------|
| Algorithm | Kadane's | Modified Kadane's |
| State tracked | currentSum only | currentMax AND currentMin |
| Why? | Negatives only reduce sum | Negatives can flip to positive |
| Temp variable needed? | No | Yes (for currMax) |
| Single element case | Works | Works |

---

## Quick Reference Table

| Problem | Key Insight | Template | Time | Space |
|---------|-------------|----------|------|-------|
| Two Sum | complement = target - num | `map[num] = i` then check `complement` | O(N) | O(N) |
| Contains Duplicate | set catches duplicates early | `if (seen.count(num)) return true` | O(N) | O(N) |
| Buy/Sell Stock | track minPrice, calc profit | `maxProfit = max(profit, price - minPrice)` | O(N) | O(1) |
| Max Subarray | extend or restart? | `curr = max(nums[i], curr + nums[i])` | O(N) | O(1) |
| Product Except Self | left × right products | forward pass (left), backward pass (right) | O(N) | O(1) |
| Max Product Subarray | track max AND min | `currMax = max({val, val*max, val*min})` | O(N) | O(1) |

---

## Common Patterns Cheat Sheet

```
Pattern: Hash Map Lookup
When: Find pair/complement/frequency
Template:
  unordered_map<int, int> seen;
  for (int num : nums) {
      int complement = target - num;
      if (seen.count(complement)) { /* found */ }
      seen[num] = index;
  }

Pattern: Single Pass Min/Max
When: Track running minimum, calculate potential profit
Template:
  int minVal = nums[0];
  for (int num : nums) {
      result = max(result, num - minVal);
      minVal = min(minVal, num);
  }

Pattern: Kadane's Algorithm
When: Contiguous subarray optimization
Template:
  int curr = nums[0], best = nums[0];
  for (int i = 1; i < n; i++) {
      curr = max(nums[i], curr + nums[i]);
      best = max(best, curr);
  }

Pattern: Prefix/Suffix Decomposition
When: Element depends on all others (except self)
Template:
  // Forward: compute prefix
  // Backward: compute suffix and combine
```

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Interview Problems Walkthrough**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **interview problems array basics** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.


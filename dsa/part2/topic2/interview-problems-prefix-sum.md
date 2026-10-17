# Part 2, Topic 2: Prefix Sum
## Interview Problems Walkthrough

Here is the strategic intuition and optimal code for the core Prefix Sum problems.

---

### Problem Classification Table

| # | Problem                          | Difficulty | Pattern Used              | Key Insight                              |
|---|----------------------------------|------------|---------------------------|------------------------------------------|
| 1 | Running Sum of 1d Array          | Easy       | Basic Prefix Sum          | In-place cumulative sum                  |
| 2 | Find Pivot Index                 | Easy       | Total Sum - Left Sum      | Right sum = total - left - current       |
| 3 | Range Sum Query - Immutable      | Easy       | Padded Prefix Array       | O(1) range query with dummy zero         |
| 4 | Subarray Sum Equals K            | Medium     | Hash Map + Prefix Sum     | Check if (current - k) was seen before   |
| 5 | Contiguous Array                 | Medium     | Hash Map + Prefix Sum     | Convert 0→-1, find longest zero-sum subarray |

---

### Solution Approach Comparison

| Problem            | Brute Force         | Prefix Sum           | Hash Map + Prefix    |
|--------------------|---------------------|----------------------|----------------------|
| Running Sum        | O(N²) nested loops  | ✅ O(N) in-place     | Not needed           |
| Pivot Index        | O(N²) left/right    | Not needed           | Not needed           |
| Range Sum Query    | O(N) per query      | ✅ O(1) per query    | Not needed           |
| Subarray Sum = K   | O(N²) all subarrays | O(N²) prefix pairs   | ✅ O(N) with map     |
| Contiguous Array   | O(N²) all subarrays | O(N²) prefix pairs   | ✅ O(N) with map     |

---

### 1. Running Sum of 1d Array (Easy)
**Trigger:** Return an array where `ans[i] = sum(nums[0]...nums[i])`.
**Intuition:** This is literally just asking you to build a Prefix Sum array without the dummy zero padding. You can modify the array in-place to achieve $O(1)$ auxiliary space.

```cpp
vector<int> runningSum(vector<int>& nums) {
    for (int i = 1; i < nums.size(); i++) {
        // The current element becomes itself plus the running sum behind it
        nums[i] += nums[i - 1]; 
    }
    return nums;
}
// Time: O(N), Space: O(1)
```

**What's happening:**
- We iterate from index 1 (index 0 stays unchanged).
- At each step, `nums[i]` accumulates the sum of all previous elements.
- After the loop, `nums[i]` contains `sum(nums[0..i])`.

**Dry-Run Table:**

| i | nums[i] (before) | nums[i-1] | nums[i] (after) | Running Sum       |
|---|------------------|-----------|-----------------|-------------------|
| 0 | 1                | —         | 1               | [1]               |
| 1 | 2                | 1         | 3               | [1, 3]            |
| 2 | 3                | 3         | 6               | [1, 3, 6]         |
| 3 | 4                | 6         | 10              | [1, 3, 6, 10]     |

**Edge Case: Single Element**
```cpp
vector<int> runningSum(vector<int>& nums) {
    // Loop doesn't execute if nums.size() <= 1
    // Returns original array (which is already the running sum)
    for (int i = 1; i < nums.size(); i++) {
        nums[i] += nums[i - 1];
    }
    return nums;
}
```

**Common Mistake: Modifying while reading**
```cpp
// ❌ WRONG: Using nums[i] += nums[i] (doubles the value)
for (int i = 1; i < nums.size(); i++) {
    nums[i] += nums[i]; // This is 2*nums[i], not cumulative sum!
}
```

---

### 2. Find Pivot Index (Easy)
**Trigger:** Find the index where the sum of numbers to the left equals the sum of numbers to the right.
**Intuition:** You don't need a full prefix array for this. First, calculate the `totalSum` of the entire array. Then, iterate through the array while maintaining a `leftSum`. At any index `i`, the `rightSum` is simply `totalSum - leftSum - nums[i]`. If `leftSum == rightSum`, you found the pivot.

```cpp
int pivotIndex(vector<int>& nums) {
    int totalSum = 0;
    for (int num : nums) totalSum += num;
    
    int leftSum = 0;
    for (int i = 0; i < nums.size(); i++) {
        int rightSum = totalSum - leftSum - nums[i];
        
        if (leftSum == rightSum) {
            return i;
        }
        leftSum += nums[i]; // Add current element to leftSum for the NEXT iteration
    }
    return -1;
}
// Time: O(N), Space: O(1)
```

**What's happening:**
- First pass: compute `totalSum` of the entire array.
- Second pass: maintain `leftSum` as we go. At index `i`, the right side is `totalSum - leftSum - nums[i]`.
- If `leftSum == rightSum`, index `i` is the pivot.
- We update `leftSum` AFTER checking, so it represents the sum of elements strictly to the left of `i+1`.

**Dry-Run Table (nums = [1, 7, 3, 6, 5, 6], totalSum = 28):**

| i | nums[i] | leftSum | rightSum = total - left - nums[i] | leftSum == rightSum? |
|---|---------|---------|-----------------------------------|----------------------|
| 0 | 1       | 0       | 28 - 0 - 1 = 27                   | 0 ≠ 27 → No         |
| 1 | 7       | 1       | 28 - 1 - 7 = 20                   | 1 ≠ 20 → No         |
| 2 | 3       | 8       | 28 - 8 - 3 = 17                   | 8 ≠ 17 → No         |
| 3 | 6       | 11      | 28 - 11 - 6 = 11                  | 11 = 11 → YES ✓     |

Pivot index = 3 (left sum = 1+7+3 = 11, right sum = 5+6 = 11)

**Edge Case: No Pivot Exists**
```cpp
// nums = [1, 2, 3] → totalSum = 6
// i=0: leftSum=0, rightSum=5 → no
// i=1: leftSum=1, rightSum=3 → no
// i=2: leftSum=3, rightSum=0 → no
// Returns -1 (no pivot found)
```

**Common Mistake: Updating leftSum before checking**
```cpp
// ❌ WRONG: Adding nums[i] to leftSum before the comparison
leftSum += nums[i];  // Now leftSum includes current element
int rightSum = totalSum - leftSum - nums[i]; // This is wrong!
```

---

### 3. Range Sum Query - Immutable (Easy)
**Trigger:** A class is initialized with an array, and its `sumRange(left, right)` method is called many times.
**Intuition:** This is the exact textbook definition of a Prefix Sum array. Build the padded prefix array in the constructor, and use `prefix[right + 1] - prefix[left]` in the query method. 

```cpp
class NumArray {
private:
    vector<int> prefix;

public:
    NumArray(vector<int>& nums) {
        prefix.resize(nums.size() + 1, 0);
        for (int i = 0; i < nums.size(); i++) {
            prefix[i + 1] = prefix[i] + nums[i];
        }
    }
    
    int sumRange(int left, int right) {
        return prefix[right + 1] - prefix[left];
    }
};
```

**What's happening:**
- Constructor builds prefix array with `prefix[0] = 0` (dummy zero).
- `prefix[i+1] = prefix[i] + nums[i]` means `prefix[i+1]` holds sum of `nums[0..i]`.
- Query: `sumRange(left, right) = prefix[right+1] - prefix[left]` = sum of `nums[left..right]`.

**Dry-Run Table (nums = [-2, 0, 3, -5, 2, -1]):**

| i | nums[i] | prefix[i+1] = prefix[i] + nums[i] |
|---|---------|-----------------------------------|
| 0 | -2      | 0 + (-2) = -2                     |
| 1 | 0       | -2 + 0 = -2                       |
| 2 | 3       | -2 + 3 = 1                        |
| 3 | -5      | 1 + (-5) = -4                     |
| 4 | 2       | -4 + 2 = -2                       |
| 5 | -1      | -2 + (-1) = -3                    |

prefix = [0, -2, -2, 1, -4, -2, -3]

Query: `sumRange(0, 5)` = `prefix[6] - prefix[0]` = -3 - 0 = -3 ✓

**Common Mistake: Forgetting the dummy zero**
```cpp
// ❌ WRONG: Not padding with a leading zero
NumArray(vector<int>& nums) {
    prefix.resize(nums.size());  // No +1!
    prefix[0] = nums[0];
    for (int i = 1; i < nums.size(); i++) {
        prefix[i] = prefix[i-1] + nums[i];
    }
}
// Then sumRange would need different indexing, causing bugs
```

---

### 4. Subarray Sum Equals K (Medium)
**Trigger:** Find the total *number* of contiguous subarrays that sum to `k` (array contains negative numbers).
**Intuition:** Use the Hash Map + Prefix Sum trick. Maintain a running sum, and at each step, check if `(runningSum - k)` exists in the hash map. Don't forget to initialize the map with `{0: 1}`!

```cpp
int subarraySum(vector<int>& nums, int k) {
    unordered_map<int, int> prefixCount;
    prefixCount[0] = 1; // Base case: sum of 0 seen once (empty prefix)
    
    int currSum = 0;
    int count = 0;
    
    for (int num : nums) {
        currSum += num;
        
        // If (currSum - k) was seen before, those subarrays sum to k
        if (prefixCount.count(currSum - k)) {
            count += prefixCount[currSum - k];
        }
        
        prefixCount[currSum]++;
    }
    
    return count;
}
// Time: O(N), Space: O(N)
```

**What's happening:**
- `currSum` is the prefix sum from index 0 to current position.
- If `prefixCount` contains `currSum - k`, it means there's a subarray between that previous position and now that sums to `k`.
- We count HOW MANY such subarrays exist (not just existence).
- `prefixCount[0] = 1` handles the case where the subarray starts at index 0.

**Dry-Run Table (nums = [1, 2, 3], k = 3):**

| Step | num | currSum | currSum - k | prefixCount (before) | Found? | count | prefixCount (after) |
|------|-----|---------|-------------|---------------------|--------|-------|---------------------|
| Init | —   | 0       | -3          | {0:1}               | No     | 0     | {0:1}               |
| 1    | 1   | 1       | -2          | {0:1}               | No     | 0     | {0:1, 1:1}          |
| 2    | 2   | 3       | 0           | {0:1, 1:1}          | Yes! 1 | 1     | {0:1, 1:1, 3:1}     |
| 3    | 3   | 6       | 3           | {0:1, 1:1, 3:1}     | Yes! 1 | 2     | {0:1, 1:1, 3:1, 6:1}|

Subarrays summing to 3: [1,2] and [3] → count = 2 ✓

**Edge Case: Negative Numbers**
```cpp
// nums = [-1, -1, 2], k = 0
// currSum: -1, -2, 0
// At step 3: currSum=0, currSum-k=0, prefixCount[0]=1 → count=1
// Subarray: [-1, -1, 2] sums to 0 ✓
```

**Common Mistake: Forgetting prefixCount[0] = 1**
```cpp
// ❌ WRONG: Not initializing with {0: 1}
unordered_map<int, int> prefixCount;
// prefixCount[0] = 0;  // Missing!

// This fails when a subarray from index 0 sums to k
// Because currSum itself equals k, so currSum - k = 0
// Without prefixCount[0] = 1, we miss this case
```

**Production Variation: Handling Large Inputs**
```cpp
int subarraySum(vector<int>& nums, int k) {
    unordered_map<int, int> prefixCount;
    prefixCount.reserve(nums.size() * 2); // Pre-allocate for performance
    prefixCount[0] = 1;
    
    int currSum = 0;
    int count = 0;
    
    for (int num : nums) {
        currSum += num;
        auto it = prefixCount.find(currSum - k);
        if (it != prefixCount.end()) {
            count += it->second;
        }
        prefixCount[currSum]++;
    }
    
    return count;
}
```

---

### 5. Contiguous Array (Medium)
**Trigger:** Given a binary array (`0`s and `1`s), find the maximum length of a contiguous subarray with an equal number of `0`s and `1`s.
**Intuition:** This is a brilliant disguise of the Hash Map + Prefix Sum trick. 
Change all `0`s to `-1`s in your mind. Now, if a subarray has an equal number of `1`s and `-1`s, what is its sum? **Zero.** The problem is now: *"Find the longest subarray that sums to 0."*

Instead of storing the *frequency* in the hash map (like problem #4), store the **first index** where you saw that prefix sum.

```cpp
int findMaxLength(vector<int>& nums) {
    // Map stores {prefix_sum : earliest_index_seen}
    unordered_map<int, int> firstSeen;
    firstSeen[0] = -1; // Base case: a sum of 0 happens BEFORE the array starts
    
    int maxLen = 0;
    int currSum = 0;
    
    for (int i = 0; i < nums.size(); i++) {
        // Treat 0 as -1
        currSum += (nums[i] == 0) ? -1 : 1;
        
        if (firstSeen.count(currSum)) {
            // We have seen this sum before! The numbers between that old index
            // and our current index MUST sum to 0.
            int length = i - firstSeen[currSum];
            maxLen = max(maxLen, length);
        } else {
            // Only record the FIRST time we see a sum, to maximize the length
            firstSeen[currSum] = i;
        }
    }
    
    return maxLen;
}
// Time: O(N), Space: O(N)
```

**What's happening:**
- Convert the problem: 0 → -1, so equal 0s and 1s means sum = 0.
- `currSum` is the prefix sum with 0→-1 conversion.
- If we've seen `currSum` before at index `j`, then `nums[j+1..i]` sums to 0.
- We only store the FIRST occurrence to maximize length.

**ASCII Diagram:**
```
nums:        [0, 1, 0, 0, 0, 0, 0, 1, 1]
converted:   [-1, 1, -1, -1, -1, -1, -1, 1, 1]
currSum:     [-1, 0, -1, -2, -3, -4, -5, -4, -3]
firstSeen:   {-1:0, 0:1, -2:3, -3:4, -4:5, -5:6}

At i=7: currSum=-4, firstSeen[-4]=5 → length = 7-5 = 2
At i=8: currSum=-3, firstSeen[-3]=4 → length = 8-4 = 4 ← maxLen

Subarray [5..8]: nums[5..8] = [0,0,1,1] → 2 zeros, 2 ones ✓
```

**Dry-Run Table (nums = [0, 1, 0]):**

| i | nums[i] | converted | currSum | firstSeen (before) | Found? | length | maxLen | firstSeen (after) |
|---|---------|-----------|---------|-------------------|--------|--------|--------|-------------------|
| 0 | 0       | -1        | -1      | {0:-1}            | No     | —      | 0      | {0:-1, -1:0}      |
| 1 | 1       | 1         | 0       | {0:-1, -1:0}      | Yes   | 1-(-1)=2 | 2   | {0:-1, -1:0}      |
| 2 | 0       | -1        | -1      | {0:-1, -1:0}      | Yes   | 2-0=2   | 2     | {0:-1, -1:0}      |

Result: maxLen = 2 (subarray [0,1] or [1,0]) ✓

**Edge Case: All Zeros**
```cpp
// nums = [0, 0, 0], k = 0
// converted: [-1, -1, -1]
// currSum: -1, -2, -3
// No repeated sums → maxLen = 0
// But we want equal 0s and 1s, so 0 is correct (no valid subarray)
```

**Edge Case: All Ones**
```cpp
// nums = [1, 1, 1], k = 0
// converted: [1, 1, 1]
// currSum: 1, 2, 3
// No repeated sums → maxLen = 0
```

**Common Mistake: Storing last index instead of first**
```cpp
// ❌ WRONG: Always overwriting the index
firstSeen[currSum] = i; // This overwrites with a later index, reducing length

// ✅ CORRECT: Only store the first occurrence
if (!firstSeen.count(currSum)) {
    firstSeen[currSum] = i;
}
```

---

### 6. Quick Reference Table

| Problem                  | Key Formula / Trick                            | Time  | Space | Edge Cases                           |
|--------------------------|------------------------------------------------|-------|-------|--------------------------------------|
| Running Sum              | `nums[i] += nums[i-1]`                         | O(N)  | O(1)  | Single element, empty array          |
| Pivot Index              | `rightSum = total - left - nums[i]`            | O(N)  | O(1)  | No pivot, first/last element         |
| Range Sum Query          | `prefix[r+1] - prefix[l]`                      | O(1)* | O(N)  | Single element range, full array     |
| Subarray Sum = K         | Check `(currSum - k)` in hash map              | O(N)  | O(N)  | Negative numbers, prefixCount[0]=1   |
| Contiguous Array         | Convert 0→-1, find longest zero-sum            | O(N)  | O(N)  | All zeros, all ones, single element  |

*After O(N) build

---

### Summary
- **Running Sum:** Trivial in-place prefix sum.
- **Pivot Index:** Use total sum to avoid explicit prefix array.
- **Range Sum Query:** Classic padded prefix array for O(1) queries.
- **Subarray Sum = K:** Hash map stores prefix sum frequencies; check for `currSum - k`.
- **Contiguous Array:** Convert 0→-1; hash map stores first occurrence for max length.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Interview Problems Walkthrough**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **interview problems prefix sum** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.


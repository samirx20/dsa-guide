# Part 2, Topic 3: Two Pointers
## Chapter 1: The Two Pointer Technique

The Two Pointer technique is one of the most frequently tested patterns in technical interviews. It is incredibly powerful because it often takes a brute-force $O(N^2)$ solution and reduces it to $O(N)$ time with $O(1)$ space.

The core idea is simple: instead of using one `for` loop to scan an array, you use two integer variables (`left` and `right`) acting as index pointers, moving them through the array simultaneously based on specific conditions.

There are two primary variations of this pattern.

### 1. Opposite-End Pointers (Squeeze Inward)

**Trigger:** The array is **sorted**, and you need to find a pair of elements that meet a condition (like a target sum), or you need to process elements from both extremes.

**The Strategy:**
1. Place the `left` pointer at index `0`.
2. Place the `right` pointer at index `nums.size() - 1`.
3. Use a `while (left < right)` loop.
4. Calculate a value using both pointers.
5. Move either `left` or `right` inward depending on the result.

**Example: Two Sum II (Input is Sorted)**
Find two numbers that add up to a target in a *sorted* array.

```cpp
vector<int> twoSumSorted(vector<int>& nums, int target) {
    int left = 0;
    int right = nums.size() - 1;
    
    while (left < right) {
        int currentSum = nums[left] + nums[right];
        
        if (currentSum == target) {
            return {left, right}; // Found it!
        } 
        // If the sum is too small, we need a bigger number.
        // Because the array is sorted, moving 'left' to the right increases the sum.
        else if (currentSum < target) {
            left++;
        } 
        // If the sum is too big, we need a smaller number.
        // Moving 'right' to the left decreases the sum.
        else {
            right--;
        }
    }
    return {};
}
// Time: O(N) because each element is visited at most once.
// Space: O(1)
```

**What's happening:**
- We start with the smallest and largest elements (since the array is sorted).
- If their sum is too small, we need a larger value → move `left` right.
- If their sum is too large, we need a smaller value → move `right` left.
- If equal, we found our pair.
- Each pointer moves at most N times total → O(N).

**ASCII Diagram:**
```
Array: [2, 7, 11, 15], target = 9

Step 1:  left=0, right=3
         [2, 7, 11, 15]
          ^           ^
          left       right
          sum = 2+15 = 17 > 9 → move right left

Step 2:  left=0, right=2
         [2, 7, 11, 15]
          ^       ^
          left   right
          sum = 2+11 = 13 > 9 → move right left

Step 3:  left=0, right=1
         [2, 7, 11, 15]
          ^   ^
          left right
          sum = 2+7 = 9 = target ✓ → return [0, 1]
```

**Dry-Run Table:**

| Step | left | right | nums[left] | nums[right] | currentSum | Action         |
|------|------|-------|------------|-------------|------------|----------------|
| 1    | 0    | 3     | 2          | 15          | 17         | sum > target → right-- |
| 2    | 0    | 2     | 2          | 11          | 13         | sum > target → right-- |
| 3    | 0    | 1     | 2          | 7           | 9          | sum == target → return [0,1] |

**Edge Case: No Solution Exists**
```cpp
vector<int> twoSumSorted(vector<int>& nums, int target) {
    int left = 0;
    int right = nums.size() - 1;
    
    while (left < right) {
        int currentSum = nums[left] + nums[right];
        if (currentSum == target) return {left, right};
        else if (currentSum < target) left++;
        else right--;
    }
    return {}; // Loop ends without finding a pair
}
// nums = [1, 2, 3], target = 100 → returns empty
```

**Common Mistake: Using `left <= right`**
```cpp
// ❌ WRONG: Using left <= right
while (left <= right) { // Can pair an element with itself!
    // When left == right, we're checking nums[i] + nums[i] = target
    // This is wrong for "two distinct elements" problems
}
```

**Production Variation: Handling Duplicates**
```cpp
// If the problem asks for unique pairs (no duplicate pairs in result)
vector<vector<int>> twoSumUniquePairs(vector<int>& nums, int target) {
    sort(nums.begin(), nums.end());
    vector<vector<int>> result;
    int left = 0, right = nums.size() - 1;
    
    while (left < right) {
        int sum = nums[left] + nums[right];
        if (sum == target) {
            result.push_back({nums[left], nums[right]});
            // Skip duplicates
            while (left < right && nums[left] == nums[left + 1]) left++;
            while (left < right && nums[right] == nums[right - 1]) right--;
            left++;
            right--;
        } else if (sum < target) {
            left++;
        } else {
            right--;
        }
    }
    return result;
}
```

### 2. Same-Direction Pointers (Slow/Fast)

**Trigger:** You need to remove duplicates, detect a cycle (often in linked lists), or move specific elements (like zeros) to the end of an array in-place.

**The Strategy:**
1. Both pointers start at index `0` (or `fast` starts at `1`).
2. The `fast` pointer moves forward in every iteration of a loop.
3. The `slow` pointer only moves forward when a specific condition is met.

*(Note: We saw this pattern in Topic 1, Chapter 2 as the "Read/Write Pointer" pattern).*

**Example: Remove Duplicates from Sorted Array**
Modify the array in-place so that unique elements appear at the beginning.

```cpp
int removeDuplicates(vector<int>& nums) {
    if (nums.empty()) return 0;
    
    int slow = 0; // Points to the last unique element we placed
    
    for (int fast = 1; fast < nums.size(); fast++) {
        // If we found a NEW unique element
        if (nums[fast] != nums[slow]) {
            slow++; // Move the slow pointer forward
            nums[slow] = nums[fast]; // Place the new unique element
        }
    }
    
    // The number of unique elements is the index + 1
    return slow + 1;
}
// Time: O(N)
// Space: O(1)
```

**What's happening:**
- `slow` tracks the position of the last unique element we've placed.
- `fast` scans ahead looking for new unique elements.
- When `fast` finds something different from `slow`, we advance `slow` and copy the new element there.
- After the loop, `slow + 1` is the count of unique elements.

**ASCII Diagram:**
```
nums = [1, 1, 2, 3, 3]

Initial: slow=0, fast=1
[1, 1, 2, 3, 3]
 ^  ^
 slow fast
 nums[fast]==nums[slow] → skip

fast=2: nums[2]=2 ≠ nums[0]=1
[1, 1, 2, 3, 3]
 ^     ^
 slow  fast
 slow++ → slow=1, nums[1]=2

fast=3: nums[3]=3 ≠ nums[1]=2
[1, 2, 2, 3, 3]
    ^     ^
    slow  fast
 slow++ → slow=2, nums[2]=3

fast=4: nums[4]=3 == nums[2]=3 → skip

Result: [1, 2, 3, 3, 3], return slow+1 = 3
```

**Dry-Run Table:**

| Step | fast | nums[fast] | nums[slow] | Equal? | slow (before) | slow (after) | Array State     |
|------|------|------------|------------|--------|---------------|--------------|-----------------|
| 1    | 1    | 1          | 1          | Yes    | 0             | 0            | [1,1,2,3,3]     |
| 2    | 2    | 2          | 1          | No     | 0             | 1            | [1,2,2,3,3]     |
| 3    | 3    | 3          | 2          | No     | 1             | 2            | [1,2,3,3,3]     |
| 4    | 4    | 3          | 3          | Yes    | 2             | 2            | [1,2,3,3,3]     |

Return slow+1 = 3 (three unique elements: 1, 2, 3)

**Edge Case: All Same Elements**
```cpp
// nums = [5, 5, 5, 5]
// slow=0, fast=1: nums[1]==nums[0] → skip
// slow=0, fast=2: nums[2]==nums[0] → skip
// slow=0, fast=3: nums[3]==nums[0] → skip
// Return slow+1 = 1 (one unique element: 5)
```

**Edge Case: Already All Unique**
```cpp
// nums = [1, 2, 3, 4]
// fast=1: 2≠1 → slow=1, nums[1]=2
// fast=2: 3≠2 → slow=2, nums[2]=3
// fast=3: 4≠3 → slow=3, nums[3]=4
// Return slow+1 = 4 (all four are unique)
```

**Common Mistake: Forgetting to check empty array**
```cpp
// ❌ WRONG: Not handling empty input
int removeDuplicates(vector<int>& nums) {
    int slow = 0;
    for (int fast = 1; fast < nums.size(); fast++) {
        // If nums is empty, the loop is skipped and slow + 1 = 1 is returned (should be 0)!
    }
}
```

**Production Variation: Remove Duplicates II (Allow at Most 2 Duplicates)**
```cpp
int removeDuplicates(vector<int>& nums) {
    if (nums.size() <= 2) return nums.size();
    
    int slow = 2; // First two elements are always kept
    
    for (int fast = 2; fast < nums.size(); fast++) {
        // Allow if current is different from the element TWO positions back
        if (nums[fast] != nums[slow - 2]) {
            nums[slow] = nums[fast];
            slow++;
        }
    }
    return slow;
}
```

### 3. When NOT to use Two Pointers
- If the array is **not sorted**, and sorting it ($O(N \log N)$) would ruin a required $O(N)$ time complexity, you probably need a Hash Map instead (like standard Two Sum).
- If you need to find a *contiguous* subarray that meets a condition, you need the **Sliding Window** technique, not standard Two Pointers.
- If the problem requires comparing elements at arbitrary positions (not just ends or sequential), two pointers won't help.

### 4. Error Scenario: Array Not Sorted

```cpp
// ❌ WRONG: Using two pointers on unsorted array
vector<int> nums = {3, 1, 4, 1, 5};
int left = 0, right = 4;
// This will NOT work because moving left/right doesn't guarantee
// we're moving toward the target sum
```

**What's happening:** Two pointers rely on the sorted property. Without it, moving `left` right doesn't necessarily increase the sum, and moving `right` left doesn't necessarily decrease it.

### 5. Error Scenario: Linked List Cycles

```cpp
// Two pointers for cycle detection (Floyd's Algorithm)
bool hasCycle(ListNode *head) {
    if (!head || !head->next) return false;
    
    ListNode *slow = head;
    ListNode *fast = head->next;
    
    while (slow != fast) {
        if (!fast || !fast->next) return false;
        slow = slow->next;
        fast = fast->next->next;
    }
    return true;
}
```

**What's happening:**
- `slow` moves 1 step, `fast` moves 2 steps.
- If there's a cycle, `fast` will eventually meet `slow` inside the cycle.
- If no cycle, `fast` reaches the end (null).
- Time: O(N), Space: O(1).

### 6. Comparison: Opposite-End vs Same-Direction

| Aspect              | Opposite-End              | Same-Direction            |
|---------------------|---------------------------|---------------------------|
| Starting positions  | Left=0, Right=N-1         | Both at 0 (or fast at 1)  |
| Movement direction  | Converge inward           | Both move right            |
| Loop condition      | `while (left < right)`    | `for (fast = 1; ...)`     |
| Best for            | Sorted arrays, pairs      | In-place modification     |
| Time complexity     | O(N)                      | O(N)                      |
| Space complexity    | O(1)                      | O(1)                      |
| Common problems     | Two Sum II, Valid Palindrome | Remove Duplicates, Move Zeros |

### 7. Comparison: Two Pointers vs Sliding Window

| Aspect              | Two Pointers              | Sliding Window             |
|---------------------|---------------------------|---------------------------|
| Pointer movement    | Both move inward or same  | Window expands/contracts  |
| Window size         | Fixed or shrinking        | Dynamic (grows/shrinks)   |
| Best for            | Pairs, palindromes        | Subarray/substring problems |
| Example             | Two Sum II, Reverse String | Longest Substring Without Repeat |
| Time complexity     | O(N)                      | O(N)                      |
| Space complexity    | O(1)                      | O(1) or O(K) for charset  |

### 8. Comparison: Two Pointers vs Hash Map

| Aspect              | Two Pointers              | Hash Map                  |
|---------------------|---------------------------|---------------------------|
| Prerequisite        | Array must be sorted      | No sorting needed         |
| Time complexity     | O(N)                      | O(N)                      |
| Space complexity    | O(1)                      | O(N)                      |
| Best for            | Sorted arrays, pairs      | Unsorted arrays, lookups  |
| When to use         | Sorting is allowed/exists | Need O(1) lookups         |

### 9. Quick Reference Table

| Pattern              | When to Use                        | Loop Condition         | Movement Rule                    | Example Problem           |
|----------------------|------------------------------------|------------------------|----------------------------------|---------------------------|
| Opposite-End         | Sorted array, find pair/palindrome | `while (left < right)` | Move based on comparison         | Two Sum II, Valid Palindrome |
| Same-Direction       | In-place compaction, cycle detect  | `for (fast=1; ...)`    | fast always moves, slow conditionally | Remove Duplicates, Move Zeros |
| Fast/Slow (Cycle)    | Linked list cycle detection        | `while (slow != fast)` | slow+1, fast+2                   | Linked List Cycle         |

### Summary
- **Opposite-End:** Used for sorted arrays or palindromes. Squeeze `left` and `right` inward based on comparisons.
- **Same-Direction:** Used for in-place compaction or cycle detection. `fast` scans ahead, `slow` lags behind and writes/tracks.
- **Complexity:** Always $O(N)$ Time, $O(1)$ Space.
- **Key Rule:** Two pointers require sorted input (for opposite-end) or sequential processing (for same-direction). If neither applies, consider Hash Map or Sliding Window.

---

## Practice & Self-Check

### Predict the Output / Trace by Hand

**Q1.** Run `twoSumSorted` on `nums = [1, 3, 4, 6, 8, 11]`, `target = 10`. Fill in the dry-run table (same columns as Section 1) until it returns.

| Step | left | right | nums[left] | nums[right] | currentSum | Action |
|------|------|-------|------------|-------------|------------|--------|
| 1 | 0 | 5 | ? | ? | ? | ? |
| … | | | | | | |

**Q2.** The "Common Mistake" uses `while (left <= right)`. On `nums = [1, 2, 5]`, `target = 10`, what does the correct version return, and what does the `<=` version return?

**Q3.** Run the slow/fast `removeDuplicates` on `nums = [0, 0, 1, 1, 1, 2, 2, 3, 3, 4]`. What is returned, and what does the full array look like afterwards?

**Q4.** Trace the production variation `twoSumUniquePairs` on `nums = [1, 1, 2, 45, 46, 46]`, `target = 47`. Which pairs are pushed, and what are `left`/`right` after each duplicate-skipping step?

**Q5.** Trace Floyd's `hasCycle` on the list `1 → 2 → 3 → 4`, where node `4`'s `next` points back to node `2`. How many iterations of the `while` loop run, and at which node do `slow` and `fast` meet?

### Coding Exercises

**E1 (Easy).** Squares of a sorted array. `nums` is sorted ascending (may contain negatives). Return the squares, also sorted, in $O(N)$ time using opposite-end pointers.
```cpp
vector<int> sortedSquares(const vector<int>& nums);
```
- `[-4, -1, 0, 3, 10]` → `[0, 1, 9, 16, 100]`
- `[-7, -3, 2, 3, 11]` → `[4, 9, 9, 49, 121]`

**E2 (Easy–Medium).** Count pairs below target. `nums` is sorted ascending. Count index pairs `i < j` with `nums[i] + nums[j] < target` in $O(N)$.
```cpp
long long countPairsLess(const vector<int>& nums, int target);
```
- `nums = [1, 2, 3, 4, 5]`, `target = 6` → `4`
- `nums = [-3, -1, 0, 2, 4]`, `target = 1` → `4`

**E3 (Medium).** Sort colors (Dutch national flag). `nums` contains only `0`, `1`, `2`. Sort it in-place in one pass with $O(1)$ space using three pointers `low`, `mid`, `high`.
```cpp
void sortColors(vector<int>& nums);
```
- `[2, 0, 2, 1, 1, 0]` → `[0, 0, 1, 1, 2, 2]`
- `[2, 0, 1]` → `[0, 1, 2]`

#### Dry-Run: Answers

**Q1.** Returns `[2, 3]` (`4 + 6 = 10`).

| Step | left | right | nums[left] | nums[right] | currentSum | Action |
|------|------|-------|------------|-------------|------------|--------|
| 1 | 0 | 5 | 1 | 11 | 12 | > 10 → right-- |
| 2 | 0 | 4 | 1 | 8 | 9 | < 10 → left++ |
| 3 | 1 | 4 | 3 | 8 | 11 | > 10 → right-- |
| 4 | 1 | 3 | 3 | 6 | 9 | < 10 → left++ |
| 5 | 2 | 3 | 4 | 6 | 10 | == → return [2, 3] |

**Q2.** Correct: sums are `6` (left++), `7` (left++), then `left = right = 2` stops the loop → returns `{}`. With `<=`, the loop continues at `left = right = 2` and checks `5 + 5 = 10`, returning `[2, 2]`: the same element used twice.

**Q3.** Returns `5`; array afterwards `[0, 1, 2, 3, 4, 2, 2, 3, 3, 4]`.

| fast | nums[fast] | nums[slow] | New? | slow after | write |
|------|------------|------------|------|------------|-------|
| 1 | 0 | 0 | No | 0 | — |
| 2 | 1 | 0 | Yes | 1 | nums[1] = 1 |
| 3 | 1 | 1 | No | 1 | — |
| 4 | 1 | 1 | No | 1 | — |
| 5 | 2 | 1 | Yes | 2 | nums[2] = 2 |
| 6 | 2 | 2 | No | 2 | — |
| 7 | 3 | 2 | Yes | 3 | nums[3] = 3 |
| 8 | 3 | 3 | No | 3 | — |
| 9 | 4 | 3 | Yes | 4 | nums[4] = 4 |

Only the first `slow + 1 = 5` slots are meaningful; the tail keeps old values.

**Q4.** Result `[[1, 46], [2, 45]]`.
- `left = 0, right = 5`: `1 + 46 = 47` → push `[1, 46]`. Skip: `nums[0] == nums[1]` so `left = 1`; `nums[5] == nums[4]` so `right = 4`. Then `left++, right--` → `left = 2, right = 3`.
- `left = 2, right = 3`: `2 + 45 = 47` → push `[2, 45]`. No duplicates to skip; `left = 3, right = 2`, loop ends.

Without the skipping, step 1 would move to `left = 1, right = 4` and push `[1, 46]` a second time.

**Q5.** 2 iterations; they meet at node `3`, so it returns `true`.

| Iteration | slow (before) | fast (before) | slow (after) | fast (after) |
|-----------|---------------|---------------|--------------|--------------|
| start | — | — | 1 | 2 |
| 1 | 1 | 2 | 2 | 4 |
| 2 | 2 | 4 | 3 | 3 (4 → 2 → 3) |

After iteration 2, `slow == fast`, so the loop condition fails and the function returns `true`.

**E1 — reference solution**
```cpp
vector<int> sortedSquares(const vector<int>& nums) {
    int n = nums.size();
    vector<int> result(n);
    int left = 0, right = n - 1;
    // The largest square is always at one of the two ends: fill from the back.
    for (int write = n - 1; write >= 0; write--) {
        if (abs(nums[left]) > abs(nums[right])) {
            result[write] = nums[left] * nums[left];
            left++;
        } else {
            result[write] = nums[right] * nums[right];
            right--;
        }
    }
    return result;
}
```
On `[-4, -1, 0, 3, 10]`: `10` beats `-4` (100), `-4` beats `3` (16), `3` beats `-1` (9), `-1` beats `0` (1), then `0`. Time $O(N)$, space $O(N)$ for the output.

**E2 — reference solution**
```cpp
long long countPairsLess(const vector<int>& nums, int target) {
    int left = 0, right = (int)nums.size() - 1;
    long long count = 0;
    while (left < right) {
        if (nums[left] + nums[right] < target) {
            // nums[left] pairs with EVERY index in (left, right]
            count += right - left;
            left++;
        } else {
            right--;
        }
    }
    return count;
}
```
On `[1, 2, 3, 4, 5]`, target 6: `1+5` no → right=3; `1+4 = 5 < 6` → +3 (pairs with 2, 3, 4); `2+4` no → right=2; `2+3 = 5 < 6` → +1. Total `4`. Counting a whole block at once is what keeps it $O(N)$.

**E3 — reference solution**
```cpp
void sortColors(vector<int>& nums) {
    // [0, low) = 0s, [low, mid) = 1s, (high, n-1] = 2s, [mid, high] unknown
    int low = 0, mid = 0, high = (int)nums.size() - 1;
    while (mid <= high) {
        if (nums[mid] == 0) {
            swap(nums[low], nums[mid]);
            low++; mid++;
        } else if (nums[mid] == 1) {
            mid++;
        } else {
            swap(nums[mid], nums[high]);
            high--;                 // do NOT advance mid: the swapped-in value is unchecked
        }
    }
}
```
Trace on `[2, 0, 2, 1, 1, 0]`: swap mid/high → `[0,0,2,1,1,2]`; two `0`s advance low and mid; swap mid/high → `[0,0,1,1,2,2]`; two `1`s advance mid past `high`. One pass, $O(N)$ time, $O(1)$ space. Here `mid` is a same-direction pointer and `high` is an opposite-end pointer.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Chapter 1: The Two Pointer Technique**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **chapter1 two pointers** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.


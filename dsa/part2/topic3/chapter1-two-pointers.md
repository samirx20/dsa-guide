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


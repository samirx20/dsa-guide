# Part 2, Topic 4: Sliding Window
## Chapter 1: The Sliding Window Technique

The Sliding Window is a specific subset of the Two Pointer pattern. It is used when the problem asks you to find a **contiguous subarray or substring** that meets a certain condition (e.g., longest, shortest, max sum, specific frequency).

Think of the window as a frame that slides across the array. The `left` pointer is the back of the frame, and the `right` pointer is the front.

---

## Pattern Classification

| Type | Trigger Keywords | Time | Space |
|------|------------------|------|-------|
| Fixed-Size Window | "subarray of size K", "window of length K" | O(N) | O(1) |
| Variable-Size Window | "longest", "shortest", "minimum/maximum" | O(N) | O(K) |
| Variable + Optimization | "minimum window", "smallest substring" | O(N) | O(K) |

---

### 1. Fixed-Size Window

**Trigger:** The problem specifies the exact size of the subarray (e.g., "Find the max sum of a subarray of size $K$").

**The Strategy:**
You don't need a loop inside a loop. 
1. Calculate the sum/condition for the first window of size $K$.
2. Slide the window one step to the right. 
3. **The Trick:** To update the sum, you don't recalculate everything. You simply **add the new element entering the window** and **subtract the old element leaving the window**.

```cpp
// Example: Maximum Average Subarray I (Find max sum of length K)
double findMaxAverage(vector<int>& nums, int k) {
    int currentSum = 0;
    
    // 1. Build the initial window of size K
    for (int i = 0; i < k; i++) {
        currentSum += nums[i];
    }
    
    int maxSum = currentSum;
    
    // 2. Slide the window from index K to the end
    for (int i = k; i < nums.size(); i++) {
        // Add the new element entering on the right: nums[i]
        // Subtract the old element leaving on the left: nums[i - k]
        currentSum += nums[i] - nums[i - k];
        
        maxSum = max(maxSum, currentSum);
    }
    
    return (double)maxSum / k;
}
// Time: O(N), Space: O(1)
```

**What's happening:**
- Build initial sum of first K elements
- For each subsequent position, slide window right by one
- Add new element entering window (right side)
- Remove old element leaving window (left side)
- Track maximum sum seen

```
Array: [1, 12, -5, -6, 50, 3], K = 4

Step 1: Build initial window
[1, 12, -5, -6] 50  3
 sum = 1 + 12 + (-5) + (-6) = 2

Step 2: Slide window
 1 [12, -5, -6, 50] 3
    sum = 2 - 1 + 50 = 51 (add 50, remove 1)

Step 3: Slide window
 1  12 [-5, -6, 50, 3]
       sum = 51 - 12 + 3 = 42 (add 3, remove 12)

Maximum sum = 51
```

#### ASCII Diagram: Fixed Window Movement
```
Array:    [ 1, 12, -5, -6, 50, 3 ]
Index:      0   1   2   3   4   5

Window 1: [ 1, 12, -5, -6 ]  50   3
           ←─── K=4 ───→

Window 2:  1 [ 12, -5, -6, 50] 3
               ←─── K=4 ───→

Window 3:  1  12 [ -5, -6, 50, 3]
                    ←─── K=4 ───→

Update formula: newSum = oldSum - nums[i-k] + nums[i]
```

#### Dry-Run Table
| Iteration | Window Start | Window End | Elements in Window | Sum | Max |
|-----------|--------------|------------|-------------------|-----|-----|
| 1 | 0 | 3 | [1, 12, -5, -6] | 2 | 2 |
| 2 | 1 | 4 | [12, -5, -6, 50] | 51 | 51 |
| 3 | 2 | 5 | [-5, -6, 50, 3] | 42 | 51 |

#### Edge Case: K Equals Array Length
```cpp
// Input: [1, 2, 3], K = 3
// Only one window possible: [1, 2, 3]
// Sum = 6
// The loop (for i = k; i < n; i++) doesn't execute
```

#### Edge Case: K=1
```cpp
// Input: [5, -1, 3], K = 1
// Windows: [5], [-1], [3]
// Max = 5
// Each window is just one element
```

#### Common Mistake: Off-by-One Error
```cpp
// WRONG: Using wrong subtraction index
currentSum += nums[i] - nums[i - k + 1]; // Off by one!

// CORRECT: Subtract the element leaving the window
currentSum += nums[i] - nums[i - k];
// nums[i - k] is the element that just left the window
```

#### Dry-Run: Off-by-One Error
```
Array: [1, 2, 3, 4, 5], K = 3

Correct (nums[i-k]):
Window 1: [1,2,3] sum=6
Window 2: [2,3,4] sum = 6 - 1 + 4 = 9 ✓
Window 3: [3,4,5] sum = 9 - 2 + 5 = 12 ✓

Wrong (nums[i-k+1]):
Window 1: [1,2,3] sum=6
Window 2: sum = 6 - 2 + 4 = 8 ✗ (removed wrong element!)
Window 3: sum = 8 - 3 + 5 = 10 ✗
```

#### Production Version with Validation
```cpp
class Solution {
public:
    double findMaxAverage(vector<int>& nums, int k) {
        if (nums.empty() || k <= 0 || k > nums.size()) return 0.0;
        
        int currentSum = 0;
        
        for (int i = 0; i < k; i++) {
            currentSum += nums[i];
        }
        
        int maxSum = currentSum;
        
        for (int i = k; i < nums.size(); i++) {
            currentSum += nums[i] - nums[i - k];
            maxSum = max(maxSum, currentSum);
        }
        
        return (double)maxSum / k;
    }
};
```

---

### 2. Variable-Size Window (The Important One)

**Trigger:** The size of the subarray is unknown. The problem asks for the "Longest" or "Shortest" contiguous sequence that satisfies a rule (e.g., "Longest substring with no repeating characters").

**The Strategy (The Expand & Shrink Template):**
1. Use `left` and `right` pointers, both starting at `0`.
2. Expand the window by moving `right` and adding the new element to your tracking state (like a hash map of counts).
3. If the window **violates the rule** (e.g., you now have a repeating character), you must shrink the window from the `left` until the rule is satisfied again.
4. Record the max/min length.

**The Golden Template for Variable Windows:**
Memorize this structure. Almost every Sliding Window Hard problem uses this exact loop.

```cpp
int variableSlidingWindow(string s) {
    int left = 0;
    int maxLength = 0;
    unordered_map<char, int> counts; // Track state inside the window
    
    for (int right = 0; right < s.length(); right++) {
        // 1. EXPAND: Add the element at 'right' to the window state
        char rightChar = s[right];
        counts[rightChar]++;
        
        // 2. SHRINK (if invalid): Use a 'while' loop to move 'left' 
        // until the window state is valid again
        while (/* window is INVALID */) {
            char leftChar = s[left];
            counts[leftChar]--; // Remove the element leaving the window
            if (counts[leftChar] == 0) counts.erase(leftChar);
            left++; // Shrink the window
        }
        
        // 3. UPDATE RESULT: At this point, the window is guaranteed to be VALID.
        maxLength = max(maxLength, right - left + 1);
    }
    return maxLength;
}
```

**What's happening:**
- `right` pointer expands window by moving right
- Add each new element to tracking state (hash map)
- When window becomes invalid, `left` pointer shrinks until valid again
- Update result after each valid window expansion
- The while loop ensures we always have a valid window

#### ASCII Diagram: Variable Window Expand & Shrink
```
String: "abcabcbb"

right=0: [a] → valid, maxLen=1
         ↑
        left

right=1: [a,b] → valid, maxLen=2
         ↑  ↑
        left right

right=2: [a,b,c] → valid, maxLen=3
         ↑     ↑
        left  right

right=3: [a,b,c,a] → INVALID (duplicate 'a')
         ↓ shrink left until valid
         [b,c,a] → valid, maxLen=3
            ↑  ↑
           left right

right=4: [b,c,a,b] → INVALID (duplicate 'b')
         ↓ shrink left until valid
         [c,a,b] → valid, maxLen=3
            ↑  ↑
           left right
```

```
String: "abcabcbb"

Step 1: right=0, char='a'
Window: [a] → valid, maxLen=1

Step 2: right=1, char='b'
Window: [a,b] → valid, maxLen=2

Step 3: right=2, char='c'
Window: [a,b,c] → valid, maxLen=3

Step 4: right=3, char='a'
Window: [a,b,c,a] → INVALID (duplicate 'a')
Shrink: remove 'a' at left=0 → [b,c,a] → valid, maxLen=3

Step 5: right=4, char='b'
Window: [b,c,a,b] → INVALID (duplicate 'b')
Shrink: remove 'b' at left=1 → [c,a,b] → valid, maxLen=3

...continues
```

#### Variable Window Comparison

| Aspect | Fixed-Size | Variable-Size |
|--------|------------|---------------|
| Window Size | Known (K) | Unknown |
| Shrinking | No | Yes (while loop) |
| Tracking State | Sum only | Hash map/frequency |
| Update Timing | After each slide | After each expansion |
| Complexity | Simpler | More complex |

#### Edge Case: Empty String
```cpp
// Input: ""
// Output: 0
// The for loop doesn't execute, returns maxLength = 0
```

#### Edge Case: Single Character
```cpp
// Input: "a"
// Output: 1
// Window: [a] → valid, maxLen=1
```

#### Common Mistake: Forgetting to Erase from Map
```cpp
// WRONG: Only decrementing count
counts[leftChar]--;

// CORRECT: Erase when count reaches zero
counts[leftChar]--;
if (counts[leftChar] == 0) counts.erase(leftChar);
```

#### Why Erase Matters
```
String: "abba"
Window tracking: {a: 2, b: 2} → INVALID (a has count 2)

Without erase:
- When left moves past first 'a', counts = {a: 1, b: 2}
- Map size is still 2, but we have duplicate 'b'
- We can't use map.size() to check uniqueness!

With erase:
- When left moves past first 'a', counts = {a: 0}
- Erase 'a' → counts = {b: 2}
- Map size = 1, but we have duplicate 'b'
- Still can't use map.size() alone!

Actually, the condition should be:
while (counts.size() < window length) → INVALID
Or: while (right - left + 1 > unique characters) → INVALID
```

---

### 3. Comparing Sliding Window vs Prefix Sums
It is easy to confuse when to use which pattern for subarray problems.

- **Sliding Window:** Only works if the array elements are **positive** (or if adding elements strictly increases a count/length). If there are negative numbers, expanding the window might *decrease* the sum, breaking the logic of the `while` loop shrink.
- **Prefix Sum + Hash Map:** Works with negative numbers. Used when you need exact sums, not maximum/minimum lengths.

```
Comparison Visualization:

Array with positives: [2, 1, 5, 1, 3, 2]
→ Sliding window works perfectly
→ Expanding always increases sum (until negative numbers appear)

Array with negatives: [2, -1, 5, -3, 2, -1]
→ Sliding window breaks!
→ Expanding might decrease sum, invalidating our logic
→ Use Prefix Sum + Hash Map instead
```

#### ASCII Diagram: When Window Breaks
```
Array: [10, -5, 10, -5, 10]
Target: sum ≤ 15

Window expansion:
[10] sum=10, valid ✓
[10,-5] sum=5, valid ✓
[10,-5,10] sum=15, valid ✓
[10,-5,10,-5] sum=10, valid ✓
[10,-5,10,-5,10] sum=20, INVALID

Shrink left:
[-5,10,-5,10] sum=10, valid ✓
[-5,10,-5] sum=0, valid ✓

But this is wrong! We should have [10,-5,10] at sum=15
The window shrank too much because -5 made the sum smaller.

The issue: with negative numbers, shrinking doesn't always help!
```

#### Decision Table

| Condition | Use Pattern |
|-----------|-------------|
| Find longest/shortest subarray with sum ≤ K | Sliding Window (if all positive) |
| Find subarray with exact sum K | Prefix Sum + Hash Map |
| Find subarray with sum ≥ K | Sliding Window (if all positive) |
| Array contains negative numbers | Prefix Sum + Hash Map |
| Count of subarrays with sum = K | Prefix Sum + Hash Map |
| Maximum sum subarray of size K | Fixed-Size Sliding Window |
| Longest substring with K unique chars | Variable-Size Window |
| Minimum window substring | Variable-Size Window |

#### Prefix Sum Pattern (For Reference)
```cpp
// When to use: Array has negatives, need exact sums
int subarraySum(vector<int>& nums, int k) {
    unordered_map<int, int> prefixSums;
    prefixSums[0] = 1;
    int count = 0, currentSum = 0;
    
    for (int num : nums) {
        currentSum += num;
        
        // If (currentSum - k) exists in map, we found a subarray
        if (prefixSums.count(currentSum - k)) {
            count += prefixSums[currentSum - k];
        }
        
        prefixSums[currentSum]++;
    }
    return count;
}
// Time: O(N), Space: O(N)
```

#### Dry-Run: Prefix Sum Pattern
```
nums = [3, 4, 7, 2, -3, 1, 4, 2], k = 7

i=0: currentSum=3, target=3-7=-4 (not found)
     prefixSums = {0:1, 3:1}

i=1: currentSum=7, target=7-7=0 (found! count += 1)
     prefixSums = {0:1, 3:1, 7:1}

i=2: currentSum=14, target=14-7=7 (found! count += 1)
     prefixSums = {0:1, 3:1, 7:1, 14:1}

i=3: currentSum=16, target=16-7=9 (not found)
     prefixSums = {0:1, 3:1, 7:1, 14:1, 16:1}

i=4: currentSum=13, target=13-7=6 (not found)
     prefixSums = {0:1, 3:1, 7:1, 14:1, 16:1, 13:1}

i=5: currentSum=14, target=14-7=7 (found! count += 1)
     prefixSums = {0:1, 3:1, 7:1, 14:2, 16:1, 13:1}

i=6: currentSum=18, target=18-7=11 (not found)

i=7: currentSum=20, target=20-7=13 (found! count += 1)

Final count: 4 subarrays with sum = 7
```

---

### 4. Template Cheat Sheet

```cpp
// FIXED-SIZE WINDOW TEMPLATE
int fixedWindow(vector<int>& nums, int k) {
    int windowSum = 0;
    
    // Build initial window
    for (int i = 0; i < k; i++) {
        windowSum += nums[i];
    }
    
    int result = windowSum;
    
    // Slide the window
    for (int i = k; i < nums.size(); i++) {
        windowSum += nums[i] - nums[i - k];
        result = max(result, windowSum); // or min
    }
    
    return result;
}

// VARIABLE-SIZE WINDOW TEMPLATE
int variableWindow(vector<int>& nums, int target) {
    int left = 0;
    int result = 0;
    // Add tracking state (sum, count, map, etc.)
    int windowState = 0;
    
    for (int right = 0; right < nums.size(); right++) {
        // EXPAND: Add right element to state
        windowState += nums[right];
        
        // SHRINK: While window is invalid
        while (/* window invalid condition */) {
            windowState -= nums[left];
            left++;
        }
        
        // UPDATE: Window is valid
        result = max(result, right - left + 1); // or other metric
    }
    
    return result;
}
```

---

## Quick Reference Table

| Pattern | Time | Space | When to Use |
|---------|------|-------|-------------|
| Fixed-Size Window | O(N) | O(1) | Known window size K |
| Variable-Size Window | O(N) | O(K) | Longest/shortest subarray |
| Prefix Sum + Hash Map | O(N) | O(N) | Exact sum, negative numbers |

| Keyword | Pattern |
|---------|---------|
| "size K" | Fixed-Size |
| "longest/shortest" | Variable-Size |
| "sum equals K" | Prefix Sum + Hash Map |
| "at most K" | Variable-Size |

---

## Error Scenarios

| Error | Cause | Fix |
|-------|-------|-----|
| Wrong window sum | Off-by-one in subtraction | Use `nums[i-k]` not `nums[i-k+1]` |
| Infinite loop in shrink | Never removing elements | Ensure left++ in while loop |
| Wrong answer with negatives | Using window for negative arrays | Use Prefix Sum + Hash Map |
| Empty result | k > array size | Check `k <= nums.size()` |
| TLE | Recalculating window sum | Use sliding window update formula |

---

## Practice & Self-Check

### Predict the Output / Trace by Hand

**Q1.** Run `findMaxAverage` on `nums = [4, 2, 1, 7, 8, 1, 2, 8, 1, 0]`, `k = 3`. List every window sum, the maximum sum, and the returned average.

**Q2.** The "Common Mistake" subtracts `nums[i - k + 1]` instead of `nums[i - k]`. On `nums = [3, 1, 4, 1, 5, 9]`, `k = 3`, give `currentSum` after each slide for both the correct and the buggy code, and the max sum each would report.

**Q3.** Fill in the Golden Template for "longest substring without repeating characters" with the invalid condition `counts[s[right]] > 1`, and run it on `s = "pwwkew"`. Give `left`, the window, its length and `maxLength` after each `right`.

| right | char | left (after shrink) | window | length | maxLength |
|-------|------|---------------------|--------|--------|-----------|
| 0 | p | ? | ? | ? | ? |
| 1 | w | ? | ? | ? | ? |
| 2 | w | ? | ? | ? | ? |
| 3 | k | ? | ? | ? | ? |
| 4 | e | ? | ? | ? | ? |
| 5 | w | ? | ? | ? | ? |

**Q4.** "Shortest subarray with sum $\ge$ K" is a variable window that shrinks *while valid*. Trace it on `nums = [2, 3, 1, 2, 4, 3]`, `target = 7`: record every time the window is valid (sum $\ge 7$), its length, and the final answer.
```cpp
int left = 0, sum = 0, best = INT_MAX;
for (int right = 0; right < nums.size(); right++) {
    sum += nums[right];
    while (sum >= target) {
        best = min(best, right - left + 1);
        sum -= nums[left];
        left++;
    }
}
```

**Q5.** The template has a `while` loop inside a `for` loop, yet the chapter claims $O(N)$. Running the Q3 version on the chapter's `"abcabcbb"`, how many times in total does `left++` execute? What does that tell you?

### Coding Exercises

**E1 (Easy).** Count fixed windows above a threshold. Return how many windows of size `k` have average $\ge$ `threshold` (compare sums against `k * threshold` to stay in integers).
```cpp
int numOfSubarrays(const vector<int>& arr, int k, int threshold);
```
- `arr = [2, 2, 2, 2, 5, 5, 5, 8]`, `k = 3`, `threshold = 4` → `3`
- `arr = [11, 13, 17, 23, 29, 31, 7, 5, 2, 3]`, `k = 3`, `threshold = 5` → `6`

**E2 (Easy–Medium).** Max consecutive ones with `k` flips. `nums` is binary; you may flip at most `k` zeros to ones. Return the longest run of ones possible (a variable window that is invalid when it holds more than `k` zeros).
```cpp
int longestOnes(const vector<int>& nums, int k);
```
- `nums = [1,1,1,0,0,0,1,1,1,1,0]`, `k = 2` → `6`
- `nums = [0,0,1,1,0,0,1,1,1,0,1,1,0,0,0,1,1,1,1]`, `k = 3` → `10`

**E3 (Medium).** Longest substring with at most `k` distinct characters (from the Decision Table). This is where erasing zero-count keys matters: the window is invalid when `counts.size() > k`.
```cpp
int lengthOfLongestSubstringKDistinct(const string& s, int k);
```
- `s = "eceba"`, `k = 2` → `3` (`"ece"`)
- `s = "aa"`, `k = 1` → `2`

#### Dry-Run: Answers

**Q1.** Window sums: `7, 10, 16, 16, 11, 11, 11, 9`. Max sum `16` (windows `[1, 7, 8]` and `[7, 8, 1]`), returned average $16 / 3 \approx 5.333$.

| i (entering) | leaving nums[i-3] | currentSum | maxSum |
|---|---|---|---|
| (initial) | — | 4+2+1 = 7 | 7 |
| 3 | 4 | 7 + 7 - 4 = 10 | 10 |
| 4 | 2 | 10 + 8 - 2 = 16 | 16 |
| 5 | 1 | 16 + 1 - 1 = 16 | 16 |
| 6 | 7 | 16 + 2 - 7 = 11 | 16 |
| 7 | 8 | 11 + 8 - 8 = 11 | 16 |
| 8 | 1 | 11 + 1 - 1 = 11 | 16 |
| 9 | 2 | 11 + 0 - 2 = 9 | 16 |

**Q2.** Correct reports `15`; buggy reports `17`, a sum no window of size 3 actually has.

| i | Correct: subtract nums[i-3] | Correct sum | Buggy: subtract nums[i-2] | Buggy sum |
|---|-----|-----|-----|-----|
| init | — | 8 | — | 8 |
| 3 | nums[0] = 3 | 8 + 1 - 3 = 6 | nums[1] = 1 | 8 + 1 - 1 = 8 |
| 4 | nums[1] = 1 | 6 + 5 - 1 = 10 | nums[2] = 4 | 8 + 5 - 4 = 9 |
| 5 | nums[2] = 4 | 10 + 9 - 4 = 15 | nums[3] = 1 | 9 + 9 - 1 = 17 |

**Q3.** Answer `3` (`"wke"`).

| right | char | left (after shrink) | window | length | maxLength |
|-------|------|---------------------|--------|--------|-----------|
| 0 | p | 0 | p | 1 | 1 |
| 1 | w | 0 | pw | 2 | 2 |
| 2 | w | 2 (drop p, w) | w | 1 | 2 |
| 3 | k | 2 | wk | 2 | 2 |
| 4 | e | 2 | wke | 3 | 3 |
| 5 | w | 3 (drop w) | kew | 3 | 3 |

**Q4.** Answer `2` (`[4, 3]`). The window becomes valid five times:

| right | left | window | sum | length | best |
|-------|------|--------|-----|--------|------|
| 3 | 0 | [2,3,1,2] | 8 | 4 | 4 |
| 4 | 1 | [3,1,2,4] | 10 | 4 | 4 |
| 4 | 2 | [1,2,4] | 7 | 3 | 3 |
| 5 | 3 | [2,4,3] | 9 | 3 | 3 |
| 5 | 4 | [4,3] | 7 | 2 | 2 |

Unlike the "longest" template, the result is updated *inside* the `while`, because here every valid window is a candidate and we shrink to find a shorter one.

**Q5.** `left++` runs **7** times in total: once each at `right = 3, 4, 5`, and twice each at `right = 6, 7`. Since `left` only moves forward and never passes `right`, the inner loop can run at most $N$ times over the *whole* algorithm. Total work is at most $2N$ pointer moves: $O(N)$, not $O(N^2)$ (amortised analysis).

**E1 — reference solution**
```cpp
int numOfSubarrays(const vector<int>& arr, int k, int threshold) {
    int windowSum = 0, count = 0;
    int need = k * threshold;                    // avg >= t  <=>  sum >= k*t
    for (int i = 0; i < (int)arr.size(); i++) {
        windowSum += arr[i];                     // element entering
        if (i >= k) windowSum -= arr[i - k];     // element leaving
        if (i >= k - 1 && windowSum >= need) count++;
    }
    return count;
}
```
First example: window sums `6, 6, 9, 12, 15, 18`, and `need = 12`, so the last three count. Folding the "build" loop into the slide loop with the `i >= k` guard is a common compact form. Time $O(N)$, space $O(1)$.

**E2 — reference solution**
```cpp
int longestOnes(const vector<int>& nums, int k) {
    int left = 0, zeros = 0, best = 0;
    for (int right = 0; right < (int)nums.size(); right++) {
        if (nums[right] == 0) zeros++;           // EXPAND
        while (zeros > k) {                      // SHRINK while invalid
            if (nums[left] == 0) zeros--;
            left++;
        }
        best = max(best, right - left + 1);      // UPDATE (window valid)
    }
    return best;
}
```
The tracking state is just a zero counter. In the first example the best window is indices `5..10` (`[0,1,1,1,1,0]`, two zeros flipped), length 6. Time $O(N)$, space $O(1)$.

**E3 — reference solution**
```cpp
int lengthOfLongestSubstringKDistinct(const string& s, int k) {
    unordered_map<char, int> counts;
    int left = 0, best = 0;
    for (int right = 0; right < (int)s.size(); right++) {
        counts[s[right]]++;
        while ((int)counts.size() > k) {         // too many distinct characters
            char c = s[left];
            if (--counts[c] == 0) counts.erase(c);   // erase so size() stays truthful
            left++;
        }
        best = max(best, right - left + 1);
    }
    return best;
}
```
On `"eceba"`, `k = 2`: the window grows to `"ece"` (length 3); adding `'b'` at index 3 makes 3 distinct, so `left` drops `e` (count 2 → 1, key stays) and then `c` (count 1 → 0, key erased), leaving `"eb"`. Without the `erase`, `counts.size()` would never shrink, so the `while` loop would keep moving `left` past perfectly valid windows (and eventually past `right`). Time $O(N)$, space $O(k)$.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Chapter 1: The Sliding Window Technique**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **chapter1 sliding window** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.


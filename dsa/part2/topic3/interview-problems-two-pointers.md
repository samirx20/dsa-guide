# Part 2, Topic 3: Two Pointers
## Interview Problems Walkthrough

The Two Pointer technique is the foundation for some of the most famous interview questions in existence.

---

## Problem Classification Table

| # | Problem | Difficulty | Pattern | Key Insight |
|---|---------|------------|---------|-------------|
| 1 | Valid Palindrome | Easy | Opposite-end | Skip non-alphanumeric, compare inward |
| 2 | 3Sum | Medium | Fixed + Opposite-end | Sort + iterate + two-pointer pair |
| 3 | Container With Most Water | Medium | Opposite-end | Move shorter pointer inward |
| 4 | Trapping Rain Water | Hard | Opposite-end + State | Track max_left/max_right |

---

## Solution Approach Comparison

| Approach | Time | Space | Best For |
|----------|------|-------|----------|
| Brute Force | O(N^2) to O(N^3) | O(1) | Small inputs only |
| Two Pointers | O(N) | O(1) | Sorted/ordered data |
| Hash Map + Two Pointers | O(N) | O(N) | When ordering not possible |

---

### 1. Valid Palindrome (Easy)
**Trigger:** Check if a string reads the same forwards and backwards.
**Intuition:** Opposite-end pointers. Start `left` at 0 and `right` at the end. If they match, squeeze inward. The tricky part is ignoring non-alphanumeric characters (spaces, punctuation). Use `isalnum()` to skip them.

```cpp
bool isPalindrome(string s) {
    int left = 0, right = s.length() - 1;
    
    while (left < right) {
        // Skip non-alphanumeric chars
        while (left < right && !isalnum(s[left])) left++;
        while (left < right && !isalnum(s[right])) right--;
        
        // Compare lowercase versions
        if (tolower(s[left]) != tolower(s[right])) return false;
        
        left++;
        right--;
    }
    return true;
}
// Time: O(N), Space: O(1)
```

**What's happening:** 
- Two pointers start at opposite ends of the string
- Inner while loops skip non-alphanumeric characters
- We compare characters in lowercase to handle case-insensitivity
- If characters don't match, we immediately return false
- If pointers meet in the middle, the entire string is a palindrome

```
Input: "A man, a plan, a canal: Panama"
       ↓                                    ↓
       A    m a n , a p l a n , a c a n a l : P a n a m a
       ↑                                    ↑
       
Step 1: left='A', right='a' → match (tolower)
Step 2: left='m', right='m' → match
...
Step N: All characters matched → return true
```

#### Dry-Run Table
| Iteration | left | right | s[left] | s[right] | Match? |
|-----------|------|-------|---------|----------|--------|
| 1 | 0 | 29 | 'A' | 'a' | Yes |
| 2 | 1 | 28 | 'm' | 'm' | Yes |
| 3 | 2 | 27 | 'a' | 'a' | Yes |
| ... | ... | ... | ... | ... | ... |

#### Edge Case: Empty String
```cpp
bool isPalindrome(string s) {
    int left = 0, right = s.length() - 1;
    // If s is empty, left (0) > right (-1), loop doesn't execute
    // Returns true (empty string is a palindrome)
    while (left < right) { ... }
    return true;
}
```

#### Common Mistake: Forgetting tolower()
```cpp
// WRONG: Case-sensitive comparison
if (s[left] != s[right]) return false;

// CORRECT: Case-insensitive
if (tolower(s[left]) != tolower(s[right])) return false;
```

#### Production Version with Input Validation
```cpp
class Solution {
public:
    bool isPalindrome(string s) {
        if (s.empty()) return true;
        
        int left = 0, right = s.size() - 1;
        
        while (left < right) {
            while (left < right && !isalnum(s[left])) left++;
            while (left < right && !isalnum(s[right])) right--;
            
            if (tolower(s[left]) != tolower(s[right])) return false;
            
            left++;
            right--;
        }
        return true;
    }
};
```

---

### 2. 3Sum (Medium)
**Trigger:** Find three numbers in an array that sum to `0`.
**Intuition:** This is a classic interview question. The brute force is $O(N^3)$. 
We can reduce this to $O(N^2)$ by first **sorting the array**. Then, iterate through the array with a fixed pointer `i`. For the remaining numbers to the right of `i`, use the **Opposite-End Two Pointer** strategy to find a pair that sums to `-nums[i]`. 

*Critical Edge Case:* You must avoid returning duplicate triplets. Skip adjacent identical numbers for both the `i` pointer and the `left`/`right` pointers.

```cpp
vector<vector<int>> threeSum(vector<int>& nums) {
    vector<vector<int>> result;
    sort(nums.begin(), nums.end()); // Required for two pointers
    
    for (int i = 0; i < nums.size(); i++) {
        // Skip duplicates for the first number
        if (i > 0 && nums[i] == nums[i - 1]) continue;
        
        int left = i + 1;
        int right = nums.size() - 1;
        
        while (left < right) {
            int sum = nums[i] + nums[left] + nums[right];
            
            if (sum == 0) {
                result.push_back({nums[i], nums[left], nums[right]});
                left++; right--;
                
                // Skip duplicates for the second number
                while (left < right && nums[left] == nums[left - 1]) left++;
                // Skip duplicates for the third number
                while (left < right && nums[right] == nums[right + 1]) right--;
            } 
            else if (sum < 0) left++;
            else right--;
        }
    }
    return result;
}
// Time: O(N^2), Space: O(1) (excluding output array)
```

**What's happening:**
- Sorting enables two-pointer technique and duplicate skipping
- Fixed pointer `i` iterates through each possible first element
- Two pointers `left` and `right` find pairs that sum to `-nums[i]`
- After finding a valid triplet, we skip duplicates to avoid repeated results
- If sum < 0, we need a larger sum → move left pointer right
- If sum > 0, we need a smaller sum → move right pointer left

```
Input: [-1, 0, 1, 2, -1, -4]
Sorted: [-4, -1, -1, 0, 1, 2]

i=0 (val=-4):
  left=1 (val=-1), right=5 (val=2)
  sum = -4 + (-1) + 2 = -3 < 0 → left++
  
  left=2 (val=-1), right=5 (val=2)
  sum = -4 + (-1) + 2 = -3 < 0 → left++
  
  left=3 (val=0), right=5 (val=2)
  sum = -4 + 0 + 2 = -2 < 0 → left++
  
  left=4 (val=1), right=5 (val=2)
  sum = -4 + 1 + 2 = -1 < 0 → left++
  
  left=5 → loop ends

i=1 (val=-1):
  left=2 (val=-1), right=5 (val=2)
  sum = -1 + (-1) + 2 = 0 → FOUND! [-1,-1,2]
```

#### Dry-Run Table (Finding first triplet)
| Step | i | left | right | nums[i] | nums[left] | nums[right] | Sum | Action |
|------|---|------|-------|---------|------------|-------------|-----|--------|
| 1 | 0 | 1 | 5 | -4 | -1 | 2 | -3 | left++ |
| 2 | 0 | 2 | 5 | -4 | -1 | 2 | -3 | left++ |
| 3 | 0 | 3 | 5 | -4 | 0 | 2 | -2 | left++ |
| 4 | 0 | 4 | 5 | -4 | 1 | 2 | -1 | left++ |
| 5 | 0 | 5 | 5 | -4 | 2 | 2 | - | loop ends |
| 6 | 1 | 2 | 5 | -1 | -1 | 2 | 0 | FOUND |

#### Edge Case: All Zeros
```cpp
// Input: [0, 0, 0, 0]
// Output: [[0, 0, 0]]
// The duplicate skipping ensures only one triplet is returned
```

#### Common Mistake: Forgetting Duplicate Skip
```cpp
// WRONG: Returns duplicate triplets
if (sum == 0) {
    result.push_back({nums[i], nums[left], nums[right]});
    left++; right--;
    // Missing duplicate skip!
}

// CORRECT: Skip duplicates after finding triplet
if (sum == 0) {
    result.push_back({nums[i], nums[left], nums[right]});
    left++; right--;
    while (left < right && nums[left] == nums[left - 1]) left++;
    while (left < right && nums[right] == nums[right + 1]) right--;
}
```

#### Production Version with Early Termination
```cpp
class Solution {
public:
    vector<vector<int>> threeSum(vector<int>& nums) {
        vector<vector<int>> result;
        int n = nums.size();
        
        if (n < 3) return result;
        
        sort(nums.begin(), nums.end());
        
        for (int i = 0; i < n - 2; i++) {
            if (nums[i] > 0) break; // All remaining will be positive
            if (i > 0 && nums[i] == nums[i - 1]) continue;
            
            int left = i + 1, right = n - 1;
            
            while (left < right) {
                int sum = nums[i] + nums[left] + nums[right];
                
                if (sum == 0) {
                    result.push_back({nums[i], nums[left], nums[right]});
                    left++; right--;
                    while (left < right && nums[left] == nums[left - 1]) left++;
                    while (left < right && nums[right] == nums[right + 1]) right--;
                } else if (sum < 0) {
                    left++;
                } else {
                    right--;
                }
            }
        }
        return result;
    }
};
```

---

### 3. Container With Most Water (Medium)
**Trigger:** Given an array of heights, find two lines that form a container holding the most water.
**Intuition:** The volume of water is limited by the *shorter* line, multiplied by the *width* (distance between them). 
Start with the maximum width: `left = 0`, `right = size - 1`. Calculate the area. To find a potentially larger area, you must move the pointer pointing to the **shorter line** inward, hoping to find a taller line to compensate for the reduced width.

```cpp
int maxArea(vector<int>& height) {
    int max_water = 0;
    int left = 0;
    int right = height.size() - 1;
    
    while (left < right) {
        int width = right - left;
        // Area = width * min(height[left], height[right])
        int current_water = width * min(height[left], height[right]);
        max_water = max(max_water, current_water);
        
        // Greedy choice: Always abandon the shorter line
        if (height[left] < height[right]) {
            left++;
        } else {
            right--;
        }
    }
    return max_water;
}
// Time: O(N), Space: O(1)
```

**What's happening:**
- Start with maximum width (leftmost and rightmost lines)
- Calculate area using the shorter line as the height constraint
- Move the pointer of the shorter line inward
- We skip the shorter line because keeping it can only decrease or maintain area
- We gain width but lose the shorter height constraint

```
Height: [1, 8, 6, 2, 5, 4, 8, 3, 7]

Step 1: left=0 (h=1), right=8 (h=7)
        area = 8 * min(1,7) = 8
        Move left (1 < 7)
        
Step 2: left=1 (h=8), right=8 (h=7)
        area = 7 * min(8,7) = 49
        Move right (7 < 8)
        
Step 3: left=1 (h=8), right=7 (h=3)
        area = 6 * min(8,3) = 18
        Move right (3 < 8)
        
...continues until pointers meet
```

#### Dry-Run Table
| Step | left | right | h[left] | h[right] | Width | Area | Action |
|------|------|-------|---------|----------|-------|------|--------|
| 1 | 0 | 8 | 1 | 7 | 8 | 8 | left++ |
| 2 | 1 | 8 | 8 | 7 | 7 | 49 | right-- |
| 3 | 1 | 7 | 8 | 3 | 6 | 18 | right-- |
| 4 | 1 | 6 | 8 | 8 | 5 | 40 | right-- |
| 5 | 1 | 5 | 8 | 4 | 4 | 16 | right-- |
| 6 | 1 | 4 | 8 | 5 | 3 | 15 | right-- |
| 7 | 1 | 3 | 8 | 2 | 2 | 4 | right-- |
| 8 | 1 | 2 | 8 | 6 | 1 | 6 | right-- |

**Answer: 49** (lines at index 1 and 8)

#### Edge Case: Two Lines
```cpp
// Input: [1, 2]
// Output: 1 (only one possible container)
// Width = 1, Area = 1 * min(1,2) = 1
```

#### Common Mistake: Moving Wrong Pointer
```cpp
// WRONG: Moving the taller line
if (height[left] > height[right]) {
    left++; // This is wrong!
}

// CORRECT: Move the shorter line
if (height[left] < height[right]) {
    left++;
} else {
    right--;
}
```

#### Production Version
```cpp
class Solution {
public:
    int maxArea(vector<int>& height) {
        if (height.size() < 2) return 0;
        
        int max_water = 0;
        int left = 0, right = height.size() - 1;
        
        while (left < right) {
            int width = right - left;
            int current_water = width * min(height[left], height[right]);
            max_water = max(max_water, current_water);
            
            if (height[left] < height[right]) {
                left++;
            } else {
                right--;
            }
        }
        return max_water;
    }
};
```

---

### 4. Trapping Rain Water (Hard)
**Trigger:** Given an elevation map, compute how much water it can trap after raining.
**Intuition:** This is one of the most feared questions, but the $O(1)$ space Two Pointer solution is elegant. 
Water trapped above a specific bar is determined by `min(max_left_height, max_right_height) - current_height`. 
Instead of precomputing arrays for `max_left` and `max_right`, we use two pointers. If `max_left < max_right`, we *know* the water level on the left side is constrained by `max_left`, regardless of what happens in the middle. We calculate the water for `left` and move it inward.

```cpp
int trap(vector<int>& height) {
    if (height.empty()) return 0;
    
    int left = 0, right = height.size() - 1;
    int left_max = height[left], right_max = height[right];
    int water = 0;
    
    while (left < right) {
        if (left_max < right_max) {
            left++;
            left_max = max(left_max, height[left]);
            water += left_max - height[left];
        } else {
            right--;
            right_max = max(right_max, height[right]);
            water += right_max - height[right];
        }
    }
    return water;
}
// Time: O(N), Space: O(1)
```

**What's happening:**
- We maintain two pointers and their respective maximum heights
- The water trapped at any position depends on the minimum of the two maximums
- If left_max < right_max, we know the left side is the bottleneck
- We calculate water for the left position and move left inward
- The key insight: we don't need to know the exact right max, only that it's >= left_max

```
Height: [0,1,0,2,1,0,1,3,2,1,2,1]

Visualization:
    #
    #   #   #
#   # # # # # #
# # # # # # # # #
0 1 2 3 4 5 6 7 8 9 10 11

Water trapped:
    -   -   -
-   - - - - - -
- - - - - - - - -
0 1 2 3 4 5 6 7 8 9 10 11
```

#### Dry-Run Table
| Step | left | right | left_max | right_max | height[left] | height[right] | Water Added | Total Water |
|------|------|-------|----------|-----------|--------------|---------------|-------------|-------------|
| 1 | 0 | 11 | 0 | 1 | 0 | 1 | - | 0 |
| 2 | 1 | 11 | 1 | 1 | 1 | 1 | 0 | 0 |
| 3 | 2 | 11 | 1 | 1 | 0 | 1 | 1 | 1 |
| 4 | 3 | 11 | 2 | 1 | 2 | 1 | 0 | 1 |
| 5 | 3 | 10 | 2 | 2 | 2 | 2 | 0 | 1 |
| 6 | 3 | 9 | 2 | 2 | 2 | 1 | 0 | 1 |
| 7 | 3 | 8 | 2 | 2 | 2 | 2 | 0 | 1 |
| 8 | 3 | 7 | 2 | 3 | 2 | 3 | 0 | 1 |
| 9 | 4 | 7 | 2 | 3 | 1 | 3 | 1 | 2 |
| 10 | 5 | 7 | 2 | 3 | 0 | 3 | 2 | 4 |
| 11 | 6 | 7 | 2 | 3 | 1 | 3 | 1 | 5 |
| 12 | 7 | 7 | 3 | 3 | - | - | - | 5 |

**Answer: 5** units of water

#### Edge Case: No Water
```cpp
// Input: [1, 2, 3, 4, 5] (strictly increasing)
// Output: 0 (no valleys to trap water)
```

#### Common Mistake: Using Two Arrays
```cpp
// WRONG: Using O(N) space when O(1) is possible
vector<int> leftMax(n), rightMax(n);
// ... this works but is not optimal

// CORRECT: Use two pointers with O(1) space
// (as shown in the main solution)
```

#### Production Version
```cpp
class Solution {
public:
    int trap(vector<int>& height) {
        if (height.size() < 3) return 0;
        
        int left = 0, right = height.size() - 1;
        int left_max = height[left], right_max = height[right];
        int water = 0;
        
        while (left < right) {
            if (left_max < right_max) {
                left++;
                left_max = max(left_max, height[left]);
                water += left_max - height[left];
            } else {
                right--;
                right_max = max(right_max, height[right]);
                water += right_max - height[right];
            }
        }
        return water;
    }
};
```

---

## Quick Reference Table

| Problem | Time | Space | Pattern | Key Trick |
|---------|------|-------|---------|-----------|
| Valid Palindrome | O(N) | O(1) | Opposite-end | Skip non-alnum, tolower |
| 3Sum | O(N^2) | O(1)* | Sort + Opposite-end | Skip duplicates |
| Container With Most Water | O(N) | O(1) | Opposite-end | Move shorter pointer |
| Trapping Rain Water | O(N) | O(1) | Opposite-end + State | left_max/right_max |

*Excluding output array

---

## Comparison: Two Pointers vs Other Patterns

| Pattern | When to Use | Time | Space |
|---------|-------------|------|-------|
| Two Pointers | Sorted arrays, opposite ends | O(N) | O(1) |
| Sliding Window | Contiguous subarray/substring | O(N) | O(1) or O(K) |
| Hash Map | Need O(1) lookup | O(N) | O(N) |
| Binary Search | Sorted array, search space | O(log N) | O(1) |

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Interview Problems Walkthrough**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **interview problems two pointers** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.


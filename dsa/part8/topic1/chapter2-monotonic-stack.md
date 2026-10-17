# Part 8, Topic 1: Stack
## Chapter 2: The Monotonic Stack

A **Monotonic Stack** is a stack whose elements are always increasing or always decreasing (strictly or not, depending on whether equal values get popped).

This is an advanced pattern that turns $O(N^2)$ brute-force solutions into brilliant $O(N)$ solutions. Once you learn to recognize this pattern, a whole category of "next greater/smaller element" problems becomes trivial.

---

### 1. The Trigger: "Next Greater Element"

The absolute definitive trigger for a Monotonic Stack is a problem asking:
**"For every element in this array, find the next element to its right that is strictly greater than it."**

*(Variations: Next smaller element, previous greater element, number of days until a warmer temperature).*

**The Brute Force:**
For every number, loop through the rest of the array to find the next bigger number. This takes $O(N^2)$ time.

```cpp
// Brute force - O(N^2)
vector<int> nextGreaterBrute(vector<int>& nums) {
    int n = nums.size();
    vector<int> result(n, -1);

    for (int i = 0; i < n; i++) {
        for (int j = i + 1; j < n; j++) {
            if (nums[j] > nums[i]) {
                result[i] = nums[j];
                break;
            }
        }
    }
    return result;
}
```

**What's happening:**
```
For each element at index i, we scan everything to its right
until we find something bigger. If we find it, record it.
If we reach the end without finding one, result[i] stays -1.

For [2, 1, 2, 4, 3]:
  i=0: scan [1,2,4,3] -> first > 2 is 4 -> result[0]=4
  i=1: scan [2,4,3]   -> first > 1 is 2 -> result[1]=2
  i=2: scan [4,3]     -> first > 2 is 4 -> result[2]=4
  i=3: scan [3]       -> nothing > 4    -> result[3]=-1
  i=4: no scan        -> nothing         -> result[4]=-1

Result: [4, 2, 4, -1, -1]
```

---

### 2. The Monotonic Insight

**The Core Idea:**
If we encounter a number `x` and the stack has `[5, 3, 1]`, then `x` is the "next greater element" for `1`, `3`, and `5` (as long as `x > 1`, `x > 3`, `x > 5`). We pop all of them and record `x` as their answer.

**Why a Decreasing Stack?**
We want to maintain elements in decreasing order. When a larger element arrives, it "resolves" all smaller elements waiting in the stack.

Imagine an array of temperatures: `[73, 74, 75, 71, 69, 72, 76]`.
We want to find how many days we have to wait for a warmer temperature.

We use a **Decreasing Monotonic Stack**. We only push elements onto the stack if they are *smaller* than the top of the stack.
Why? Because as long as temperatures are dropping (75, 71, 69), we haven't found the "next warmer day" for any of them. We just stack them up.

The magic happens when we encounter a hotter day (e.g., 72).
`72` is greater than the top of the stack (`69`). This means `72` is the "next warmer day" for `69`! We pop `69` and record the answer.
Then we check the new top of the stack (`71`). `72` is greater than `71` too! We pop `71` and record the answer.
We keep popping until the stack is empty, or the top of the stack is hotter than `72`. Then we finally push `72`.

---

### 3. Full Walkthrough: Next Greater Element

Let's solve "Next Greater Element" for `[2, 1, 2, 4, 3]` step by step.

**Goal:** For each element, find the first element to its right that is greater.

**Expected answer:** `[4, 2, 4, -1, -1]`

**Dry-Run Table:**

| Step | Index | Value | Stack State (indices) | Action | Result |
|------|-------|-------|-----------------------|--------|--------|
| 1 | 0 | 2 | [0] | Push 0 | [_, _, _, _, _] |
| 2 | 1 | 1 | [0, 1] | Push 1 | [_, _, _, _, _] |
| 3 | 2 | 2 | [0, 2] | Pop 1 (1<2), Push 2 | [_, 2, _, _, _] |
| 4 | 3 | 4 | [3] | Pop 2 (2<4), Pop 0 (2<4), Push 3 | [4, 2, 4, _, _] |
| 5 | 4 | 3 | [3, 4] | Push 4 | [4, 2, 4, _, _] |

**After loop:** Elements still in stack (indices 3 and 4) have no next greater element -> result stays -1.

**Final result:** `[4, 2, 4, -1, -1]` ✓

---

### 4. The Golden Template

Instead of pushing the actual *values* onto the stack, we usually push the **Indices**. This allows us to calculate the distance (number of days) between the elements.

```cpp
vector<int> dailyTemperatures(vector<int>& temperatures) {
    int n = temperatures.size();

    // Initialize results array with 0s
    vector<int> result(n, 0);

    // The Monotonic Stack (storing indices)
    vector<int> st;

    for (int i = 0; i < n; i++) {
        int currentTemp = temperatures[i];

        // THE MONOTONIC CHECK:
        // While the stack is not empty AND the current temperature is
        // HOTTER than the temperature at the index stored on top of the stack.
        while (!st.empty() && currentTemp > temperatures[st.back()]) {

            // We found the "Next Greater Element" for the top of the stack!
            int prevIndex = st.back();
            st.pop_back();

            // The answer is the distance between the indices
            result[prevIndex] = i - prevIndex;
        }

        // We couldn't pop anything else. Our currentTemp is now smaller than
        // the top of the stack (maintaining the monotonic decreasing property).
        // Push the current index onto the stack to wait for a hotter day.
        st.push_back(i);
    }

    return result;
}
```

**What's happening:**
```
We iterate through the array once.
At each index i:
  1. While stack is not empty AND current temp > temp at stack top:
     -> Current temp is the "next warmer day" for the element at stack top
     -> Record the distance: result[prevIndex] = i - prevIndex
     -> Pop that index (it's resolved)
  2. Push current index onto stack (it might be the answer for future elements)

The stack maintains indices of elements that are STILL WAITING for a warmer day.
Elements in the stack are always in decreasing temperature order.
```

**Step-by-step for `[73, 74, 75, 71, 69, 72, 76]`:**

| Step | i | Temp | Stack (indices) | Comparison | Action | Result |
|------|---|------|-----------------|------------|--------|--------|
| 1 | 0 | 73 | [0] | Empty stack | Push 0 | [0,0,0,0,0,0,0] |
| 2 | 1 | 74 | [1] | 74 > 73? YES | Pop 0, result[0]=1-0=1, Push 1 | [1,0,0,0,0,0,0] |
| 3 | 2 | 75 | [2] | 75 > 74? YES | Pop 1, result[1]=2-1=1, Push 2 | [1,1,0,0,0,0,0] |
| 4 | 3 | 71 | [2,3] | 71 > 75? NO | Push 3 | [1,1,0,0,0,0,0] |
| 5 | 4 | 69 | [2,3,4] | 69 > 71? NO | Push 4 | [1,1,0,0,0,0,0] |
| 6 | 5 | 72 | [2,3] | 72 > 69? YES | Pop 4, result[4]=5-4=1 | [1,1,0,0,1,0,0] |
| 7 | 5 | 72 | [2] | 72 > 71? YES | Pop 3, result[3]=5-3=2 | [1,1,0,2,1,0,0] |
| 8 | 5 | 72 | [2,5] | 72 > 75? NO | Push 5 | [1,1,0,2,1,0,0] |
| 9 | 6 | 76 | [2] | 76 > 72? YES | Pop 5, result[5]=6-5=1 | [1,1,0,2,1,1,0] |
| 10 | 6 | 76 | [] | 76 > 75? YES | Pop 2, result[2]=6-2=4 | [1,1,4,2,1,1,0] |
| 11 | 6 | 76 | [6] | Empty stack | Push 6 | [1,1,4,2,1,1,0] |

**Final result:** `[1, 1, 4, 2, 1, 1, 0]` ✓

---

### 5. Why is this $O(N)$?

You might look at the `while` loop inside the `for` loop and think, "That's a loop inside a loop, it must be $O(N^2)$!"

**Incorrect.** Look closely at the operations. Every index `i` is pushed onto the stack exactly *once*. Every index is popped from the stack at most *once*. Therefore, the total number of stack operations across the entire execution of the program is $2N$.
$O(2N)$ simplifies to **$O(N)$ Time Complexity.**

```
Total operations = N pushes + N pops = 2N
2N = O(N)

Even though there's a while loop inside the for loop,
the while loop doesn't run N times for each iteration.
Across ALL iterations combined, it runs at most N times total.
```

---

### 6. Variations

**Next Greater Element:** Use a decreasing stack (pop when `curr > top`; equal values stay, so it is non-increasing).
**Next Smaller Element:** Use an increasing stack (pop when `curr < top`; equal values stay, so it is non-decreasing).

**Next Smaller Element Example:**
```cpp
vector<int> nextSmallerElement(vector<int>& nums) {
    int n = nums.size();
    vector<int> result(n, -1);
    vector<int> st; // Increasing monotonic stack

    for (int i = 0; i < n; i++) {
        while (!st.empty() && nums[i] < nums[st.back()]) {
            int prevIndex = st.back();
            st.pop_back();
            result[prevIndex] = nums[i];
        }
        st.push_back(i);
    }

    return result;
}
```

**What's happening:**
```
For [4, 5, 2, 10, 8]:

i=0: push 0        stack: [0]
i=1: 5 > 4, push 1 stack: [0, 1]
i=2: 2 < 5, pop 1  result[1]=2, stack: [0]
     2 < 4, pop 0  result[0]=2, stack: []
     push 2        stack: [2]
i=3: 10 > 2, push 3 stack: [2, 3]
i=4: 8 < 10, pop 3  result[3]=8, stack: [2]
     8 > 2, push 4  stack: [2, 4]

Result: [2, 2, -1, 8, -1]
```

---

### 7. Edge Cases

| Edge Case | Behavior |
|-----------|----------|
| All elements same | No pops, stack grows to full size, all results = -1 |
| Strictly increasing | Stack only has 1 element, all resolve immediately |
| Strictly decreasing | No pops, stack grows, all results = -1 |
| Single element | Stack has 1 element, result = [-1] |
| Empty array | No iterations, return empty result |

---

### 8. Common Mistakes

**Mistake 1: Pushing values instead of indices**
```cpp
// WRONG - can't calculate distance
st.push_back(temperatures[i]);

// RIGHT - push index to calculate distance
st.push_back(i);
```

**Mistake 2: Forgetting the while loop**
```cpp
// WRONG - only resolves one element per step
if (!st.empty() && currentTemp > temperatures[st.back()]) {
    // ...
}

// RIGHT - resolve ALL elements that are smaller
while (!st.empty() && currentTemp > temperatures[st.back()]) {
    // ...
}
```

**Mistake 3: Using >= instead of >**
```cpp
// WRONG - for "next strictly greater"
while (!st.empty() && currentTemp >= temperatures[st.back()]) {

// RIGHT - strict comparison
while (!st.empty() && currentTemp > temperatures[st.back()]) {
```

---

### 9. Stack vs Monotonic Stack

| Feature | Regular Stack | Monotonic Stack |
|---------|--------------|-----------------|
| Order | Any order | Strictly increasing/decreasing |
| Purpose | LIFO processing | Finding next greater/smaller |
| Push condition | Always push | Only push if order maintained |
| Pop trigger | Manual or condition | Order violation |
| Time complexity | O(1) per operation | O(n) amortized |
| Space complexity | O(n) | O(n) |

---

### Quick Reference Table

| Problem Type | Stack Type | Pop Condition | Push After | Result |
|-------------|-----------|---------------|------------|--------|
| Next Greater Element | Decreasing | `curr > top` | Always | Next greater value |
| Next Smaller Element | Increasing | `curr < top` | Always | Next smaller value |
| Daily Temperatures | Decreasing | `curr > top` | Always | Days until warmer |
| Stock Span | Decreasing | `curr >= top` | Always | Consecutive days |
| Largest Rectangle | Increasing | `curr < top` | Always | Rectangle width |

**Key Takeaways:**
- Monotonic Stack = stack with enforced order (increasing or decreasing)
- Push indices, not values (for distance calculations)
- Use `while` loop to pop all resolved elements
- Amortized O(n) because each element pushed/popped at most once
- Decreasing stack for "next greater", Increasing stack for "next smaller"

### 10. Stock Span Problem (Decreasing Monotonic Stack)

The Stock Span Problem asks: "For each day's stock price, find how many consecutive days (including today) the price was less than or equal to today's price."

This is a classic application of a **Decreasing Monotonic Stack**.

```cpp
vector<int> stockSpan(vector<int>& prices) {
    int n = prices.size();
    vector<int> span(n, 1);  // Each day has at least span of 1 (itself)
    vector<int> st;          // Decreasing monotonic stack (indices)
    
    for (int i = 0; i < n; i++) {
        // Pop all elements smaller than or equal to current price
        while (!st.empty() && prices[st.back()] <= prices[i]) {
            st.pop_back();
        }
        
        // If stack is empty, all previous days were smaller → span = i + 1
        // Otherwise, span = i - st.top() (distance from last greater element)
        span[i] = st.empty() ? i + 1 : i - st.back();
        
        st.push_back(i);
    }
    
    return span;
}
// prices:  [100, 80, 60, 70, 60, 75, 85]
// span:    [1,   1,  1,  2,  1,  4,  6]
```

**What's happening:**
```
For [100, 80, 60, 70, 60, 75, 85]:

i=0 (100): stack empty → span=1, push 0     stack: [0]
i=1 (80):  80 < 100, push 1                 stack: [0,1]
           span = 1-0 = 1? No, span = i - st.top() = 1-0=1
           Wait, let me recalculate...
           
Actually: 80 < 100, so we don't pop. stack not empty, span = 1-0 = 1
           push 1                            stack: [0,1]
i=2 (60):  60 < 80, push 2                  stack: [0,1,2]
           span = 2-1 = 1
i=3 (70):  70 > 60, pop 2. 70 > 80? No.
           span = 3-1 = 2, push 3           stack: [0,1,3]
i=4 (60):  60 < 70, push 4                  stack: [0,1,3,4]
           span = 4-3 = 1
i=5 (75):  75 > 60, pop 4. 75 > 70, pop 3. 75 < 80? Yes.
           span = 5-1 = 4, push 5           stack: [0,1,5]
i=6 (85):  85 > 75, pop 5. 85 > 80, pop 1. 85 < 100? Yes.
           span = 6-0 = 6, push 6           stack: [0,6]

Result: [1, 1, 1, 2, 1, 4, 6]
```

---

### 11. Largest Rectangle in Histogram (Monotonic Stack Classic)

Given an array of bar heights, find the area of the largest rectangle that can be formed.

```cpp
int largestRectangleArea(vector<int>& heights) {
    int n = heights.size();
    vector<int> st;  // Increasing monotonic stack (indices)
    int maxArea = 0;
    
    for (int i = 0; i <= n; i++) {
        int currHeight = (i == n) ? 0 : heights[i];
        
        while (!st.empty() && currHeight < heights[st.back()]) {
            int height = heights[st.back()];
            st.pop_back();
            int width = st.empty() ? i : i - st.back() - 1;
            maxArea = max(maxArea, height * width);
        }
        
        st.push_back(i);
    }
    
    return maxArea;
}
// heights: [2, 1, 5, 6, 2, 3]
// Largest rectangle: height=5, width=2 → area=10
// (bars at index 2 and 3, both height ≥ 5)
```

**What's happening:**
```
Key insight: For each bar, find the first bar to the left and right
that is SHORTER. The rectangle extends between those boundaries.

For [2, 1, 5, 6, 2, 3]:

Bar at index 2 (height 5):
  First shorter to left: index 1 (height 1)
  First shorter to right: index 4 (height 2)
  Width = 4 - 1 - 1 = 2
  Area = 5 × 2 = 10

Bar at index 3 (height 6):
  First shorter to left: index 2 (height 5)
  First shorter to right: index 4 (height 2)
  Width = 4 - 2 - 1 = 1
  Area = 6 × 1 = 6

The stack maintains indices of bars in increasing height order.
When we encounter a shorter bar, we pop taller bars and calculate
their rectangle width using the new top of stack as the left boundary.
```

**Dry-Run:**

| Step | i | Height | Stack | Popped | Width | Area | Max |
|------|---|--------|-------|--------|-------|------|-----|
| 1 | 0 | 2 | [0] | — | — | — | 0 |
| 2 | 1 | 1 | [1] | 0 (h=2) | 1 | 2×1=2 | 2 |
| 3 | 2 | 5 | [1,2] | — | — | — | 2 |
| 4 | 3 | 6 | [1,2,3] | — | — | — | 2 |
| 5 | 4 | 2 | [1,4] | 3 (h=6), 2 (h=5) | 1, 2 | 6, 10 | 10 |
| 6 | 5 | 3 | [1,4,5] | — | — | — | 10 |
| 7 | 6 | 0 | [6] | 5,4,1 | 1,4,6 | 3,8,6 | 10 |

**Final answer:** 10

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Chapter 2: The Monotonic Stack**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **chapter2 monotonic stack** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.


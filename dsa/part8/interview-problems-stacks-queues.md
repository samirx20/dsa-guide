# Part 8: Stacks & Queues
## Interview Problems Walkthrough

Mastering the Monotonic pattern is the key to passing Hard array problems.

---

## Problem Classification Table

| # | Problem | Difficulty | Pattern | Data Structure | Time | Space |
|---|---------|-----------|---------|----------------|------|-------|
| 1 | Valid Parentheses | Easy | Brackets Matching | Stack | O(n) | O(n) |
| 2 | Min Stack | Medium | Design / Auxiliary Stack | Stack of pairs | O(1) ops | O(n) |
| 3 | Evaluate RPN | Medium | Expression Evaluation | Stack | O(n) | O(n) |
| 4 | Daily Temperatures | Medium | Monotonic Stack | Stack (indices) | O(n) | O(n) |
| 5 | Car Fleet | Medium | Sorting + Stack | Stack | O(n log n) | O(n) |
| 6 | Largest Rectangle | Hard | Monotonic Stack | Stack (indices) | O(n) | O(n) |
| 7 | Queue using Stacks | Easy | Two Stack Simulation | 2 Stacks | O(1) amortized | O(n) |
| 8 | Sliding Window Max | Hard | Monotonic Deque | Deque (indices) | O(n) | O(k) |

---

## Solution Approach Comparison

| Problem | Brute Force | Optimal Approach | Key Insight |
|---------|------------|-----------------|-------------|
| Valid Parentheses | N/A | Stack | Push open, pop on close, check match |
| Min Stack | Scan for min O(n) | Pair stack O(1) | Each element remembers its min |
| Evaluate RPN | N/A | Stack | Push numbers, pop on operator |
| Daily Temperatures | Nested loop O(n^2) | Monotonic stack O(n) | Decreasing stack, pop when hotter |
| Car Fleet | Simulate all O(n^2) | Sort + stack O(n log n) | Sort by position desc, compare times |
| Largest Rectangle | Check all O(n^2) | Monotonic stack O(n) | Increasing stack, pop when shorter |
| Queue using Stacks | N/A | Two stacks O(1) amortized | Pour s1->s2 to reverse order |
| Sliding Window Max | Scan window O(nk) | Monotonic deque O(n) | Decreasing deque, front = max |

---

### 1. Valid Parentheses (Easy)

**Trigger:** Determine if `()[]{}` is valid.

**Intuition:** Classic Stack. Iterate through characters. If it's an opening bracket, push the *closing* equivalent to the stack. If it's a closing bracket, check if the stack is empty or if the top doesn't match. If valid, pop. At the end, return `stack.empty()`.

**Step-by-Step Walkthrough for `"{[()]}"`:**

| Step | Char | Action | Stack | Match? |
|------|------|--------|-------|--------|
| 1 | { | Push '}' | [}] | - |
| 2 | [ | Push ']' | [},]] | - |
| 3 | ( | Push ')' | [},],)] | - |
| 4 | ) | Pop, check | [},]] | )==) ✓ |
| 5 | ] | Pop, check | [}] | ]==] ✓ |
| 6 | } | Pop, check | [] | }==} ✓ |
| 7 | end | Check empty | [] | Valid ✓ |

**Code:**
```cpp
bool isValid(string s) {
    vector<char> st;

    for (char c : s) {
        if (c == '(' || c == '[' || c == '{') {
            st.push_back(c);
        } else {
            if (st.empty()) return false;
            char top = st.back();
            st.pop_back();
            if ((c == ')' && top != '(') ||
                (c == ']' && top != '[') ||
                (c == '}' && top != '{')) {
                return false;
            }
        }
    }

    return st.empty();
}
```

**What's happening:**
```
We push opening brackets onto the stack.
When we see a closing bracket:
  1. If stack is empty -> no matching opener -> invalid
  2. Pop the top and check if it matches
  3. If no match -> invalid

At the end:
  - Empty stack -> all matched -> valid
  - Non-empty stack -> unmatched openers -> invalid
```

**Edge Cases:**
- `"("` -> stack not empty at end -> false
- `")"` -> stack empty when trying to pop -> false
- `"([)]"` -> mismatched pair -> false
- `""` -> empty stack -> true

---

### 2. Min Stack (Medium)

**Trigger:** Design a stack that supports `push`, `pop`, `top`, and `getMin()` all in $O(1)$ time.

**Intuition:** Normal stacks can't do `getMin` in $O(1)$. If you just keep a `globalMin` variable, what happens when you `pop` the minimum element? You don't know what the previous minimum was!

**Solution:** Store a `pair<int, int>` in the stack. `(currentValue, currentMinimum)`.
When you push a new value, the new minimum is `min(value, stack.top().second)`. Now, every element "remembers" what the minimum was at the exact moment it was pushed.

**Step-by-Step Walkthrough: push(3), push(5), push(2), push(1), pop(), pop()**

| Step | Action | Stack (val, min) | getMin() |
|------|--------|------------------|----------|
| 1 | push(3) | [(3,3)] | 3 |
| 2 | push(5) | [(3,3), (5,3)] | 3 |
| 3 | push(2) | [(3,3), (5,3), (2,2)] | 2 |
| 4 | push(1) | [(3,3), (5,3), (2,2), (1,1)] | 1 |
| 5 | pop() | [(3,3), (5,3), (2,2)] | 2 |
| 6 | pop() | [(3,3), (5,3)] | 3 |

**Key insight:** After popping (1,1), the min goes back to 2 because (2,2) remembers that 2 was the min when it was pushed.

**Code:**
```cpp
class MinStack {
    vector<pair<int, int>> st;
public:
    void push(int val) {
        if (st.empty()) {
            st.push_back({val, val});
        } else {
            int currentMin = min(val, st.back().second);
            st.push_back({val, currentMin});
        }
    }
    void pop() { st.pop_back(); }
    int top() { return st.back().first; }
    int getMin() { return st.back().second; }
};
```

**What's happening:**
```
Each stack element is a pair: (value, min_so_far)

When pushing:
  - If stack empty: min = val itself
  - Otherwise: min = min(val, previous min)
  
When popping:
  - Just remove the top pair
  - The new top already has the correct min for remaining elements

When getting min:
  - Just return the second element of the top pair
  - O(1) because we stored it!
```

**Alternative approach: Two stacks**
```cpp
class MinStack {
    stack<int> st;
    stack<int> minSt;  // auxiliary stack for mins
public:
    void push(int val) {
        st.push(val);
        if (minSt.empty() || val <= minSt.top()) {
            minSt.push(val);
        }
    }
    void pop() {
        if (st.top() == minSt.top()) {
            minSt.pop();
        }
        st.pop();
    }
    int top() { return st.top(); }
    int getMin() { return minSt.top(); }
};
```

---

### 3. Evaluate Reverse Polish Notation (Medium)

**Trigger:** Evaluate postfix notation `"2 1 + 3 *"`.

**Intuition:** Push numbers to a stack. When encountering an operator `+ - * /`, pop the top TWO numbers (remembering that the first popped is the *right* operand), evaluate, and push the result back.

**Step-by-Step Walkthrough for `["4","13","5","/","+"]`:**

| Step | Token | Action | Stack | Calculation |
|------|-------|--------|-------|-------------|
| 1 | "4" | Push | [4] | - |
| 2 | "13" | Push | [4, 13] | - |
| 3 | "5" | Push | [4, 13, 5] | - |
| 4 | "/" | Pop 5,13 | [4] | 13 / 5 = 2 |
| 5 | "+" | Pop 2,4 | [6] | 4 + 2 = 6 |

**Result:** 6

**Code:**
```cpp
int evalRPN(vector<string>& tokens) {
    vector<int> st;

    for (string& token : tokens) {
        if (token == "+" || token == "-" || token == "*" || token == "/") {
            int right = st.back(); st.pop_back();
            int left = st.back(); st.pop_back();

            if (token == "+") st.push_back(left + right);
            else if (token == "-") st.push_back(left - right);
            else if (token == "*") st.push_back(left * right);
            else if (token == "/") st.push_back(left / right);
        } else {
            st.push_back(stoi(token));
        }
    }

    return st.back();
}
```

**What's happening:**
```
RPN puts operators AFTER operands.
So when we see an operator, the two most recent numbers
are its operands.

CRITICAL: The first number popped is the RIGHT operand.
  "13 5 /" means 13 / 5 (NOT 5 / 13)
  So right = 5, left = 13, result = 13 / 5 = 2

The stack naturally handles nested expressions:
  "4 13 5 / +" = 4 + (13 / 5) = 4 + 2 = 6
```

---

### 4. Daily Temperatures (Medium)

**Trigger:** Find how many days until a warmer temperature.

**Intuition:** "Next Greater Element" problem. Use a Decreasing Monotonic Stack storing indices.

**Step-by-Step Walkthrough for `[73, 74, 75, 71, 69, 72, 76]`:**

| Step | i | Temp | Stack (indices) | Action | Result |
|------|---|------|-----------------|--------|--------|
| 1 | 0 | 73 | [0] | Push 0 | [0,0,0,0,0,0,0] |
| 2 | 1 | 74 | [1] | 74>73? Pop 0, result[0]=1, push 1 | [1,0,0,0,0,0,0] |
| 3 | 2 | 75 | [2] | 75>74? Pop 1, result[1]=1, push 2 | [1,1,0,0,0,0,0] |
| 4 | 3 | 71 | [2,3] | 71>75? No, push 3 | [1,1,0,0,0,0,0] |
| 5 | 4 | 69 | [2,3,4] | 69>71? No, push 4 | [1,1,0,0,0,0,0] |
| 6 | 5 | 72 | [2,3] | 72>69? Pop 4, result[4]=1 | [1,1,0,0,1,0,0] |
| 7 | 5 | 72 | [2] | 72>71? Pop 3, result[3]=2 | [1,1,0,2,1,0,0] |
| 8 | 5 | 72 | [2,5] | 72>75? No, push 5 | [1,1,0,2,1,0,0] |
| 9 | 6 | 76 | [2] | 76>72? Pop 5, result[5]=1 | [1,1,0,2,1,1,0] |
| 10 | 6 | 76 | [] | 76>75? Pop 2, result[2]=4 | [1,1,4,2,1,1,0] |
| 11 | 6 | 76 | [6] | Push 6 | [1,1,4,2,1,1,0] |

**Final result:** `[1, 1, 4, 2, 1, 1, 0]`

**Code:**
```cpp
vector<int> dailyTemperatures(vector<int>& temperatures) {
    int n = temperatures.size();
    vector<int> result(n, 0);
    vector<int> st;

    for (int i = 0; i < n; i++) {
        while (!st.empty() && temperatures[i] > temperatures[st.back()]) {
            int prevIndex = st.back();
            st.pop_back();
            result[prevIndex] = i - prevIndex;
        }
        st.push_back(i);
    }

    return result;
}
```

---

### 5. Car Fleet (Medium)

**Trigger:** Given positions and speeds of cars heading to a target, return the number of car fleets.

**Intuition:** Calculate the `timeToTarget` for each car: `(target - position) / speed`.
Sort the cars by their starting position in **descending order** (closest to the target first).
Iterate through the sorted cars. If a car's `timeToTarget` is $\le$ the car in front of it, it will bump into it and form a fleet! We don't push it to the stack. If its time is $>$, it will never catch up, forming a NEW fleet. Push it to the stack.
The answer is `stack.size()`.

**Step-by-Step Walkthrough: target=12, positions=[10,8,0,5,3], speeds=[2,4,1,1,3]**

| Step | Car | Pos | Speed | Time | Stack (times) | Action |
|------|-----|-----|-------|------|---------------|--------|
| Sort | 10 | 10 | 2 | 1.0 | [] | - |
| Sort | 8 | 8 | 4 | 1.0 | [] | - |
| Sort | 5 | 5 | 1 | 7.0 | [] | - |
| Sort | 3 | 3 | 3 | 3.0 | [] | - |
| Sort | 0 | 0 | 1 | 12.0 | [] | - |
| 1 | 10 | 10 | 2 | 1.0 | [1.0] | Push |
| 2 | 8 | 8 | 4 | 1.0 | [1.0] | 1.0<=1.0, fleet! Don't push |
| 3 | 5 | 5 | 1 | 7.0 | [1.0, 7.0] | Push |
| 4 | 3 | 3 | 3 | 3.0 | [1.0, 7.0] | 3.0<=7.0, fleet! Don't push |
| 5 | 0 | 0 | 1 | 12.0 | [1.0, 7.0, 12.0] | 12.0>7.0, Push |

**Result:** stack.size() = 3 fleets

**Code:**
```cpp
int carFleet(int target, vector<int>& position, vector<int>& speed) {
    int n = position.size();
    vector<pair<int, double>> cars;

    for (int i = 0; i < n; i++) {
        double time = (double)(target - position[i]) / speed[i];
        cars.push_back({position[i], time});
    }

    // Sort by position descending (closest to target first)
    sort(cars.begin(), cars.end(), [](auto& a, auto& b) {
        return a.first > b.first;
    });

    vector<double> st;
    for (auto& [pos, time] : cars) {
        if (st.empty() || time > st.back()) {
            st.push_back(time);
        }
        // If time <= st.back(), this car catches up -> fleet
    }

    return st.size();
}
```

**What's happening:**
```
Sort cars by position descending (closest to target first).
For each car:
  - If its time > stack top: it forms a new fleet (push)
  - If its time <= stack top: it catches up (don't push)

The stack stores times of fleet leaders.
Each fleet leader is the car that determines the fleet's speed.
```

---

### 6. Largest Rectangle in Histogram (Hard)

**Trigger:** Find the largest rectangular area possible in a histogram.

**Intuition:** A rectangle's height is bounded by the shortest bar in its span.
We can use an **Increasing Monotonic Stack** storing indices.
If we see a bar that is *shorter* than the top of the stack, it means the bar at the top of the stack can no longer expand to the right! Its rectangle is complete.
Pop it, calculate its area (`height * width`), and record the max. The width is tricky: `current_index - new_top_index - 1`.

**Step-by-Step Walkthrough for `[2, 1, 5, 6, 2, 3]`:**

| Step | i | Height | Stack (indices) | Action | Max Area |
|------|---|--------|-----------------|--------|----------|
| 1 | 0 | 2 | [0] | Push 0 | 0 |
| 2 | 1 | 1 | [0] | 1<2? Pop 0, stack empty, area=2*1=2 | 2 |
| 3 | 1 | 1 | [1] | Push 1 | 2 |
| 4 | 2 | 5 | [1,2] | Push 2 | 2 |
| 5 | 3 | 6 | [1,2,3] | Push 3 | 2 |
| 6 | 4 | 2 | [1,2,3] | 2<6? Pop 3, area=6*(4-2-1)=6 | 6 |
| 7 | 4 | 2 | [1,2] | 2<5? Pop 2, area=5*(4-1-1)=10 | 10 |
| 8 | 4 | 2 | [1] | 2>1, push 4 | 10 |
| 9 | 5 | 3 | [1,4] | Push 5 | 10 |
| 10 | end | - | [1,4,5] | Pop 5, area=3*(6-4-1)=3 | 10 |
| 11 | end | - | [1,4] | Pop 4, area=2*(6-1-1)=8 | 10 |
| 12 | end | - | [1] | Pop 1, stack empty, area=1*6=6 | 10 |

**Result:** 10

**Code:**
```cpp
int largestRectangleArea(vector<int>& heights) {
    int n = heights.size();
    vector<int> st;
    int maxArea = 0;

    for (int i = 0; i <= n; i++) {
        int h = (i == n) ? 0 : heights[i];

        while (!st.empty() && h < heights[st.back()]) {
            int height = heights[st.back()];
            st.pop_back();
            int width = st.empty() ? i : i - st.back() - 1;
            maxArea = max(maxArea, height * width);
        }
        st.push_back(i);
    }

    return maxArea;
}
```

**What's happening:**
```
We use an increasing monotonic stack.
When we see a shorter bar, it means the taller bars
in the stack can no longer extend to the right.

For each popped bar:
  - height = heights[popped_index]
  - width = current_index - new_top_index - 1
  - If stack empty after pop: width = current_index (extends to left edge)

We iterate to n (one past end) to flush remaining bars.
Using h=0 at i=n ensures all bars get popped.
```

---

### 7. Implement Queue using Stacks (Easy)

**Trigger:** Design a FIFO Queue using only two LIFO Stacks.

**Intuition:** You need two stacks: `s1` and `s2`.
`push(x)`: Simply push `x` onto `s1`. $O(1)$.
`pop()` / `peek()`: A queue needs the *oldest* element, which is at the bottom of `s1`. Pour everything from `s1` into `s2`. Because of LIFO, the order is reversed! The oldest element is now at the top of `s2`. Pop it. (Only pour from `s1` to `s2` if `s2` is completely empty).

**Step-by-Step Walkthrough:**

| Step | Operation | s1 | s2 | Action | Return |
|------|-----------|----|----|--------|--------|
| 1 | push(1) | [1] | [] | Push to s1 | - |
| 2 | push(2) | [1,2] | [] | Push to s1 | - |
| 3 | peek() | [] | [2,1] | Pour s1->s2 | 1 |
| 4 | pop() | [] | [2] | Pop s2 | 1 |
| 5 | push(3) | [3] | [2] | Push to s1 | - |
| 6 | pop() | [3] | [] | s2 not empty, no pour; pop s2 | 2 |

**Code:**
```cpp
class MyQueue {
    stack<int> s1, s2;

    void pour() {
        if (s2.empty()) {
            while (!s1.empty()) {
                s2.push(s1.top());
                s1.pop();
            }
        }
    }
public:
    void push(int x) {
        s1.push(x);
    }

    int pop() {
        pour();
        int val = s2.top();
        s2.pop();
        return val;
    }

    int peek() {
        pour();
        return s2.top();
    }

    bool empty() {
        return s1.empty() && s2.empty();
    }
};
```

**What's happening:**
```
s1 = input stack (receives new elements)
s2 = output stack (provides oldest elements)

The "pour" operation:
  - Only happens when s2 is empty
  - Transfers all elements from s1 to s2
  - Reverses the order (LIFO -> FIFO)

Amortized O(1):
  - Each element is poured at most once
  - Total pours across n operations = n
  - So average cost per operation = O(1)
```

---

### 8. Sliding Window Maximum (Hard)

**Trigger:** Find the maximum in a sliding window of size `K`.

**Intuition:** Use a **Monotonic Deque** storing indices. Maintain decreasing order. Pop useless smaller elements from the back. Pop out-of-bounds elements from the front. The max is always at the front.

**Step-by-Step Walkthrough for `[1, 3, -1, -3, 5, 3, 6, 7]` with `k = 3`:**

| Step | i | Value | Deque (indices) | Action | Result |
|------|---|-------|-----------------|--------|--------|
| 1 | 0 | 1 | [0] | Push 0 | [] |
| 2 | 1 | 3 | [0] | 3>1? Pop 0, Push 1 | [] |
| 3 | 2 | -1 | [1,2] | Push 2 | [3] |
| 4 | 3 | -3 | [1,2,3] | Push 3 | [3, 3] |
| 5 | 4 | 5 | [4] | Pop 3,2,1 (all<5), Push 4 | [3, 3, 5] |
| 6 | 5 | 3 | [4,5] | Push 5 | [3, 3, 5, 5] |
| 7 | 6 | 6 | [6] | Pop 5,4 (both<6), Push 6 | [3, 3, 5, 5, 6] |
| 8 | 7 | 7 | [7] | Pop 6 (6<7), Push 7 | [3, 3, 5, 5, 6, 7] |

**Final result:** `[3, 3, 5, 5, 6, 7]`

**Code:**
```cpp
vector<int> maxSlidingWindow(vector<int>& nums, int k) {
    vector<int> result;
    deque<int> dq;

    for (int i = 0; i < nums.size(); i++) {
        while (!dq.empty() && nums[dq.back()] < nums[i]) {
            dq.pop_back();
        }
        dq.push_back(i);

        if (dq.front() < i - k + 1) {
            dq.pop_front();
        }

        if (i >= k - 1) {
            result.push_back(nums[dq.front()]);
        }
    }

    return result;
}
```

**What's happening:**
```
Three rules for each element:
  1. CLEAN BACK: Remove smaller elements (useless now)
  2. ADD: Push current index
  3. CLEAN FRONT: Remove out-of-window elements
  4. RECORD: Front is always the max

The deque is always decreasing.
Front = current window maximum.
```

---

## Quick Reference: Problem Patterns

| Pattern | When to Use | Key Operation |
|---------|-------------|---------------|
| Brackets Matching | Matching pairs, validation | Push open, pop on close |
| Expression Evaluation | Postfix/prefix math | Push numbers, pop on operator |
| Monotonic Stack | Next greater/smaller | Decreasing/increasing stack |
| Monotonic Deque | Sliding window max/min | Decreasing/increasing deque |
| Two Stack Queue | FIFO with LIFO only | Pour to reverse order |
| Auxiliary Stack | Track extra info (min, max) | Pair stack or second stack |

**Key Takeaways:**
- Stack = LIFO, perfect for matching, expressions, undo
- Monotonic Stack = O(n) for next greater/smaller element problems
- Monotonic Deque = O(n) for sliding window max/min
- Always store indices when distance/position matters
- Draw dry-run tables during interviews to show your thinking

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Interview Problems Walkthrough**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **interview problems stacks queues** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.


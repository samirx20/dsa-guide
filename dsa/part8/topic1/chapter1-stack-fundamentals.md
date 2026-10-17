# Part 8, Topic 1: Stack
## Chapter 1: Stack Fundamentals & Triggers

A **Stack** is a simple data structure that follows the **Last In, First Out (LIFO)** principle. You can only interact with the very top of the stack.

Think of it like a stack of plates. You can only put a plate on top and take one from the top. You can't grab a plate from the middle or bottom without removing everything above it first.

While the underlying operations (`push`, `pop`, `top`) take $O(1)$ time, the power of a stack lies in *when* you choose to use it.

---

### 1. Common Interview Triggers for Stacks

You should immediately think of a Stack if an interview problem involves:

1.  **Matching Pairs or Validating Order:** The classic "Valid Parentheses" `()[]{}` problem. You push opening brackets and pop them when you find a matching closing bracket.
2.  **Evaluating Expressions:** Parsing math equations like Reverse Polish Notation (`"3 4 + 5 *"`). You push numbers, and when you see an operator, you pop the top two numbers, evaluate them, and push the result back.
3.  **Undoing Operations:** Simulating a browser's "Back" button, or an editor's "Ctrl+Z".
4.  **Tracking Paths (DFS Simulation):** The Call Stack we discussed in Recursion is literally a Stack. You can simulate recursion iteratively by pushing states onto your own `std::stack`.
5.  **Finding the "Next Greater Element":** This requires a specialized version called a *Monotonic Stack*, covered in the next chapter.

---

### 2. Implementation: `std::stack` vs `std::vector`

In C++, you can use the `<stack>` library, but experienced competitive programmers and interviewees often just use a `std::vector` to act as a stack.

Why? Because a `stack` doesn't let you iterate through it to print its contents for debugging without destroying it! A `vector` gives you standard `push_back()` (push), `pop_back()` (pop), and `.back()` (top), while still allowing iteration.

**Using `std::stack`:**
```cpp
#include <stack>

stack<int> st;
st.push(10);
st.push(20);

int topVal = st.top(); // 20
st.pop();              // removes 20
bool empty = st.empty(); // false
```

**What's happening:**
```
st.push(10):
    Stack: [10]       <- top

st.push(20):
    Stack: [10, 20]   <- top

st.top() returns 20:
    Stack: [10, 20]   <- top (peek only, no removal)

st.pop():
    Stack: [10]       <- top (20 is gone)
```

**Using `std::vector` as a Stack (Recommended):**
```cpp
#include <vector>

vector<int> st;
st.push_back(10);
st.push_back(20);

int topVal = st.back(); // 20
st.pop_back();          // removes 20
bool empty = st.empty();  // false

// Superpower: Easy debugging!
for (int val : st) {
    cout << val << " ";
}
```

**What's happening:**
```
st.push_back(10):
    Vector: [10]       <- back()

st.push_back(20):
    Vector: [10, 20]   <- back()

st.back() returns 20:
    Vector: [10, 20]   <- back() (peek only)

st.pop_back():
    Vector: [10]       <- back() (20 is gone)

Loop prints: "10 "    <- You can see inside it!
```

---

### 3. Push/Pop Visualization: Step by Step

Let's trace a sequence of operations to build intuition:

```
Operations: push(5) -> push(3) -> push(8) -> pop() -> push(1) -> pop()

Step 1: push(5)
    |   5   |  <- top
    |_______|

Step 2: push(3)
    |   3   |  <- top
    |   5   |
    |_______|

Step 3: push(8)
    |   8   |  <- top
    |   3   |
    |   5   |
    |_______|

Step 4: pop() -> returns 8
    |   3   |  <- top
    |   5   |
    |_______|

Step 5: push(1)
    |   1   |  <- top
    |   3   |
    |   5   |
    |_______|

Step 6: pop() -> returns 1
    |   3   |  <- top
    |   5   |
    |_______|

Final stack: [5, 3]  (bottom to top)
```

**Key insight:** The stack behaves like a time machine. The last thing you put in is the first thing you get out. Perfect for undo operations and backtracking.

---

### 4. Dry-Run Table: Stack State Tracking

Here's a systematic way to track stack state during interview problems:

| Operation | Action | Stack (bottom→top) | Return Value |
|-----------|--------|-------------------|--------------|
| push(10)  | Add 10 | [10]              | -            |
| push(20)  | Add 20 | [10, 20]          | -            |
| push(30)  | Add 30 | [10, 20, 30]      | -            |
| top()     | Peek   | [10, 20, 30]      | 30           |
| pop()     | Remove | [10, 20]          | 30           |
| top()     | Peek   | [10, 20]          | 20           |
| push(40)  | Add 40 | [10, 20, 40]      | -            |
| pop()     | Remove | [10, 20]          | 40           |
| empty()   | Check  | [10, 20]          | false        |

**Tip:** Draw this table during interviews. It makes your thought process visible to the interviewer and helps you catch bugs.

---

### 5. The Classic Example: Evaluate Reverse Polish Notation

Reverse Polish Notation (RPN) puts operators *after* their operands.
Instead of `(2 + 1) * 3`, it is written as `2 1 + 3 *`.

This is the perfect problem to demonstrate stack utility.

**Basic Solution:**
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

**What's happening with `"2 1 + 3 *"`:**
```
Token: "2"  -> number, push
    Stack: [2]

Token: "1"  -> number, push
    Stack: [2, 1]

Token: "+"  -> operator, pop 1 and 2
    right = 1, left = 2
    2 + 1 = 3, push 3
    Stack: [3]

Token: "3"  -> number, push
    Stack: [3, 3]

Token: "*"  -> operator, pop 3 and 3
    right = 3, left = 3
    3 * 3 = 9, push 9
    Stack: [9]

Result: st.back() = 9
```

**Edge Case: Division with negative numbers**
```cpp
// C++ integer division truncates toward zero
// -3 / 2 = -1 (not -2)
// This matches the RPN spec on LeetCode
```

**Optimized: Use a map for operators (cleaner code)**
```cpp
int evalRPN(vector<string>& tokens) {
    vector<int> st;
    unordered_map<string, function<int(int,int)>> ops = {
        {"+", [](int a, int b) { return a + b; }},
        {"-", [](int a, int b) { return a - b; }},
        {"*", [](int a, int b) { return a * b; }},
        {"/", [](int a, int b) { return a / b; }}
    };

    for (auto& token : tokens) {
        if (ops.count(token)) {
            int right = st.back(); st.pop_back();
            int left = st.back(); st.pop_back();
            st.push_back(ops[token](left, right));
        } else {
            st.push_back(stoi(token));
        }
    }

    return st.back();
}
```

**What's happening:**
```
The map stores lambda functions for each operator.
When we encounter an operator, we look it up in the map
and call the corresponding function with the popped values.
This avoids a long if-else chain and is more maintainable.
```

---

### 6. Another Classic: Valid Parentheses

The most common stack interview problem.

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

**What's happening with `"({[]})"`:**
```
Char: '('  -> opening, push
    Stack: ['(']

Char: '{'  -> opening, push
    Stack: ['(', '{']

Char: '['  -> opening, push
    Stack: ['(', '{', '[']

Char: ']'  -> closing, top is '[' -> match! pop
    Stack: ['(', '{']

Char: '}'  -> closing, top is '{' -> match! pop
    Stack: ['(']

Char: ')'  -> closing, top is '(' -> match! pop
    Stack: []

Return: st.empty() = true  -> Valid!
```

**What's happening with `"(]"`:**
```
Char: '('  -> opening, push
    Stack: ['(']

Char: ']'  -> closing, top is '(' -> mismatch!
    '(' != '[' -> return false immediately
```

---

### 7. Edge Cases to Remember

| Edge Case | How Stack Handles It |
|-----------|---------------------|
| Empty input | Stack stays empty, return default |
| Only opening brackets | Stack not empty at end -> invalid |
| Only closing brackets | Stack empty when trying to pop -> invalid |
| Nested pairs | Stack depth = nesting level |
| Mismatched pairs | Detected during pop comparison |

**Stack never lies.** If you push opening brackets and pop on closing brackets, the stack's final state tells you everything:
- Empty = all matched
- Not empty = unmatched opening brackets remain

---

### 8. Stack vs Queue: When to Use Which

| Feature | Stack (LIFO) | Queue (FIFO) |
|---------|-------------|--------------|
| Access pattern | Last in, first out | First in, first out |
| Primary use | DFS, undo, backtracking | BFS, scheduling |
| Insert | Push (top) | Enqueue (back) |
| Remove | Pop (top) | Dequeue (front) |
| Peek | Top element | Front element |
| C++ implementation | `std::stack` or `vector` | `std::queue` |
| Debug-friendly | `vector` (can iterate) | `deque` (can iterate) |
| Time complexity | O(1) push/pop/top | O(1) enqueue/dequeue |
| Space complexity | O(n) | O(n) |
| Classic problems | Valid Parentheses, RPN | BFS traversal, Sliding Window |
| Monotonic variant | Monotonic Stack | Monotonic Deque |

**Rule of thumb:**
- Need to process things in reverse order? -> Stack
- Need to process things in arrival order? -> Queue
- Need to find "next greater/smaller"? -> Monotonic Stack
- Need max/min in sliding window? -> Monotonic Deque

---

### 9. Common Stack Patterns

**Pattern 1: Brackets Matching**
```cpp
// Push opening, pop on closing, check match
// Time: O(n), Space: O(n)
```

**Pattern 2: Expression Evaluation**
```cpp
// Push operands, pop on operator
// Time: O(n), Space: O(n)
```

**Pattern 3: Monotonic Stack (preview)**
```cpp
// Maintain increasing/decreasing order
// Pop when order is violated
// Time: O(n), Space: O(n)
```

**Pattern 4: DFS Simulation**
```cpp
// Push states, process top, push neighbors
// Time: O(V+E), Space: O(V)
```

---

### Quick Reference Table

| Operation | `std::stack` | `std::vector` (as stack) | Time |
|-----------|-------------|-------------------------|------|
| Push | `st.push(val)` | `st.push_back(val)` | O(1) |
| Pop | `st.pop()` | `st.pop_back()` | O(1) |
| Top/Peek | `st.top()` | `st.back()` | O(1) |
| Empty check | `st.empty()` | `st.empty()` | O(1) |
| Size | `st.size()` | `st.size()` | O(1) |
| Access by index | Not supported | `st[i]` | O(1) |
| Iterate | Not supported | Range for loop | O(n) |
| Clear | `st = stack<int>()` | `st.clear()` | O(n) |

**Key Takeaways:**
- Stack = LIFO, $O(1)$ push/pop/top
- Use `vector` in interviews for debuggability
- Triggers: matching pairs, expressions, undo, DFS, next greater element
- Always track stack state in a dry-run table during interviews

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Chapter 1: Stack Fundamentals & Triggers**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **chapter1 stack fundamentals** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.


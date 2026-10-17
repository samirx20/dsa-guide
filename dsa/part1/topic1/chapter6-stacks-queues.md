# Part 1, Topic 1: C++ STL Essentials
## Chapter 6: `stack`, `queue`, and `deque`

Vectors are great, but they don't enforce any rules about how data is accessed. In many algorithms (like Depth First Search or Breadth First Search), you need strict rules about the order in which data is processed.

---

### 1. `std::stack<T>` (LIFO)

A Stack follows **Last In, First Out (LIFO)**. Think of a stack of plates in a cafeteria: you can only add a plate to the top, and you can only remove a plate from the top.

*Interview Use Cases:* Validating parenthesis `()[]{}`, Depth-First Search (DFS), or reversing strings.

```cpp
#include <stack>
#include <iostream>
using namespace std;

int main() {
    stack<int> s;

    // Push adds to the top: O(1)
    s.push(10);
    s.push(20);
    s.push(30);

    // Top looks at the top element without removing it: O(1)
    int val = s.top(); // 30

    // Pop removes the top element (returns void): O(1)
    s.pop();
    // Now top is 20

    bool isEmp = s.empty(); // false (still has 10, 20)
    int sz = s.size();      // 2
}
```

**What's happening:**
```
Memory layout (LIFO):

  s.push(10):    s.push(20):    s.push(30):    s.pop():
  ┌──────┐      ┌──────┐      ┌──────┐       ┌──────┐
  │  10  │      │  20  │ ←top │  30  │ ←top  │  20  │ ←top
  │      │      │  10  │      │  20  │       │  10  │
  └──────┘      └──────┘      └──────┘       └──────┘

  s.top() returns 20 (current top, not removed)
  s.size() = 2
  s.empty() = false
```

**Dry-run table:**

| Step | Operation | Stack State (top→) | `top()` | `size()` |
|------|-----------|---------------------|---------|----------|
| 1 | `push(10)` | `[10]` | — | 1 |
| 2 | `push(20)` | `[20, 10]` | — | 2 |
| 3 | `push(30)` | `[30, 20, 10]` | — | 3 |
| 4 | `top()` | `[30, 20, 10]` | `30` | 3 |
| 5 | `pop()` | `[20, 10]` | — | 2 |
| 6 | `top()` | `[20, 10]` | `20` | 2 |
| 7 | `empty()` | `[20, 10]` | — | `false` |

### 2. Stack Method Complexity Table

| Method | Time | Space | Notes |
|--------|------|-------|-------|
| `push(val)` | $O(1)$ | $O(1)$ | Adds to top |
| `pop()` | $O(1)$ | $O(1)$ | Removes top (returns void) |
| `top()` | $O(1)$ | $O(1)$ | Returns reference to top |
| `size()` | $O(1)$ | $O(1)$ | Stored member variable |
| `empty()` | $O(1)$ | $O(1)$ | Returns bool |
| `swap(other)` | $O(N)$ | $O(1)$ | Swaps contents with another stack |

### 3. `std::queue<T>` (FIFO)

A Queue follows **First In, First Out (FIFO)**. Think of a line at a grocery store: the first person to get in line is the first person to be served.

*Interview Use Cases:* Breadth-First Search (BFS), processing tasks in order.

```cpp
#include <queue>
#include <iostream>
using namespace std;

int main() {
    queue<string> q;

    // Push adds to the back of the line: O(1)
    q.push("Alice");
    q.push("Bob");
    q.push("Charlie");

    // Front looks at the first person in line: O(1)
    string first = q.front(); // "Alice"

    // Back looks at the last person in line: O(1)
    string last = q.back(); // "Charlie"

    // Pop removes the first person in line: O(1)
    q.pop();
    // Now front is "Bob"
}
```

**What's happening:**
```
Memory layout (FIFO):

  q.push("Alice"):  q.push("Bob"):    q.push("Charlie"):  q.pop():
  ┌───────┐        ┌───────┐         ┌───────┐          ┌───────┐
  │ Alice │←front  │ Alice │←front   │ Alice │←front    │  Bob  │←front
  │       │←back   │  Bob  │←back    │  Bob  │          │Charlie│←back
  └───────┘        └───────┘         │Charlie│←back     └───────┘
                                     └───────┘

  front() = "Bob" (Alice was removed)
  back() = "Charlie"
```

**Dry-run table:**

| Step | Operation | Queue State (front→back) | `front()` | `back()` | `size()` |
|------|-----------|--------------------------|-----------|----------|----------|
| 1 | `push("Alice")` | `["Alice"]` | — | — | 1 |
| 2 | `push("Bob")` | `["Alice", "Bob"]` | — | — | 2 |
| 3 | `push("Charlie")` | `["Alice", "Bob", "Charlie"]` | — | — | 3 |
| 4 | `front()` | `["Alice", "Bob", "Charlie"]` | `"Alice"` | — | 3 |
| 5 | `pop()` | `["Bob", "Charlie"]` | — | — | 2 |
| 6 | `front()` | `["Bob", "Charlie"]` | `"Bob"` | — | 2 |
| 7 | `back()` | `["Bob", "Charlie"]` | — | `"Charlie"` | 2 |

### 4. Queue Method Complexity Table

| Method | Time | Space | Notes |
|--------|------|-------|-------|
| `push(val)` | $O(1)$ | $O(1)$ | Adds to back |
| `pop()` | $O(1)$ | $O(1)$ | Removes front (returns void) |
| `front()` | $O(1)$ | $O(1)$ | Returns reference to front |
| `back()` | $O(1)$ | $O(1)$ | Returns reference to back |
| `size()` | $O(1)$ | $O(1)$ | Stored member variable |
| `empty()` | $O(1)$ | $O(1)$ | Returns bool |

### 5. `std::deque<T>` (Double-Ended Queue)

A Deque (pronounced "deck") is a hybrid. It allows you to push and pop from **both** the front and the back in $O(1)$ time.

*Interview Use Cases:* Sliding Window Maximum problems, or when you need a queue but also need to access elements by index `[i]`.

```cpp
#include <deque>
#include <iostream>
using namespace std;

int main() {
    deque<int> dq;

    // Adding to both ends: O(1)
    dq.push_back(10);   // [10]
    dq.push_front(5);   // [5, 10]
    dq.push_back(20);   // [5, 10, 20]
    dq.push_front(1);   // [1, 5, 10, 20]

    // Removing from both ends: O(1)
    dq.pop_front();     // [5, 10, 20]
    dq.pop_back();      // [5, 10]

    // Unlike a standard queue, a deque allows index access!
    dq.push_back(30);   // [5, 10, 30]
    int val = dq[0];    // 5
    int val2 = dq[1];   // 10

    // Also has front() and back()
    int f = dq.front(); // 5
    int b = dq.back();  // 30
}
```

**What's happening:**
```
Deque memory layout:

  Initial:    push_back(10):  push_front(5):  push_back(20):
  empty       [10]           [5, 10]         [5, 10, 20]
                ↑back         ↑front  ↑back   ↑front     ↑back

  push_front(1):  pop_front():   pop_back():
  [1, 5, 10, 20]  [5, 10, 20]    [5, 10]
  ↑front     ↑back  ↑front ↑back  ↑front ↑back

  Deque = flexible vector that can grow from BOTH ends
  Unlike stack/queue, it supports dq[i] random access
```

**Dry-run table:**

| Step | Operation | Deque State (front→back) | `front()` | `back()` | `size()` |
|------|-----------|--------------------------|-----------|----------|----------|
| 1 | `push_back(10)` | `[10]` | 10 | 10 | 1 |
| 2 | `push_front(5)` | `[5, 10]` | 5 | 10 | 2 |
| 3 | `push_back(20)` | `[5, 10, 20]` | 5 | 20 | 3 |
| 4 | `push_front(1)` | `[1, 5, 10, 20]` | 1 | 20 | 4 |
| 5 | `pop_front()` | `[5, 10, 20]` | 5 | 20 | 3 |
| 6 | `pop_back()` | `[5, 10]` | 5 | 10 | 2 |
| 7 | `dq[0]` | `[5, 10]` | — | — | — |

### 6. Deque Method Complexity Table

| Method | Time | Space | Notes |
|--------|------|-------|-------|
| `push_back(val)` | $O(1)$ | $O(1)$ | Adds to back |
| `push_front(val)` | $O(1)$ | $O(1)$ | Adds to front |
| `pop_back()` | $O(1)$ | $O(1)$ | Removes from back |
| `pop_front()` | $O(1)$ | $O(1)$ | Removes from front |
| `front()` | $O(1)$ | $O(1)$ | Returns reference to front |
| `back()` | $O(1)$ | $O(1)$ | Returns reference to back |
| `dq[i]` | $O(1)$ | $O(1)$ | Random access (unlike stack/queue!) |
| `size()` | $O(1)$ | $O(1)$ | Stored member variable |
| `empty()` | $O(1)$ | $O(1)$ | Returns bool |
| `insert(it, val)` | $O(N)$ | $O(N)$ | Shifts elements (avoid in interviews) |
| `erase(it)` | $O(N)$ | $O(N)$ | Shifts elements (avoid in interviews) |

### 7. Stack vs Queue vs Deque vs Vector — Comparison

| Feature | `stack` | `queue` | `deque` | `vector` |
|---------|---------|---------|---------|----------|
| Access Pattern | LIFO (top only) | FIFO (front/back) | Both ends | Random `[i]` |
| `push` | top | back | front + back | back (+ `insert` at front) |
| `pop` | top | front | front + back | back |
| `operator[]` | ❌ | ❌ | ✅ | ✅ |
| `front()`/`back()` | ❌ (`top()`) | ✅ (`front()`) | ✅ | ✅ |
| Time: push_back | $O(1)$ | $O(1)$ | $O(1)$ | $O(1)$ amortized |
| Time: push_front | N/A | N/A | $O(1)$ | $O(N)$ |
| Time: pop_back | N/A | N/A | $O(1)$ | $O(1)$ |
| Time: pop_front | N/A | $O(1)$ | $O(1)$ | $O(N)$ |
| Time: random access | N/A | N/A | $O(1)$ | $O(1)$ |
| Memory Layout | Contiguous | Chunked | Chunked | Contiguous |

### 8. Common Interview Pattern: Balanced Parentheses

```cpp
bool isValid(string s) {
    stack<char> st;

    for (char c : s) {
        if (c == '(' || c == '[' || c == '{') {
            st.push(c);
        } else {
            if (st.empty()) return false;
            char top = st.top();
            if ((c == ')' && top == '(') ||
                (c == ']' && top == '[') ||
                (c == '}' && top == '{')) {
                st.pop();
            } else {
                return false;
            }
        }
    }
    return st.empty();
}
```

**What's happening:**
```
s = "([]){}"

Step 1: c='(' → push '('     → stack: ['(']
Step 2: c='[' → push '['     → stack: ['(', '[']
Step 3: c=']' → top='[', match → pop   → stack: ['(']
Step 4: c=')' → top='(', match → pop   → stack: []
Step 5: c='{' → push '{'     → stack: ['{']
Step 6: c='}' → top='{', match → pop   → stack: []

After loop: stack.empty() → true → return true ✓
```

**Dry-run table:**

| Step | `c` | Action | Stack State (top→) | Notes |
|------|-----|--------|---------------------|-------|
| 1 | `(` | push | `['(']` | Opening bracket |
| 2 | `[` | push | `['[', '(']` | Opening bracket |
| 3 | `]` | pop | `['(']` | `[` matches `]` ✓ |
| 4 | `)` | pop | `[]` | `(` matches `)` ✓ |
| 5 | `{` | push | `['{']` | Opening bracket |
| 6 | `}` | pop | `[]` | `{` matches `}` ✓ |
| End | — | check | `[]` | Empty → valid ✓ |

### 9. Common Interview Pattern: BFS with Queue

```cpp
void bfs(vector<vector<int>>& adj, int start) {
    vector<bool> visited(adj.size(), false);
    queue<int> q;

    visited[start] = true;
    q.push(start);

    while (!q.empty()) {
        int node = q.front();
        q.pop();
        cout << node << " ";

        for (int neighbor : adj[node]) {
            if (!visited[neighbor]) {
                visited[neighbor] = true;
                q.push(neighbor);
            }
        }
    }
}
```

**What's happening:**
```
BFS explores layer by layer (like ripples in a pond):

        0
       / \
      1   2
     / \   \
    3   4   5

BFS order from 0: 0 1 2 3 4 5
  - Process 0 → enqueue 1, 2
  - Process 1 → enqueue 3, 4
  - Process 2 → enqueue 5
  - Process 3 → no new neighbors
  - Process 4 → no new neighbors
  - Process 5 → no new neighbors
  - Queue empty → done

Queue state at each step:
 q.push(0): [0]
 q.pop(0):  [] → push 1,2: [1,2]
 q.pop(1):  [2] → push 3,4: [2,3,4]
 q.pop(2):  [3,4] → push 5: [3,4,5]
 q.pop(3):  [4,5]
 q.pop(4):  [5]
 q.pop(5):  []
 q.empty() → true → exit
```

### 10. Common Mistakes

```cpp
// MISTAKE 1: Calling top() or front() on an empty container
stack<int> s;
// int val = s.top();  // UNDEFINED BEHAVIOR! (crash or garbage)
// ALWAYS check empty() first
if (!s.empty()) {
    int val = s.top();
}

// MISTAKE 2: Trying to access stack/queue by index
stack<int> s;
s.push(10);
// cout << s[0];  // ERROR: no operator[] for stack
// Use top() instead

// MISTAKE 3: Using pop() return value
stack<int> s;
s.push(10);
// int val = s.pop();  // ERROR: pop() returns void!
int val = s.top();     // Get value first
s.pop();               // Then remove

// MISTAKE 4: Using pop() then top() without checking empty
stack<int> s;
s.push(10);
s.pop();
// int val = s.top();  // UNDEFINED: stack is now empty!
if (!s.empty()) {
    int val = s.top();
}

// MISTAKE 5: Confusing stack push/pop order with queue
// Stack: push(1) push(2) pop() → removes 2 (LIFO)
// Queue: push(1) push(2) pop() → removes 1 (FIFO)
```

### 11. When to Use Which

```
Decision Tree:

  Need LIFO behavior (undo, DFS, backtracking)?
  ├─ Yes → stack<T>

  Need FIFO behavior (BFS, task scheduling)?
  ├─ Yes → Need random access too?
  │        ├─ Yes → deque<T>
  │        └─ No  → queue<T>

  Need to push/pop from both ends?
  ├─ Yes → deque<T>

  Need random access + dynamic size?
  ├─ Yes → vector<T>
```

### Summary of Big O

All operations for Stacks, Queues, and Deques (push, pop, top/front) are strictly **$O(1)$**. If they weren't, there would be no point in using them over a `vector`!

### Quick Reference

| Syntax | What It Does |
|--------|-------------|
| `stack<int> s;` | Create empty stack |
| `s.push(val)` | Add element to top |
| `s.pop()` | Remove top element (void) |
| `s.top()` | Return reference to top element |
| `s.size()` | Number of elements |
| `s.empty()` | `true` if stack is empty |
| `queue<int> q;` | Create empty queue |
| `q.push(val)` | Add element to back |
| `q.pop()` | Remove front element (void) |
| `q.front()` | Return reference to front |
| `q.back()` | Return reference to back |
| `deque<int> dq;` | Create empty deque |
| `dq.push_front(val)` | Add element to front |
| `dq.push_back(val)` | Add element to back |
| `dq.pop_front()` | Remove front element |
| `dq.pop_back()` | Remove back element |
| `dq[i]` | Random access by index |
| `dq.front()` | Return reference to front |
| `dq.back()` | Return reference to back |

---

## Practice & Self-Check

Draw each container as a row of boxes and mark which end is "top", "front" or "back". Then apply the operations one at a time, just like the chapter's dry-run tables.

### Predict the Output / Trace by Hand

**Q1. Same operations, different container.** Both containers get the exact same calls. What are the final contents, `size()`, and `top()` / `front()` / `back()`?

```cpp
stack<int> s;            queue<int> q;
s.push(1);               q.push(1);
s.push(2);               q.push(2);
s.push(3);               q.push(3);
s.pop();                 q.pop();
s.push(4);               q.push(4);
s.pop();                 q.pop();
```

**Q2. Deque from both ends.** What are the final contents, `dq[2]`, `front()` and `back()`?

```cpp
deque<int> dq;
dq.push_front(3);
dq.push_back(7);
dq.push_front(1);
dq.push_back(9);
dq.pop_back();
dq.push_front(0);
```

**Q3. Where does `isValid` fail?** Using `isValid` from Section 8, give the result for each input and the exact step / reason it returns:
(a) `"{[(])}"` (b) `"(()"` (c) `"())"`

**Q4. BFS on a new graph.** Run `bfs` from Section 9 with `start = 0` on

```cpp
vector<vector<int>> adj = {
    {2, 1},   // 0
    {3},      // 1
    {3, 4},   // 2
    {5},      // 3
    {5},      // 4
    {}        // 5
};
```

What is printed? Show the queue after each node is processed.

**Q5. Stack into queue.** What is printed?

```cpp
stack<int> s;
for (int x : {5, 1, 4}) s.push(x);

queue<int> q;
while (!s.empty()) { q.push(s.top()); s.pop(); }
while (!q.empty()) { cout << q.front() << " "; q.pop(); }
```

### Coding Exercises

**E1 (Easy). Apply backspaces.** In the string, `'#'` means "backspace": delete the previous character if there is one. Write `string applyBackspaces(const string& s)` using a `stack<char>`.
- `"ab#c"` returns `"ac"`
- `"a##b"` returns `"b"` (the second `#` has nothing to delete)

**E2 (Easy–Medium). Remove adjacent duplicates.** Repeatedly delete pairs of equal adjacent characters until none remain. Write `string removeAdjacentDuplicates(const string& s)` in one left-to-right pass.
- `"abbaca"` returns `"ca"` (remove `bb` giving `"aaca"`, then remove `aa` giving `"ca"`)
- `"azxxzy"` returns `"ay"`

**E3 (Medium). Sliding window maximum.** Section 5 mentions deques for this problem. Write `vector<int> maxSlidingWindow(const vector<int>& nums, int k)` that returns the maximum of every window of size `k`, in $O(N)$ total time. Keep a `deque<int>` of **indices** whose values are in decreasing order.
- `nums = {1, 3, -1, -3, 5, 3, 6, 7}`, `k = 3` returns `{3, 3, 5, 5, 6, 7}`

#### Dry-Run: Answers

**Q1.**

| Step | `stack` (bottom→top) | `queue` (front→back) |
|------|----------------------|----------------------|
| push 1, 2, 3 | `[1, 2, 3]` | `[1, 2, 3]` |
| `pop()` | `[1, 2]` (removed 3) | `[2, 3]` (removed 1) |
| push 4 | `[1, 2, 4]` | `[2, 3, 4]` |
| `pop()` | `[1, 2]` (removed 4) | `[3, 4]` (removed 2) |

Stack: contents `[1, 2]`, `size() == 2`, `top() == 2`. Queue: contents `[3, 4]`, `size() == 2`, `front() == 3`, `back() == 4`. Same calls, completely different survivors: LIFO removes the newest, FIFO removes the oldest.

**Q2.** Final `[0, 1, 3, 7]`; `dq[2] == 3`, `front() == 0`, `back() == 7`.

| Operation | Deque (front→back) |
|-----------|--------------------|
| `push_front(3)` | `[3]` |
| `push_back(7)` | `[3, 7]` |
| `push_front(1)` | `[1, 3, 7]` |
| `push_back(9)` | `[1, 3, 7, 9]` |
| `pop_back()` | `[1, 3, 7]` |
| `push_front(0)` | `[0, 1, 3, 7]` |

**Q3.**
- (a) `false`. Steps 1–3 push `{`, `[`, `(`. Step 4 reads `]`, but `top()` is `(`, which does not match, so it returns `false` immediately.
- (b) `false`. Push `(`, push `(`, then `)` pops one. The loop ends with one `(` left, so `st.empty()` is `false`.
- (c) `false`. `(` pushed, `)` pops it, then the second `)` finds the stack **empty** and returns `false` at the `if (st.empty())` guard (without that guard, `top()` on an empty stack would be Undefined Behavior — Mistake 1).

**Q4.** Prints `0 2 1 3 4 5`.

| Process | Neighbors | Newly enqueued | Queue after |
|---------|-----------|----------------|-------------|
| 0 | 2, 1 | 2, 1 | `[2, 1]` |
| 2 | 3, 4 | 3, 4 | `[1, 3, 4]` |
| 1 | 3 | — (3 already visited) | `[3, 4]` |
| 3 | 5 | 5 | `[4, 5]` |
| 4 | 5 | — (5 already visited) | `[5]` |
| 5 | — | — | `[]` |

Node 2 comes before node 1 because the neighbor **list order** `{2, 1}` decides the enqueue order. Marking `visited` when pushing (not when popping) stops 3 and 5 from being enqueued twice.

**Q5.** Prints `4 1 5`. The stack holds `[5, 1, 4]` with `4` on top. Popping it moves `4`, `1`, `5` (reversed) into the queue, and the queue then outputs them in that same FIFO order.

**E1 — reference solution**

```cpp
#include <stack>
#include <string>
using namespace std;

string applyBackspaces(const string& s) {
    stack<char> st;
    for (char c : s) {
        if (c == '#') {
            if (!st.empty()) st.pop();   // guard: never pop an empty stack
        } else {
            st.push(c);
        }
    }
    // The stack holds the answer reversed (top = last char); fill from the back.
    string result(st.size(), ' ');
    for (int i = (int)result.size() - 1; i >= 0; i--) {
        result[i] = st.top();
        st.pop();
    }
    return result;
}
```

$O(N)$ time and space. For `"a##b"`: push `a`, pop it, the second `#` sees an empty stack and does nothing, push `b`, giving `"b"`.

**E2 — reference solution**

```cpp
#include <string>
using namespace std;

string removeAdjacentDuplicates(const string& s) {
    string st;                         // a string used as a stack: back() is the top
    for (char c : s) {
        if (!st.empty() && st.back() == c) {
            st.pop_back();             // c cancels the top
        } else {
            st.push_back(c);
        }
    }
    return st;
}
```

$O(N)$ time. Trace on `"abbaca"`: `a` gives `[a]`, `b` gives `[a, b]`, `b` cancels to `[a]`, `a` cancels to `[]`, `c` gives `[c]`, `a` gives `[c, a]`, so `"ca"`. Using a `string` as the stack avoids the reverse-copy step of E1.

**E3 — reference solution**

```cpp
#include <deque>
#include <vector>
using namespace std;

vector<int> maxSlidingWindow(const vector<int>& nums, int k) {
    deque<int> dq;                     // indices; nums[dq] is decreasing front->back
    vector<int> result;
    for (int i = 0; i < (int)nums.size(); i++) {
        if (!dq.empty() && dq.front() <= i - k) {
            dq.pop_front();            // front index slid out of the window
        }
        while (!dq.empty() && nums[dq.back()] <= nums[i]) {
            dq.pop_back();             // smaller values can never be a max again
        }
        dq.push_back(i);
        if (i >= k - 1) result.push_back(nums[dq.front()]);
    }
    return result;
}
```

$O(N)$ time: each index is pushed once and popped at most once. Trace (deque shown as indices with values):

| `i` | `nums[i]` | Deque after | Output |
|-----|-----------|-------------|--------|
| 0 | 1 | `[0:1]` | — |
| 1 | 3 | `[1:3]` | — |
| 2 | -1 | `[1:3, 2:-1]` | 3 |
| 3 | -3 | `[1:3, 2:-1, 3:-3]` | 3 |
| 4 | 5 | `[4:5]` (index 1 expired; -1, -3 popped) | 5 |
| 5 | 3 | `[4:5, 5:3]` | 5 |
| 6 | 6 | `[6:6]` | 6 |
| 7 | 7 | `[7:7]` | 7 |

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Chapter 6: `stack`, `queue`, and `deque`**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **chapter6 stacks queues** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.


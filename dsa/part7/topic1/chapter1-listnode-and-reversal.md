# Part 7, Topic 1: Linked List Operations
## Chapter 1: The `ListNode` & Reversal

While Arrays are contiguous blocks of memory, Linked Lists are scattered. Each element (a Node) lives somewhere random in memory, but it holds a pointer (a memory address) telling the computer exactly where the next Node is located.

**Golden Rule of Linked Lists:** Always draw the pointers on a piece of paper or a whiteboard before you write a single line of code. If you try to do pointer manipulation entirely in your head, you will lose track and cause a Segmentation Fault.

---

## 1. The `ListNode` Struct

In C++, LeetCode provides this definition for a singly-linked list node:

```cpp
struct ListNode {
    int val;
    ListNode *next;

    // Constructors
    ListNode() : val(0), next(nullptr) {}
    ListNode(int x) : val(x), next(nullptr) {}
    ListNode(int x, ListNode *next) : val(x), next(next) {}
};
```

**What's happening:**
```cpp
struct ListNode {
    int val;           // The data stored in this node
    ListNode *next;    // A pointer to the NEXT node in the list

    // Constructor 1: No arguments -> val=0, next=nullptr
    ListNode() : val(0), next(nullptr) {}

    // Constructor 2: One argument -> val=x, next=nullptr
    ListNode(int x) : val(x), next(nullptr) {}

    // Constructor 3: Two arguments -> val=x, next=nextNode
    ListNode(int x, ListNode *next) : val(x), next(next) {}
};
//
// Visual: Creating a list [1 -> 2 -> 3]
//
// ListNode* node3 = new ListNode(3);     // node3: {val=3, next=nullptr}
// ListNode* node2 = new ListNode(2, node3); // node2: {val=2, next=node3}
// ListNode* node1 = new ListNode(1, node2); // node1: {val=1, next=node2}
//
// Memory layout:
//   node1  ->  {1} ---> {2} ---> {3} ---> nullptr
//              node1    node2    node3
```

### Visualizing a Linked List in Memory

Unlike arrays, linked list nodes are NOT contiguous in memory:

```cpp
// Array in memory (contiguous):
// [0x100] [0x104] [0x108] [0x10C]
//   1       2       3       4

// Linked List in memory (scattered):
// 0x200: {val=1, next=0x500} ---> 0x500: {val=2, next=0x300} ---> 0x300: {val=3, next=nullptr}
//
// The nodes live at random addresses, but each node
// knows WHERE the next node lives via its 'next' pointer.
```

---

## 2. Basic Traversal

To loop through a linked list, you use a `while` loop, checking if the current node is `nullptr` (the end of the list).

```cpp
void printList(ListNode* head) {
    ListNode* curr = head;
    while (curr != nullptr) {
        cout << curr->val << " -> ";
        curr = curr->next; // Move to the next node
    }
    cout << "NULL" << endl;
}
```

**What's happening:**
```cpp
// Given list: 1 -> 2 -> 3 -> nullptr
//
// Step-by-step traversal:
//   curr = head (points to node with val=1)
//
//   Iteration 1: curr = node(1), print "1 -> ", curr = curr->next (node 2)
//   Iteration 2: curr = node(2), print "2 -> ", curr = curr->next (node 3)
//   Iteration 3: curr = node(3), print "3 -> ", curr = curr->next (nullptr)
//   Iteration 4: curr = nullptr, loop exits
//
//   Output: "1 -> 2 -> 3 -> NULL"
//
// Key insight: We NEVER modify the list here. We just READ and advance.
// curr is a "walker" that steps through the list one node at a time.
```

### Dry-Run Table: Traversal

For list `1 -> 2 -> 3 -> nullptr`:

| Iteration | `curr` points to | `curr->val` | `curr->next` | Output so far |
|-----------|-------------------|-------------|---------------|----------------|
| Start     | node(1)           | 1           | node(2)       | -              |
| 1         | node(1)           | 1           | node(2)       | "1 -> "        |
| 2         | node(2)           | 2           | node(3)       | "1 -> 2 -> "   |
| 3         | node(3)           | 3           | nullptr       | "1 -> 2 -> 3 -> " |
| 4         | nullptr           | -           | -             | "1 -> 2 -> 3 -> NULL" |

---

## 3. Inserting and Deleting (The $O(1)$ Advantage)

The main advantage a Linked List has over a `vector` is that inserting or deleting a node in the *middle* of the list takes $O(1)$ time, provided you already have a pointer to that location. You don't have to shift any elements!

### Inserting `NewNode` after `NodeA`

```cpp
// Step 1: Point NewNode->next to NodeA->next (the rest of the list)
NewNode->next = NodeA->next;

// Step 2: Point NodeA->next to NewNode
NodeA->next = NewNode;
```

**What's happening:**
```
BEFORE insertion (inserting node X between A and B):

    NodeA ---> NodeB ---> NodeC ---> nullptr
     |

    NewNode ---> (uninitialized)

AFTER Step 1 (NewNode->next = NodeA->next):

    NodeA ---> NodeB ---> NodeC ---> nullptr
     |

    NewNode ---> NodeB ---> NodeC ---> nullptr

    Now NewNode and NodeA both point to NodeB!

AFTER Step 2 (NodeA->next = NewNode):

    NodeA ---> NewNode ---> NodeB ---> NodeC ---> nullptr

    DONE! NewNode is now inserted between NodeA and NodeB.
```

**CRITICAL: Order Matters!**
```
WRONG ORDER (Step 2 first, then Step 1):
    Step 2: NodeA->next = NewNode
    Step 1: NewNode->next = NodeA->next  // This is NewNode->next = NewNode!

    Result: NodeA ---> NewNode ---> (points to itself!) INFINITE LOOP!
            The entire list after NodeA is LOST (memory leak).
```

### Dry-Run Table: Insertion

Inserting node X (val=5) between node A (val=1) and node B (val=3):

| Step | Operation | `NodeA->next` | `NewNode->next` | List after step |
|------|-----------|---------------|------------------|-----------------|
| Before | - | points to B | (uninitialized) | `1 -> 3 -> 4 -> nullptr` |
| 1 | `NewNode->next = NodeA->next` | points to B | points to B | `1 -> 3 -> 4` AND `5 -> 3 -> 4` (both point to B) |
| 2 | `NodeA->next = NewNode` | points to X | points to B | `1 -> 5 -> 3 -> 4 -> nullptr` |

### Deleting the node after `NodeA`

```cpp
// Point NodeA->next to NodeA->next->next
// This "bypasses" the next node, removing it from the logical chain.
NodeA->next = NodeA->next->next;
```

**What's happening:**
```
BEFORE deletion (removing NodeB):

    NodeA ---> NodeB ---> NodeC ---> nullptr

AFTER deletion (NodeA->next = NodeA->next->next):

    NodeA ---> NodeC ---> nullptr
                 |
    NodeB        (orphaned, will be garbage collected)

    NodeB is still in memory, but nothing points to it anymore.
    It will be cleaned up by garbage collection (Java/Python)
    or you must explicitly 'delete' it in C++.
```

### Dry-Run Table: Deletion

| Step | Operation | `NodeA->next` | List after step |
|------|-----------|---------------|-----------------|
| Before | - | points to B | `1 -> 2 -> 3 -> nullptr` |
| 1 | `NodeA->next = NodeA->next->next` | points to C | `1 -> 3 -> nullptr` |

### Comparison: Array vs Linked List Insertion/Deletion

| Operation | Array (vector) | Linked List |
|-----------|----------------|-------------|
| Insert at beginning | $O(N)$ - must shift all elements | $O(1)$ - just change head pointer |
| Insert at end | $O(1)$ amortized | $O(1)$ with tail pointer, $O(N)$ without |
| Insert at middle (given pointer) | $O(N)$ - must shift elements | $O(1)$ - just rewire pointers |
| Delete at beginning | $O(N)$ - must shift all elements | $O(1)$ - just change head pointer |
| Delete at end | $O(1)$ | $O(N)$ - must find second-to-last node |
| Delete at middle (given pointer) | $O(N)$ - must shift elements | $O(1)$ - just rewire pointers |
| Access by index | $O(1)$ - direct index | $O(N)$ - must traverse |

---

## 4. Reversing a Linked List

This is the most famous interview question of all time. You must be able to write the iterative version of this in your sleep.

### 4a. Iterative Reversal (The 3-Pointer Trick)

To reverse `A -> B -> C`, we need `B` to point to `A`. But if `B` points to `A`, we lose the pointer to `C`!
Therefore, we need 3 pointers at all times:
1. `prev` (starts at `nullptr`)
2. `curr` (starts at `head`)
3. `next_node` (temporarily holds the rest of the list)

```cpp
ListNode* reverseList(ListNode* head) {
    ListNode* prev = nullptr;
    ListNode* curr = head;

    while (curr != nullptr) {
        // 1. Save the rest of the list
        ListNode* next_node = curr->next;

        // 2. REVERSE the pointer
        curr->next = prev;

        // 3. Slide the 'prev' and 'curr' pointers forward for the next iteration
        prev = curr;
        curr = next_node;
    }

    // When the loop ends, 'curr' is nullptr, and 'prev' is the NEW head!
    return prev;
}
// Time: O(N), Space: O(1)
```

**What's happening:**
```
Given list: 1 -> 2 -> 3 -> nullptr

INITIAL STATE:
    prev = nullptr
    curr = node(1)

    nullptr <-- prev    curr --> 2 -> 3 -> nullptr
                        |
                       [1]

ITERATION 1:
    next_node = curr->next  (saves node 2)
    curr->next = prev       (reverses: 1 now points to nullptr)
    prev = curr             (prev moves to node 1)
    curr = next_node        (curr moves to node 2)

    nullptr <-- [1]    curr --> 3 -> nullptr
              prev     |
                      [2]

ITERATION 2:
    next_node = curr->next  (saves node 3)
    curr->next = prev       (reverses: 2 now points to 1)
    prev = curr             (prev moves to node 2)
    curr = next_node        (curr moves to node 3)

    nullptr <-- [2] <-- [1]    curr --> nullptr
              prev
                       |
                      [3]

ITERATION 3:
    next_node = curr->next  (saves nullptr)
    curr->next = prev       (reverses: 3 now points to 2)
    prev = curr             (prev moves to node 3)
    curr = next_node        (curr moves to nullptr)

    nullptr <-- [3] <-- [2] <-- [1]    curr = nullptr
              prev

LOOP ENDS: curr == nullptr
    return prev  (which is node 3, the new head)

FINAL LIST: 3 -> 2 -> 1 -> nullptr
```

### Dry-Run Table: Iterative Reversal

For list `1 -> 2 -> 3 -> nullptr`:

| Iteration | `prev` | `curr` | `next_node` | Action | List state after |
|-----------|--------|--------|-------------|--------|------------------|
| Start | nullptr | node(1) | - | - | `1 -> 2 -> 3 -> nullptr` |
| 1 | node(1) | node(2) | node(2) | 1->next = nullptr | `nullptr <-- 1    2 -> 3` |
| 2 | node(2) | node(3) | node(3) | 2->next = node(1) | `nullptr <-- 1 <-- 2    3 -> nullptr` |
| 3 | node(3) | nullptr | nullptr | 3->next = node(2) | `nullptr <-- 1 <-- 2 <-- 3` |
| End | node(3) | nullptr | - | return prev | `3 -> 2 -> 1 -> nullptr` |

### 4b. Recursive Reversal

While less common, understanding the recursive approach is excellent for your overall grasp of the Call Stack.

```cpp
ListNode* reverseListRecursive(ListNode* head) {
    // Base case: empty list or single node
    if (head == nullptr || head->next == nullptr) {
        return head;
    }

    // Reverse the REST of the list.
    // 'newHead' will eventually bubble up the last node of the original list.
    ListNode* newHead = reverseListRecursive(head->next);

    // Right now, head->next still points to the node to our right.
    // We want the node to our right to point BACK at us!
    head->next->next = head;

    // We point our own next to nullptr (in case we are the new tail)
    head->next = nullptr;

    return newHead;
}
// Time: O(N), Space: O(N) due to Call Stack
```

**What's happening:**
```
Given list: 1 -> 2 -> 3 -> nullptr

RECURSIVE CALLS (building up the call stack):
    reverseList(1) calls reverseList(2) calls reverseList(2) calls reverseList(3)
                                                              returns node(3) (base case)

UNWINDING THE CALL STACK:

    At node(3): returns node(3) as newHead
    At node(2): head = node(2), head->next = node(3)
        head->next->next = head  =>  node(3)->next = node(2)  (3 now points to 2!)
        head->next = nullptr     =>  node(2)->next = nullptr  (2 is now the tail)
        Returns newHead (still node 3)

    At node(1): head = node(1), head->next = node(2)
        head->next->next = head  =>  node(2)->next = node(1)  (2 now points to 1!)
        head->next = nullptr     =>  node(1)->next = nullptr  (1 is now the tail)
        Returns newHead (still node 3)

FINAL: 3 -> 2 -> 1 -> nullptr
```

### Comparison: Iterative vs Recursive Reversal

| Aspect | Iterative | Recursive |
|--------|-----------|-----------|
| Time Complexity | $O(N)$ | $O(N)$ |
| Space Complexity | $O(1)$ | $O(N)$ (call stack) |
| Readability | Moderate | High (cleaner logic) |
| Stack Overflow Risk | None | Yes, for very long lists |
| Interview Preference | Preferred | Acceptable but explain tradeoff |

---

## 5. Common Patterns and Edge Cases

### Edge Case: Empty List
```cpp
// head == nullptr
// reverseList(nullptr) returns nullptr immediately (base case / while loop skips)
```

### Edge Case: Single Node
```cpp
// head -> nullptr
// Iterative: prev starts at nullptr, curr = head, one iteration makes prev = head
// Returns head. Correct!
```

### Edge Case: Two Nodes
```
1 -> 2 -> nullptr

Iteration 1: next_node = 2, 1->next = nullptr, prev = 1, curr = 2
Iteration 2: next_node = nullptr, 2->next = 1, prev = 2, curr = nullptr
Return prev = 2

Result: 2 -> 1 -> nullptr
```

---

## Quick Reference Table

| Concept | Syntax | Time | Space |
|---------|--------|------|-------|
| Define node | `ListNode* node = new ListNode(val);` | $O(1)$ | $O(1)$ |
| Traverse | `while (curr != nullptr) { ... curr = curr->next; }` | $O(N)$ | $O(1)$ |
| Insert after node | `newNode->next = node->next; node->next = newNode;` | $O(1)$ | $O(1)$ |
| Delete next node | `node->next = node->next->next;` | $O(1)$ | $O(1)$ |
| Reverse (iterative) | 3 pointers: `prev`, `curr`, `next_node` | $O(N)$ | $O(1)$ |
| Reverse (recursive) | `head->next->next = head; head->next = nullptr;` | $O(N)$ | $O(N)$ |
| Find length | Traverse and count | $O(N)$ | $O(1)$ |
| Print list | Traverse with `cout` | $O(N)$ | $O(1)$ |

| Pattern | When to Use |
|---------|-------------|
| 3-pointer reversal | Any "reverse a linked list" problem |
| Insert after node | Building new lists, merging lists |
| Bypass delete | Removing nodes by value or position |
| Sentinel/dummy node | When head might change (see Chapter 2) |

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Chapter 1: The `ListNode` & Reversal**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **chapter1 listnode and reversal** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.


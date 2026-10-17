# Part 7, Topic 1: Linked List Operations
## Chapter 2: Dummy Heads (Sentinel Nodes)

When manipulating Linked Lists, 90% of bugs come from Edge Cases involving the `head` of the list.

---

## 1. The Head Edge Case Problem

Imagine a problem where you need to delete nodes that contain the value `val`.

```cpp
ListNode* removeElements(ListNode* head, int val) {
    ListNode* curr = head;
    while (curr != nullptr && curr->next != nullptr) {
        if (curr->next->val == val) {
            curr->next = curr->next->next; // Bypass the node
        } else {
            curr = curr->next;
        }
    }
    return head;
}
```

**What's happening:**
```
Given list: 1 -> 2 -> 6 -> 3 -> 6 -> nullptr, val = 6

This code works for removing a node in the MIDDLE or END.
It checks curr->next->val, meaning it can never check or delete curr itself.

When curr is at node(2):
    curr->next = node(6), val matches!
    curr->next = curr->next->next  =>  node(2)->next = node(3)
    List becomes: 1 -> 2 -> 3 -> 6 -> nullptr
    curr stays at node(2), next iteration checks node(3)

BUT what if the list is [6, 2, 3] and we want to remove 6?
    curr = head (node 6)
    curr->next = node(2)
    curr->next->val == 2, which is NOT 6
    So we advance curr to node(2)
    We NEVER checked if head itself was 6!
    The head node is NEVER deleted.
```

### The Problem Visualized

```
List: 6 -> 2 -> 3 -> nullptr, remove val=6

    curr = head (node 6)
    Check: curr->next->val == 2, NOT 6
    Advance: curr = node(2)
    Check: curr->next->val == 3, NOT 6
    Advance: curr = node(3)
    Check: curr->next == nullptr, stop

    Result: 6 -> 2 -> 3 -> nullptr  (6 was NOT removed!)

    The code can only delete the NEXT node, never the CURRENT node.
    So if head needs to be deleted, we're stuck.
```

### The Messy Fix (Without Dummy Node)

```cpp
ListNode* removeElements(ListNode* head, int val) {
    // Handle head edge case separately
    while (head != nullptr && head->val == val) {
        ListNode* temp = head;
        head = head->next;
        delete temp;
    }

    if (head == nullptr) return nullptr;

    // Now handle the rest
    ListNode* curr = head;
    while (curr->next != nullptr) {
        if (curr->next->val == val) {
            ListNode* temp = curr->next;
            curr->next = curr->next->next;
            delete temp;
        } else {
            curr = curr->next;
        }
    }
    return head;
}
```

**What's happening:**
```
This "works" but it's UGLY:
    1. We need a special while loop just for the head
    2. We need a separate 'if (head == nullptr)' check
    3. The main logic is duplicated

    If the problem were MORE complex (like "remove every other node"),
    the head edge case code would become MUCH more complicated.

    This is a code smell. There's a better way.
```

---

## 2. The Dummy Node Solution

A **Dummy Head** (or Sentinel Node) is a fake node that you instantiate at the very beginning of your function and place *before* the actual `head`.

By putting a fake node before the `head`, the actual `head` becomes a "middle" node. This means **your middle-node logic now works for the entire list, completely eliminating head edge cases.**

### The Visual Transformation

```
WITHOUT DUMMY NODE:
    Head is special. You can't use curr->next->val logic on it.

    [head] -> 1 -> 2 -> 3 -> nullptr
     ^
     You can't check or delete this with standard logic

WITH DUMMY NODE:
    The dummy node absorbs the "head" edge case.

    [dummy] -> [head] -> 1 -> 2 -> 3 -> nullptr
       ^
       curr starts here. Now head(1) is just a "middle" node.
       The SAME logic works for head, middle, and tail nodes!
```

### The Code

```cpp
ListNode* removeElementsOptimal(ListNode* head, int val) {
    // 1. Create a dummy node. (Value doesn't matter, we use 0).
    // Note: We create it directly on the stack, not with 'new',
    // to avoid manual memory management leaks in C++.
    ListNode dummy(0);

    // 2. Point the dummy's next to the actual head
    dummy.next = head;

    // 3. Start 'curr' at the dummy node!
    ListNode* curr = &dummy;

    while (curr->next != nullptr) {
        if (curr->next->val == val) {
            // Because curr is dummy, curr->next is the actual head!
            // We can now safely delete the head using standard bypass logic.
            curr->next = curr->next->next;
        } else {
            curr = curr->next;
        }
    }

    // 4. Return the ACTUAL new head, which is dummy.next
    return dummy.next;
}
```

**What's happening:**
```
Given list: 6 -> 2 -> 6 -> 3 -> nullptr, val = 6

INITIAL STATE:
    dummy(0) -> 6 -> 2 -> 6 -> 3 -> nullptr
    curr = &dummy

ITERATION 1:
    curr->next = node(6), val == 6!
    curr->next = curr->next->next (bypass node 6)
    dummy(0) -> 2 -> 6 -> 3 -> nullptr
    curr stays at dummy

ITERATION 2:
    curr->next = node(2), val != 6
    curr = curr->next (advance to node 2)
    dummy(0) -> 2 -> 6 -> 3 -> nullptr
    curr = node(2)

ITERATION 3:
    curr->next = node(6), val == 6!
    curr->next = curr->next->next (bypass node 6)
    dummy(0) -> 2 -> 3 -> nullptr
    curr stays at node(2)

ITERATION 4:
    curr->next = node(3), val != 6
    curr = curr->next (advance to node 3)
    dummy(0) -> 2 -> 3 -> nullptr
    curr = node(3)

ITERATION 5:
    curr->next == nullptr, loop exits

RETURN dummy.next = node(2)
Result: 2 -> 3 -> nullptr
```

### Dry-Run Table: Dummy Node Removal

List: `6 -> 2 -> 6 -> 3 -> nullptr`, remove val=6:

| Iteration | `curr` points to | `curr->next->val` | Match? | Action | List after |
|-----------|-------------------|--------------------|--------|--------|------------|
| 1 | dummy(0) | 6 | Yes | Bypass | `dummy -> 2 -> 6 -> 3` |
| 2 | dummy(0) | 2 | No | Advance | `dummy -> 2 -> 6 -> 3` |
| 3 | node(2) | 6 | Yes | Bypass | `dummy -> 2 -> 3` |
| 4 | node(2) | 3 | No | Advance | `dummy -> 2 -> 3` |
| 5 | node(3) | nullptr | - | Stop | `dummy -> 2 -> 3` |

Return `dummy.next` = node(2) => `2 -> 3 -> nullptr`

---

## 3. When to Use a Dummy Node

You should instantiate a Dummy Node in almost **every** Linked List problem where the `head` of the list might change or be removed.

### Pattern Recognition Table

| Problem Type | Why Use Dummy Node | Example Problems |
|--------------|-------------------|------------------|
| Merging Lists | You don't know which list provides the new head | Merge Two Sorted Lists |
| Deleting Nodes | Head might be the node to delete | Remove Nth Node From End |
| Reordering/Partitioning | Building a new list from parts of the original | Odd-Even Linked List |
| Reversing Sub-lists | Head of the reversed portion changes | Reverse Nodes in k-Group |
| Removing Duplicates | Head might be duplicated | Remove Duplicates from Sorted List |
| Intersection Point | Both lists might be modified | Intersection of Two Linked Lists |

### Example: Merge Two Sorted Lists (Without Dummy)

```cpp
ListNode* mergeTwoLists(ListNode* list1, ListNode* list2) {
    if (list1 == nullptr) return list2;
    if (list2 == nullptr) return list1;

    // Special case: which list is the new head?
    ListNode* head;
    if (list1->val <= list2->val) {
        head = list1;
    } else {
        head = list2;
    }
    // ... complex merging logic with head tracking ...
    return head;
}
```

**What's happening:**
```
This is messy because:
    1. We need 'if (list1 == nullptr)' and 'if (list2 == nullptr)' checks
    2. We need to decide WHICH list is the head
    3. During merging, we'd need to track if we're still at the head

    Without a dummy node, the "first element" is always special.
```

### Example: Merge Two Sorted Lists (With Dummy)

```cpp
ListNode* mergeTwoLists(ListNode* list1, ListNode* list2) {
    ListNode dummy(0);
    ListNode* tail = &dummy;

    while (list1 != nullptr && list2 != nullptr) {
        if (list1->val <= list2->val) {
            tail->next = list1;
            list1 = list1->next;
        } else {
            tail->next = list2;
            list2 = list2->next;
        }
        tail = tail->next;
    }

    // Attach whatever is left over
    if (list1 != nullptr) tail->next = list1;
    else if (list2 != nullptr) tail->next = list2;

    return dummy.next;
}
```

**What's happening:**
```
    The dummy node ELIMINATES the "which list is head?" question.
    We just attach everything to dummy->next and return dummy.next.
    The code is cleaner, shorter, and less error-prone.

    BEFORE:  dummy -> [merged list starts here]
    We never touch dummy again. We just use 'tail' to build the list.
    RETURN dummy.next (the first real node).
```

---

## 4. Memory Management Note (C++)

In Java or Python, you can write `ListNode dummy = new ListNode(0)` and the Garbage Collector handles it.

In C++, if you use `new`, you allocate memory on the heap and you are responsible for `delete`ing it before the function returns, or you cause a memory leak.

### Stack Allocation (Preferred)

```cpp
ListNode dummy(0);  // Created on the STACK
dummy.next = head;
// ...
return dummy.next;
// dummy is automatically destroyed when function returns. No leak!
```

### Heap Allocation (Risky)

```cpp
ListNode* dummy = new ListNode(0);  // Created on the HEAP
dummy->next = head;
// ...
ListNode* result = dummy->next;
delete dummy;  // MUST manually delete, or leak!
return result;
// If you forget 'delete dummy', it's a memory leak.
```

### Comparison Table

| Allocation | Syntax | Automatic Cleanup | Debug-Friendly | Recommended |
|------------|--------|-------------------|----------------|-------------|
| Stack | `ListNode dummy(0);` | Yes | Yes (can inspect) | Yes |
| Heap | `ListNode* dummy = new ListNode(0);` | No (must delete) | Harder (pointer indirection) | No |

In competitive programming / LeetCode, people often use `new ListNode(0)` and accept the small memory leak because the program terminates immediately anyway. However, in a real interview, writing `ListNode dummy(0);` (stack allocation) and passing its address `&dummy` shows the interviewer you understand C++ memory management better than 90% of candidates.

---

## Quick Reference Table

| Concept | Pattern | When to Use |
|---------|---------|-------------|
| Dummy node creation | `ListNode dummy(0); ListNode* curr = &dummy;` | Head might change |
| Dummy.next return | `return dummy.next;` | Always when using dummy |
| Bypass delete | `curr->next = curr->next->next;` | Remove node with specific value |
| Advance pointer | `curr = curr->next;` | Move to next node |
| Attach to tail | `tail->next = source; tail = tail->next;` | Build new list |
| Stack allocation | `ListNode dummy(0);` | C++ (no memory leak) |
| Heap allocation | `new ListNode(0)` + `delete` | Avoid in interviews |

| Anti-Pattern | Better Alternative |
|--------------|-------------------|
| `if (head == nullptr) return nullptr;` + separate head logic | Use dummy node |
| `head = head->next;` in a loop for head deletion | Use dummy node, return `dummy.next` |
| `new ListNode(0)` without `delete` | `ListNode dummy(0)` on stack |

---

## Practice & Self-Check

The test for every answer below: *could the head change?* If yes, the dummy node should be doing the work.

### Predict the Output / Trace by Hand

**Q1. The buggy version on a nastier input.** Run the very first `removeElements` in this chapter (no dummy, checks only `curr->next->val`) on `6 -> 6 -> 2 -> 6 -> nullptr` with `val = 6`. What list is returned? Which 6s were removed and which survived?

**Q2. Dummy-node dry-run.** Run `removeElementsOptimal` on `7 -> 7 -> 7 -> 1 -> nullptr` with `val = 7`. Fill in the chapter-style dry-run table (`curr`, `curr->next->val`, match?, action). How many loop iterations run, and what is returned? What would be returned for `7 -> 7 -> nullptr`?

**Q3. Ties in the merge.** Label the nodes `list1 = 1a -> 4 -> 5` and `list2 = 1b -> 2 -> 6`. Using this chapter's dummy-node `mergeTwoLists` (which compares with `<=`), which `1` ends up first? What is the final order? Would the answer change if the comparison were `<`?

**Q4. Why `return dummy.next` and not `&dummy`?** A student "simplifies" the dummy-node pattern:

```cpp
ListNode* buildWithDummy(ListNode* head) {
    ListNode dummy(0);
    dummy.next = head;
    return &dummy;      // caller will just skip the first node...
}
```

What is wrong with returning `&dummy`, and which section of the chapter explains why?

### Coding Exercises

**E1 (Easy). Remove duplicates from a sorted list (keep one copy).** Every value should appear once. Here the head never needs deleting — explain in one sentence why no dummy is required.

```cpp
ListNode* deleteDuplicates(ListNode* head);
// [1, 1, 2, 3, 3] -> [1, 2, 3]
// [1, 1, 1]       -> [1]
```

**E2 (Easy–Medium). Partition list (LC 86).** Rearrange so that all nodes with value `< x` come before nodes with value `>= x`, preserving the original relative order inside each group. Build two lists with **two** stack-allocated dummy nodes, then join them.

```cpp
ListNode* partition(ListNode* head, int x);
// [1, 4, 3, 2, 5, 2], x = 3 -> [1, 2, 2, 4, 3, 5]
// [2, 1],             x = 2 -> [1, 2]
```

**E3 (Medium). Remove *all* duplicated values from a sorted list (LC 82).** If a value appears more than once, delete every node with that value. The head itself may be deleted, so use a dummy.

```cpp
ListNode* deleteAllDuplicates(ListNode* head);
// [1, 2, 3, 3, 4, 4, 5] -> [1, 2, 5]
// [1, 1, 1, 2, 3]       -> [2, 3]
```

#### Dry-Run: Answers

**Q1.** Returns **`6 -> 2 -> nullptr`**. The second and fourth 6s are removed; the head 6 survives.

| Iteration | `curr` | `curr->next->val` | Match? | Action | List after |
|-----------|--------|-------------------|--------|--------|------------|
| 1 | node(6) head | 6 (2nd node) | Yes | Bypass | `6 -> 2 -> 6` |
| 2 | node(6) head | 2 | No | Advance | `6 -> 2 -> 6` |
| 3 | node(2) | 6 | Yes | Bypass | `6 -> 2` |
| 4 | node(2) | – (`next` is nullptr) | – | Stop | `6 -> 2` |

Note the code *can* delete the second 6 because it is "a next node" — only the head is unreachable for deletion.

**Q2.** **5** iterations (4 that do work + 1 failed check), returns **node(1)** → `1 -> nullptr`.

| Iteration | `curr` | `curr->next->val` | Match? | Action | List after |
|-----------|--------|-------------------|--------|--------|------------|
| 1 | dummy | 7 | Yes | Bypass | `dummy -> 7 -> 7 -> 1` |
| 2 | dummy | 7 | Yes | Bypass | `dummy -> 7 -> 1` |
| 3 | dummy | 7 | Yes | Bypass | `dummy -> 1` |
| 4 | dummy | 1 | No | Advance | `dummy -> 1` |
| 5 | node(1) | nullptr | – | Stop | `dummy -> 1` |

For `7 -> 7 -> nullptr`: two bypasses leave `dummy.next == nullptr`, the loop stops, and it returns **`nullptr`** (empty list) — no special case needed.

**Q3.** With `<=`, **`1a`** (from `list1`) comes first. Final order: **`1a -> 1b -> 2 -> 4 -> 5 -> 6`**.

| Step | Compare | Attach | `tail` |
|------|---------|--------|--------|
| 1 | 1a <= 1b ✓ | 1a | 1a |
| 2 | 4 <= 1b ✗ | 1b | 1b |
| 3 | 4 <= 2 ✗ | 2 | 2 |
| 4 | 4 <= 6 ✓ | 4 | 4 |
| 5 | 5 <= 6 ✓ | 5 | 5 |
| end | list1 empty | attach 6 | – |

With `<` (as in the Interview Problems version), step 1 is `1a < 1b` = false, so **`1b` comes first**. The values are identical, but `<=` keeps the merge *stable* (equal elements keep their list1-before-list2 order), which matters when nodes carry extra data.

**Q4.** `dummy` lives on the **stack frame** of `buildWithDummy`. When the function returns, that frame is destroyed, so `&dummy` is a **dangling pointer** — dereferencing it is undefined behaviour. Section 4 ("Memory Management Note") explains this: the stack-allocated dummy is "automatically destroyed when function returns", which is exactly why the pattern returns `dummy.next` (a pointer to a real heap node) and never the dummy itself.

**E1 — reference solution**

```cpp
ListNode* deleteDuplicates(ListNode* head) {
    ListNode* curr = head;
    while (curr != nullptr && curr->next != nullptr) {
        if (curr->next->val == curr->val) {
            curr->next = curr->next->next;     // Bypass the duplicate, stay put
        } else {
            curr = curr->next;                 // Next value is new: advance
        }
    }
    return head;
}
```

$O(N)$ time, $O(1)$ space. No dummy is needed because the *first* occurrence of each value is always kept, so the head node can never be removed.

**E2 — reference solution**

```cpp
ListNode* partition(ListNode* head, int x) {
    ListNode lessDummy(0), geDummy(0);             // Two stack dummies
    ListNode* less = &lessDummy;
    ListNode* ge = &geDummy;
    for (ListNode* curr = head; curr != nullptr; curr = curr->next) {
        if (curr->val < x) { less->next = curr; less = curr; }   // Attach to tail
        else               { ge->next = curr;   ge = curr;   }
    }
    ge->next = nullptr;                // CRITICAL: cut the old link (avoids a cycle)
    less->next = geDummy.next;         // Join: small list, then big list
    return lessDummy.next;
}
```

$O(N)$ time, $O(1)$ extra space. Without `ge->next = nullptr`, the last `>= x` node (here the `5` in the first example) would keep pointing at whatever followed it originally (the final `2`, which is now in the *less* list), creating a cycle.

**E3 — reference solution**

```cpp
ListNode* deleteAllDuplicates(ListNode* head) {
    ListNode dummy(0, head);
    ListNode* prev = &dummy;                       // Last node known to be unique
    while (prev->next != nullptr) {
        ListNode* curr = prev->next;
        if (curr->next != nullptr && curr->next->val == curr->val) {
            int dup = curr->val;
            while (prev->next != nullptr && prev->next->val == dup) {
                prev->next = prev->next->next;     // Bypass EVERY node with this value
            }
        } else {
            prev = prev->next;                     // curr is unique: keep it
        }
    }
    return dummy.next;
}
```

$O(N)$ time, $O(1)$ space. For `[1,1,1,2,3]`, `prev` stays on the dummy while all three 1s are bypassed, so `dummy.next` becomes node(2) — the head deletion happens with no special code.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Chapter 2: Dummy Heads (Sentinel Nodes)**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **chapter2 dummy heads** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.


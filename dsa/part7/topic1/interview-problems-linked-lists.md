# Part 7, Topic 1: Linked List Operations
## Interview Problems Walkthrough

Because Linked Lists limit your ability to access random indexes, these problems heavily test your pointer manipulation skills. Draw them out!

---

## Problem Classification Table

| # | Problem | Difficulty | Key Technique | Pattern |
|---|---------|------------|---------------|---------|
| 1 | Reverse Linked List | Easy | 3-pointer reversal | Core skill |
| 2 | Merge Two Sorted Lists | Easy | Dummy node + tail pointer | Merge pattern |
| 3 | Linked List Cycle | Easy | Fast & slow pointers | Cycle detection |
| 4 | Find the Duplicate Number | Medium | Fast & slow (cycle as array) | Cycle on values |
| 5 | Remove Nth Node From End | Medium | Two pointers + dummy node | Gap technique |
| 6 | Reorder List | Medium | Find middle + reverse + merge | Combo problem |
| 7 | LRU Cache | Medium | Hash map + doubly linked list | Design |
| 8 | Reverse Nodes in k-Group | Hard | Dummy node + group reversal | Chunk processing |

## Solution Approach Comparison

| Technique | Problems Using It | Time | Space |
|-----------|-------------------|------|-------|
| 3-pointer reversal | #1, #6, #8 | $O(N)$ | $O(1)$ |
| Dummy node | #2, #5, #8 | $O(N)$ | $O(1)$ |
| Fast & slow pointers | #3, #4, #6 | $O(N)$ | $O(1)$ |
| Hash map | #4, #7 | $O(N)$ | $O(N)$ |
| Two pointers with gap | #5 | $O(N)$ | $O(1)$ |

---

## 1. Reverse Linked List (Easy)

**Trigger:** Reverse a singly linked list.
**Intuition:** Use the 3-pointer trick (`prev`, `curr`, `next_node`).
*(See Chapter 1 for the full code template and walkthrough).*

```cpp
ListNode* reverseList(ListNode* head) {
    ListNode* prev = nullptr;
    ListNode* curr = head;

    while (curr != nullptr) {
        ListNode* next_node = curr->next;
        curr->next = prev;
        prev = curr;
        curr = next_node;
    }

    return prev;
}
```

### Step-by-Step Walkthrough

List: `1 -> 2 -> 3 -> nullptr`

| Step | `prev` | `curr` | `next_node` | Action |
|------|--------|--------|-------------|--------|
| Init | nullptr | node(1) | - | - |
| 1 | node(1) | node(2) | node(2) | 1->next = nullptr |
| 2 | node(2) | node(3) | node(3) | 2->next = node(1) |
| 3 | node(3) | nullptr | nullptr | 3->next = node(2) |
| Return | node(3) | nullptr | - | `3 -> 2 -> 1 -> nullptr` |

---

## 2. Merge Two Sorted Lists (Easy)

**Trigger:** Splice two two sorted linked lists together in $O(1)$ space.
**Intuition:** This is exactly like the `merge()` step of Merge Sort! Use a **Dummy Node**. Keep a `tail` pointer. While both lists have nodes, compare their values. Attach the smaller node to `tail->next`, and advance that list's pointer. When one list runs out, simply attach the entire remainder of the other list to the `tail`.

```cpp
ListNode* mergeTwoLists(ListNode* list1, ListNode* list2) {
    ListNode dummy(0);
    ListNode* tail = &dummy;

    while (list1 != nullptr && list2 != nullptr) {
        if (list1->val < list2->val) {
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

### Step-by-Step Walkthrough

List1: `1 -> 3 -> 5`, List2: `2 -> 4 -> 6`

| Step | `list1` | `list2` | `tail->next` | `tail` | Action |
|------|---------|---------|-------------|--------|--------|
| Init | node(1) | node(2) | - | dummy | - |
| 1 | node(3) | node(2) | node(1) | node(1) | 1 < 2, attach 1 |
| 2 | node(3) | node(4) | node(2) | node(2) | 3 > 2, attach 2 |
| 3 | node(5) | node(4) | node(3) | node(3) | 3 < 4, attach 3 |
| 4 | node(5) | node(6) | node(4) | node(4) | 5 > 4, attach 4 |
| 5 | nullptr | node(6) | node(5) | node(5) | 5 < 6, attach 5 |
| 6 | nullptr | node(6) | node(6) | node(5) | list1 empty, attach rest |

Return `dummy.next` => `1 -> 2 -> 3 -> 4 -> 5 -> 6 -> nullptr`

---

## 3. Linked List Cycle (Easy) & Find the Duplicate Number (Medium)

**Trigger:** Detect a cycle / Find a duplicate number in an array bounded by $[1, N]$.
**Intuition:** Use Floyd's Tortoise and Hare (Fast & Slow pointers).

### Linked List Cycle Detection

```cpp
bool hasCycle(ListNode *head) {
    if (head == nullptr) return false;

    ListNode* slow = head;
    ListNode* fast = head;

    while (fast != nullptr && fast->next != nullptr) {
        slow = slow->next;
        fast = fast->next->next;

        if (slow == fast) {
            return true;
        }
    }

    return false;
}
```

### Step-by-Step Walkthrough (Cycle Detection)

List: `1 -> 2 -> 3 -> 4 -> (back to 2)`

| Step | `slow` | `fast` | `slow` moves to | `fast` moves to | Meet? |
|------|--------|--------|-----------------|-----------------|-------|
| Init | node(1) | node(1) | - | - | No (same, check after move) |
| 1 | node(2) | node(3) | +1 | +2 | No |
| 2 | node(3) | node(2) | +1 | +2 (wrapped) | No |
| 3 | node(4) | node(4) | +1 | +2 | **Yes!** |

Cycle detected.

### Mind-Blowing Trick: Find Duplicate Number (Medium)

*You can treat the values in the array as "next pointers" (`curr = nums[curr]`). If multiple indices point to the same value, a cycle forms. Finding the start of the cycle is exactly the same as finding the duplicate number!*

```cpp
int findDuplicate(vector<int>& nums) {
    // Phase 1: Find intersection (cycle detection)
    int slow = nums[0];
    int fast = nums[0];

    do {
        slow = nums[slow];       // 1 step
        fast = nums[nums[fast]]; // 2 steps
    } while (slow != fast);

    // Phase 2: Find cycle start (duplicate number)
    slow = nums[0];
    while (slow != fast) {
        slow = nums[slow];
        fast = nums[fast];
    }

    return slow;
}
```

### Step-by-Step Walkthrough (Find Duplicate)

Array: `[1, 3, 4, 2, 2]` (values act as "next pointers")

| Step | `slow` | `fast` | Action |
|------|--------|--------|--------|
| Init | nums[0]=1 | nums[0]=1 | - |
| 1 | nums[1]=3 | nums[nums[1]]=nums[3]=2 | slow+1, fast+2 |
| 2 | nums[3]=2 | nums[nums[2]]=nums[4]=2 | slow+1, fast+2 (slow == fast, stop) |

Phase 1: slow=2, fast=2 (meet!)

Phase 2 (find start):
| Step | `slow` | `fast` | Action |
|------|--------|--------|--------|
| Reset | nums[0]=1 | 2 | - |
| 1 | nums[1]=3 | nums[2]=4 | Advance both |
| 2 | nums[3]=2 | nums[4]=2 | Advance both |

Meet at 2. Duplicate = 2. Correct!

---

## 4. Remove Nth Node From End of List (Medium)

**Trigger:** Remove the $N$th node from the end in **one pass**.
**Intuition:** You cannot use `size - N` because finding the size takes one pass, and deleting takes a second pass.

Use two pointers (`left` and `right`) and a **Dummy Node** (in case you need to remove the first node!).

Move `right` forward by $N$ steps. Then, move *both* `left` and `right` forward by 1 step until `right` hits the end. Because `right` had a head start of $N$, when it hits the end, `left` will be exactly $N$ nodes behind it—pointing right at the node you need to delete!

```cpp
ListNode* removeNthFromEnd(ListNode* head, int n) {
    ListNode dummy(0);
    dummy.next = head;

    ListNode* left = &dummy;
    ListNode* right = &dummy;

    // Move right n+1 steps ahead (so there's a gap of n+1 between them)
    for (int i = 0; i <= n; i++) {
        right = right->next;
    }

    // Move both until right hits the end
    while (right != nullptr) {
        left = left->next;
        right = right->next;
    }

    // left is now right before the node to delete
    ListNode* toDelete = left->next;
    left->next = left->next->next;
    delete toDelete;

    return dummy.next;
}
```

### Step-by-Step Walkthrough

List: `1 -> 2 -> 3 -> 4 -> 5`, remove 2nd from end (node 4)

| Step | `left` | `right` | Gap | Action |
|------|--------|---------|-----|--------|
| Init | dummy | dummy | 0 | - |
| Move right 3 | dummy | node(3) | 3 | right = right->next x3 |
| 1 | node(1) | node(4) | 3 | Both advance |
| 2 | node(2) | node(5) | 3 | Both advance |
| 3 | node(3) | nullptr | 3 | right=nullptr, STOP |

`left` = node(3), `left->next` = node(4). Delete node(4).

Result: `1 -> 2 -> 3 -> 5 -> nullptr`

---

## 5. Reorder List (Medium)

**Trigger:** Reorder `L0 -> L1 -> ... -> Ln-1 -> Ln` to `L0 -> Ln -> L1 -> Ln-1 -> ...`
**Intuition:** This is the ultimate "Combo" problem. It tests three distinct skills:

1. **Find the Middle:** Use Fast/Slow pointers to split the list in half.
2. **Reverse a List:** Reverse the entire second half of the list.
3. **Merge Two Lists:** Interweave the first half and the reversed second half by altering their `next` pointers.

### Step-by-Step Walkthrough

List: `1 -> 2 -> 3 -> 4 -> 5`

**Step 1: Find Middle (Fast/Slow)**

| Step | `slow` | `fast` |
|------|--------|--------|
| Init | node(1) | node(1) |
| 1 | node(2) | node(3) |
| 2 | node(3) | node(5) |

Middle = node(3). Split: `1 -> 2 -> 3` and `4 -> 5`

**Step 2: Reverse Second Half**

`4 -> 5` reversed to `5 -> 4`

**Step 3: Merge/Interweave**

```
First half:  1 -> 2 -> 3
Second half: 5 -> 4

Interweave:
1 -> 5 -> 2 -> 4 -> 3 -> nullptr
```

```cpp
void reorderList(ListNode* head) {
    if (!head || !head->next) return;

    // Step 1: Find middle
    ListNode* slow = head;
    ListNode* fast = head;
    while (fast->next && fast->next->next) {
        slow = slow->next;
        fast = fast->next->next;
    }

    // Step 2: Reverse second half
    ListNode* prev = nullptr;
    ListNode* curr = slow->next;
    slow->next = nullptr; // Split the list
    while (curr) {
        ListNode* next_node = curr->next;
        curr->next = prev;
        prev = curr;
        curr = next_node;
    }

    // Step 3: Merge two halves
    ListNode* first = head;
    ListNode* second = prev;
    while (second) {
        ListNode* temp1 = first->next;
        ListNode* temp2 = second->next;
        first->next = second;
        second->next = temp1;
        first = temp1;
        second = temp2;
    }
}
```

---

## 6. LRU Cache (Medium)

**Trigger:** Design a Least Recently Used (LRU) cache with $O(1)$ `get` and `put`.
**Intuition:** This is a system design micro-problem.

To get $O(1)$ lookups, you need a **Hash Map**.

To remove the "least recently used" item in $O(1)$ time, you need an ordered list where you can pop the tail instantly. But if you access an item in the middle of the list, you need to move it to the front in $O(1)$ time. A vector takes $O(N)$ to shift elements. A singly-linked list takes $O(N)$ to find the `prev` node.

**Solution: Hash Map + Doubly Linked List.**

The Hash Map stores `Key -> Pointer to Node`. The Nodes live in a Doubly Linked List (`prev` and `next` pointers) so they can detach themselves in $O(1)$ time and move to the front!

### Architecture Diagram

```
Hash Map:                    Doubly Linked List:
  Key | Node*                HEAD <-> [A] <-> [B] <-> [C] <-> TAIL
  "a" | -> node(A)
  "b" | -> node(B)           Most recent ----> Least recent
  "c" | -> node(C)

Operations:
  get("b"): Look up "b" in map, move node(B) to HEAD, return value
  put("d"): Add node(D) to HEAD, add to map. If over capacity, remove TAIL from list and map.
```

### Implementation Sketch

```cpp
class LRUCache {
    struct Node {
        int key, val;
        Node *prev, *next;
        Node(int k, int v) : key(k), val(v), prev(nullptr), next(nullptr) {}
    };

    int capacity;
    unordered_map<int, Node*> cache;
    Node* head; // Most recent
    Node* tail; // Least recent

    void addToFront(Node* node) {
        node->next = head->next;
        node->prev = head;
        head->next->prev = node;
        head->next = node;
    }

    void removeNode(Node* node) {
        node->prev->next = node->next;
        node->next->prev = node->prev;
    }

    void moveToFront(Node* node) {
        removeNode(node);
        addToFront(node);
    }

    Node* removeTail() {
        Node* node = tail->prev;
        removeNode(node);
        return node;
    }

public:
    LRUCache(int cap) : capacity(cap) {
        head = new Node(0, 0);
        tail = new Node(0, 0);
        head->next = tail;
        tail->prev = head;
    }

    int get(int key) {
        if (!cache.count(key)) return -1;
        Node* node = cache[key];
        moveToFront(node);
        return node->val;
    }

    void put(int key, int value) {
        if (cache.count(key)) {
            Node* node = cache[key];
            node->val = value;
            moveToFront(node);
        } else {
            if (cache.size() >= capacity) {
                Node* lru = removeTail();
                cache.erase(lru->key);
                delete lru;
            }
            Node* newNode = new Node(key, value);
            cache[key] = newNode;
            addToFront(newNode);
        }
    }
};
```

---

## 7. Reverse Nodes in k-Group (Hard)

**Trigger:** Reverse the nodes of a linked list `k` at a time.
**Intuition:** Use a **Dummy Node**. You need a `groupPrev` pointer (pointing to the node right before the current group) and a `groupNext` pointer (pointing to the node right after the group).

Check if you have `k` nodes available. If yes, save `groupNext`. Run the standard Reverse List algorithm on the `k` nodes. Then, carefully rewire `groupPrev->next` to point to the new head of the reversed group, and point the tail of the reversed group to `groupNext`. Advance `groupPrev` and repeat.
*(Draw this out meticulously!)*

### Step-by-Step Walkthrough

List: `1 -> 2 -> 3 -> 4 -> 5`, k = 2

```
Group 1: [1, 2] -> reverse -> [2, 1]
Group 2: [3, 4] -> reverse -> [4, 3]
Group 3: [5]    -> not enough nodes, keep as-is

Result: 2 -> 1 -> 4 -> 3 -> 5
```

| Step | Group | Nodes | Reversed | List after |
|------|-------|-------|----------|------------|
| 1 | [1,2] | 2 nodes >= k | [2,1] | `2 -> 1 -> 3 -> 4 -> 5` |
| 2 | [3,4] | 2 nodes >= k | [4,3] | `2 -> 1 -> 4 -> 3 -> 5` |
| 3 | [5] | 1 node < k | keep | `2 -> 1 -> 4 -> 3 -> 5` |

```cpp
ListNode* reverseKGroup(ListNode* head, int k) {
    ListNode dummy(0);
    dummy.next = head;
    ListNode* groupPrev = &dummy;

    while (true) {
        // Check if k nodes remain
        ListNode* kth = groupPrev;
        for (int i = 0; i < k; i++) {
            kth = kth->next;
            if (!kth) return dummy.next; // Not enough nodes, stop
        }

        ListNode* groupNext = kth->next;
        ListNode* prev = groupNext;
        ListNode* curr = groupPrev->next;

        // Reverse k nodes
        for (int i = 0; i < k; i++) {
            ListNode* next_node = curr->next;
            curr->next = prev;
            prev = curr;
            curr = next_node;
        }

        // Rewire: groupPrev->next should point to the new head (kth)
        ListNode* tail = groupPrev->next; // This is now the TAIL of reversed group
        groupPrev->next = kth;            // kth is now the HEAD of reversed group
        groupPrev = tail;                 // Move groupPrev to the tail for next group
    }
}
```

---

## Quick Reference: All Problems

| Problem | Key Insight | Code Pattern |
|---------|-------------|-------------|
| Reverse Linked List | 3-pointer: prev, curr, next_node | `curr->next = prev; prev=curr; curr=next;` |
| Merge Two Sorted Lists | Dummy node + tail pointer, compare and attach smaller | `tail->next = smaller; advance that list` |
| Linked List Cycle | Fast catches slow if cycle exists | `while(fast && fast->next)` |
| Find Duplicate Number | Array values as "next pointers", Floyd's cycle | `slow=nums[slow]; fast=nums[nums[fast]]` |
| Remove Nth From End | Two pointers with N gap + dummy node | Move right N steps, then both until right=nullptr |
| Reorder List | Find middle + reverse second + merge | 3-step combo |
| LRU Cache | Hash map + doubly linked list | O(1) get/put via map + list manipulation |
| Reverse k-Group | Dummy node + reverse chunks of k | `groupPrev->next = kth` after reversing |

---

## Practice & Self-Check

Each question re-runs one of the solutions above on a new input. Name the technique first (3-pointer reversal, dummy + tail, fast/slow, gap pointers, hash map + doubly linked list), then trace.

### Predict the Output / Trace by Hand

**Q1. Remove Nth From End — deleting the head.** Run Problem 4's `removeNthFromEnd` on `1 -> 2 -> 3 -> 4 -> 5` with `n = 5`. Where are `left` and `right` after the "move right n+1 steps" loop? How many times does the `while (right != nullptr)` loop run? What is returned, and why would the code crash or misbehave without the dummy node?

**Q2. Find the Duplicate on a new array.** Trace Problem 3's `findDuplicate` on `nums = [3, 1, 3, 4, 2]`. Give the Phase 1 values of `slow` and `fast` after each `do` iteration, then Phase 2. What is returned?

**Q3. Reorder List, even length.** Run Problem 5's `reorderList` on `1 -> 2 -> 3 -> 4 -> 5 -> 6`. Where does `slow` stop, what are the two halves after the split and reversal, and what is the final list?

**Q4. LRU Cache trace.** With `LRUCache cache(2)`, run: `put(1,1)`, `put(2,2)`, `get(1)`, `put(3,3)`, `get(2)`, `put(4,4)`, `get(1)`, `get(3)`, `get(4)`. Give each `get`'s return value and the list order (most recent first) after every operation.

**Q5. Reverse Nodes in k-Group, k = 3.** What does Problem 7's `reverseKGroup` return for `1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8` with `k = 3`? After the first group is processed, which node is `groupPrev`?

### Coding Exercises

**E1 (Easy). k-th node from the end.** Return the value of the k-th node from the end (1-based) in one pass, using the gap technique from Problem 4. Assume `1 <= k <= length`.

```cpp
int kthFromEnd(ListNode* head, int k);
// [1, 2, 3, 4, 5], k = 2 -> 4
// [1, 2, 3, 4, 5], k = 5 -> 1
```

**E2 (Easy–Medium). Add Two Numbers (LC 2).** Each list stores a non-negative integer with its digits in **reverse** order (ones digit first). Return their sum as a list in the same format. Use a dummy node + `tail` like Merge Two Sorted Lists, and carry like grade-school addition.

```cpp
ListNode* addTwoNumbers(ListNode* l1, ListNode* l2);
// [2, 4, 3] + [5, 6, 4] -> [7, 0, 8]     (342 + 465 = 807)
// [9, 9]    + [1]       -> [0, 0, 1]     (99 + 1 = 100)
```

**E3 (Medium). Rotate List (LC 61).** Rotate the list to the right by `k` places. `k` may exceed the length — reduce it with `k % length`. Hint: temporarily link the tail to the head, then cut at the right place.

```cpp
ListNode* rotateRight(ListNode* head, int k);
// [1, 2, 3, 4, 5], k = 2 -> [4, 5, 1, 2, 3]
// [0, 1, 2],       k = 4 -> [2, 0, 1]
```

#### Dry-Run: Answers

**Q1.** After moving `right` $n + 1 = 6$ steps (`dummy → 1 → 2 → 3 → 4 → 5 → nullptr`), **`right = nullptr`** and **`left = dummy`**. The `while` loop runs **0** times. `left->next` is node(1), so node(1) is bypassed and deleted; `dummy.next` is node(2) → returns **`2 -> 3 -> 4 -> 5`**.

| Step | `left` | `right` |
|------|--------|---------|
| Init | dummy | dummy |
| after 6 moves | dummy | nullptr |
| while loop | (skipped) | (skipped) |
| delete `left->next` | dummy → node(2) | – |

Without the dummy, `left` and `right` would have to start at `head`; there is no node *before* node(1) for `left` to stop on, and moving `right` $n + 1 = 6$ steps would step past `nullptr` (crash). The dummy supplies that "node before the head".

**Q2.** Returns **3**.

Phase 1 (`slow = nums[slow]`, `fast = nums[nums[fast]]`), starting with `slow = fast = nums[0] = 3`:

| Iteration | `slow` | `fast` | Equal? |
|-----------|--------|--------|--------|
| Init | 3 | 3 | (do-while: move first) |
| 1 | nums[3] = 4 | nums[nums[3]] = nums[4] = 2 | No |
| 2 | nums[4] = 2 | nums[nums[2]] = nums[3] = 4 | No |
| 3 | nums[2] = 3 | nums[nums[4]] = nums[2] = 3 | **Yes** |

Phase 2: `slow = nums[0] = 3`, `fast = 3` → already equal, loop body never runs → return **3**. (Index-graph: 0 → 3 → 4 → 2 → 3, so value 3 is the entry of the cycle, i.e. the duplicate.)

**Q3.** `slow` stops at **node(3)**. Halves: `1 -> 2 -> 3` and `4 -> 5 -> 6`, reversed to `6 -> 5 -> 4`. Final list: **`1 -> 6 -> 2 -> 5 -> 3 -> 4`**.

| Merge step | `first` | `second` | Link made | Chain so far |
|------------|---------|----------|-----------|--------------|
| 1 | 1 | 6 | 1→6→2 | `1 6 2 …` |
| 2 | 2 | 5 | 2→5→3 | `1 6 2 5 3 …` |
| 3 | 3 | 4 | 3→4→nullptr | `1 6 2 5 3 4` |
| end | nullptr | nullptr | – | done |

(Middle-finding: `slow`/`fast` go (1,1) → (2,3) → (3,5); then `fast->next->next` is `nullptr`, so it stops.)

**Q4.** `get` results: **1, −1, −1, 3, 4**.

| Operation | Returns | List (MRU → LRU) | Note |
|-----------|---------|------------------|------|
| `put(1,1)` | – | [1] | |
| `put(2,2)` | – | [2, 1] | |
| `get(1)` | **1** | [1, 2] | 1 moved to front |
| `put(3,3)` | – | [3, 1] | full → evict tail **2** |
| `get(2)` | **−1** | [3, 1] | 2 was evicted |
| `put(4,4)` | – | [4, 3] | full → evict tail **1** |
| `get(1)` | **−1** | [4, 3] | |
| `get(3)` | **3** | [3, 4] | |
| `get(4)` | **4** | [4, 3] | |

**Q5.** Returns **`3 -> 2 -> 1 -> 6 -> 5 -> 4 -> 7 -> 8`** (the last group `7, 8` has fewer than 3 nodes, so the `kth` check returns early and leaves it as-is). After the first group, `groupPrev` = **node(1)** — the old first node of the group, which is now its tail (`ListNode* tail = groupPrev->next; … groupPrev = tail;`).

| Group | kth | groupNext | After rewiring |
|-------|-----|-----------|----------------|
| 1, 2, 3 | node(3) | node(4) | `3 2 1 4 5 6 7 8`, groupPrev = node(1) |
| 4, 5, 6 | node(6) | node(7) | `3 2 1 6 5 4 7 8`, groupPrev = node(4) |
| 7, 8, ? | – | – | `kth` hits nullptr → return |

**E1 — reference solution**

```cpp
int kthFromEnd(ListNode* head, int k) {
    ListNode* right = head;
    for (int i = 0; i < k; i++) right = right->next;   // Gap of k nodes
    ListNode* left = head;
    while (right != nullptr) {                         // Move both until right falls off
        left = left->next;
        right = right->next;
    }
    return left->val;                                  // left is k nodes from the end
}
```

$O(N)$ time, one pass, $O(1)$ space. No dummy is needed because we *read* the node instead of deleting it (we need the node itself, not the one before it).

**E2 — reference solution**

```cpp
ListNode* addTwoNumbers(ListNode* l1, ListNode* l2) {
    ListNode dummy(0);
    ListNode* tail = &dummy;
    int carry = 0;
    while (l1 != nullptr || l2 != nullptr || carry != 0) {   // Keep going for a final carry
        int sum = carry;
        if (l1 != nullptr) { sum += l1->val; l1 = l1->next; }
        if (l2 != nullptr) { sum += l2->val; l2 = l2->next; }
        tail->next = new ListNode(sum % 10);                 // Digit for this place
        tail = tail->next;
        carry = sum / 10;
    }
    return dummy.next;
}
```

$O(\max(m, n))$ time. For `[9,9] + [1]`: `9+1 = 10` → digit 0, carry 1; `9+0+1 = 10` → digit 0, carry 1; both lists empty but `carry = 1` → digit 1. Result `[0,0,1]`.

**E3 — reference solution**

```cpp
ListNode* rotateRight(ListNode* head, int k) {
    if (head == nullptr || head->next == nullptr || k == 0) return head;
    int n = 1;
    ListNode* tail = head;
    while (tail->next != nullptr) { tail = tail->next; n++; }   // Length + tail
    k %= n;
    if (k == 0) return head;                                    // Full rotations: no change
    ListNode* newTail = head;
    for (int i = 0; i < n - k - 1; i++) newTail = newTail->next;  // (n-k)-th node
    ListNode* newHead = newTail->next;
    newTail->next = nullptr;       // Cut
    tail->next = head;             // Old tail joins old head
    return newHead;
}
```

$O(N)$ time, $O(1)$ space. For `[0,1,2]`, `k = 4`: `n = 3`, `k = 1`, the new tail is node(1) (index 1), the new head node(2) → `[2, 0, 1]`.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Interview Problems Walkthrough**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **interview problems linked lists** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.


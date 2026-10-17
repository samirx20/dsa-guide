# Part 10, Topic 3: Heaps & Priority Queues
## Interview Problems Walkthrough

Heaps are the ultimate tool for "Top-K" and scheduling problems.

---

### Problem Classification Table

| Problem | Difficulty | Pattern | Key Insight |
|---------|------------|---------|-------------|
| Last Stone Weight | Easy | Max-Heap | Smash two largest repeatedly |
| Kth Largest Element | Medium | Min-Heap of size K | Keep only K elements |
| K Closest Points | Medium | Max-Heap of size K | Pop farthest points |
| Task Scheduler | Medium | Max-Heap + Queue | Cooldown scheduling |
| Find Median from Stream | Hard | Two Heaps | Max-Heap + Min-Heap |
| Merge K Sorted Lists | Hard | Min-Heap | K-way merge |
| Ugly Number II | Medium | Min-Heap | Generate in order |
| Sliding Window Median | Hard | Two Heaps + Deque | Moving window |

---

### Solution Approach Comparison

| Problem | Brute Force | Optimal | Time | Space |
|---------|-------------|---------|------|-------|
| Last Stone | Sort each time | Max-Heap | O(N log N) | O(N) |
| Kth Largest | Sort | Min-Heap size K | O(N log K) | O(K) |
| K Closest | Sort by distance | Max-Heap size K | O(N log K) | O(K) |
| Task Scheduler | Greedy simulation | Max-Heap + Queue | O(N) | O(N) |
| Find Median | Sort each insert | Two Heaps | O(log N) | O(N) |
| Merge K Lists | Merge one by one | Min-Heap | O(N log K) | O(K) |

---

### 1. Last Stone Weight (Easy)
**Trigger:** Repeatedly smash the two largest elements together.
**Intuition:** Because you always need the *current* two largest elements, use a Max-Heap (`priority_queue`). Pop the top two. If they aren't equal, push the difference back into the heap. Repeat until `size <= 1`.

```cpp
int lastStoneWeight(vector<int>& stones) {
    priority_queue<int> maxHeap(stones.begin(), stones.end()); // O(N) to build
    
    while (maxHeap.size() > 1) {
        int y = maxHeap.top(); maxHeap.pop();
        int x = maxHeap.top(); maxHeap.pop();
        
        if (y != x) {
            maxHeap.push(y - x); // O(log N)
        }
    }
    
    return maxHeap.empty() ? 0 : maxHeap.top();
}
```

**What's happening:**
```cpp
// Stones: [2, 7, 4, 1, 8, 1]
//
// Build heap: [8, 7, 4, 2, 1, 1]
//
// Round 1: y=8, x=7, diff=1
//   Push 1: [4, 2, 1, 1, 1]
//
// Round 2: y=4, x=2, diff=2
//   Push 2: [2, 1, 1, 1]
//
// Round 3: y=2, x=1, diff=1
//   Push 1: [1, 1, 1]
//
// Round 4: y=1, x=1, diff=0
//   Don't push: [1]
//
// Result: 1
```

**Dry Run Table:**

| Round | Heap State | y | x | diff | Action |
|-------|------------|---|---|------|--------|
| 1 | [8,7,4,2,1,1] | 8 | 7 | 1 | Push 1 |
| 2 | [4,2,1,1,1] | 4 | 2 | 2 | Push 2 |
| 3 | [2,1,1,1] | 2 | 1 | 1 | Push 1 |
| 4 | [1,1,1] | 1 | 1 | 0 | Don't push |
| 5 | [1] | - | - | - | Return 1 |

---

### 2. Kth Largest Element in an Array (Medium)
**Trigger:** Find the $K$th largest element in an unsorted array.
**Intuition:** 
*Approach 1:* Sort it and return `nums[nums.size() - k]`. $O(N \log N)$.
*Approach 2:* Use a **Min-Heap** of size $K$. Iterate through the array, pushing to the heap. If `size > k`, `pop()` the smallest element. What remains at the end is the $K$ largest elements. The top of the heap is the $K$th largest! Time: $O(N \log K)$. Space: $O(K)$.
*(This code is identical to Top K Frequent Elements from Phase 9).*

```cpp
int findKthLargest(vector<int>& nums, int k) {
    // Min-heap of size k
    priority_queue<int, vector<int>, greater<int>> minHeap;
    
    for (int num : nums) {
        minHeap.push(num);
        
        if (minHeap.size() > k) {
            minHeap.pop();  // Remove smallest
        }
    }
    
    return minHeap.top();  // Kth largest
}
```

**What's happening:**
```cpp
// nums = [3, 2, 1, 5, 6, 4], k = 2
//
// Process 3: heap=[3]
// Process 2: heap=[2,3]
// Process 1: heap=[1,3,2] → pop 1 → heap=[2,3]
// Process 5: heap=[2,3,5] → pop 2 → heap=[3,5]
// Process 6: heap=[3,5,6] → pop 3 → heap=[5,6]
// Process 4: heap=[4,5,6] → pop 4 → heap=[5,6]
//
// Heap contains [5,6] (2 largest elements)
// Top = 5 = 2nd largest ✓
```

**Dry Run Table:**

| Num | Heap Before | Push | Size > k? | Pop | Heap After |
|-----|-------------|------|-----------|-----|------------|
| 3 | [] | [3] | No | - | [3] |
| 2 | [3] | [2,3] | No | - | [2,3] |
| 1 | [2,3] | [1,2,3] | Yes | 1 | [2,3] |
| 5 | [2,3] | [2,3,5] | Yes | 2 | [3,5] |
| 6 | [3,5] | [3,5,6] | Yes | 3 | [5,6] |
| 4 | [5,6] | [4,5,6] | Yes | 4 | [5,6] |

---

### 3. K Closest Points to Origin (Medium)
**Trigger:** Find the $K$ items closest to a target.
**Intuition:** Exact same logic as Kth Largest. Maintain a **Max-Heap** of size $K$ (because we want to pop the points that are the *farthest* away to keep the heap small). 
The heap will store `pair<int, vector<int>>` representing `{distance, {x, y}}`.

```cpp
vector<vector<int>> kClosest(vector<vector<int>>& points, int k) {
    // Max-Heap of pairs {squared_distance, point_vector}
    priority_queue<pair<int, vector<int>>> maxHeap;
    
    for (auto& point : points) {
        int dist = (point[0] * point[0]) + (point[1] * point[1]); // x^2 + y^2
        maxHeap.push({dist, point});
        
        if (maxHeap.size() > k) {
            maxHeap.pop(); // Remove the point farthest away!
        }
    }
    
    vector<vector<int>> result;
    while (!maxHeap.empty()) {
        result.push_back(maxHeap.top().second);
        maxHeap.pop();
    }
    return result;
}
```

**What's happening:**
```cpp
// points = [[3,3],[5,-1],[-2,4]], k = 2
//
// Distances: 3²+3²=18, 5²+(-1)²=26, (-2)²+4²=20
//
// Process [3,3]: heap=[(18,[3,3])]
// Process [5,-1]: heap=[(26,[5,-1]),(18,[3,3])]
// Process [-2,4]: heap=[(26,[5,-1]),(20,[-2,4]),(18,[3,3])]
//   Size 3 > k=2, pop (26,[5,-1])
//   heap=[(20,[-2,4]),(18,[3,3])]
//
// Result: [[-2,4], [3,3]] (2 closest; popped farthest-first, any order is accepted)
```

---

### 4. Task Scheduler (Medium)
**Trigger:** Given tasks `A, B, C` and a cooldown `n`, find the minimum intervals needed to execute them.
**Intuition:** We always want to schedule the task that is currently the *most frequent*. This requires a Max-Heap.
However, if we schedule `A`, it goes on cooldown. We must temporarily remove it from the heap and store it in a `queue` with a timestamp of when it is allowed to re-enter the heap.
At every time step, we check the queue. If a task's cooldown has expired, we push it back into the Max-Heap.

```cpp
int leastInterval(vector<char>& tasks, int n) {
    vector<int> count(26, 0);
    for (char c : tasks) count[c - 'A']++;
    
    priority_queue<int> maxHeap;
    for (int c : count) {
        if (c > 0) maxHeap.push(c);
    }
    
    int time = 0;
    queue<pair<int, int>> cooldownQueue; // {count, availableTime}
    
    while (!maxHeap.empty() || !cooldownQueue.empty()) {
        time++;
        
        if (!maxHeap.empty()) {
            int cnt = maxHeap.top() - 1;
            maxHeap.pop();
            
            if (cnt > 0) {
                cooldownQueue.push({cnt, time + n});
            }
        }
        
        // Check if any task's cooldown has expired
        if (!cooldownQueue.empty() && cooldownQueue.front().second == time) {
            maxHeap.push(cooldownQueue.front().first);
            cooldownQueue.pop();
        }
    }
    
    return time;
}
```

**What's happening:**
```cpp
// tasks = ["A","A","A","B","B","B"], n = 2
//
// Count: A=3, B=3
// Heap: [3, 3]
//
// Time 1: Pop A(3), A remaining=2, cooldown until 1+2=3
//   Queue: [(2,3)]
//   Heap: [3]
//
// Time 2: Pop B(3), B remaining=2, cooldown until 2+2=4
//   Queue: [(2,3), (2,4)]
//   Heap: []
//
// Time 3: Heap empty → IDLE (nothing to pop)
//   Then A's cooldown expires (front time 3 == 3): push A(2) to heap
//   Queue: [(2,4)]
//
// Time 4: Pop A(2), A remaining=1, cooldown until 4+2=6
//   Then B's cooldown expires (4 == 4): push B(2) to heap
//   Queue: [(1,6)]
//
// Time 5: Pop B(2), B remaining=1, cooldown until 5+2=7
//   Queue: [(1,6), (1,7)]
//
// Time 6: Heap empty → IDLE
//   Then A's cooldown expires: push A(1) to heap
//   Queue: [(1,7)]
//
// Time 7: Pop A(1), A remaining=0
//   Then B's cooldown expires: push B(1) to heap
//   Queue: []
//
// Time 8: Pop B(1), B remaining=0
//   Heap empty, Queue empty → loop ends
//
// Total time: 8  (A B idle A B idle A B)
```

---

### 5. Find Median from Data Stream (Hard)
**Trigger:** Design a class that accepts a stream of numbers and returns the median in $O(1)$ time.
**Intuition:** Use the Two-Heap Pattern.
1. `maxHeap` (small half of numbers).
2. `minHeap` (large half of numbers).

```cpp
class MedianFinder {
private:
    priority_queue<int> maxHeap; // Small half
    priority_queue<int, vector<int>, greater<int>> minHeap; // Large half

public:
    void addNum(int num) {
        // 1. Add to maxHeap
        maxHeap.push(num);
        
        // 2. Ensure every element in maxHeap is smaller than minHeap
        minHeap.push(maxHeap.top());
        maxHeap.pop();
        
        // 3. Rebalance sizes (maxHeap should hold the extra element if odd)
        if (maxHeap.size() < minHeap.size()) {
            maxHeap.push(minHeap.top());
            minHeap.pop();
        }
    }
    
    double findMedian() {
        if (maxHeap.size() > minHeap.size()) {
            return maxHeap.top(); // Odd number of elements
        }
        // Even number of elements: average of both tops
        return (maxHeap.top() + minHeap.top()) / 2.0; 
    }
};
```

**What's happening:**
```cpp
// Stream: [5, 15, 1, 3]
//
// addNum(5):
//   maxHeap: [5]
//   minHeap: []
//   Median: 5 (odd count)
//
// addNum(15):
//   maxHeap: [5], push 15 to minHeap
//   minHeap: [15]
//   Rebalance: maxHeap.size == minHeap.size, no change
//   Median: (5+15)/2 = 10
//
// addNum(1):
//   maxHeap: [5, 1]
//   minHeap: [15]
//   Push 5 to minHeap, pop from maxHeap
//   minHeap: [5, 15]
//   maxHeap: [1]
//   Rebalance: maxHeap.size(1) < minHeap.size(2)
//   Push 5 back to maxHeap
//   maxHeap: [5, 1], minHeap: [15]
//   Median: 5
//
// addNum(3):
//   maxHeap: [5, 3, 1]
//   minHeap: [15]
//   Push 5 to minHeap, pop from maxHeap
//   minHeap: [5, 15]
//   maxHeap: [3, 1]
//   Rebalance: maxHeap.size(2) == minHeap.size(2)
//   Median: (3+5)/2 = 4
```

---

### 6. Merge K Sorted Lists (Hard)
**Trigger:** Merge K sorted linked lists into one sorted list.
**Intuition:** Use a Min-Heap containing one node from each list. Always extract the smallest, then add the next node from that same list.

```cpp
struct ListNode {
    int val;
    ListNode* next;
    ListNode(int x) : val(x), next(nullptr) {}
};

ListNode* mergeKLists(vector<ListNode*>& lists) {
    // Min-heap: {value, list_index}
    priority_queue<pair<int, int>, vector<pair<int, int>>, greater<>> minHeap;
    
    // Initialize heap with first node from each list
    for (int i = 0; i < lists.size(); i++) {
        if (lists[i] != nullptr) {
            minHeap.push({lists[i]->val, i});
            lists[i] = lists[i]->next;
        }
    }
    
    ListNode* dummy = new ListNode(0);
    ListNode* curr = dummy;
    
    while (!minHeap.empty()) {
        auto [val, idx] = minHeap.top();
        minHeap.pop();
        
        curr->next = new ListNode(val);
        curr = curr->next;
        
        // Add next node from same list
        if (lists[idx] != nullptr) {
            minHeap.push({lists[idx]->val, idx});
            lists[idx] = lists[idx]->next;
        }
    }
    
    return dummy->next;
}
```

**What's happening:**
```cpp
// Lists:
//   List 0: 1 → 4 → 5
//   List 1: 1 → 3 → 4
//   List 2: 2 → 6
//
// Initial heap: [(1,0), (1,1), (2,2)]
//
// Extract (1,0): output 1, add 4 from list 0
//   heap: [(1,1), (2,2), (4,0)]
//
// Extract (1,1): output 1, add 3 from list 1
//   heap: [(2,2), (3,1), (4,0)]
//
// Extract (2,2): output 2, add 6 from list 2
//   heap: [(3,1), (4,0), (6,2)]
//
// Extract (3,1): output 3, add 4 from list 1
//   heap: [(4,0), (4,1), (6,2)]
//
// Extract (4,0): output 4, add 5 from list 0
//   heap: [(4,1), (5,0), (6,2)]
//
// Extract (4,1): output 4, null from list 1
//   heap: [(5,0), (6,2)]
//
// Extract (5,0): output 5, null from list 0
//   heap: [(6,2)]
//
// Extract (6,2): output 6, null from list 2
//   heap: []
//
// Result: 1→1→2→3→4→4→5→6
```

---

### 7. Ugly Number II (Medium)
**Trigger:** Find the nth ugly number (a positive number whose only prime factors are 2, 3, and 5).
**Intuition:** Use three pointers (or a Min-Heap) to generate ugly numbers in order. Each ugly number can be multiplied by 2, 3, or 5 to get the next candidates.

```cpp
int nthUglyNumber(int n) {
    vector<int> ugly(n);
    ugly[0] = 1;
    
    int i2 = 0, i3 = 0, i5 = 0;
    
    for (int i = 1; i < n; i++) {
        int next2 = ugly[i2] * 2;
        int next3 = ugly[i3] * 3;
        int next5 = ugly[i5] * 5;
        
        ugly[i] = min({next2, next3, next5});
        
        if (ugly[i] == next2) i2++;
        if (ugly[i] == next3) i3++;
        if (ugly[i] == next5) i5++;
    }
    
    return ugly[n - 1];
}
```

**What's happening:**
```cpp
// n = 10
//
// ugly[0] = 1
// i2=0, i3=0, i5=0
//
// i=1: next2=2, next3=3, next5=5 → ugly[1]=2, i2++
// i=2: next2=4, next3=3, next5=5 → ugly[2]=3, i3++
// i=3: next2=4, next3=6, next5=5 → ugly[3]=4, i2++
// i=4: next2=6, next3=6, next5=5 → ugly[4]=5, i5++
// i=5: next2=6, next3=6, next5=10 → ugly[5]=6, i2++, i3++
// i=6: next2=8, next3=9, next5=10 → ugly[6]=8, i2++
// i=7: next2=10, next3=9, next5=10 → ugly[7]=9, i3++
// i=8: next2=10, next3=12, next5=10 → ugly[8]=10, i2++, i5++
// i=9: next2=12, next3=12, next5=15 → ugly[9]=12, i2++, i3++
//
// Result: 12
```

---

### Key Patterns Summary

| Pattern | When to Use | Key Insight |
|---------|-------------|-------------|
| Max-Heap size K | K smallest/largest | Pop extremes to keep size K |
| Min-Heap size K | K largest | Keep only K elements |
| Two Heaps | Median maintenance | Split into small/large halves |
| Max-Heap + Queue | Task scheduling | Cooldown management |
| Min-Heap K-way merge | Merge sorted lists | Always pick smallest |

### Quick Reference Table

| Problem | Time | Space | Heap Type |
|---------|------|-------|-----------|
| Last Stone | O(N log N) | O(N) | Max-Heap |
| Kth Largest | O(N log K) | O(K) | Min-Heap |
| K Closest | O(N log K) | O(K) | Max-Heap |
| Task Scheduler | O(N) | O(N) | Max-Heap |
| Find Median | O(log N) | O(N) | Two Heaps |
| Merge K Lists | O(N log K) | O(K) | Min-Heap |
| Ugly Number | O(N) | O(N) | Three pointers |

**When to Use Heaps:**
```
✓ "Top K" problems (K largest, K smallest)
✓ Median in stream
✓ Merge K sorted things
✓ Task scheduling with priorities
✓ Find Kth element without full sort
✓ Sliding window max/min
```

**When NOT to Use Heaps:**
```
✗ Need to search by value (use Hash Map)
✗ Need sorted order of all elements (use sorting)
✗ Need O(1) lookup (use Hash Map)
✗ K is large relative to N (just sort)
```

---

## Practice & Self-Check

### Predict the Output / Trace by Hand

**Q1. Last Stone Weight.** Run Problem 1's `lastStoneWeight` on `[3, 7, 2, 9, 4]`. Fill in the dry-run table (Round, Heap State, y, x, diff, Action) and give the result.

**Q2. Kth Largest with duplicates.** Run Problem 2's `findKthLargest` on `nums = [3, 2, 3, 1, 2, 4, 5, 5, 6]` with `k = 4`. What is in the min-heap after every number, and what is returned?

**Q3. Task Scheduler, traced against the code.** Run Problem 4's `leastInterval` on `tasks = [A, A, A, B, C]`, `n = 2`. Pay attention to the order inside the loop: the code pops from the heap **first**, and only **then** checks whether the queue's front cooldown expired at this `time`. Give `time`, the task run (or idle), the queue and the heap at the end of each iteration, and the returned value.

**Q4. Merge K Sorted Lists.** Run Problem 6's `mergeKLists` on `List 0: 2 → 5`, `List 1: 1 → 3 → 8`, `List 2: 4`. List each extracted `(val, idx)` pair and the heap contents after the refill. What is the largest the heap ever gets?

**Q5. Ugly Number II, continued.** The chapter stops at `i = 9` with `i2 = 6, i3 = 4, i5 = 2`. Continue the trace for `i = 10, 11, 12`. What does `nthUglyNumber(13)` return?

### Coding Exercises

**E1 (Easy).** Kth Largest Element in a **Stream**: keep a min-heap of size `k` across calls.

```cpp
class KthLargest {
public:
    KthLargest(int k, vector<int>& nums);
    int add(int val);   // adds val, returns current kth largest
};
// k = 3, nums = [4, 5, 8, 2]
// add(3) -> 4, add(5) -> 5, add(10) -> 5, add(9) -> 8, add(4) -> 8
```

**E2 (Easy–Medium).** Connecting two sticks of lengths `a` and `b` costs `a + b` and produces one stick of length `a + b`. Return the minimum total cost to connect all sticks into one.

```cpp
int connectSticks(vector<int>& sticks);
// [2, 4, 3]     -> 14   (2+3 = 5, then 5+4 = 9; 5 + 9 = 14)
// [1, 8, 3, 5]  -> 30   (1+3 = 4, 4+5 = 9, 9+8 = 17; 4 + 9 + 17 = 30)
```

**E3 (Medium).** Kth smallest element in an $n \times n$ matrix whose rows and columns are each sorted ascending. Use the K-way merge idea from Problem 6 (each row is a sorted list).

```cpp
int kthSmallest(vector<vector<int>>& matrix, int k);
// [[1, 5, 9], [10, 11, 13], [12, 13, 15]], k = 8 -> 13
// [[-5]], k = 1                                  -> -5
```

#### Dry-Run: Answers

**Q1.** Returns **1**.

| Round | Heap State | y | x | diff | Action |
|-------|------------|---|---|------|--------|
| 1 | [9,7,4,3,2] | 9 | 7 | 2 | Push 2 |
| 2 | [4,3,2,2] | 4 | 3 | 1 | Push 1 |
| 3 | [2,2,1] | 2 | 2 | 0 | Don't push |
| 4 | [1] | - | - | - | Return 1 |

**Q2.** Returns **4**. (Sorted descending the array is `6, 5, 5, 4, ...`, so the 4th largest is 4; duplicates count separately.)

| Num | Heap after push (sorted view) | Size > 4? | Popped | Heap after |
|-----|-------------------------------|-----------|--------|------------|
| 3 | [3] | No | - | [3] |
| 2 | [2,3] | No | - | [2,3] |
| 3 | [2,3,3] | No | - | [2,3,3] |
| 1 | [1,2,3,3] | No | - | [1,2,3,3] |
| 2 | [1,2,2,3,3] | Yes | 1 | [2,2,3,3] |
| 4 | [2,2,3,3,4] | Yes | 2 | [2,3,3,4] |
| 5 | [2,3,3,4,5] | Yes | 2 | [3,3,4,5] |
| 5 | [3,3,4,5,5] | Yes | 3 | [3,4,5,5] |
| 6 | [3,4,5,5,6] | Yes | 3 | [4,5,5,6] |

**Q3.** Returns **7** (schedule `A B C A idle idle A`). Counts: A = 3, B = 1, C = 1, so the heap starts as `[3, 1, 1]`.

| time | Popped & run | Pushed to queue | Queue front expires now? | Queue after | Heap after |
|------|--------------|-----------------|--------------------------|-------------|------------|
| 1 | A (3 → 2) | (2, 3) | no | [(2,3)] | [1,1] |
| 2 | B (1 → 0) | - | no | [(2,3)] | [1] |
| 3 | C (1 → 0) | - | yes, (2,3) → heap | [] | [2] |
| 4 | A (2 → 1) | (1, 6) | no | [(1,6)] | [] |
| 5 | idle | - | no | [(1,6)] | [] |
| 6 | idle | - | yes, (1,6) → heap | [] | [1] |
| 7 | A (1 → 0) | - | no | [] | [] |

Note that a count pushed back at time 3 or 6 runs at the *next* step, which is exactly the cooldown: A runs at 1, 4, 7 (gap of $n = 2$ between runs). Check with the formula $\max(N, (f_{\max} - 1)(n + 1) + \#\text{tasks with } f_{\max}) = \max(5, 2 \cdot 3 + 1) = 7$. By the same rules, the walkthrough's `[A,A,A,B,B,B]`, `n = 2` example returns **8** when the code is run step by step (`A B idle A B idle A B`), matching the formula $2 \cdot 3 + 2 = 8$.

**Q4.** Output `1 → 2 → 3 → 4 → 5 → 8`. The heap never holds more than **3** entries ($K$).

| Extract | Refill from list | Heap after (sorted view) |
|---------|------------------|--------------------------|
| initial | - | [(1,1), (2,0), (4,2)] |
| (1,1) | 3 from list 1 | [(2,0), (3,1), (4,2)] |
| (2,0) | 5 from list 0 | [(3,1), (4,2), (5,0)] |
| (3,1) | 8 from list 1 | [(4,2), (5,0), (8,1)] |
| (4,2) | list 2 empty | [(5,0), (8,1)] |
| (5,0) | list 0 empty | [(8,1)] |
| (8,1) | list 1 empty | [] |

**Q5.** Returns **18**. So far `ugly = [1, 2, 3, 4, 5, 6, 8, 9, 10, 12]`.

| i | next2 = ugly[i2]·2 | next3 = ugly[i3]·3 | next5 = ugly[i5]·5 | ugly[i] | Pointers moved |
|---|--------------------|--------------------|--------------------|---------|----------------|
| 10 | ugly[6]·2 = 16 | ugly[4]·3 = 15 | ugly[2]·5 = 15 | 15 | i3 → 5, i5 → 3 |
| 11 | ugly[6]·2 = 16 | ugly[5]·3 = 18 | ugly[3]·5 = 20 | 16 | i2 → 7 |
| 12 | ugly[7]·2 = 18 | ugly[5]·3 = 18 | ugly[3]·5 = 20 | 18 | i2 → 8, i3 → 6 |

Both `if` statements fire on ties (15 at `i = 10`, 18 at `i = 12`), which is what prevents duplicates.

**E1 — reference solution**

```cpp
class KthLargest {
    priority_queue<int, vector<int>, greater<int>> minHeap;
    int k;
public:
    KthLargest(int k, vector<int>& nums) : k(k) {
        for (int x : nums) add(x);
    }
    int add(int val) {
        minHeap.push(val);
        if ((int)minHeap.size() > k) minHeap.pop();   // drop the smallest
        return minHeap.top();
    }
};
```

Problem 2's loop body, kept alive between calls. Each `add` is $O(\log k)$, space $O(k)$. (Assumes at least `k` values exist by the time `add` returns, as the problem guarantees.)

**E2 — reference solution**

```cpp
int connectSticks(vector<int>& sticks) {
    priority_queue<int, vector<int>, greater<int>> minHeap(sticks.begin(), sticks.end());
    int cost = 0;
    while (minHeap.size() > 1) {
        int a = minHeap.top(); minHeap.pop();
        int b = minHeap.top(); minHeap.pop();
        cost += a + b;
        minHeap.push(a + b);         // the merged stick can be merged again
    }
    return cost;
}
```

The mirror image of Last Stone Weight: always combine the two *smallest*, because every stick's length is paid again each time its group is merged (Huffman-style greedy). Time $O(N \log N)$, space $O(N)$.

**E3 — reference solution**

```cpp
int kthSmallest(vector<vector<int>>& matrix, int k) {
    int n = matrix.size();
    // {value, row, col}
    priority_queue<tuple<int, int, int>, vector<tuple<int, int, int>>, greater<>> minHeap;
    for (int r = 0; r < n; r++) minHeap.push({matrix[r][0], r, 0});   // head of each row

    for (int i = 0; i < k - 1; i++) {          // discard the k-1 smallest
        auto [val, r, c] = minHeap.top();
        minHeap.pop();
        if (c + 1 < n) minHeap.push({matrix[r][c + 1], r, c + 1});
    }
    return get<0>(minHeap.top());
}
```

For the example, the 7 discarded values are `1, 5, 9, 10, 11, 12, 13`, leaving the other `13` on top. Time $O(n + k \log n)$, space $O(n)$.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Interview Problems Walkthrough**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **interview problems heaps** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.


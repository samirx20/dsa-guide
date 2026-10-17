# Part 2, Topic 1: Array Basics & Kadane's Algorithm
## Chapter 2: In-Place Modifications

In technical interviews, a working solution that uses $O(N)$ extra space might not be good enough. Interviewers frequently add a constraint: **"Can you do it in $O(1)$ extra space?"**

This requires **In-Place Modification**. Instead of creating a new array to store the result, you must modify the input array directly.

### 1. The Swapping Trick
The most fundamental in-place operation is swapping two elements. C++ provides a built-in `std::swap()` function.

```cpp
vector<int> nums = {10, 20};
swap(nums[0], nums[1]); 
// nums is now {20, 10}
```

**What's happening:**
- `std::swap()` exchanges the values of two variables
- Uses a temporary variable internally (or move semantics for efficiency)
- Time complexity: O(1), Space complexity: O(1)

**ASCII Diagram of Swapping:**
```
Before swap:
Index:    0     1
Array:  [10 ] [20 ]
          ↑     ↑
         a     b

After swap(nums[0], nums[1]):
Index:    0     1
Array:  [20 ] [10 ]
          ↑     ↑
         b     a
```

**Manual Swap Implementation:**
```cpp
// Using temporary variable
int temp = nums[0];
nums[0] = nums[1];
nums[1] = temp;

// XOR swap (no temp variable, but less readable)
nums[0] ^= nums[1];
nums[1] ^= nums[0];
nums[0] ^= nums[1];
```

*When to use it:* Reversing an array, moving zeros to the end, sorting.

**Dry-Run Table for Array Reversal:**
| Step | nums State | Swapped Indices |
|------|------------|-----------------|
| 0    | [1,2,3,4,5] | -               |
| 1    | [5,2,3,4,1] | (0,4)           |
| 2    | [5,4,3,2,1] | (1,3)           |
| Done | [5,4,3,2,1] | Middle stays    |

### 2. The Read/Write Pointer Pattern
When you need to remove elements from an array or compact it, you cannot use `.erase()` because it takes $O(N)$ time, making a full loop take $O(N^2)$ time.

Instead, you use two variables:
1.  **Read Pointer (`i`):** Scans through the array normally.
2.  **Write Pointer (`write_idx`):** Keeps track of where the next valid element should be placed.

**Example: Remove all instances of the number `3` in-place.**
```cpp
int removeElement(vector<int>& nums, int val) {
    int write_idx = 0; // Points to the front

    // 'i' is the read pointer
    for (int i = 0; i < nums.size(); i++) {
        // If it's a VALID number (not 3)
        if (nums[i] != val) {
            // Write it to the write_idx, and advance the write pointer
            nums[write_idx] = nums[i];
            write_idx++;
        }
    }
    
    // The first 'write_idx' elements are valid. The rest is garbage.
    // We return the new logical size.
    return write_idx; 
}
```

**What's happening:**
- `i` (read pointer) scans every element
- `write_idx` (write pointer) tracks where to place next valid element
- When `nums[i] != val`: copy to `write_idx` and increment `write_idx`
- When `nums[i] == val`: skip (don't increment `write_idx`)
- Result: valid elements are compacted at front, return new size

**ASCII Diagram of Read/Write Pointers:**
```
Input: nums = [3, 2, 3, 4, 3], val = 3

Initial:
Write: ↓
Read:  ↓
      [3, 2, 3, 4, 3]
       0  1  2  3  4

i=0: nums[0]=3 == val → skip
      [3, 2, 3, 4, 3]
       0  1  2  3  4
       W  R

i=1: nums[1]=2 != val → nums[0]=2, write_idx=1
      [2, 2, 3, 4, 3]
          W  R

i=2: nums[2]=3 == val → skip
      [2, 2, 3, 4, 3]
          W     R

i=3: nums[3]=4 != val → nums[1]=4, write_idx=2
      [2, 4, 3, 4, 3]
             W     R

i=4: nums[4]=3 == val → skip
      [2, 4, 3, 4, 3]
             W        R (done)

Final array: [2, 4, 3, 4, 3] (first 2 elements valid)
```

**Dry-Run Table:**
| i | nums[i] | Action | write_idx | Array After |
|---|---------|--------|-----------|-------------|
| 0 | 3       | Skip   | 0         | [3,2,3,4,3] |
| 1 | 2       | Copy   | 1         | [2,2,3,4,3] |
| 2 | 3       | Skip   | 1         | [2,2,3,4,3] |
| 3 | 4       | Copy   | 2         | [2,4,3,4,3] |
| 4 | 3       | Skip   | 2         | [2,4,3,4,3] |

**Error Scenario: Forgetting to Return write_idx**
```cpp
// WRONG: Returns original size
int removeElement(vector<int>& nums, int val) {
    int write_idx = 0;
    for (int i = 0; i < nums.size(); i++) {
        if (nums[i] != val) {
            nums[write_idx] = nums[i];
            write_idx++;
        }
    }
    return nums.size();  // BUG: Should return write_idx
}
```

**What's happening:** If you return `nums.size()`, the caller thinks all elements are valid, but only the first `write_idx` elements are.

### 3. Using the Input Array as a Hash Map
This is an advanced trick used in Hard problems. If an array of size $N$ contains numbers strictly in the range $1$ to $N$, you can use the array *itself* to mark which numbers you've seen, achieving $O(1)$ space.

**The Strategy (Negation):**
When you see the number `X`, go to index `X-1` and make the value there **negative**.
Later, if you check an index and see a negative number, it means you've seen the number associated with that index before!

```cpp
// Example: Find duplicates in an array containing numbers 1 to N
vector<int> findDuplicates(vector<int>& nums) {
    vector<int> result;
    
    for (int i = 0; i < nums.size(); i++) {
        // Get the absolute value (since we might have negated it earlier)
        int val = abs(nums[i]);
        int idx = val - 1; // Map value to index (1-based to 0-based)
        
        // Have we seen this value before?
        if (nums[idx] < 0) {
            result.push_back(val); // Duplicate found!
        } else {
            // Mark as seen by negating
            nums[idx] = -nums[idx];
        }
    }
    return result;
}
```

**What's happening:**
- For each value, map it to index: `idx = val - 1`
- Check if `nums[idx]` is negative (already seen)
- If negative: duplicate found, add to result
- If positive: mark as seen by negating

**ASCII Diagram of Negation Technique:**
```
Input: nums = [4, 3, 2, 7, 8, 2, 3, 1]

i=0: val=4, idx=3, nums[3]=7 > 0 → negate → nums=[4,3,2,-7,8,2,3,1]
i=1: val=3, idx=2, nums[2]=2 > 0 → negate → nums=[4,3,-2,-7,8,2,3,1]
i=2: val=2, idx=1, nums[1]=3 > 0 → negate → nums=[4,-3,-2,-7,8,2,3,1]
i=3: val=7, idx=6, nums[6]=3 > 0 → negate → nums=[4,-3,-2,-7,8,2,-3,1]
i=4: val=8, idx=7, nums[7]=1 > 0 → negate → nums=[4,-3,-2,-7,8,2,-3,-1]
i=5: val=2, idx=1, nums[1]=-3 < 0 → DUPLICATE! Add 2 to result
i=6: val=3, idx=2, nums[2]=-2 < 0 → DUPLICATE! Add 3 to result
i=7: val=1, idx=0, nums[0]=4 > 0 → negate → nums=[-4,-3,-2,-7,8,2,-3,-1]

Result: [2, 3]
```

**Dry-Run Table:**
| i | val | idx | nums[idx] | Action | Result |
|---|-----|-----|-----------|--------|--------|
| 0 | 4   | 3   | 7         | Negate | []     |
| 1 | 3   | 2   | 2         | Negate | []     |
| 2 | 2   | 1   | 3         | Negate | []     |
| 3 | 7   | 6   | 3         | Negate | []     |
| 4 | 8   | 7   | 1         | Negate | []     |
| 5 | 2   | 1   | -3        | Add    | [2]    |
| 6 | 3   | 2   | -2        | Add    | [2,3]  |
| 7 | 1   | 0   | 4         | Negate | [2,3]  |

**Error Scenario: Not Using abs()**
```cpp
// WRONG: Forgetting absolute value
int idx = nums[i] - 1;  // If nums[i] is negative, idx is wrong

// CORRECT:
int val = abs(nums[i]);
int idx = val - 1;
```

**What's happening:** Values can become negative after marking, so always use `abs()` to get the original value.

### 4. When to Use Extra Space ($O(N)$)
You cannot *always* do things in-place. You must use extra space when:
1.  **The prompt forbids modifying the input array.** ("Given a read-only array...").
2.  **You need the original data later.** (If you overwrite data in-place, the old data is lost forever).
3.  **You need $O(1)$ lookups.** (If you need to check if a specific number exists randomly, you must build an `unordered_set`, costing $O(N)$ space).

**Comparison Table: In-Place vs Extra Space**
| Aspect | In-Place | Extra Space |
|--------|----------|-------------|
| Time | O(N) or better | O(N) or better |
| Space | O(1) | O(N) |
| Modifies Input | Yes | No |
| Data Preservation | No | Yes |
| Read-Only Arrays | Cannot use | Can use |
| Use When | Space constrained | Data needed later |

**Common Patterns That Require Extra Space:**
```cpp
// 1. When you need to preserve original for later use
vector<int> original = nums;
// ... modify nums in-place ...
// ... later use original ...

// 2. When you need O(1) lookups
unordered_set<int> seen;
for (int num : nums) {
    if (seen.count(num)) { /* found */ }
    seen.insert(num);
}

// 3. When storing intermediate results
vector<int> prefixSum(nums.size() + 1, 0);
for (int i = 0; i < nums.size(); i++) {
    prefixSum[i + 1] = prefixSum[i] + nums[i];
}
```

### 5. Multiple Code Variations

**Variation 1: Remove Duplicates from Sorted Array**
```cpp
int removeDuplicates(vector<int>& nums) {
    if (nums.empty()) return 0;
    
    int write_idx = 1;  // Start at 1 since first element is always unique
    
    for (int i = 1; i < nums.size(); i++) {
        if (nums[i] != nums[i - 1]) {
            nums[write_idx] = nums[i];
            write_idx++;
        }
    }
    
    return write_idx;
}
```

**What's happening:**
- Sorted array means duplicates are adjacent
- Compare current with previous: if different, it's unique
- Write unique elements to front

**Variation 2: Move Zeroes to End**
```cpp
void moveZeroes(vector<int>& nums) {
    int write_idx = 0;
    
    // First pass: move all non-zero to front
    for (int i = 0; i < nums.size(); i++) {
        if (nums[i] != 0) {
            nums[write_idx] = nums[i];
            write_idx++;
        }
    }
    
    // Second pass: fill remaining with zeros
    while (write_idx < nums.size()) {
        nums[write_idx] = 0;
        write_idx++;
    }
}
```

**What's happening:**
- Two-pass approach: first compact non-zeros, then fill with zeros
- Alternative one-pass: swap non-zeros with zeros at write_idx

**Variation 3: Sort Array By Parity**
```cpp
vector<int> sortArrayByParity(vector<int>& nums) {
    int write_idx = 0;
    
    for (int i = 0; i < nums.size(); i++) {
        if (nums[i] % 2 == 0) {
            swap(nums[write_idx], nums[i]);
            write_idx++;
        }
    }
    
    return nums;
}
```

**What's happening:**
- Even numbers go to front, odd numbers stay at back
- Use swap instead of direct assignment to preserve odd numbers

### 6. Error Scenarios and Common Mistakes

**Mistake 1: Modifying Array While Iterating**
```cpp
// WRONG: Erasing while iterating
for (int i = 0; i < nums.size(); i++) {
    if (nums[i] == target) {
        nums.erase(nums.begin() + i);  // O(N) operation!
        i--;  // Adjust index
    }
}

// CORRECT: Use read/write pointers
int write_idx = 0;
for (int i = 0; i < nums.size(); i++) {
    if (nums[i] != target) {
        nums[write_idx] = nums[i];
        write_idx++;
    }
}
```

**What's happening:** `erase()` shifts all elements, making the loop O(N²).

**Mistake 2: Off-by-One in Pointer Updates**
```cpp
// WRONG: Incrementing write_idx before copy
if (nums[i] != val) {
    write_idx++;  // Increment first
    nums[write_idx] = nums[i];  // Writes to wrong position
}

// CORRECT: Copy first, then increment
if (nums[i] != val) {
    nums[write_idx] = nums[i];
    write_idx++;  // Increment after copy
}
```

**What's happening:** Write to current position, then advance pointer.

**Mistake 3: Not Handling Empty Array**
```cpp
// WRONG: No empty check
int removeElement(vector<int>& nums, int val) {
    int write_idx = 0;
    // ... loop ...
    return write_idx;
}

// CORRECT:
int removeElement(vector<int>& nums, int val) {
    if (nums.empty()) return 0;
    int write_idx = 0;
    // ... loop ...
    return write_idx;
}
```

**What's happening:** Empty array should return 0 immediately.

### Summary

**Quick Reference Table:**
| Pattern | Time | Space | Use Case |
|---------|------|-------|----------|
| Swapping | O(1) | O(1) | Reverse, move elements |
| Read/Write Pointers | O(N) | O(1) | Remove elements, compact |
| Negation Technique | O(N) | O(1) | Find duplicates (1 to N range) |

**Key Takeaways:**
- In-place modification saves space but destroys original data
- Read/write pointer pattern avoids O(N²) from `.erase()`
- Negation technique: use array as hash map for numbers 1 to N
- Always use `abs()` when values might be negated
- Check for empty arrays before accessing elements
- Prefer in-place when space is constrained; use extra space when data must be preserved

---

## Practice & Self-Check

### Predict the Output / Trace by Hand

**Q1.** Run the chapter's `removeElement` on `nums = [0, 1, 2, 2, 3, 0, 4, 2]` with `val = 2`. What does it return, which elements are "valid", and what does the *whole* array look like afterwards (including the garbage tail)?

**Q2.** Trace the chapter's `findDuplicates` (negation technique) on `nums = [2, 1, 2, 1]`. What is `result`, and what is the final state of `nums`?

**Q3.** Trace Variation 3, `sortArrayByParity`, on `nums = [3, 1, 2, 4]`. Fill in the table and give the returned array.

| i | nums[i] | Even? | Swap | write_idx after | Array after |
|---|---------|-------|------|-----------------|-------------|
| 0 | 3 | ? | ? | ? | ? |
| 1 | 1 | ? | ? | ? | ? |
| 2 | 2 | ? | ? | ? | ? |
| 3 | 4 | ? | ? | ? | ? |

**Q4.** Mistake 2 shows the "increment before copy" bug. Run that buggy version on the chapter's input `[3, 2, 3, 4, 3]`, `val = 3`. What does the array look like at the end, what is returned, and why is the answer wrong?
```cpp
int write_idx = 0;
for (int i = 0; i < nums.size(); i++) {
    if (nums[i] != val) {
        write_idx++;                 // BUG: increment first
        nums[write_idx] = nums[i];
    }
}
return write_idx;
```

**Q5.** The chapter shows the XOR swap. What does this print when the "two" elements are actually the same slot (as happens in a reversal or swap loop if `i == j`)?
```cpp
vector<int> nums = {10, 20};
int i = 0, j = 0;
nums[i] ^= nums[j];
nums[j] ^= nums[i];
nums[i] ^= nums[j];
cout << nums[0] << " " << nums[1];
```

### Coding Exercises

**E1 (Easy).** One-pass Move Zeroes. Variation 2 uses two passes; write the one-pass *swap* version mentioned in the chapter. Relative order of non-zero elements must be kept.
```cpp
void moveZeroes(vector<int>& nums);
```
- `[0, 1, 0, 3, 12]` → `[1, 3, 12, 0, 0]`
- `[0]` → `[0]`

**E2 (Easy–Medium).** Remove duplicates from a *sorted* array so each value appears **at most twice**. Return the new length `k`; the first `k` slots hold the answer. $O(1)$ extra space.
```cpp
int removeDuplicatesAtMostTwo(vector<int>& nums);
```
- `[1, 1, 1, 2, 2, 3]` → `5`, first 5 = `[1, 1, 2, 2, 3]`
- `[0, 0, 1, 1, 1, 1, 2, 3, 3]` → `7`, first 7 = `[0, 0, 1, 1, 2, 3, 3]`

**E3 (Medium).** Find all disappeared numbers. `nums` has length $N$ and every value is in $[1, N]$; some values appear twice and others are missing. Return the missing values in increasing order using the negation trick, $O(N)$ time and $O(1)$ extra space (the output does not count).
```cpp
vector<int> findDisappearedNumbers(vector<int>& nums);
```
- `[4, 3, 2, 7, 8, 2, 3, 1]` → `[5, 6]`
- `[1, 1]` → `[2]`

#### Dry-Run: Answers

**Q1.** Returns `5`; the valid prefix is `[0, 1, 3, 0, 4]`. Full array afterwards: `[0, 1, 3, 0, 4, 0, 4, 2]` (indices 5–7 are leftover garbage).

| i | nums[i] | Action | write_idx after |
|---|---------|--------|-----------------|
| 0 | 0 | Copy to [0] | 1 |
| 1 | 1 | Copy to [1] | 2 |
| 2 | 2 | Skip | 2 |
| 3 | 2 | Skip | 2 |
| 4 | 3 | Copy to [2] | 3 |
| 5 | 0 | Copy to [3] | 4 |
| 6 | 4 | Copy to [4] | 5 |
| 7 | 2 | Skip | 5 |

Note that `0` is a perfectly valid value here; only `val = 2` is removed.

**Q2.** `result = [2, 1]`, final `nums = [-2, -1, 2, 1]`.

| i | val = abs(nums[i]) | idx | nums[idx] | Action | nums after | result |
|---|-----|-----|-----------|--------|------------|--------|
| 0 | 2 | 1 | 1 | Negate | [2,-1,2,1] | [] |
| 1 | 1 | 0 | 2 | Negate | [-2,-1,2,1] | [] |
| 2 | 2 | 1 | -1 | Add 2 | [-2,-1,2,1] | [2] |
| 3 | 1 | 0 | -2 | Add 1 | [-2,-1,2,1] | [2,1] |

At `i = 1` the value read is `abs(-1) = 1`: without `abs()` we would compute `idx = -2` and crash, exactly the chapter's "Not Using abs()" error.

**Q3.** Returns `[2, 4, 3, 1]`.

| i | nums[i] | Even? | Swap | write_idx after | Array after |
|---|---------|-------|------|-----------------|-------------|
| 0 | 3 | No | — | 0 | [3,1,2,4] |
| 1 | 1 | No | — | 0 | [3,1,2,4] |
| 2 | 2 | Yes | (0,2) | 1 | [2,1,3,4] |
| 3 | 4 | Yes | (1,3) | 2 | [2,4,3,1] |

Here the odds happen to keep their order (`3, 1`), but swap-based partitioning is not stable in general: on `[1, 3, 2]` it gives `[2, 3, 1]`, reversing the odds.

**Q4.** Trace: `i=0` (3) skip; `i=1` (2): `write_idx = 1`, `nums[1] = 2`; `i=2` skip; `i=3` (4): `write_idx = 2`, `nums[2] = 4`; `i=4` skip. Final array `[3, 2, 4, 4, 3]`, returns `2`. The caller reads the first 2 slots as `[3, 2]`: it still contains the removed value `3` and lost the `4`. Writing to `write_idx` *after* incrementing skips slot 0 entirely, so every kept value lands one slot too far right.

**Q5.** Prints `0 20`. With `i == j` the first line computes `nums[0] ^= nums[0]`, i.e. $x \oplus x = 0$, destroying the value; the next two lines compute $0 \oplus 0 = 0$. `std::swap` (or a temp variable) does not have this problem, which is one more reason to prefer it.

**E1 — reference solution**
```cpp
void moveZeroes(vector<int>& nums) {
    int write_idx = 0;                           // next slot for a non-zero
    for (int i = 0; i < (int)nums.size(); i++) {
        if (nums[i] != 0) {
            swap(nums[write_idx], nums[i]);      // zero (or itself) moves back
            write_idx++;
        }
    }
}
```
Everything in `[0, write_idx)` is non-zero in original order; everything in `[write_idx, i)` is zero. Time $O(N)$, space $O(1)$.

**E2 — reference solution**
```cpp
int removeDuplicatesAtMostTwo(vector<int>& nums) {
    int write_idx = 0;
    for (int i = 0; i < (int)nums.size(); i++) {
        // Keep nums[i] unless the kept prefix already ends with two copies of it.
        if (write_idx < 2 || nums[i] != nums[write_idx - 2]) {
            nums[write_idx] = nums[i];
            write_idx++;
        }
    }
    return write_idx;
}
```
Because the array is sorted, comparing against `nums[write_idx - 2]` (the *written* prefix, not the read side) is enough: if they are equal, two copies are already kept. Time $O(N)$, space $O(1)$. Changing `2` to `k` generalises it to "at most $k$ copies".

**E3 — reference solution**
```cpp
vector<int> findDisappearedNumbers(vector<int>& nums) {
    // Pass 1: mark every value v as seen by making nums[v-1] negative.
    for (int i = 0; i < (int)nums.size(); i++) {
        int idx = abs(nums[i]) - 1;              // abs(): slot may already be negated
        if (nums[idx] > 0) nums[idx] = -nums[idx];
    }
    // Pass 2: any slot still positive was never marked -> value i+1 is missing.
    vector<int> missing;
    for (int i = 0; i < (int)nums.size(); i++) {
        if (nums[i] > 0) missing.push_back(i + 1);
    }
    return missing;
}
```
On `[4,3,2,7,8,2,3,1]` the marked array becomes `[-4,-3,-2,-7,8,2,-3,-1]`; slots 4 and 5 stay positive, so the answer is `[5, 6]`. Time $O(N)$, extra space $O(1)$. The `if (nums[idx] > 0)` guard prevents a duplicate from flipping a slot back to positive.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Chapter 2: In-Place Modifications**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **chapter2 in place modifications** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.


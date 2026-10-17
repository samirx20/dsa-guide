# Part 3, Topic 1: All Major Sorts
## Chapter 3: Non-Comparison Sorts & Stability

Every sort we have covered so far (Bubble, Insertion, Merge, Quick) works by comparing two elements ($A < B$). Mathematics dictates that any algorithm relying on comparisons cannot possibly be faster than $O(N \log N)$.

However, if we have *prior knowledge* about the data we are sorting, we can break this rule and achieve $O(N)$ sorting times.

```
Comparison Sort Lower Bound:
┌──────────────────────────────────────────────┐
│ Any comparison-based sort must make at least │
│ N log N comparisons in the worst case.       │
│                                              │
│ Why? There are N! possible permutations.     │
│ Each comparison eliminates at most half.      │
│ log₂(N!) ≈ N log N comparisons needed.      │
│                                              │
│ Non-comparison sorts bypass this by using     │
│ the VALUES themselves as indices.             │
└──────────────────────────────────────────────┘
```

---

### 1. Counting Sort

**The Constraint:** You can only use Counting Sort if you know that all elements are integers within a relatively small, specific range (e.g., ages of humans: $0$ to $120$).

**The Intuition:**
Instead of comparing elements, you simply count how many times each number appears using a frequency array.

```cpp
void countingSort(vector<int>& arr) {
    if (arr.empty()) return;

    // 1. Find the maximum value to know how big our frequency array needs to be
    int maxVal = *max_element(arr.begin(), arr.end());

    // 2. Create a frequency array (initialized to 0)
    vector<int> counts(maxVal + 1, 0);

    // 3. Count the occurrences of each element
    for (int num : arr) {
        counts[num]++;
    }

    // 4. Reconstruct the sorted array by overwriting the original
    int write_idx = 0;
    for (int num = 0; num <= maxVal; num++) {
        while (counts[num] > 0) {
            arr[write_idx] = num;
            write_idx++;
            counts[num]--;
        }
    }
}
```

**What's happening:**
```
We use the values in the input array as *indices* into our `counts` array.
By iterating through the input, we tally up occurrences.
Then, we iterate through the `counts` array from index 0 to maxVal.
For each index, we write that value back to the original array
as many times as it appeared. This avoids any comparison logic.

Algorithm Flow:
  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
  │  Input Array  │────▶│  Count Freq  │────▶│  Reconstruct │
  │  [4,2,2,8,3]  │     │  [0,0,2,1..] │     │  [2,2,3,4,8] │
  └──────────────┘     └──────────────┘     └──────────────┘
        O(N)                O(K)                  O(N)
```

**Dry-Run: Sort `[4, 2, 2, 8, 3, 3, 1]`**

| Step | Array | Counts Array (indices 0-8) | Action |
|------|-------|---------------------------|--------|
| 0 | `[4, 2, 2, 8, 3, 3, 1]` | `[0, 0, 0, 0, 0, 0, 0, 0, 0]` | Initial state |
| 1 | — | `[0, 1, 2, 2, 1, 0, 0, 0, 1]` | Count frequencies |
| 2 | `[1, 2, 2, 3, 3, 4, 8]` | `[0, 0, 0, 0, 0, 0, 0, 0, 0]` | Reconstruct array |

**Bucket Visualization:**
Imagine `counts` as a series of buckets. Each bucket corresponds to a number. You drop items into buckets, then collect them from left to right.

```
Bucket 0: [ ]
Bucket 1: [1]        <- 1 item
Bucket 2: [2, 2]     <- 2 items
Bucket 3: [3, 3]     <- 2 items
Bucket 4: [4]        <- 1 item
Bucket 5: [ ]
Bucket 6: [ ]
Bucket 7: [ ]
Bucket 8: [8]        <- 1 item

Collect left to right: 1, 2, 2, 3, 3, 4, 8
```

**Edge Case: Handling Negative Numbers**
```cpp
void countingSortWithNegatives(vector<int>& arr) {
    if (arr.empty()) return;

    int minVal = *min_element(arr.begin(), arr.end());
    int maxVal = *max_element(arr.begin(), arr.end());

    // Offset: shift all values so minimum maps to index 0
    int offset = -minVal;
    int range = maxVal - minVal + 1;

    vector<int> counts(range, 0);

    // Count with offset
    for (int num : arr) {
        counts[num + offset]++;
    }

    // Reconstruct
    int write_idx = 0;
    for (int i = 0; i < range; i++) {
        while (counts[i] > 0) {
            arr[write_idx] = i - offset;  // Remove offset
            write_idx++;
            counts[i]--;
        }
    }
}
// [-3, -1, 2, 0, 4] → offset = 3 → counts indexed at [0..7]
// counts[0]=1 (val -3), counts[2]=1 (val -1), counts[3]=1 (val 0), etc.
```

**Production Version (Stable):**
```cpp
void countingSortStable(vector<int>& arr) {
    if (arr.empty()) return;

    int maxVal = *max_element(arr.begin(), arr.end());
    vector<int> counts(maxVal + 1, 0);

    for (int num : arr) counts[num]++;

    // Prefix sums: counts[i] = number of elements <= i
    for (int i = 1; i <= maxVal; i++) {
        counts[i] += counts[i - 1];
    }

    // Build output in reverse order (stable!)
    vector<int> output(arr.size());
    for (int i = arr.size() - 1; i >= 0; i--) {
        output[counts[arr[i]] - 1] = arr[i];
        counts[arr[i]]--;
    }

    arr = output;
}
// Why reverse? For stability — equal elements maintain original order
```

**What's happening:**
```
Original: [3a, 1, 3b, 2]  (two 3s, labeled a and b)

Prefix sums:
  counts[1] = 1  (one element ≤ 1)
  counts[2] = 2  (two elements ≤ 2)
  counts[3] = 4  (four elements ≤ 3)

Place from right to left:
  3b → output[counts[3]-1] = output[3] → output = [_,_,_,3b]
  2  → output[counts[2]-1] = output[1] → output = [_,2,_,3b]
  1  → output[counts[1]-1] = output[0] → output = [1,2,_,3b]
  3a → output[counts[3]-1] = output[2] → output = [1,2,3a,3b]

3a is BEFORE 3b → STABLE ✓
```

*   **Time Complexity:** $O(N + K)$, where $K$ is the maximum value in the array. If $K$ is small, this is effectively $O(N)$.
*   **Space Complexity:** $O(K)$ to store the frequency array.
*   **The Trap:** If you use Counting Sort on an array like `[1, 2, 99999999]`, you will allocate an array of 100 million elements just to sort three numbers! Memory crash.

**Error Scenarios:**
```
❌ Error 1: Max value is huge
   arr = [1, 2, 1000000000]
   counts array size = 1,000,000,001 → Memory crash!

❌ Error 2: Negative numbers without offset
   arr = [-1, -2, 3]
   counts[-1] → Index out of bounds!

❌ Error 3: Floating point values
   arr = [1.5, 2.3, 4.7]
   Can't use as array indices → Counting Sort doesn't work!
```

---

### 2. Radix Sort (Complete)

What if the numbers are large, but have a limited number of digits (like phone numbers or 32-bit integers)?

**Radix Sort** works by performing a Counting Sort digit by digit, starting from the least significant digit (the 1s place) up to the most significant digit.

For example, to sort `[170, 45, 75, 90, 802, 24, 2, 66]`:
1.  Sort based on the 1s digit.
2.  Sort based on the 10s digit.
3.  Sort based on the 100s digit.

**Complete C++ Implementation:**
```cpp
void countingSortByDigit(vector<int>& arr, int exp) {
    int n = arr.size();
    vector<int> output(n);
    vector<int> counts(10, 0);  // Digits 0-9

    // Count occurrences of each digit
    for (int num : arr) {
        int digit = (num / exp) % 10;
        counts[digit]++;
    }

    // Prefix sums
    for (int i = 1; i < 10; i++) {
        counts[i] += counts[i - 1];
    }

    // Build output (reverse for stability)
    for (int i = n - 1; i >= 0; i--) {
        int digit = (arr[i] / exp) % 10;
        output[counts[digit] - 1] = arr[i];
        counts[digit]--;
    }

    arr = output;
}

void radixSort(vector<int>& arr) {
    if (arr.empty()) return;

    int maxVal = *max_element(arr.begin(), arr.end());

    // Sort by each digit: 1s, 10s, 100s, ...
    for (int exp = 1; maxVal / exp > 0; exp *= 10) {
        countingSortByDigit(arr, exp);
    }
}
```

**What's happening:**
```
For each digit position (1s, 10s, 100s...):
  1. Extract that digit from every number
  2. Use counting sort to sort by that digit only
  3. The counting sort is STABLE, so earlier digit order is preserved

Example: [170, 45, 75, 90, 802, 24, 2, 66]

After sorting by 1s digit:
  170(0), 90(0), 802(2), 2(2), 24(4), 45(5), 75(5), 66(6)
  Grouped by 1s: {0:170,90}, {2:802,2}, {4:24}, {5:45,75}, {6:66}

After sorting by 10s digit:
  802(0), 2(0), 24(2), 45(4), 66(6), 170(7), 75(7), 90(9)

After sorting by 100s digit:
  2, 24, 45, 66, 75, 90, 170, 802  ← SORTED!
```

**Dry-Run: Radix Sort `[170, 45, 75, 90, 802, 24, 2, 66]`**

| Pass | Digit | Input Array | Bucket State (0-9) | Result |
|------|-------|-------------|-------------------|--------|
| 1 | 1s | `[170, 45, 75, 90, 802, 24, 2, 66]` | 0:[170,90], 1:[], 2:[802,2], 3:[], 4:[24], 5:[45,75], 6:[66], 7:[], 8:[], 9:[] | `[170, 90, 802, 2, 24, 45, 75, 66]` |
| 2 | 10s | `[170, 90, 802, 2, 24, 45, 75, 66]` | 0:[802,2], 1:[], 2:[24], 3:[], 4:[45], 5:[], 6:[66], 7:[170,75], 8:[], 9:[90] | `[802, 2, 24, 45, 66, 170, 75, 90]` |
| 3 | 100s | `[802, 2, 24, 45, 66, 170, 75, 90]` | 0:[2,24,45,66,75,90], 1:[170], 2:[], 3:[], 4:[], 5:[], 6:[], 7:[], 8:[802], 9:[] | `[2, 24, 45, 66, 75, 90, 170, 802]` |

*   **Time Complexity:** $O(d \times (N + b))$, where $d$ is the number of digits, and $b$ is the base (10 for decimal). Since $d$ and $b$ are usually small constants, it is considered $O(N)$.

*   **Space Complexity:** $O(N + b)$ for the output array and counting array.

*   **Error Scenarios:** Sorting from MSD instead of LSD breaks order. Negative numbers need special handling (separate, sort absolute values, reverse and prepend). Floating point numbers can't use digit extraction directly.

---

### 3. Bucket Sort (NEW)

**When to use:** Data is uniformly distributed over a known range (e.g., floating point numbers between 0.0 and 1.0).

```cpp
void bucketSort(vector<float>& arr) {
    int n = arr.size();
    if (n <= 1) return;

    // Create n empty buckets
    vector<vector<float>> buckets(n);

    // Distribute elements into buckets
    for (float num : arr) {
        int bucketIdx = n * num;  // For range [0, 1)
        bucketIdx = min(bucketIdx, n - 1);  // Handle edge case: num == 1.0
        buckets[bucketIdx].push_back(num);
    }

    // Sort each bucket (insertion sort for small buckets)
    for (auto& bucket : buckets) {
        stable_sort(bucket.begin(), bucket.end());
    }

    // Concatenate all buckets
    int idx = 0;
    for (auto& bucket : buckets) {
        for (float num : bucket) {
            arr[idx++] = num;
        }
    }
}
```

**What's happening:**
```
arr = [0.42, 0.32, 0.23, 0.52, 0.25, 0.47, 0.51]

Step 1: Distribute into buckets (n=7 buckets for 7 elements)
  bucket[0] (0.00-0.14): []
  bucket[1] (0.14-0.28): [0.23, 0.25]
  bucket[2] (0.28-0.42): [0.42, 0.32]
  bucket[3] (0.42-0.57): [0.52, 0.47, 0.51]
  bucket[4] (0.57-0.71): []
  bucket[5] (0.71-0.85): []
  bucket[6] (0.85-1.00): []

Step 2: Sort each bucket
  bucket[1]: [0.23, 0.25]
  bucket[2]: [0.32, 0.42]
  bucket[3]: [0.47, 0.51, 0.52]

Step 3: Concatenate
  [0.23, 0.25, 0.32, 0.42, 0.47, 0.51, 0.52] ✓
```

*   **Time Complexity:** $O(N)$ average, $O(N^2)$ worst (if all elements fall in one bucket)
*   **Space Complexity:** $O(N + K)$ where K is number of buckets

**Error Scenarios:** Non-uniform distribution degrades performance (one bucket gets huge). Values outside [0,1) range need normalization or different mapping.

---

### 4. The Concept of "Stability"

During an interview, you might be asked: *"Is your sorting algorithm stable?"*

**A sorting algorithm is STABLE if it preserves the relative order of equal elements.**

Imagine you have a list of people represented as `(Name, Age)`:
`[ ("Alice", 25), ("Bob", 30), ("Charlie", 25) ]`

Notice that Alice and Charlie are the same age, and Alice appears *before* Charlie in the original array.
If we sort this array by Age using a **Stable** sort, the result is guaranteed to be:
`[ ("Alice", 25), ("Charlie", 25), ("Bob", 30) ]`

If we use an **Unstable** sort, the result *might* be:
`[ ("Charlie", 25), ("Alice", 25), ("Bob", 30) ]`

**Code Example: Stable vs Unstable Behavior**
```cpp
struct Student {
    string name;
    int grade;
};

// Stable sort (Merge Sort / std::stable_sort)
// Alice comes before Charlie in original → stays before after sort
// Result: [(Alice,90), (Charlie,90), (Bob,85)]

// Unstable sort (Quick Sort / std::sort)
// Charlie might end up before Alice
// Result: [(Charlie,90), (Alice,90), (Bob,85)]  ← scrambled!
```

**Why Merge Sort is Stable but Quick Sort Isn't:**
Merge Sort preserves order of equal elements during merge. Quick Sort's partition can jump equal elements across the pivot, breaking relative order.

**Why does this matter?**
Multi-key sorting: sort by Department first (any sort), then by Name using stable sort. Employees with the same Name stay ordered by Department.

```cpp
// Multi-key sort using stability:
// 1. Sort by Department (unstable is fine for first sort)
sort(employees.begin(), employees.end(), byDepartment);

// 2. Sort by Name (MUST be stable to preserve department order among equal names)
stable_sort(employees.begin(), employees.end(), byName);

// Result: sorted by Name, and within same Name, grouped by Department
```

#### Stability Cheat Sheet
- **Stable Sorts:** Bubble Sort, Insertion Sort, **Merge Sort**, Counting Sort, Radix Sort, Bucket Sort.
- **Unstable Sorts:** Selection Sort, **Quick Sort**, Heap Sort.
- **C++ STL:**
  - `std::sort()` is **unstable** (it uses Introsort/Quick Sort).
  - `std::stable_sort()` is **stable** (it uses Merge Sort).

---

### 5. When to Use What — Decision Guide

```
┌─────────────────────────────────────────────────────────┐
│               SORTING ALGORITHM DECISION TREE            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Is your data integers in a small range K?              │
│  ├── YES → Is K ≈ N?                                   │
│  │         ├── YES → Counting Sort O(N+K) ✓            │
│  │         └── NO  → Radix Sort O(d×N) ✓               │
│  │                                                          │
│  Is your data uniformly distributed floats?              │
│  ├── YES → Bucket Sort O(N) ✓                           │
│  │                                                          │
│  Do you need stability?                                 │
│  ├── YES → Merge Sort O(N log N) ✓                      │
│  │         std::stable_sort()                            │
│  │                                                          │
│  Do you need in-place?                                  │
│  ├── YES → Quick Sort O(N log N) avg                    │
│  │         Heap Sort O(N log N)                          │
│  │                                                          │
│  Default → std::sort() O(N log N)                       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

### Comparison Table: All Sorting Algorithms

| Algorithm | Best Case | Average Case | Worst Case | Space | Stable? | Notes |
|-----------|-----------|--------------|------------|-------|---------|-------|
| Bubble Sort | $O(N)$ | $O(N^2)$ | $O(N^2)$ | $O(1)$ | Yes | Simple, inefficient |
| Insertion Sort | $O(N)$ | $O(N^2)$ | $O(N^2)$ | $O(1)$ | Yes | Good for small/sorted arrays |
| Selection Sort | $O(N^2)$ | $O(N^2)$ | $O(N^2)$ | $O(1)$ | No | Always $O(N^2)$ comparisons |
| Merge Sort | $O(N \log N)$ | $O(N \log N)$ | $O(N \log N)$ | $O(N)$ | Yes | Stable, consistent |
| Quick Sort | $O(N \log N)$ | $O(N \log N)$ | $O(N^2)$ | $O(\log N)$ | No | Fast in practice, unstable |
| Heap Sort | $O(N \log N)$ | $O(N \log N)$ | $O(N \log N)$ | $O(1)$ | No | In-place, unstable |
| Counting Sort | $O(N+K)$ | $O(N+K)$ | $O(N+K)$ | $O(K)$ | Yes | Only for small integer ranges |
| Radix Sort | $O(d(N+b))$ | $O(d(N+b))$ | $O(d(N+b))$ | $O(N+b)$ | Yes | Good for fixed-length integers |
| Bucket Sort | $O(N)$ avg | $O(N)$ avg | $O(N^2)$ | $O(N)$ | Yes | Uniform distribution required |

---

### Common Mistakes

**Mistake 1: Using Counting Sort on large ranges**
```cpp
// WRONG: arr = [1, 2, 9999999]
int maxVal = 9999999;
vector<int> counts(maxVal + 1, 0);  // 10 million elements for 3 values!

// RIGHT: Use a different sort or compress values
```

**Mistake 2: Forgetting Radix Sort needs stable sub-sort**
```cpp
// WRONG: Using unstable counting sort for each digit pass
// The result will be incorrect!

// RIGHT: Use stable counting sort (reverse iteration with prefix sums)
```

**Mistake 3: Assuming O(N) always beats O(N log N)**
Counting Sort O(N+K): If K = 10^9, that's O(10^9) not O(N)! Always check if K is actually small.

---

### Quick Reference

| Concept | Detail |
|---------|--------|
| **Comparison Sort Limit** | $O(N \log N)$ is the theoretical lower bound |
| **Counting Sort** | Frequency array, $O(N+K)$, requires small range $K$ |
| **Radix Sort** | Digit-by-digit counting sort, $O(dN)$, requires fixed digits |
| **Bucket Sort** | Distribute into buckets, sort each, $O(N)$ avg |
| **Stability** | Preserves relative order of equal elements |
| **When to use Non-Comparison** | Integer data with known/small range |
| **C++ std::sort** | Unstable (Introsort) |
| **C++ std::stable_sort** | Stable (Merge Sort) |

| Algorithm | Time | Space | Stable | When to Use |
|-----------|------|-------|--------|-------------|
| Counting Sort | O(N+K) | O(K) | Yes | Small integer range |
| Radix Sort | O(d×N) | O(N+b) | Yes | Fixed-digit integers |
| Bucket Sort | O(N) avg | O(N) | Yes | Uniform floats |
| Merge Sort | O(N log N) | O(N) | Yes | Need stability |
| Quick Sort | O(N log N) avg | O(log N) | No | Fast average case |

---

## Practice & Self-Check

### Predict the Output / Trace by Hand

**Q1. Prefix sums in stable Counting Sort.** Run `countingSortStable` on `[2, 5, 3, 0, 2, 3, 0, 3]`. Give the `counts` array (indices 0–5) after counting and after the prefix-sum loop. Into which `output` index does the 3 that started at index 2 land?

**Q2. Radix Sort passes.** Run the chapter's `radixSort` on `[329, 457, 657, 839, 436, 720, 355]`. How many passes does the `exp` loop make? Write the array after each pass.

**Q3. Offset arithmetic.** Run `countingSortWithNegatives` on `[-2, 5, -2, 1]`. What are `offset` and `range`, which `counts` indices end up non-zero (and with what values), and what is the final array?

**Q4. Which bucket?** Run the chapter's `bucketSort` on the 10 values `[0.78, 0.17, 0.39, 0.26, 0.72, 0.94, 0.21, 0.12, 0.23, 0.68]`. List each non-empty bucket's contents *before* the per-bucket sort. Which bucket is largest?

**Q5. Mistake 2, made concrete.** Suppose someone "simplifies" `countingSortByDigit` by changing the output loop to run forward: `for (int i = 0; i < n; i++)` (everything else unchanged). What does `radixSort` now return for `[21, 12, 22, 11]`? What does the correct (reverse-loop) version return?

### Coding Exercises

**E1 (Easy).** The array contains only `0`, `1` and `2`. Sort it with Counting Sort in two passes (count, then overwrite).

```cpp
void sortColors(vector<int>& nums);
```

- `[2, 0, 2, 1, 1, 0]` → `[0, 0, 1, 1, 2, 2]`
- `[1]` → `[1]`

**E2 (Easy–Medium).** Stable Counting Sort on *records*: sort people by age (`0 <= age <= maxAge`) so that people with equal ages keep their input order. Use the prefix-sum + reverse-placement pattern from `countingSortStable`.

```cpp
vector<pair<string, int>> sortByAge(const vector<pair<string, int>>& people, int maxAge);
```

- `[("Alice",25), ("Bob",30), ("Charlie",25)], maxAge = 120` → `[("Alice",25), ("Charlie",25), ("Bob",30)]`
- `[("Zed",3), ("Amy",1), ("Kim",3), ("Lee",1)], maxAge = 5` → `[("Amy",1), ("Lee",1), ("Zed",3), ("Kim",3)]`

**E3 (Medium).** Extend Radix Sort to handle negative numbers, following the chapter's hint: separate the negatives, radix-sort their absolute values, then reverse and negate them and put them in front of the sorted non-negatives. Assume no element equals `INT_MIN`.

```cpp
void radixSortWithNegatives(vector<int>& arr);
```

- `[170, -45, 75, -90, 802, 24, -2, 66]` → `[-90, -45, -2, 24, 66, 75, 170, 802]`
- `[-5, -50, -1]` → `[-50, -5, -1]`

#### Dry-Run: Answers

**Q1.** After counting: `[2, 0, 2, 3, 0, 1]`. After prefix sums: `[2, 2, 4, 7, 7, 8]`. The 3 from index 2 lands at **output[4]**. Final output `[0, 0, 2, 2, 3, 3, 3, 5]`.

| i (right → left) | arr[i] | slot = counts[v] - 1 | counts[v] after |
|------------------|--------|----------------------|-----------------|
| 7 | 3 | 6 | 6 |
| 6 | 0 | 1 | 1 |
| 5 | 3 | 5 | 5 |
| 4 | 2 | 3 | 3 |
| 3 | 0 | 0 | 0 |
| 2 | 3 | **4** | 4 |
| 1 | 5 | 7 | 7 |
| 0 | 2 | 2 | 2 |

The three 3s (from indices 2, 5, 7) land at slots 4, 5, 6 — the same left-to-right order they had in the input. That is stability.

**Q2.** `maxVal = 839`, so `exp` takes the values 1, 10, 100 → **3 passes** (`839 / 1000 = 0` stops the loop).

| Pass | Digit | Buckets (in stable order) | Array after pass |
|------|-------|---------------------------|------------------|
| 1 | 1s | 0:[720] 5:[355] 6:[436] 7:[457, 657] 9:[329, 839] | `[720, 355, 436, 457, 657, 329, 839]` |
| 2 | 10s | 2:[720, 329] 3:[436, 839] 5:[355, 457, 657] | `[720, 329, 436, 839, 355, 457, 657]` |
| 3 | 100s | 3:[329, 355] 4:[436, 457] 6:[657] 7:[720] 8:[839] | `[329, 355, 436, 457, 657, 720, 839]` |

Note pass 3: 329 and 355 share the 100s digit 3; they end up correctly ordered only because pass 2 already put 329 before 355 and the sub-sort is stable.

**Q3.** `minVal = -2`, `maxVal = 5`, so `offset = 2` and `range = 5 - (-2) + 1 = 8` (indices 0–7).
- `-2 + 2 = 0` → `counts[0] = 2`
- `1 + 2 = 3` → `counts[3] = 1`
- `5 + 2 = 7` → `counts[7] = 1`

Reconstruction writes `i - offset`: `0 - 2 = -2` (twice), `3 - 2 = 1`, `7 - 2 = 5` → `[-2, -2, 1, 5]`.

**Q4.** `bucketIdx = (int)(10 * num)` (truncation):

| Bucket | Contents before sort | After sort |
|--------|----------------------|------------|
| 1 | `[0.17, 0.12]` | `[0.12, 0.17]` |
| 2 | `[0.26, 0.21, 0.23]` | `[0.21, 0.23, 0.26]` |
| 3 | `[0.39]` | `[0.39]` |
| 6 | `[0.68]` | `[0.68]` |
| 7 | `[0.78, 0.72]` | `[0.72, 0.78]` |
| 9 | `[0.94]` | `[0.94]` |

Bucket **2** is largest (3 items). Concatenating: `[0.12, 0.17, 0.21, 0.23, 0.26, 0.39, 0.68, 0.72, 0.78, 0.94]`.

**Q5.** Broken (forward loop) version returns **`[12, 11, 22, 21]`** — not sorted. The correct version returns `[11, 12, 21, 22]`.

Why: with prefix sums, `counts[d]` points one past the *last* slot for digit `d`. Filling from the right end of each group while scanning the input forward places equal-digit items in **reversed** order.

| Pass | Input | Prefix `counts[1], counts[2]` | Forward placement | Output |
|------|-------|-------------------------------|-------------------|--------|
| 1s | `[21, 12, 22, 11]` | 2, 4 | 21→[1], 12→[3], 22→[2], 11→[0] | `[11, 21, 22, 12]` |
| 10s | `[11, 21, 22, 12]` | 2, 4 | 11→[1], 21→[3], 22→[2], 12→[0] | `[12, 11, 22, 21]` |

**E1 — reference solution**

```cpp
void sortColors(vector<int>& nums) {
    int counts[3] = {0, 0, 0};
    for (int x : nums) counts[x]++;
    int w = 0;
    for (int v = 0; v < 3; v++)
        while (counts[v]-- > 0) nums[w++] = v;
}
```

Time $O(N)$, space $O(1)$ ($K = 3$ is a constant).

**E2 — reference solution**

```cpp
vector<pair<string, int>> sortByAge(const vector<pair<string, int>>& people, int maxAge) {
    vector<int> counts(maxAge + 1, 0);
    for (const auto& p : people) counts[p.second]++;
    for (int a = 1; a <= maxAge; a++) counts[a] += counts[a - 1];

    vector<pair<string, int>> output(people.size());
    for (int i = (int)people.size() - 1; i >= 0; i--) {   // reverse => stable
        int age = people[i].second;
        output[--counts[age]] = people[i];
    }
    return output;
}
```

Time $O(N + K)$, space $O(N + K)$ with $K$ = `maxAge`. This is exactly why the "production" version exists: the simple overwrite version only works for bare integers, because it rebuilds values instead of moving the original records.

**E3 — reference solution**

```cpp
void radixSort(vector<int>& arr);   // the chapter's version (non-negative input)

void radixSortWithNegatives(vector<int>& arr) {
    vector<int> neg, pos;
    for (int x : arr) {
        if (x < 0) neg.push_back(-x);   // store absolute value
        else       pos.push_back(x);
    }
    radixSort(neg);                     // e.g. [45, 90, 2] -> [2, 45, 90]
    radixSort(pos);

    arr.clear();
    for (int i = (int)neg.size() - 1; i >= 0; i--)   // largest |x| first
        arr.push_back(-neg[i]);                      // -> -90, -45, -2
    for (int x : pos) arr.push_back(x);
}
```

Time $O(d \cdot (N + b))$, space $O(N + b)$. Reversing is required because among negatives a *larger* absolute value means a *smaller* number. `INT_MIN` is excluded because `-INT_MIN` overflows an `int`.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Chapter 3: Non-Comparison Sorts & Stability**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **chapter3 non comparison sorts and stability** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.


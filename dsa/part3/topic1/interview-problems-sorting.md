# Part 3, Topic 1: All Major Sorts
## Interview Problems Walkthrough

Sorting questions in interviews rarely ask you to just "sort the array." They test whether you can recognize *when* a specific sorting property (like partitioning, bounded ranges, or custom comparators) provides the optimal solution.

### Problem Classification Table

| Problem | Difficulty | Pattern | Key Insight |
|---------|-----------|---------|-------------|
| Sort an Array | Medium | Divide & Conquer | Merge Sort for guaranteed $O(N \log N)$ |
| Sort Colors (Dutch National Flag) | Medium | Three-Way Partition | 0s, 1s, 2s in single pass |
| Merge Intervals | Medium | Sort + Greedy | Sort by start, merge overlapping |
| Largest Number | Medium | Custom Comparator | Compare concatenations $A+B$ vs $B+A$ |
| Meeting Rooms II | Medium | Min-Heap + Sort | Track concurrent meetings |
| Meeting Rooms | Easy | Sort + Scan | Check if any overlaps exist |

### Solution Approach Comparison

| Approach | When to Use | Time | Space |
|----------|------------|------|-------|
| Merge Sort | Stable sort needed, large arrays | $O(N \log N)$ | $O(N)$ |
| Quick Sort | Average case fast, in-place | $O(N \log N)$ | $O(\log N)$ |
| Counting Sort | Small integer range | $O(N+K)$ | $O(K)$ |
| Dutch National Flag | 3-way partitioning | $O(N)$ | $O(1)$ |
| Custom Sort | Complex ordering rules | $O(N \log N)$ | $O(1)$ |

---

### 1. Sort an Array (Medium)

**Trigger:** Sort an array in $O(N \log N)$ time without using built-in functions.
**Intuition:** This is a direct request to implement Merge Sort. Quick Sort might TLE on LeetCode for worst-case inputs unless you randomize the pivot. Memorize the Merge Sort template from Chapter 2.

```cpp
void merge(vector<int>& arr, int left, int mid, int right) {
    vector<int> temp;
    int i = left, j = mid + 1;
    
    while (i <= mid && j <= right) {
        if (arr[i] <= arr[j]) {
            temp.push_back(arr[i++]);
        } else {
            temp.push_back(arr[j++]);
        }
    }
    
    while (i <= mid) temp.push_back(arr[i++]);
    while (j <= right) temp.push_back(arr[j++]);
    
    for (int k = 0; k < temp.size(); k++) {
        arr[left + k] = temp[k];
    }
}

void mergeSort(vector<int>& arr, int left, int right) {
    if (left >= right) return;
    
    int mid = left + (right - left) / 2;
    mergeSort(arr, left, mid);
    mergeSort(arr, mid + 1, right);
    merge(arr, left, mid, right);
}
```

**What's happening:**
We recursively divide the array into halves until we reach single elements (base case). Then we merge sorted halves back together using a temporary array. The merge step compares elements from both halves and places them in sorted order.

**Dry-Run: Sort `[38, 27, 43, 3, 9, 82, 10]`**

| Step | Array State | Action |
|------|-------------|--------|
| 1 | `[38, 27, 43, 3, 9, 82, 10]` | Split at mid=3 |
| 2 | `[38, 27, 43]` + `[3, 9, 82, 10]` | Recurse left |
| 3 | `[38]` + `[27, 43]` | Split |
| 4 | `[27]` + `[43]` | Merge → `[27, 43]` |
| 5 | `[27, 38, 43]` | Merge → `[27, 38, 43]` |
| 6 | `[27, 38, 43]` + `[3, 9, 82, 10]` | Merge halves |
| 7 | `[3, 9, 10, 27, 38, 43, 82]` | Final sorted array |

**Production Version (Handles duplicates, stable):**
```cpp
void mergeSortProduction(vector<int>& arr) {
    if (arr.size() <= 1) return;
    
    vector<int> temp(arr.size());
    function<void(int, int)> sort = [&](int l, int r) {
        if (l >= r) return;
        int m = l + (r - l) / 2;
        sort(l, m);
        sort(m + 1, r);
        
        // Merge
        int i = l, j = m + 1, k = l;
        while (i <= m && j <= r) {
            if (arr[i] <= arr[j]) {  // <= ensures stability
                temp[k++] = arr[i++];
            } else {
                temp[k++] = arr[j++];
            }
        }
        while (i <= m) temp[k++] = arr[i++];
        while (j <= r) temp[k++] = arr[j++];
        copy(temp.begin() + l, temp.begin() + r + 1, arr.begin() + l);
    };
    sort(0, arr.size() - 1);
}
// Time: O(N log N), Space: O(N), Stable: Yes
```

---

### 2. Sort Colors / Dutch National Flag (Medium)

**Trigger:** Given an array of 0s, 1s, and 2s, sort them in-place.
**Intuition:** The naive approach is a 2-pass Counting Sort: count the 0s, 1s, and 2s, then overwrite the array.
The interviewer will ask for a **1-pass, in-place solution**. This uses a brilliant 3-pointer partition technique (The Dutch National Flag algorithm).
- `low`: Where the next `0` should go.
- `mid`: The current element we are inspecting.
- `high`: Where the next `2` should go.

```cpp
void sortColors(vector<int>& nums) {
    int low = 0;
    int mid = 0;
    int high = nums.size() - 1;
    
    while (mid <= high) {
        if (nums[mid] == 0) {
            // Found a 0, swap it to the low zone
            swap(nums[low], nums[mid]);
            low++;
            mid++;
        } else if (nums[mid] == 1) {
            // Found a 1, it's already in the middle zone, just move on
            mid++;
        } else {
            // Found a 2, swap it to the high zone
            swap(nums[mid], nums[high]);
            high--;
            // We DO NOT increment mid here! 
            // The number we just swapped from 'high' might be a 0 or 2, 
            // so we must evaluate it again in the next iteration.
        }
    }
}
// Time: O(N) (One pass!), Space: O(1)
```

**What's happening:**
The array is divided into four regions: `[0..low-1]` (0s), `[low..mid-1]` (1s), `[mid..high]` (unknown), `[high+1..n-1]` (2s). We process each element in the unknown region and place it in the correct zone. When we swap with `high`, we don't increment `mid` because the swapped element hasn't been examined yet.

**Dry-Run: Sort `[2, 0, 2, 1, 1, 0]`**

| Step | Array | low | mid | high | Action |
|------|-------|-----|-----|------|--------|
| 0 | `[2,0,2,1,1,0]` | 0 | 0 | 5 | Start |
| 1 | `[0,0,2,1,1,2]` | 1 | 1 | 4 | Swap(0,5), 2 moved to end |
| 2 | `[0,0,2,1,1,2]` | 1 | 2 | 4 | nums[2]=2, swap with high |
| 3 | `[0,0,1,1,2,2]` | 1 | 2 | 3 | nums[2]=1, mid++ |
| 4 | `[0,0,1,1,2,2]` | 1 | 3 | 3 | nums[3]=1, mid++ |
| 5 | `[0,0,1,1,2,2]` | 1 | 4 | 3 | mid > high, done |

**Edge Case Version (Handles any integers, 3-way partition):**
```cpp
void sortColorsGeneral(vector<int>& nums, int pivot) {
    int lo = 0, mid = 0, hi = nums.size() - 1;
    while (mid <= hi) {
        if (nums[mid] < pivot) {
            swap(nums[lo++], nums[mid++]);
        } else if (nums[mid] > pivot) {
            swap(nums[mid], nums[hi--]);
        } else {
            mid++;
        }
    }
}
// Sorts around pivot value, putting smaller elements before and larger after
// Time: O(N), Space: O(1)
```

---

### 3. Merge Intervals (Medium)

**Trigger:** Given an array of intervals `[start, end]`, merge all overlapping intervals.
**Intuition:** How do you know if interval A overlaps with interval B? It is very difficult if the array is randomized. 
**Sorting solves this instantly.** Sort the intervals based on their `start` times. 
Once sorted, you only need to compare the current interval with the *last* interval you added to your merged list.
- If current `start` <= last `end`, they overlap! Update the last `end` to be the maximum of both ends.
- Else, they don't overlap. Push the current interval to the list.

```cpp
vector<vector<int>> merge(vector<vector<int>>& intervals) {
    if (intervals.empty()) return {};
    
    // Sort intervals by their start time
    sort(intervals.begin(), intervals.end());
    
    vector<vector<int>> merged;
    merged.push_back(intervals[0]); // Add the first interval
    
    for (int i = 1; i < intervals.size(); i++) {
        // merged.back() gets the last interval in our result list
        if (intervals[i][0] <= merged.back()[1]) {
            // Overlap! Extend the end of the last merged interval
            merged.back()[1] = max(merged.back()[1], intervals[i][1]);
        } else {
            // No overlap. Add it as a new interval
            merged.push_back(intervals[i]);
        }
    }
    
    return merged;
}
// Time: O(N log N) dominated by sorting. Space: O(1) (excluding output array)
```

**What's happening:**
After sorting by start time, overlapping intervals become adjacent. We maintain a result list and for each new interval, check if it overlaps with the last interval in our result. If yes, we merge them by extending the end time. If no, we add it as a new interval.

**Dry-Run: Merge `[[1,3], [2,6], [8,10], [15,18]]`**

| Step | Current Interval | Merged List | Action |
|------|------------------|-------------|--------|
| 1 | `[1,3]` | `[[1,3]]` | Add first |
| 2 | `[2,6]` | `[[1,6]]` | 2 ≤ 3, merge → max(3,6)=6 |
| 3 | `[8,10]` | `[[1,6], [8,10]]` | 8 > 6, no overlap |
| 4 | `[15,18]` | `[[1,6], [8,10], [15,18]]` | 15 > 10, no overlap |

**Production Version (Handles empty, single interval, unsorted):**
```cpp
vector<vector<int>> mergeProduction(vector<vector<int>>& intervals) {
    if (intervals.size() <= 1) return intervals;
    
    sort(intervals.begin(), intervals.end());
    
    vector<vector<int>> result;
    result.reserve(intervals.size());
    result.push_back(intervals[0]);
    
    for (int i = 1; i < intervals.size(); i++) {
        auto& last = result.back();
        if (intervals[i][0] <= last[1]) {
            last[1] = max(last[1], intervals[i][1]);
        } else {
            result.push_back(intervals[i]);
        }
    }
    
    return result;
}
// Time: O(N log N), Space: O(1) extra
```

---

### 4. Largest Number (Medium)

**Trigger:** Given an array of integers, arrange them such that they form the largest string number. (e.g., `[10, 2]` -> `"210"`)
**Intuition:** This problem tests your ability to write **Custom Comparators**. 
You can't just sort normally. Is `9` larger than `34`? Yes, alphabetically, but numerically `34` is larger.
The trick is to compare combinations: Given numbers `A` and `B`, compare the string concatenation `A+B` against `B+A`. If `A+B` is larger, `A` should come first!

```cpp
// Custom comparator for strings
bool compareConcat(const string& a, const string& b) {
    return a + b > b + a;
}

string largestNumber(vector<int>& nums) {
    // 1. Convert ints to strings
    vector<string> strNums;
    for (int num : nums) {
        strNums.push_back(to_string(num));
    }
    
    // 2. Sort using the custom comparator
    sort(strNums.begin(), strNums.end(), compareConcat);
    
    // 3. Edge Case: If the largest number is "0", the entire array is zeros.
    // We should return "0", not "000".
    if (strNums[0] == "0") return "0";
    
    // 4. Concatenate result
    string result = "";
    for (string& s : strNums) {
        result += s;
    }
    
    return result;
}
// Time: O(N log N * L) where L is string length. Space: O(N) for string vector.
```

**What's happening:**
We convert all numbers to strings and sort them using a custom comparator that compares concatenations. For strings "3" and "30", we compare "330" vs "303". Since "330" > "303", "3" comes before "30". This ensures the final concatenation forms the largest possible number.

**Dry-Run: Largest Number from `[3, 30, 34, 5, 9]`**

| Step | String Array | Comparison | Result |
|------|--------------|------------|--------|
| 1 | `["3", "30", "34", "5", "9"]` | Initial | — |
| 2 | `["9", "5", "34", "3", "30"]` | Sorted by custom comparator | — |
| 3 | `"9534330"` | Concatenated | Largest number |

**Production Version (Handles leading zeros, empty input):**
```cpp
string largestNumberProduction(vector<int>& nums) {
    if (nums.empty()) return "0";
    
    vector<string> strNums;
    strNums.reserve(nums.size());
    for (int num : nums) {
        strNums.push_back(to_string(num));
    }
    
    sort(strNums.begin(), strNums.end(), [](const string& a, const string& b) {
        return a + b > b + a;
    });
    
    // Handle all zeros
    if (strNums[0] == "0") return "0";
    
    string result;
    size_t totalLen = 0;
    for (const auto& s : strNums) totalLen += s.size();
    result.reserve(totalLen);
    
    for (const auto& s : strNums) {
        result += s;
    }
    
    return result;
}
// Time: O(N log N * L), Space: O(N)
```

---

### 5. Meeting Rooms II (Medium) - BONUS

**Trigger:** Given an array of meeting time intervals, find the minimum number of conference rooms required.
**Intuition:** Sort meetings by start time. Use a min-heap to track end times of ongoing meetings. If the current meeting starts after the earliest meeting ends, reuse that room.

```cpp
int minMeetingRooms(vector<vector<int>>& intervals) {
    if (intervals.empty()) return 0;
    
    sort(intervals.begin(), intervals.end());
    
    priority_queue<int, vector<int>, greater<int>> minHeap;
    minHeap.push(intervals[0][1]);
    
    for (int i = 1; i < intervals.size(); i++) {
        // If current meeting starts after earliest meeting ends, reuse room
        if (intervals[i][0] >= minHeap.top()) {
            minHeap.pop();
        }
        minHeap.push(intervals[i][1]);
    }
    
    return minHeap.size();
}
// Time: O(N log N), Space: O(N)
```

**What's happening:**
We sort meetings by start time and use a min-heap to track end times. For each new meeting, we check if the earliest ending meeting has finished (top of heap ≤ current start). If yes, we reuse that room (pop from heap). Then we add the current meeting's end time. The heap size at the end is the minimum rooms needed.

---

### Quick Reference

| Problem | Key Insight | Time | Space | Pattern |
|---------|-------------|------|-------|---------|
| Sort Array | Merge Sort template | $O(N \log N)$ | $O(N)$ | Divide & Conquer |
| Sort Colors | 3 pointers, don't increment mid on swap with high | $O(N)$ | $O(1)$ | Three-way partition |
| Merge Intervals | Sort by start, compare with last merged | $O(N \log N)$ | $O(1)$ | Sort + Greedy |
| Largest Number | Compare A+B vs B+A | $O(N \log N \cdot L)$ | $O(N)$ | Custom comparator |
| Meeting Rooms II | Min-heap tracks end times | $O(N \log N)$ | $O(N)$ | Heap + Sort |
| Meeting Rooms | Sort by start, check consecutive | $O(N \log N)$ | $O(1)$ | Sort + Scan |

---

## Practice & Self-Check

### Predict the Output / Trace by Hand

**Q1. Dutch National Flag trace.** Run the chapter's `sortColors` on `[1, 2, 0, 2, 0, 1]`. Fill in `low`, `mid`, `high` and the array after every loop iteration. How many iterations and how many swaps happen?

**Q2. The "don't increment mid" rule.** A buggy version adds `mid++` inside the `else` branch (after swapping with `high`). What does the buggy version produce on `[1, 2, 0]`? What does the correct version produce?

**Q3. Merge Intervals with touching ends.** Run the chapter's `merge` on `[[1,4], [0,2], [3,5], [7,9], [9,10]]`. What is the sorted order, and what is the final merged list? Do `[7,9]` and `[9,10]` merge?

**Q4. Custom comparator.** What does `largestNumber` return for `[10, 2, 9, 39, 17]`? Give the sorted string order and justify each tricky pair with its `A+B` vs `B+A` comparison. What does it return for `[0, 0, 0]`?

**Q5. Heap trace.** Run `minMeetingRooms` on `[[0,30], [5,10], [15,20], [10,15]]`. Show the heap contents after each meeting is processed. What is returned?

### Coding Exercises

**E1 (Easy).** *Meeting Rooms.* Return `true` if one person can attend every meeting (no two meetings overlap). A meeting ending at `t` and another starting at `t` do **not** overlap.

```cpp
bool canAttendMeetings(vector<vector<int>>& intervals);
```

- `[[0,30], [5,10], [15,20]]` → `false`
- `[[7,10], [2,4]]` → `true`

**E2 (Easy–Medium).** *Insert Interval.* `intervals` is already sorted by start and non-overlapping. Insert `newInterval` and merge where necessary, in $O(N)$ (no re-sort).

```cpp
vector<vector<int>> insertInterval(const vector<vector<int>>& intervals, vector<int> newInterval);
```

- `intervals = [[1,3], [6,9]], newInterval = [2,5]` → `[[1,5], [6,9]]`
- `intervals = [[1,2], [3,5], [6,7], [8,10], [12,16]], newInterval = [4,8]` → `[[1,2], [3,10], [12,16]]`

**E3 (Medium).** *Non-overlapping Intervals.* Return the minimum number of intervals to remove so the rest do not overlap (touching at an endpoint is fine). Hint: sort by **end** time and greedily keep the interval that finishes earliest.

```cpp
int eraseOverlapIntervals(vector<vector<int>>& intervals);
```

- `[[1,2], [2,3], [3,4], [1,3]]` → `1`
- `[[1,2], [1,2], [1,2]]` → `2`

#### Dry-Run: Answers

**Q1.** 6 iterations, 4 swaps, final `[0, 0, 1, 1, 2, 2]`.

| Iter | nums[mid] | Action | Array after | low | mid | high |
|------|-----------|--------|-------------|-----|-----|------|
| start | — | — | `[1,2,0,2,0,1]` | 0 | 0 | 5 |
| 1 | 1 | mid++ | `[1,2,0,2,0,1]` | 0 | 1 | 5 |
| 2 | 2 | swap(1,5), high-- | `[1,1,0,2,0,2]` | 0 | 1 | 4 |
| 3 | 1 | mid++ | `[1,1,0,2,0,2]` | 0 | 2 | 4 |
| 4 | 0 | swap(0,2), low++, mid++ | `[0,1,1,2,0,2]` | 1 | 3 | 4 |
| 5 | 2 | swap(3,4), high-- | `[0,1,1,0,2,2]` | 1 | 3 | 3 |
| 6 | 0 | swap(1,3), low++, mid++ | `[0,0,1,1,2,2]` | 2 | 4 | 3 |

Loop ends because `mid = 4 > high = 3`. Notice iteration 5: the value swapped in from `high` was a `0`, and it was only handled correctly because `mid` stayed put.

**Q2.** Buggy: **`[1, 0, 2]`** (wrong). Correct: `[0, 1, 2]`.
- Both: `nums[0] = 1` → `mid = 1`.
- `nums[1] = 2` → `swap(nums[1], nums[2])` → `[1, 0, 2]`, `high = 1`.
- Buggy: `mid++` → `mid = 2 > high = 1`, loop exits; the `0` that was swapped in is never examined.
- Correct: `mid` stays 1; `nums[1] = 0` → `swap(nums[0], nums[1])` → `[0, 1, 2]`, `low = 1`, `mid = 2`; loop exits.

**Q3.** Sorted: `[[0,2], [1,4], [3,5], [7,9], [9,10]]`. Result: **`[[0,5], [7,10]]`** — yes, `[7,9]` and `[9,10]` merge because the test is `9 <= 9`.

| Current | Test vs last end | Merged list |
|---------|------------------|-------------|
| `[0,2]` | first | `[[0,2]]` |
| `[1,4]` | 1 <= 2 → merge, end = max(2,4) | `[[0,4]]` |
| `[3,5]` | 3 <= 4 → merge, end = max(4,5) | `[[0,5]]` |
| `[7,9]` | 7 > 5 → push | `[[0,5], [7,9]]` |
| `[9,10]` | 9 <= 9 → merge, end = 10 | `[[0,5], [7,10]]` |

**Q4.** Order `["9", "39", "2", "17", "10"]` → **`"93921710"`**. For `[0, 0, 0]` → **`"0"`** (the `strNums[0] == "0"` guard).

| Pair | A+B | B+A | Who goes first |
|------|-----|-----|----------------|
| 9 vs 39 | 939 | 399 | 9 |
| 39 vs 2 | 392 | 239 | 39 |
| 2 vs 17 | 217 | 172 | 2 |
| 17 vs 10 | 1710 | 1017 | 17 |

Plain numeric sorting would wrongly put 39 first; plain lexicographic sorting happens to work here but fails on cases like `[3, 30]` (`"330" > "303"`, so 3 must precede 30 even though `"3" < "30"`).

**Q5.** Returns **2**. After `sort`: `[[0,30], [5,10], [10,15], [15,20]]`.

| Meeting | start >= heap top? | Heap after (min first) |
|---------|--------------------|------------------------|
| `[0,30]` | initial push | `{30}` |
| `[5,10]` | 5 >= 30? no | `{10, 30}` |
| `[10,15]` | 10 >= 10? yes → pop 10 | `{15, 30}` |
| `[15,20]` | 15 >= 15? yes → pop 15 | `{20, 30}` |

The `>=` matters: a meeting that starts exactly when another ends can reuse its room.

**E1 — reference solution**

```cpp
bool canAttendMeetings(vector<vector<int>>& intervals) {
    sort(intervals.begin(), intervals.end());          // by start time
    for (size_t i = 1; i < intervals.size(); i++)
        if (intervals[i][0] < intervals[i - 1][1])      // strict: touching is OK
            return false;
    return true;
}
```

Time $O(N \log N)$, space $O(1)$ extra. After sorting, only neighbors can be the first overlap.

**E2 — reference solution**

```cpp
vector<vector<int>> insertInterval(const vector<vector<int>>& intervals, vector<int> newInterval) {
    vector<vector<int>> res;
    size_t i = 0, n = intervals.size();
    // 1. Intervals that end before newInterval starts
    while (i < n && intervals[i][1] < newInterval[0]) res.push_back(intervals[i++]);
    // 2. Overlapping intervals: absorb into newInterval
    while (i < n && intervals[i][0] <= newInterval[1]) {
        newInterval[0] = min(newInterval[0], intervals[i][0]);
        newInterval[1] = max(newInterval[1], intervals[i][1]);
        i++;
    }
    res.push_back(newInterval);
    // 3. Intervals that start after newInterval ends
    while (i < n) res.push_back(intervals[i++]);
    return res;
}
```

Time $O(N)$, space $O(N)$ for the output. Second example: `[1,2]` is copied; `[3,5]`, `[6,7]`, `[8,10]` all start at or before the growing end and are absorbed into `[3,10]`; `[12,16]` is copied.

**E3 — reference solution**

```cpp
int eraseOverlapIntervals(vector<vector<int>>& intervals) {
    if (intervals.empty()) return 0;
    sort(intervals.begin(), intervals.end(),
         [](const vector<int>& a, const vector<int>& b) { return a[1] < b[1]; });
    int removed = 0;
    int lastEnd = intervals[0][1];
    for (size_t i = 1; i < intervals.size(); i++) {
        if (intervals[i][0] < lastEnd) removed++;   // overlaps the kept one: drop it
        else lastEnd = intervals[i][1];             // keep it
    }
    return removed;
}
```

Time $O(N \log N)$, space $O(1)$ extra. Keeping the interval that ends earliest leaves the most room for the rest (exchange argument). First example sorted by end: `[1,2]`, then `[2,3]` and `[1,3]` (tied at end 3, either order), then `[3,4]`. Keep `[1,2]` (lastEnd = 2); whichever of the tied pair comes first, `[2,3]` is kept (2 >= its predecessor's end) and `[1,3]` is dropped (1 < 2 or 1 < 3); `[3,4]` is kept → 1 removal.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Interview Problems Walkthrough**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **interview problems sorting** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.


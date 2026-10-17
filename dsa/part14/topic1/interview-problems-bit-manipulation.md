# Part 14, Topic 1: Bit Manipulation
## Interview Problems Walkthrough

Master the XOR trick and the `n & (n-1)` trick to solve these quickly.

---

## Problem Classification Table

| # | Problem | Bit Technique | Key Insight | Difficulty |
|---|---|---|---|---|
| 1 | Single Number | XOR cancellation | Pairs cancel to 0, lone survives | Easy |
| 2 | Number of 1 Bits | Brian Kernighan | `n & (n-1)` clears lowest set bit | Easy |
| 3 | Counting Bits | DP + bit shift | `dp[i] = dp[i>>1] + (i&1)` | Easy |
| 4 | Reverse Bits | Bit extraction loop | Extract, shift, OR, repeat 32x | Easy |
| 5 | Missing Number | XOR or Math sum | XOR 0..N with array → lone = missing | Easy |
| 6 | Sum of Two Integers | XOR + AND carry | XOR = sum without carry, AND<<1 = carry | Medium |

---

## Solution Approach Comparison

| Approach | Time | Space | When to Use |
|---|---|---|---|
| Bit Manipulation | O(N) or O(1) | O(1) | When XOR/AND tricks apply |
| Hash Set | O(N) | O(N) | When bit tricks don't apply |
| Math (sum formula) | O(N) | O(1) | When overflow isn't a concern |
| Brute Force | O(N^2) | O(1) | Never in interviews |

---

## Step-by-Step Walkthroughs

### 1. Single Number (Easy)

**Trigger:** Every element appears twice except one. Find it.

**Step-by-Step Walkthrough:**

**Intuition:** XOR all elements together. The duplicates cancel out to 0. `res ^= num`.

**Visual:**
```
nums = [4, 1, 2, 1, 2]

Binary representations:
  4 = 100
  1 = 001
  2 = 010
  1 = 001
  2 = 010

XOR all together:
  100  (4)
^ 001  (1)
------
  101  (5)
^ 010  (2)
------
  111  (7)
^ 001  (1)
------
  110  (6)
^ 010  (2)
------
  100  (4) ← the unique number!
```

**Dry-Run Table:**

| Step | num | res (before) | res ^ num | res (after) |
|---|---|---|---|---|
| 1 | 4 | 0 | 0 ^ 4 | 4 |
| 2 | 1 | 4 | 4 ^ 1 | 5 |
| 3 | 2 | 5 | 5 ^ 2 | 7 |
| 4 | 1 | 7 | 7 ^ 1 | 6 |
| 5 | 2 | 6 | 6 ^ 2 | 4 |

```cpp
int singleNumber(vector<int>& nums) {
    int res = 0;
    for (int num : nums) {
        res ^= num; 
    }
    return res;
}
```

**What's happening:**
```cpp
int res = 0;
//  ^^^    ^
//  |      └── Start with 0 (identity for XOR)
//  └── Result accumulator

for (int num : nums) {
    res ^= num;
    //  ^^    ^^^
    //  |     └── Current array element
    //  └── XOR: pairs cancel to 0, lone number survives
}
return res;
// Pairs: (a ^ a) = 0
// Lone:  (0 ^ single) = single
```

---

### 2. Number of 1 Bits (Hamming Weight) (Easy)

**Trigger:** Count the number of '1' bits in an integer.

**Step-by-Step Walkthrough:**

**Intuition:** Use Brian Kernighan's algorithm. `while(n) { n = n & (n-1); count++; }`.

**Visual: n = 13 (1101)**
```
Iteration 1:
  n = 1101 (13)
  n-1 = 1100 (12)
  n & (n-1) = 1100 (12)
  count = 1

Iteration 2:
  n = 1100 (12)
  n-1 = 1011 (11)
  n & (n-1) = 1000 (8)
  count = 2

Iteration 3:
  n = 1000 (8)
  n-1 = 0111 (7)
  n & (n-1) = 0000 (0)
  count = 3

n = 0 → loop ends. Answer: 3
```

**Dry-Run Table:**

| Iteration | n (binary) | n-1 (binary) | n & (n-1) | count |
|---|---|---|---|---|
| 1 | 1101 | 1100 | 1100 | 1 |
| 2 | 1100 | 1011 | 1000 | 2 |
| 3 | 1000 | 0111 | 0000 | 3 |

```cpp
int countSetBits(int n) {
    int count = 0;
    while (n) {
        n = n & (n - 1); // Clears the lowest 1 bit
        count++;
    }
    return count;
}
```

**What's happening:**
```cpp
while (n) {
    n = n & (n - 1);
    //  ^    ^   ^
    //  |    |   └── n-1 flips lowest 1 to 0
    //  |    └── AND clears that bit
    //  └── One fewer 1-bit each iteration
    count++;
    // Each iteration clears exactly one set bit
}
// Loop ends when n=0 (all 1-bits cleared)
// count = total number of 1-bits
```

---

### 3. Counting Bits (Easy)

**Trigger:** Return an array counting the 1 bits for every number from 0 to n.

**Step-by-Step Walkthrough:**

**Intuition:** You could loop $N$ times and call the $O(1)$ function from Problem 2, resulting in an $O(N \log N)$ overall time.
*Better DP Solution:* The number of set bits in `x` is exactly the number of set bits in `x / 2` (which is `x >> 1`), plus 1 if `x` is odd!
`dp[i] = dp[i >> 1] + (i & 1);`

**Visual:**
```
i=0: dp[0] = 0                    → 0000 → 0 bits
i=1: dp[1] = dp[0] + (1&1) = 1   → 0001 → 1 bit
i=2: dp[2] = dp[1] + (2&1) = 1   → 0010 → 1 bit
i=3: dp[3] = dp[1] + (3&1) = 2   → 0011 → 2 bits
i=4: dp[4] = dp[2] + (4&1) = 1   → 0100 → 1 bit
i=5: dp[5] = dp[2] + (5&1) = 2   → 0101 → 2 bits
```

**Dry-Run Table:**

| i | i >> 1 | i & 1 | dp[i>>1] | dp[i] |
|---|---|---|---|---|
| 0 | 0 | 0 | — | 0 |
| 1 | 0 | 1 | 0 | 1 |
| 2 | 1 | 0 | 1 | 1 |
| 3 | 1 | 1 | 1 | 2 |
| 4 | 2 | 0 | 1 | 1 |
| 5 | 2 | 1 | 1 | 2 |

```cpp
vector<int> countBits(int n) {
    vector<int> dp(n + 1, 0);
    for (int i = 1; i <= n; i++) {
        dp[i] = dp[i >> 1] + (i & 1);
    }
    return dp;
}
```

**What's happening:**
```cpp
dp[i] = dp[i >> 1] + (i & 1);
//  ^^      ^^^^^      ^^^^^
//  |       |          └── Is i odd? (last bit = 1?)
//  |       └── i / 2 (right shift = divide by 2)
//  └── Set bits in i = set bits in i/2 + (1 if odd, 0 if even)
//
// Example: i=5 (101)
// dp[5] = dp[2] + 1 = 1 + 1 = 2
// Because 5 = 101 has 2 set bits, and 2 = 10 has 1 set bit
```

---

### 4. Reverse Bits (Easy)

**Trigger:** Reverse the 32 bits of an unsigned integer.

**Step-by-Step Walkthrough:**

**Intuition:** Maintain a `result = 0`. Loop 32 times.
In each iteration:
1. Extract the rightmost bit of `n` using `bit = (n & 1)`.
2. Shift `result` to the left by 1 to make room.
3. OR `result` with the extracted bit `result = result | bit`.
4. Shift `n` to the right by 1.

**Visual: n = 13 (00000000000000000000000000001101)**
```
Step 1: bit = 1, result = 00...001, n = 00...0110
Step 2: bit = 0, result = 00...010, n = 00...0011
Step 3: bit = 1, result = 00...101, n = 00...0001
Step 4: bit = 1, result = 00...1011, n = 00...0000
... remaining 28 iterations all extract 0

Final result: 10110000000000000000000000000000 (reversed)
```

**Dry-Run Table (first 8 bits):**

| Step | n & 1 | result (before) | result << 1 | result \| bit | n >> 1 |
|---|---|---|---|---|---|
| 1 | 1 | 00000000 | 00000000 | 00000001 | 00000110 |
| 2 | 0 | 00000001 | 00000010 | 00000010 | 00000011 |
| 3 | 1 | 00000010 | 00000100 | 00000101 | 00000001 |
| 4 | 1 | 00000101 | 00001010 | 00001011 | 00000000 |
| 5-32 | 0 | ... | ... | ... | ... |

```cpp
uint32_t reverseBits(uint32_t n) {
    uint32_t result = 0;
    for (int i = 0; i < 32; i++) {
        result = (result << 1) | (n & 1);
        n >>= 1;
    }
    return result;
}
```

**What's happening:**
```cpp
for (int i = 0; i < 32; i++) {
    result = (result << 1) | (n & 1);
    //  ^^^^^^     ^^^^^         ^^^^^
    //  |          |             └── Extract rightmost bit of n
    //  |             └── Make room: shift result left by 1
    //  └── Place extracted bit at the end
    n >>= 1;
    //  ^^
    //  └── Discard the bit we just extracted
}
// After 32 iterations, all bits are in reversed order
```

---

### 5. Missing Number (Easy)

**Trigger:** Array containing $n$ distinct numbers in range `[0, n]`. Find the missing one.

**Step-by-Step Walkthrough:**

**Intuition:** 
*Math approach:* Compute the expected sum using Gauss's formula $\frac{N(N+1)}{2}$. Subtract all numbers in the array. The remainder is the missing number.
*Bit approach (prevents overflow):* XOR the numbers `0` through `N` with all the actual values in the array. The pairs will cancel out, leaving only the missing number.

**Visual (XOR approach): nums = [3, 0, 1], n = 3**
```
XOR 0..3 with array:
  0 ^ 3 ^ 0 ^ 1 ^ 1 ^ 2 ^ 3
= (0 ^ 0) ^ (1 ^ 1) ^ (3 ^ 3) ^ 2
= 0 ^ 0 ^ 0 ^ 2
= 2

Missing number: 2
```

**Dry-Run Table:**

| Step | num | res (before) | res ^ num | res (after) |
|---|---|---|---|---|
| 0 | — | 0 (init) | — | 0 |
| 1 | 3 | 0 | 0 ^ 3 | 3 |
| 2 | 0 | 3 | 3 ^ 0 | 3 |
| 3 | 1 | 3 | 3 ^ 1 | 2 |
| 4 | 2 | 2 | 2 ^ 2 | 0 |
| 5 | 3 | 0 | 0 ^ 3 | 3 |

Wait, let me redo this properly: XOR of i from 0..n AND nums array.

```
Expected XOR: 0 ^ 1 ^ 2 ^ 3 = 0
Array XOR: 3 ^ 0 ^ 1 = 2
Result: 0 ^ 2 = 2 ← missing number!
```

```cpp
int missingNumber(vector<int>& nums) {
    int result = nums.size();
    for (int i = 0; i < nums.size(); i++) {
        result ^= i ^ nums[i];
    }
    return result;
}
```

**What's happening:**
```cpp
int result = nums.size();
//  ^^^^^^     ^^^^^^^^^^^^^
//  |          └── Start with n (the last number in range)
//  └── Accumulator for XOR

for (int i = 0; i < nums.size(); i++) {
    result ^= i ^ nums[i];
    //  ^^      ^    ^^^^^^^
    //  |       |    └── Actual value from array
    //  |       └── Expected value (index)
    //  └── XOR both: pairs cancel, missing survives
}
// All pairs (i, nums[i]) cancel except the missing number
return result;
```

---

### 6. Sum of Two Integers (Medium)

**Trigger:** Calculate `a + b` WITHOUT using the `+` or `-` operators.

**Step-by-Step Walkthrough:**

**Intuition:** How does addition work in hardware? 
If you add bits without worrying about carrying the 1, it's just XOR! (`0+1=1`, `1+0=1`, `1+1=0`).
How do you calculate the carry? The carry only happens when both bits are 1, which is an AND operation `(a & b)`. Because the carry shifts over to the next column, you must left-shift the result by 1: `(a & b) << 1`.
Repeat this process until there is no carry left.

**Visual: a = 5 (0101), b = 3 (0011)**
```
Iteration 1:
  XOR:  0101 ^ 0011 = 0110 (sum without carry)
  AND:  0101 & 0011 = 0001
  Carry: 0001 << 1 = 0010

Iteration 2:
  XOR:  0110 ^ 0010 = 0100 (sum without carry)
  AND:  0110 & 0010 = 0010
  Carry: 0010 << 1 = 0100

Iteration 3:
  XOR:  0100 ^ 0100 = 0000 (sum without carry)
  AND:  0100 & 0100 = 0100
  Carry: 0100 << 1 = 1000

Iteration 4:
  XOR:  0000 ^ 1000 = 1000 (sum without carry)
  AND:  0000 & 1000 = 0000
  Carry: 0000 << 1 = 0000

Carry = 0 → done! Result: 1000 = 8 ✓ (5+3=8)
```

**Dry-Run Table:**

| Iteration | a (XOR) | b (carry) | a & b | carry << 1 |
|---|---|---|---|---|
| 1 | 0110 | 0010 | 0001 | 0010 |
| 2 | 0100 | 0100 | 0010 | 0100 |
| 3 | 0000 | 1000 | 0000 | 0000 |

```cpp
int getSum(int a, int b) {
    while (b != 0) {
        // Calculate carry (cast to unsigned to prevent C++ negative shift errors)
        int carry = (unsigned int)(a & b) << 1;
        
        // Calculate sum without carry
        a = a ^ b;
        
        // Now add the carry in the next iteration
        b = carry;
    }
    return a;
}
```

**What's happening:**
```cpp
while (b != 0) {
    //  ^^^^^^^
    //  └── Keep going until there's no carry left
    
    int carry = (unsigned int)(a & b) << 1;
    //  ^^^^^^     ^^^^^^^^^^^^^^^^^  ^^^^^
    //  |          |                  └── Shift carry to next bit position
    //  |          └── AND finds where both bits are 1 (carry positions)
    //  └── Carry to add in next iteration
    
    a = a ^ b;
    //  ^    ^
    //  |    └── Current b (before carry)
    //  └── XOR = sum without carry (1+1=0, 1+0=1, 0+0=0)
    
    b = carry;
    //  ^^^^^^
    //  └── Now try to add the carry
}
return a;
// When carry=0, a holds the final sum
```

---

## Quick Reference

| Problem | Bit Technique | Time | Space |
|---|---|---|---|
| Single Number | XOR cancellation | O(N) | O(1) |
| Number of 1 Bits | Brian Kernighan | O(k) | O(1) |
| Counting Bits | DP + bit shift | O(N) | O(N) |
| Reverse Bits | Extract-shift-OR loop | O(1) | O(1) |
| Missing Number | XOR 0..N with array | O(N) | O(1) |
| Sum of Two Integers | XOR + AND carry | O(1) | O(1) |

### Key Bit Manipulation Triggers

| Trigger Phrase | Technique | Action |
|---|---|---|
| "Every element appears twice" | XOR cancellation | XOR all elements |
| "Count 1 bits" | Brian Kernighan | `n & (n-1)` loop |
| "Without + or - operators" | XOR + AND carry | Simulate hardware addition |
| "Reverse bits" | Extract-shift-OR | Loop 32 times |
| "Missing number" | XOR range with array | Pairs cancel, missing survives |
| "Is power of two" | `n & (n-1)` | Single 1-bit → result is 0 |

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Interview Problems Walkthrough**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **interview problems bit manipulation** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.


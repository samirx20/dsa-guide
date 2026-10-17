# Part 14, Topic 1: Bit Manipulation
## Chapter 1: Operations and Tricks

At the lowest level, all data is binary (0s and 1s). Bit manipulation allows you to process information directly at the hardware level, resulting in blazing-fast, $O(1)$ space algorithms.

---

## 1. The Core Operators

- **AND (`&`)**: Returns 1 only if BOTH bits are 1.
- **OR (`|`)**: Returns 1 if EITHER bit is 1.
- **XOR (`^`)**: Returns 1 if the bits are DIFFERENT. (0^1=1, 1^0=1, 0^0=0, 1^1=0).
- **NOT (`~`)**: Inverts all bits (0 becomes 1, 1 becomes 0).
- **Left Shift (`<<`)**: Shifts all bits to the left, filling with 0s. Mathematically, `x << y` is equivalent to $x \times 2^y$.
- **Right Shift (`>>`)**: Shifts all bits to the right. Mathematically, `x >> y` is equivalent to $\lfloor x / 2^y \rfloor$.

### Binary Representation Walkthrough

```
Number: 13  → Binary: 1101
Number: 7   → Binary: 0111

AND (13 & 7):
  1101
& 0111
------
  0101 = 5

OR (13 | 7):
  1101
| 0111
------
  1111 = 15

XOR (13 ^ 7):
  1101
^ 0111
------
  1010 = 10
```

### Left and Right Shift Visualization

```
Left Shift (5 << 2 = 20):
  5 = 0000 0101
  << 2 shifts left by 2:
  0001 0100 = 20  (5 × 4 = 20)

Right Shift (20 >> 2 = 5):
  20 = 0001 0100
  >> 2 shifts right by 2:
  0000 0101 = 5  (20 / 4 = 5)
```

---

## 2. The Mighty XOR Trick

XOR has two magical mathematical properties that appear constantly in interviews:

1. **Anything XOR'd with itself is 0:** `A ^ A = 0`
2. **Anything XOR'd with 0 is itself:** `A ^ 0 = A`
3. **Order doesn't matter (Associative/Commutative):** `A ^ B ^ A = (A ^ A) ^ B = 0 ^ B = B`

### XOR Walkthrough

```
Example: 5 ^ 3 ^ 5

Step 1: 5 ^ 3
  101  (5)
^ 011  (3)
------
  110  (6)

Step 2: 6 ^ 5
  110  (6)
^ 101  (5)
------
  011  (3)

Result: 3 (the 5s cancelled out!)
```

**The Classic Problem: Single Number**
Given an array where every element appears twice except for one, find that single one.
*Brute force:* Hash Map ($O(N)$ space).
*Bit Manipulation:* Initialize `result = 0`. XOR `result` with every number in the array. All the pairs will XOR themselves out to `0`. The only number remaining in `result` will be the single number! $O(1)$ space!

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
    //  └── XOR with result: pairs cancel to 0, lone number survives
}
return res;
// Pairs cancel out: (a ^ a) = 0
// Lone number: (0 ^ single) = single
```

### XOR Dry-Run Table

| Step | num | res (before) | res ^ num | res (after) |
|---|---|---|---|---|
| 1 | 4 | 0 | 0 ^ 4 | 4 |
| 2 | 1 | 4 | 4 ^ 1 | 5 |
| 3 | 2 | 5 | 5 ^ 2 | 7 |
| 4 | 1 | 7 | 7 ^ 1 | 6 |
| 5 | 2 | 6 | 6 ^ 2 | 4 |

Result: 4 (the unique number)

---

## 3. Bit Masking (Checking, Setting, Clearing)

You can use the bits of an integer as a lightweight array of booleans (a Bit Mask).

### The Three Operations

```
Number:  n = 12 = 1100
Position:   3 2 1 0  (bit positions, right to left)

Check bit 2:  (n & (1 << 2))  →  (1100 & 0100) = 0100 ≠ 0 → SET ✓
Check bit 1:  (n & (1 << 1))  →  (1100 & 0010) = 0000 = 0 → NOT SET ✗

Set bit 1:    n = n | (1 << 1)  →  1100 | 0010 = 1110 = 14
Clear bit 3:  n = n & ~(1 << 3) → 1100 & 0111 = 0100 = 4
```

### Code for Each Operation

- **Check if the $i^{th}$ bit is set (1):**
  Create a mask with a 1 at the $i^{th}$ position: `(1 << i)`. 
  Use AND: `if ((n & (1 << i)) != 0)`
- **Set the $i^{th}$ bit to 1:**
  Use OR: `n = n | (1 << i)`
- **Clear the $i^{th}$ bit to 0:**
  Use AND with an inverted mask: `n = n & ~(1 << i)`

### Dry-Run: Bit Masking

```
n = 12 (1100), i = 1

Step 1: Create mask
  1 << 1 = 0010

Step 2: Check
  n & mask = 1100 & 0010 = 0000 → bit 1 is NOT set

Step 3: Set bit 1
  n = n | mask = 1100 | 0010 = 1110 (14)

Step 4: Clear bit 3
  mask = ~(1 << 3) = ~1000 = 0111
  n = n & mask = 1110 & 0111 = 0110 (6)
```

| Operation | Input n | Mask | Result |
|---|---|---|---|
| Check bit 2 | 1100 | 0100 | 0100 (set) |
| Check bit 1 | 1100 | 0010 | 0000 (not set) |
| Set bit 1 | 1100 | 0010 | 1110 (14) |
| Clear bit 3 | 1110 | 0111 | 0110 (6) |

---

## 4. The Brian Kernighan Algorithm: `n & (n - 1)`

This is the most famous bit trick. What happens when you subtract 1 from a binary number?
It flips the lowest set bit (the rightmost 1) to a 0, and flips all the 0s to its right into 1s.
For example: `12` is `1100`. `12 - 1 = 11` is `1011`.

### Binary Walkthrough: n & (n - 1)

```
n = 12 = 1100
n - 1 = 11 = 1011

1100  (12)
& 1011  (11)
------
  1000  (8)

The rightmost 1 vanished!
```

**The Trick:** 
If you bitwise AND a number `n` with `(n - 1)`, **it clears the lowest set bit.**
`1100 & 1011 = 1000` (The rightmost 1 vanished!)

### Use Case 1: Counting set bits (Number of 1 Bits)

Instead of shifting 32 times, you can just do `n = n & (n - 1)` until `n` is 0. The number of times the loop runs is exactly the number of 1 bits.

**Dry-Run Table: n = 13 (1101)**

| Iteration | n (binary) | n-1 (binary) | n & (n-1) | count |
|---|---|---|---|---|
| 1 | 1101 | 1100 | 1100 | 1 |
| 2 | 1100 | 1011 | 1000 | 2 |
| 3 | 1000 | 0111 | 0000 | 3 |

Answer: 3 set bits

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
    //  |    |   └── n minus 1 flips the lowest 1 to 0
    //  |    └── AND clears that lowest set bit
    //  └── Assign back: one fewer 1-bit each iteration
    count++;
    // Count how many times we cleared a bit = number of 1s
}
// Loop ends when n = 0 (all 1-bits cleared)
```

### Use Case 2: Checking if a number is a Power of Two

Powers of two in binary are exactly a single 1 followed by 0s (`10`, `100`, `1000`).
If a number is a power of two, clearing its *only* set bit should make it 0!

```cpp
bool isPowerOfTwo(int n) {
    return n > 0 && (n & (n - 1)) == 0;
}
```

**What's happening:**
```cpp
return n > 0 && (n & (n - 1)) == 0;
//     ^^^       ^^^^^^^^^^^   ^
//     |         |             └── If result is 0, only 1 bit was set
//     |         └── Brian Kernighan: clears lowest set bit
//     └── Must be positive (0 and negatives aren't powers of 2)
//
// Powers of 2: 1(1), 2(10), 4(100), 8(1000)
// Non-powers:  3(11), 5(101), 6(110), 7(111)
// 3 & 2 = 10 ≠ 0 → NOT power of 2
// 4 & 3 = 000 = 0 → IS power of 2
```

---

## 5. Additional Bit Tricks

### Swap Two Numbers Without Temp

```cpp
a = a ^ b;  // a now holds a^b
b = a ^ b;  // b = (a^b) ^ b = a
a = a ^ b;  // a = (a^b) ^ a = b
```

### Find the Single Number (One Unique, Rest Appear Thrice)

Use a bit-counting approach. For each bit position, count how many numbers have that bit set. If the count is not divisible by 3, the unique number has that bit set.

```cpp
int singleNumber(vector<int>& nums) {
    int result = 0;
    for (int i = 0; i < 32; i++) {
        int count = 0;
        for (int num : nums) {
            count += (num >> i) & 1;
        }
        if (count % 3 != 0) {
            result |= (1 << i);
        }
    }
    return result;
}
```

### Bit Manipulation Quick Lookup

| Operation | Code | Time |
|---|---|---|
| Check if even | `(n & 1) == 0` | O(1) |
| Divide by 2 | `n >> 1` | O(1) |
| Multiply by 2 | `n << 1` | O(1) |
| Check bit i | `(n >> i) & 1` | O(1) |
| Set bit i | `n \| (1 << i)` | O(1) |
| Clear bit i | `n & ~(1 << i)` | O(1) |
| Toggle bit i | `n ^ (1 << i)` | O(1) |
| Lowest set bit | `n & (-n)` | O(1) |
| Clear lowest set | `n & (n - 1)` | O(1) |
| Count set bits | Brian Kernighan loop | O(k) where k = set bits |
| Is power of two | `n > 0 && (n & (n-1)) == 0` | O(1) |

---

## Quick Reference

| Concept | Formula/Pattern | Time | Space |
|---|---|---|---|
| **XOR Trick** | `A ^ A = 0`, `A ^ 0 = A` | O(1) | O(1) |
| **Bit Masking** | Check: `(n & (1<<i)) != 0` | O(1) | O(1) |
| **Set Bit** | `n \| (1 << i)` | O(1) | O(1) |
| **Clear Bit** | `n & ~(1 << i)` | O(1) | O(1) |
| **Brian Kernighan** | `n & (n-1)` clears lowest set bit | O(k) | O(1) |
| **Power of Two** | `n > 0 && (n & (n-1)) == 0` | O(1) | O(1) |
| **Count Bits** | Brian Kernighan loop until 0 | O(k) | O(1) |
| **Left Shift** | `n << k` = n × 2^k | O(1) | O(1) |
| **Right Shift** | `n >> k` = n / 2^k | O(1) | O(1) |
| **Swap XOR** | `a^=b; b^=a; a^=b;` | O(1) | O(1) |
| **Lowest Set Bit** | `n & (-n)` | O(1) | O(1) |

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Chapter 1: Operations and Tricks**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **chapter1 bit manipulation** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.


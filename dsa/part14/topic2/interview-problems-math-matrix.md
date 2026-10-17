# Part 14, Topic 2: Math & Matrix Tricks
## Interview Problems Walkthrough

These matrix problems test your ability to handle strict loops and boundary conditions without causing segfaults.

---

## Number Theory Visualizations

### Digit Sum of Squares — The Cycle

When you repeatedly sum the squares of digits, you either reach 1 (happy) or enter a cycle.

```
n = 7 → 49 → 97 → 130 → 10 → 1 (HAPPY!)

n = 4 → 16 → 37 → 58 → 89 → 145 → 42 → 20 → 4 (CYCLE!)
```

### Modulo Arithmetic — Modular Exponentiation

```
(a × b) mod m = [(a mod m) × (b mod m)] mod m

Example: (2^10) mod 1000
= (1024) mod 1000
= 24

Using repeated squaring:
2^1  = 2       mod 1000 = 2
2^2  = 4       mod 1000 = 4
2^4  = 16      mod 1000 = 16
2^8  = 256     mod 1000 = 256
2^10 = 2^8 × 2^2 = 256 × 4 = 1024 mod 1000 = 24
```

### GCD and LCM Visual

```
GCD(48, 18):
48 = 2^4 × 3^1
18 = 2^1 × 3^2
GCD = 2^1 × 3^1 = 6

LCM(48, 18) = (48 × 18) / GCD(48, 18)
            = 864 / 6
            = 144

Euclidean algorithm:
GCD(48, 18) → GCD(18, 12) → GCD(12, 6) → GCD(6, 0) = 6
```

---

### 1. Happy Number (Easy)
**Trigger:** Replace a number with the sum of the squares of its digits. If it reaches 1, it's happy. If it loops endlessly, it's not.
**Intuition:** This is secretly a Linked List Cycle problem! 
You can use a Hash Set to track numbers you've seen. Or, you can use Floyd's Tortoise and Hare algorithm: `slow = next(n)`, `fast = next(next(n))`. If `slow == fast`, check if it's 1.

```cpp
// Approach 1: Hash Set
bool isHappy(int n) {
    unordered_set<int> seen;
    while (n != 1) {
        if (seen.count(n)) return false;
        seen.insert(n);
        int sum = 0;
        while (n > 0) {
            sum += (n % 10) * (n % 10);
            n /= 10;
        }
        n = sum;
    }
    return true;
}

// Approach 2: Floyd's Cycle Detection (O(1) space)
int digitSquareSum(int n) {
    int sum = 0;
    while (n > 0) {
        sum += (n % 10) * (n % 10);
        n /= 10;
    }
    return sum;
}

bool isHappy(int n) {
    int slow = n, fast = digitSquareSum(n);
    while (fast != slow) {
        slow = digitSquareSum(slow);
        fast = digitSquareSum(digitSquareSum(fast));
    }
    return slow == 1;
}
```

**What's happening (n = 7):**
```cpp
// Approach 2 walkthrough:
//
// slow=7, fast=digitSquareSum(7)=49
//
// Step 1: slow = digitSquareSum(7) = 49
//         fast = digitSquareSum(digitSquareSum(49)) = digitSquareSum(97) = 130
//
// Step 2: slow = digitSquareSum(49) = 97
//         fast = digitSquareSum(digitSquareSum(130)) = digitSquareSum(10) = 1
//
// Step 3: slow = digitSquareSum(97) = 130
//         fast = digitSquareSum(digitSquareSum(1)) = digitSquareSum(1) = 1
//
// Step 4: slow = digitSquareSum(130) = 10
//         fast = digitSquareSum(digitSquareSum(1)) = 1
//
// Step 5: slow = digitSquareSum(10) = 1
//         fast = 1
//         slow == fast → break
//
// Return slow == 1 → TRUE (happy!)
```

**Dry Run Table — n = 7:**

| Step | slow | fast | slow.next | fast.next | Equal? |
|------|------|------|-----------|-----------|--------|
| 0 | 7 | 49 | 49 | 130 | No |
| 1 | 49 | 130 | 97 | 1 | No |
| 2 | 97 | 1 | 130 | 1 | No |
| 3 | 130 | 1 | 10 | 1 | No |
| 4 | 10 | 1 | 1 | 1 | Yes! |

**Dry Run Table — n = 4 (unhappy):**

| Step | slow | fast | slow.next | fast.next | Equal? |
|------|------|------|-----------|-----------|--------|
| 0 | 4 | 16 | 16 | 58 | No |
| 1 | 16 | 58 | 37 | 89 | No |
| 2 | 37 | 89 | 58 | 145 | No |
| 3 | 58 | 145 | 89 | 42 | No |
| 4 | 89 | 42 | 145 | 20 | No |
| 5 | 145 | 20 | 42 | 4 | No |
| 6 | 42 | 4 | 20 | 16 | No |
| 7 | 20 | 16 | 4 | 58 | No |
| ... | cycle continues... | | | | |

---

### 2. Rotate Image (Medium)
**Trigger:** Rotate a 2D matrix 90 degrees clockwise in-place.
**Intuition:** Transpose the matrix (`swap(matrix[i][j], matrix[j][i])`), then reverse each row.
*(See Chapter 1 for the exact code).*

**Visual — 90° Clockwise Rotation:**
```
Original:        Transpose:       Reverse Rows:
1 2 3            1 4 7            7 4 1
4 5 6            2 5 8            8 5 2
7 8 9            3 6 9            9 6 3

90° clockwise = Transpose + Reverse each row
```

**Step-by-step for cell (0,1) = 2:**
```
Transpose: swap(matrix[0][1], matrix[1][0]) → 2 ↔ 4
After transpose row 0: [1, 4, 7]
After reverse row 0: [7, 4, 1]
```

---

### 3. Spiral Matrix (Medium)
**Trigger:** Return all elements of an $M \times N$ matrix in spiral order.
**Intuition:** Maintain four boundary pointers: `top`, `bottom`, `left`, `right`.
Use four `for` loops inside a `while (top <= bottom && left <= right)` loop.
1. Move Left -> Right along the `top` row. `top++`.
2. Move Top -> Bottom along the `right` column. `right--`.
3. Move Right -> Left along the `bottom` row. `bottom--`. *(Ensure `top <= bottom` before this loop!)*
4. Move Bottom -> Top along the `left` column. `left++`. *(Ensure `left <= right` before this loop!)*

```cpp
vector<int> spiralOrder(vector<vector<int>>& matrix) {
    vector<int> result;
    if (matrix.empty()) return result;
    
    int top = 0, bottom = matrix.size() - 1;
    int left = 0, right = matrix[0].size() - 1;
    
    while (top <= bottom && left <= right) {
        // Left → Right
        for (int j = left; j <= right; j++)
            result.push_back(matrix[top][j]);
        top++;
        
        // Top → Bottom
        for (int i = top; i <= bottom; i++)
            result.push_back(matrix[i][right]);
        right--;
        
        // Right → Left (check boundary!)
        if (top <= bottom) {
            for (int j = right; j >= left; j--)
                result.push_back(matrix[bottom][j]);
            bottom--;
        }
        
        // Bottom → Top (check boundary!)
        if (left <= right) {
            for (int i = bottom; i >= top; i--)
                result.push_back(matrix[i][left]);
            left++;
        }
    }
    return result;
}
```

**What's happening:**
```cpp
// Matrix:
// 1  2  3  4
// 5  6  7  8
// 9  10 11 12
//
// Round 1: top=0, bottom=2, left=0, right=3
//   Left→Right: 1,2,3,4   → top=1
//   Top→Bottom: 8,12      → right=2
//   Right→Left: 11,10,9   → bottom=1
//   Bottom→Top: 5         → left=1
//
// Round 2: top=1, bottom=1, left=1, right=2
//   Left→Right: 6,7       → top=2
//   top>bottom → stop
//
// Result: [1,2,3,4,8,12,11,10,9,5,6,7]
```

**Dry Run Table — 3×4 Matrix:**

| Round | top | bottom | left | right | Direction | Elements Added |
|-------|-----|--------|------|-------|-----------|----------------|
| 1 | 0 | 2 | 0 | 3 | L→R | 1,2,3,4 |
| 1 | 1 | 2 | 0 | 3 | T→B | 8,12 |
| 1 | 1 | 2 | 0 | 2 | R→L | 11,10,9 |
| 1 | 1 | 1 | 1 | 2 | B→T | 5 |
| 2 | 1 | 1 | 1 | 2 | L→R | 6,7 |
| 2 | 2 | 1 | 1 | 2 | T→B | (top>bottom, stop) |

---

### 4. Set Matrix Zeroes (Medium)
**Trigger:** If an element is 0, set its entire row and column to 0 in-place.
**Intuition:**
*Brute force:* $O(M \times N)$ extra space.
*Optimal ($O(1)$ space):* Use the first row and first column of the matrix itself to store flags indicating whether that row/col should be zeroed!
1. Scan the matrix. If `matrix[r][c] == 0`, set `matrix[r][0] = 0` and `matrix[0][c] = 0`.
2. *(Wait! What if the first row or first column itself had a 0 initially? You must use two boolean variables `firstRowZero` and `firstColZero` to track this before doing Step 1).*
3. Scan the matrix *again* (skipping the first row/col). If the corresponding flag in the first row/col is 0, set `matrix[r][c] = 0`.
4. Finally, if `firstRowZero` is true, zero out the first row. Do the same for the column.

```cpp
void setZeroes(vector<vector<int>>& matrix) {
    int m = matrix.size(), n = matrix[0].size();
    bool firstRowZero = false, firstColZero = false;
    
    // Step 1: Check if first row/col have zeros
    for (int j = 0; j < n; j++)
        if (matrix[0][j] == 0) firstRowZero = true;
    for (int i = 0; i < m; i++)
        if (matrix[i][0] == 0) firstColZero = true;
    
    // Step 2: Use first row/col as flags
    for (int i = 1; i < m; i++)
        for (int j = 1; j < n; j++)
            if (matrix[i][j] == 0)
                matrix[i][0] = matrix[0][j] = 0;
    
    // Step 3: Zero out cells based on flags
    for (int i = 1; i < m; i++)
        for (int j = 1; j < n; j++)
            if (matrix[i][0] == 0 || matrix[0][j] == 0)
                matrix[i][j] = 0;
    
    // Step 4: Zero first row/col if needed
    if (firstRowZero)
        for (int j = 0; j < n; j++) matrix[0][j] = 0;
    if (firstColZero)
        for (int i = 0; i < m; i++) matrix[i][0] = 0;
}
```

**What's happening:**
```cpp
// Matrix:
// 1  1  1
// 1  0  1
// 1  1  1
//
// Step 1: firstRowZero=false, firstColZero=false
//
// Step 2: matrix[1][1]=0 → matrix[1][0]=0, matrix[0][1]=0
//   Matrix becomes:
//   1  0  1
//   0  0  1
//   1  1  1
//
// Step 3: Scan (skip row 0, col 0):
//   matrix[1][0]=0 → zero row 1: matrix[1][2]=0
//   matrix[0][1]=0 → zero col 1: matrix[2][1]=0
//   Matrix becomes:
//   1  0  1
//   0  0  0
//   1  0  1
//
// Step 4: firstRowZero=false, firstColZero=false → no change
//
// Final:
// 1  0  1
// 0  0  0
// 1  0  1
```

**Edge Case — first row has zero:**
```cpp
// Matrix:
// 1  0  1      Step 1: firstRowZero=true
// 1  1  1      Step 2: No inner zeros, flags stay as is
// 1  1  1      Step 3: No changes (no flags set)
//               Step 4: firstRowZero=true → zero entire first row
// Final:
// 0  0  0
// 1  1  1
// 1  1  1
```

**Dry Run Table:**

| Step | Action | Matrix State |
|------|--------|--------------|
| 1 | Check first row/col | firstRowZero=true, firstColZero=false |
| 2 | Mark flags (skip row 0, col 0) | No inner zeros found |
| 3 | Zero based on flags | No changes |
| 4 | Zero first row (firstRowZero=true) | Row 0 → [0,0,0] |

---

### 5. Multiply Strings (Medium)
**Trigger:** Multiply two huge numbers represented as strings.
**Intuition:** You cannot convert them to `int` or `long long`; they will overflow.
Simulate the grade-school multiplication algorithm.
The maximum possible length of the product string is `num1.length() + num2.length()`. Create a `vector<int> result` of that size.
Loop `i` backward through `num1`, and `j` backward through `num2`.
Multiply the two digits: `mul = (num1[i]-'0') * (num2[j]-'0')`.
Add `mul` to the current position in the result array: `sum = mul + result[i + j + 1]`.
Calculate the current digit: `result[i + j + 1] = sum % 10`.
Carry the remainder over to the next position: `result[i + j] += sum / 10`.
At the end, convert the integer array back into a string, skipping leading zeros.

```cpp
string multiply(string num1, string num2) {
    int m = num1.size(), n = num2.size();
    vector<int> result(m + n, 0);
    
    // Grade-school multiplication, right to left
    for (int i = m - 1; i >= 0; i--) {
        for (int j = n - 1; j >= 0; j--) {
            int mul = (num1[i] - '0') * (num2[j] - '0');
            int sum = mul + result[i + j + 1];
            
            result[i + j + 1] = sum % 10;
            result[i + j] += sum / 10;
        }
    }
    
    // Convert to string, skip leading zeros
    string res;
    for (int digit : result) {
        if (!(res.empty() && digit == 0)) {
            res += to_string(digit);
        }
    }
    return res.empty() ? "0" : res;
}
```

**What's happening:**
```cpp
// num1 = "123", num2 = "456"
//
// result array: [0, 0, 0, 0, 0] (size 5)
//
// i=2 (digit=3):
//   j=2 (digit=6): mul=18, sum=18+0=18 → result[4]=8, result[3]+=1
//   j=1 (digit=5): mul=15, sum=15+0=15 → result[3]=5, result[2]+=1
//   j=0 (digit=4): mul=12, sum=12+0=12 → result[2]=2, result[1]+=1
//   result: [0, 1, 2, 5, 8]
//
// i=1 (digit=2):
//   j=2 (digit=6): mul=12, sum=12+5=17 → result[3]=7, result[2]+=1
//   j=1 (digit=5): mul=10, sum=10+2=12 → result[2]=2, result[1]+=1
//   j=0 (digit=4): mul=8, sum=8+1=9 → result[1]=9, result[0]+=0
//   result: [0, 9, 2, 7, 8]
//
// i=0 (digit=1):
//   j=2 (digit=6): mul=6, sum=6+7=13 → result[3]=3, result[2]+=1
//   j=1 (digit=5): mul=5, sum=5+2=7 → result[2]=7, result[1]+=0
//   j=0 (digit=4): mul=4, sum=4+9=13 → result[1]=3, result[0]+=1
//   result: [1, 3, 3, 7, 8]
//
// Skip leading zero → "1337" wait, let me recalculate...
// 123 × 456 = 56088
```

**Correction — detailed walkthrough for 123 × 456:**
```
     1 2 3
   ×   4 5 6
   ---------
     7 3 8     (3×456 = 1368, position at j=2)
   6 1 5       (2×456 = 912, position at j=1, shifted left)
 4 5 6         (1×456 = 456, position at j=0, shifted left)
 ---------
 5 6 0 8 8

Index mapping for result[i+j+1]:
i=2,j=2 → result[5], i=2,j=1 → result[4], i=2,j=0 → result[3]
i=1,j=2 → result[4], i=1,j=1 → result[3], i=1,j=0 → result[2]
i=0,j=2 → result[3], i=0,j=1 → result[2], i=0,j=0 → result[1]
```

**Dry Run Table — 123 × 456:**

| i | j | num1[i] | num2[j] | mul | sum | result[i+j+1] | result[i+j] | result array |
|---|---|---------|---------|-----|-----|---------------|-------------|--------------|
| 2 | 2 | 3 | 6 | 18 | 18 | 8 | +1 | [0,0,0,1,8] |
| 2 | 1 | 3 | 5 | 15 | 15 | 5 | +1 | [0,0,1,5,8] |
| 2 | 0 | 3 | 4 | 12 | 12 | 2 | +1 | [0,1,2,5,8] |
| 1 | 2 | 2 | 6 | 12 | 13 | 3 | +1 | [0,1,3,3,8] |
| 1 | 1 | 2 | 5 | 10 | 12 | 2 | +1 | [0,2,3,3,8] |
| 1 | 0 | 2 | 4 | 8 | 9 | 9 | +0 | [0,2,3,3,8] |
| 0 | 2 | 1 | 6 | 6 | 7 | 7 | +0 | [0,2,7,3,8] |
| 0 | 1 | 1 | 5 | 5 | 7 | 7 | +0 | [0,2,7,3,8] |
| 0 | 0 | 1 | 4 | 4 | 6 | 6 | +0 | [0,5,6,0,8] |

Result: "56088" (skip leading zero)

---

## Quick Reference Table

| Problem | Difficulty | Key Trick | Time | Space |
|---------|-----------|-----------|------|-------|
| Happy Number | Easy | Cycle detection or HashSet | O(log N) per step | O(1) or O(N) |
| Rotate Image | Medium | Transpose + Reverse rows | O(N²) | O(1) |
| Spiral Matrix | Medium | 4 boundary pointers | O(M×N) | O(1) |
| Set Matrix Zeroes | Medium | First row/col as flags | O(M×N) | O(1) |
| Multiply Strings | Medium | Grade-school multiplication | O(M×N) | O(M+N) |

**Matrix Pattern Cheat Sheet:**
```
Rotate 90° CW:    Transpose + Reverse each row
Rotate 90° CCW:   Transpose + Reverse each column
Rotate 180°:      Reverse each row + Reverse each column
Spiral:           4 boundaries (top, bottom, left, right), shrink inward
Set Zeroes:       Use first row/col as marker, handle edge cases
```

**When to Use What:**
```
Need to rotate matrix?      → Transpose + reverse (in-place)
Need spiral traversal?      → 4 boundary pointers
Need to zero rows/cols?     → First row/col as flags
Multiply large numbers?     → Grade-school with carry array
Detect number property?     → Cycle detection or set tracking
```

**Number Theory Tips:**
```
Sum of squares of digits:   while (n > 0) { sum += (n%10)*(n%10); n/=10; }
Extract digits:             while (n > 0) { digit = n%10; n/=10; }
Reverse number:             while (n > 0) { rev = rev*10 + n%10; n/=10; }
Check palindrome:           Original == reversed
```

---

## Practice & Self-Check

### Predict the Output / Trace by Hand

**Q1.** Using Problem 1's **Hash Set** version of `isHappy`, list every value inserted into `seen` for `n = 19` and for `n = 2`. What does each call return, and on which value does the unhappy one detect its cycle?

**Q2.** Apply Problem 2's Rotate Image (transpose + reverse rows) to the 4×4 matrix

```
 1  2  3  4
 5  6  7  8
 9 10 11 12
13 14 15 16
```

What is the rotated matrix? Where does the value `7` (originally at row 1, column 2) end up? State the general rule for where `(r, c)` goes.

**Q3.** Run Problem 3's `spiralOrder` on the single-row matrix `[[1, 2, 3, 4]]`. Then answer: if the guard `if (top <= bottom)` before the Right → Left loop were deleted, what would the function return for the same input?

**Q4.** Run Problem 4's `setZeroes` on

```
0 1 2
3 4 5
6 7 0
```

Give `firstRowZero` / `firstColZero`, the matrix after Step 2, after Step 3, and the final matrix.

**Q5.** Run Problem 5's `multiply("25", "4")`. The `result` vector has size `m + n = 3`. Fill in one row per `(i, j)` pair: `mul`, `sum`, `result[i+j+1]`, carry into `result[i+j]`, and the whole array. What string is returned?

### Coding Exercises

**E1 (Easy).** Palindrome Number. Using the "Reverse number" tip from the cheat sheet, return `true` if integer `x` reads the same forwards and backwards. Negative numbers are never palindromes.

```cpp
bool isPalindromeNumber(int x);
// 121 -> true,  -121 -> false,  10 -> false,  0 -> true
```

**E2 (Easy–Medium).** Add Strings. Add two non-negative integers given as decimal strings, without converting them to `int` / `long long` (same carry idea as Multiply Strings).

```cpp
string addStrings(string num1, string num2);
// "11",  "123" -> "134"
// "456", "77"  -> "533"
// "999", "1"   -> "1000"
```

**E3 (Medium).** Diagonal Traverse. Return all elements of an $M \times N$ matrix in zig-zag diagonal order: diagonal $d$ contains the cells with $r + c = d$; even diagonals are read going **up** (row decreasing), odd diagonals going **down**.

```cpp
vector<int> findDiagonalOrder(vector<vector<int>>& mat);
// [[1,2,3],[4,5,6],[7,8,9]] -> [1,2,4,7,5,3,6,8,9]
// [[1,2],[3,4]]             -> [1,2,3,4]
```

#### Dry-Run: Answers

**Q1 — `isHappy(19) = true`, `isHappy(2) = false`.**

For 19: inserts `19` → $1^2 + 9^2 = 82$; inserts `82` → $64 + 4 = 68$; inserts `68` → $36 + 64 = 100$; inserts `100` → $1 + 0 + 0 = 1$; loop ends because `n == 1`. Seen = {19, 82, 68, 100}.

For 2: the chain is

| Value inserted | Next (digit-square sum) |
|---|---|
| 2 | 4 |
| 4 | 16 |
| 16 | 37 |
| 37 | 58 |
| 58 | 89 |
| 89 | 145 |
| 145 | 42 |
| 42 | 20 |
| 20 | 4 |

Next `n = 4` is already in `seen` → return `false`. This is the same 8-number cycle shown at the top of the file (4 → 16 → … → 20 → 4).

**Q2 — rotated matrix, and `7` moves to `(2, 2)`.**

```
13  9  5  1
14 10  6  2
15 11  7  3
16 12  8  4
```

Transpose sends `(r, c)` to `(c, r)`; reversing a row of length $n$ sends column $r$ to column $n-1-r$. So `(r, c)` → `(c, n-1-r)`. For `7`: `(1, 2)` → `(2, 4-1-1)` = `(2, 2)`.

**Q3 — returns `[1, 2, 3, 4]`; without the guard it returns `[1, 2, 3, 4, 3, 2, 1]`.** Start `top=0, bottom=0, left=0, right=3`.

| Pass | Guard | Added | Boundaries after |
|---|---|---|---|
| L→R row 0 | — | 1, 2, 3, 4 | top = 1 |
| T→B col 3, rows 1..0 | — | nothing (empty range) | right = 2 |
| R→L | `1 <= 0`? NO → skipped | — | bottom stays 0 |
| B→T col 0, rows 0..1 | `0 <= 2` YES | nothing (`i` from 0 down to 1 is empty) | left = 1 |
| loop test | `1 <= 0`? NO | — | stop |

Without the guard, the R→L loop runs on `matrix[bottom = 0]` for `j = 2, 1, 0` and re-reads 3, 2, 1 from the row that was already consumed.

**Q4 — final matrix `[[0,0,0],[0,4,0],[0,0,0]]`.**

Step 1: row 0 contains `matrix[0][0] = 0` → `firstRowZero = true`; column 0 contains `matrix[0][0] = 0` → `firstColZero = true`.

Step 2 (inner cells only): `matrix[2][2] = 0` → set `matrix[2][0] = 0` and `matrix[0][2] = 0`:

```
0 1 0
3 4 5
0 7 0
```

Step 3 (inner cells): `(1,1)`: flags `matrix[1][0]=3`, `matrix[0][1]=1` → keep 4. `(1,2)`: `matrix[0][2]=0` → 0. `(2,1)`: `matrix[2][0]=0` → 0. `(2,2)`: already 0.

```
0 1 0
3 4 0
0 0 0
```

Step 4: zero row 0 and column 0 → `[[0,0,0],[0,4,0],[0,0,0]]`. Check: the original zeros at `(0,0)` and `(2,2)` wipe rows 0, 2 and columns 0, 2, leaving only `(1,1) = 4`.

**Q5 — returns `"100"`.** `m = 2, n = 1`, `result = [0, 0, 0]`.

| i | j | digits | mul | sum = mul + result[i+j+1] | result[i+j+1] | carry → result[i+j] | result |
|---|---|---|---|---|---|---|---|
| 1 | 0 | 5 × 4 | 20 | 20 + 0 = 20 | result[2] = 0 | result[1] += 2 | [0, 2, 0] |
| 0 | 0 | 2 × 4 | 8 | 8 + 2 = 10 | result[1] = 0 | result[0] += 1 | [1, 0, 0] |

No leading zeros to skip → `"100"`.

**E1 — reference solution.** Reverse the number with `rev = rev * 10 + n % 10` (in `long long` so it cannot overflow) and compare.

```cpp
bool isPalindromeNumber(int x) {
    if (x < 0) return false;
    long long rev = 0;
    int n = x;
    while (n > 0) {
        rev = rev * 10 + n % 10;
        n /= 10;
    }
    return rev == x;
}
```

Time $O(\log_{10} x)$. `10` reverses to `1` ≠ 10 → false; `0` skips the loop, `rev = 0 == 0` → true.

**E2 — reference solution.** Walk both strings from the right with a carry, exactly like column addition.

```cpp
string addStrings(string num1, string num2) {
    int i = num1.size() - 1, j = num2.size() - 1, carry = 0;
    string res;
    while (i >= 0 || j >= 0 || carry) {
        int sum = carry;
        if (i >= 0) sum += num1[i--] - '0';
        if (j >= 0) sum += num2[j--] - '0';
        res.push_back(char('0' + sum % 10));
        carry = sum / 10;
    }
    reverse(res.begin(), res.end());
    return res;
}
```

Time $O(\max(M, N))$. Trace `"999" + "1"`: 9+1 = 10 → digit 0, carry 1; 9+1 → 0, carry 1; 9+1 → 0, carry 1; only carry left → 1. Reversed: `"1000"`.

**E3 — reference solution.** For each diagonal $d$, the valid rows are $\max(0, d-N+1) \le r \le \min(d, M-1)$ with $c = d - r$. Walk them upward for even $d$, downward for odd $d$.

```cpp
vector<int> findDiagonalOrder(vector<vector<int>>& mat) {
    int m = mat.size(), n = mat[0].size();
    vector<int> res;
    for (int d = 0; d <= m + n - 2; d++) {
        int lo = max(0, d - n + 1), hi = min(d, m - 1);   // valid row range on diagonal d
        if (d % 2 == 0) {
            for (int r = hi; r >= lo; r--) res.push_back(mat[r][d - r]);  // going up
        } else {
            for (int r = lo; r <= hi; r++) res.push_back(mat[r][d - r]);  // going down
        }
    }
    return res;
}
```

Time $O(M \cdot N)$, each cell visited once. 3×3 trace: d=0 → 1; d=1 (down) → 2, 4; d=2 (up, rows 2..0) → 7, 5, 3; d=3 (down, rows 1..2) → 6, 8; d=4 → 9.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Interview Problems Walkthrough**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **interview problems math matrix** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.


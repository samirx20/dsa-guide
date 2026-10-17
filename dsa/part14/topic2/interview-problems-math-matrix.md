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
| 1 | 16 | 58 | 37 | 145 | No |
| 2 | 37 | 145 | 58 | 20 | No |
| 3 | 58 | 20 | 89 | 16 | No |
| 4 | 89 | 16 | 145 | 58 | No |
| 5 | 145 | 58 | 42 | 145 | No |
| 6 | 42 | 145 | 20 | 20 | No |
| 7 | 20 | 20 | — | — | Yes! (met inside the cycle; 20 != 1 → not happy) |

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
| 1 | 1 | 1 | 0 | 2 | B→T | 5 |
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
// 1  1  1      Step 3: matrix[0][1]=0 acts as a column flag → matrix[1][1]=matrix[2][1]=0
//               Step 4: firstRowZero=true → zero entire first row
// Final:
// 0  0  0
// 1  0  1
// 1  0  1
```

**Dry Run Table:**

| Step | Action | Matrix State |
|------|--------|--------------|
| 1 | Check first row/col | firstRowZero=true, firstColZero=false |
| 2 | Mark flags (skip row 0, col 0) | No inner zeros found |
| 3 | Zero based on flags | matrix[0][1]=0 → column 1 zeroed: rows 1-2 → [1,0,1] |
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
// result array: [0, 0, 0, 0, 0, 0] (size m + n = 6)
//
// i=2 (digit=3):
//   j=2 (digit=6): mul=18, sum=18+0=18 → result[5]=8, result[4]+=1
//   j=1 (digit=5): mul=15, sum=15+1=16 → result[4]=6, result[3]+=1
//   j=0 (digit=4): mul=12, sum=12+1=13 → result[3]=3, result[2]+=1
//   result: [0, 0, 1, 3, 6, 8]
//
// i=1 (digit=2):
//   j=2 (digit=6): mul=12, sum=12+6=18 → result[4]=8, result[3]+=1
//   j=1 (digit=5): mul=10, sum=10+4=14 → result[3]=4, result[2]+=1
//   j=0 (digit=4): mul=8, sum=8+2=10 → result[2]=0, result[1]+=1
//   result: [0, 1, 0, 4, 8, 8]
//
// i=0 (digit=1):
//   j=2 (digit=6): mul=6, sum=6+4=10 → result[3]=0, result[2]+=1
//   j=1 (digit=5): mul=5, sum=5+1=6 → result[2]=6, result[1]+=0
//   j=0 (digit=4): mul=4, sum=4+1=5 → result[1]=5, result[0]+=0
//   result: [0, 5, 6, 0, 8, 8]
//
// Skip leading zero → "56088"
// 123 × 456 = 56088
```

**Correction — detailed walkthrough for 123 × 456:**
```
         1 2 3
     ×   4 5 6
     ---------
       1 3 6 8     (3×456 = 1368, from i=2)
       9 1 2       (2×456 = 912, from i=1, shifted left)
     4 5 6         (1×456 = 456, from i=0, shifted left twice)
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
| 2 | 2 | 3 | 6 | 18 | 18 | 8 | +1 | [0,0,0,0,1,8] |
| 2 | 1 | 3 | 5 | 15 | 16 | 6 | +1 | [0,0,0,1,6,8] |
| 2 | 0 | 3 | 4 | 12 | 13 | 3 | +1 | [0,0,1,3,6,8] |
| 1 | 2 | 2 | 6 | 12 | 18 | 8 | +1 | [0,0,1,4,8,8] |
| 1 | 1 | 2 | 5 | 10 | 14 | 4 | +1 | [0,0,2,4,8,8] |
| 1 | 0 | 2 | 4 | 8 | 10 | 0 | +1 | [0,1,0,4,8,8] |
| 0 | 2 | 1 | 6 | 6 | 10 | 0 | +1 | [0,1,1,0,8,8] |
| 0 | 1 | 1 | 5 | 5 | 6 | 6 | +0 | [0,1,6,0,8,8] |
| 0 | 0 | 1 | 4 | 4 | 5 | 5 | +0 | [0,5,6,0,8,8] |

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


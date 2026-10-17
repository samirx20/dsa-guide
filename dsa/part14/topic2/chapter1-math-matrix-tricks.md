# Part 14, Topic 2: Math & Matrix Tricks
## Chapter 1: Essential Math & Matrix Algorithms

Certain interview questions look like logic puzzles but require specific mathematical tricks or strict matrix traversal patterns.

---

## 1. Modular Arithmetic

If a problem asks you to calculate a massive number (like combinations or permutations) and return it "Modulo 10^9 + 7", it is because the true answer overflows a 64-bit integer.

You must apply the modulo operator `%` at **every single step** of your calculation, not just at the end.

### The Rules
- `(a + b) % M = ((a % M) + (b % M)) % M`
- `(a * b) % M = ((a % M) * (b % M)) % M`

### Modular Arithmetic Examples

```
Example 1: Addition
  (15 + 17) % 7 = 32 % 7 = 4
  Verify: (15%7 + 17%7) % 7 = (1 + 3) % 7 = 4  ✓

Example 2: Multiplication
  (12 * 13) % 7 = 156 % 7 = 2
  Verify: (12%7 * 13%7) % 7 = (5 * 6) % 7 = 30 % 7 = 2  ✓

Example 3: Why apply at EVERY step?
  Computing 10^18 * 10^18 directly OVERFLOWS a 64-bit integer!
  But: (10^18 % M) * (10^18 % M) % M fits perfectly.
```

```cpp
const int MOD = 1e9 + 7;

int addMod(int a, int b) {
    return ((a % MOD) + (b % MOD)) % MOD;
}

int mulMod(int a, int b) {
    return (int)((1LL * (a % MOD) * (b % MOD)) % MOD);
    // 1LL casts to long long to prevent overflow during multiplication
}
```

**What's happening:**
```cpp
return (int)((1LL * (a % MOD) * (b % MOD)) % MOD);
//      ^^^^   ^^
//      |      └── Cast to long long to prevent overflow
//      |          a and b can be up to 10^9, their product up to 10^18
//      |          which fits in long long (64-bit) but not int (32-bit)
//      └── Cast back to int since result < MOD < 2^31
//
// Step 1: a % MOD and b % MOD bring values into [0, MOD-1]
// Step 2: Multiply (safe in 64-bit)
// Step 3: % MOD again to bring result back to [0, MOD-1]
```

---

## 2. Greatest Common Divisor (GCD)

To find the GCD of two numbers, use the **Euclidean Algorithm**.
*(Note: C++17 includes `std::gcd(a, b)` in the `<numeric>` header, but you should know how it works).*

```cpp
int gcd(int a, int b) {
    if (b == 0) return a;
    return gcd(b, a % b);
}
```

### GCD Step-by-Step Visualization

```
GCD(48, 18):
  48 = 2 * 18 + 12
  18 = 1 * 12 + 6
  12 = 2 * 6 + 0
  GCD = 6

Visual:
  48 % 18 = 12  ->  GCD(18, 12)
  18 % 12 = 6   ->  GCD(12, 6)
  12 % 6 = 0    ->  GCD = 6
```

### Dry-Run Table: GCD(48, 18)

| Step | a | b | a % b | Next call |
|---|---|---|---|---|
| 1 | 48 | 18 | 12 | gcd(18, 12) |
| 2 | 18 | 12 | 6 | gcd(12, 6) |
| 3 | 12 | 6 | 0 | gcd(6, 0) |
| 4 | 6 | 0 | — | return 6 |

**What's happening:**
```cpp
int gcd(int a, int b) {
    if (b == 0) return a;
    // Base case: GCD of any number and 0 is that number
    return gcd(b, a % b);
    // Replace (a, b) with (b, a % b)
    // The GCD doesn't change because:
    // GCD(a, b) = GCD(b, a mod b)
    // The numbers get smaller quickly -> O(log(min(a,b)))
}
```

**Lowest Common Multiple (LCM):** The formula is simply `(a * b) / gcd(a, b)`.

```cpp
int lcm(int a, int b) {
    return a / gcd(a, b) * b;
    // Divide FIRST to prevent overflow
    // a * b / gcd can overflow, but a / gcd * b is safe
}
```

**What's happening:**
```cpp
return a / gcd(a, b) * b;
//  ^^ ^^^^^^^^^^^^^  ^^
//  |  |               └── Multiply by b
//  |  └── Divide by GCD first (reduces the magnitude)
//  └── Divide a by GCD before multiplying by b
//
// Why not (a * b) / gcd?
// Because a * b might overflow even long long for large values
// But a / gcd is guaranteed to be smaller than a
```

---

## 3. Sieve of Eratosthenes (Finding Primes)

**Trigger:** Find all prime numbers less than or equal to N.
Checking if every number is prime takes O(N * sqrt(N)) time. The Sieve achieves it in O(N log log N) time.

### Step-by-Step Visualization (n = 30)

```
Step 1: Initialize array (all true except 0 and 1)
  Index:  0  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30
  Value:  F  F  T  T  T  T  T  T  T  T  T  T  T  T  T  T  T  T  T  T  T  T  T  T  T  T  T  T  T  T  T

Step 2: p = 2 (prime!). Mark multiples of 2:
  Cross out: 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30
  Index:  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30
  Value:  T  T  F  T  F  T  F  T  F  T  F  T  F  T  F  T  F  T  F  T  F  T  F  T  F  T  F  T  F  T

Step 3: p = 3 (prime!). Mark multiples of 3 (start from 3*3=9):
  Cross out: 9, 15, 21, 27
  Index:  3  5  7  9  11 13 15 17 19 21 23 25 27 29
  Value:  T  T  T  F  T  T  F  T  T  F  T  T  F  T

Step 4: p = 5 (prime!). Mark multiples of 5 (start from 5*5=25):
  Cross out: 25
  Index:  5  7  11 13 17 19 23 25 29
  Value:  T  T  T  T  T  T  T  F  T

Step 5: p = 7 (prime!). 7*7 = 49 > 30. STOP.

Remaining primes: 2, 3, 5, 7, 11, 13, 17, 19, 23, 29
```

```cpp
vector<int> sieve(int n) {
    vector<bool> isPrime(n + 1, true);
    isPrime[0] = isPrime[1] = false;
    
    // We only need to check up to sqrt(N)
    for (int p = 2; p * p <= n; p++) {
        if (isPrime[p]) {
            // Mark all multiples as false
            for (int i = p * p; i <= n; i += p) {
                isPrime[i] = false;
            }
        }
    }
    
    vector<int> primes;
    for (int i = 2; i <= n; i++) {
        if (isPrime[i]) primes.push_back(i);
    }
    return primes;
}
```

**What's happening:**
```cpp
for (int p = 2; p * p <= n; p++) {
// Only check up to sqrt(n) because:
// If n has a factor > sqrt(n), it must also have one < sqrt(n)

    if (isPrime[p]) {
    // p is prime -> all its multiples are composite
        
        for (int i = p * p; i <= n; i += p) {
        //  ^^^^^         ^^^  ^^^
        //  |             |    └── Step by p (next multiple)
        //  |             └── Stop at n
        //  └── Start from p*p (smaller multiples already marked!)
        //      Why? Because 2*p, 3*p, ..., (p-1)*p were already
        //      marked when we processed primes 2, 3, ..., p-1
            isPrime[i] = false;
        }
    }
}
```

---

## 4. Fast Exponentiation (Binary Exponentiation)

**Trigger:** Calculate x^n efficiently (e.g., for modular exponentiation).

Naive approach: multiply x by itself n times = O(n).
Binary exponentiation: O(log n).

### Visualization: 3^13

```
13 in binary = 1101

3^13 = 3^(8 + 4 + 1) = 3^8 * 3^4 * 3^1

Process bits from right to left:
  bit 0 (1): result *= base  -> result = 3            (base = 3^1 = 3)
  bit 1 (0): skip            -> result = 3            (base = 3^2 = 9)
  bit 2 (1): result *= base  -> result = 3 * 81 = 243  (base = 3^4 = 81)
  bit 3 (1): result *= base  -> result = 243 * 6561 = 1594323  (base = 3^8 = 6561)

3^13 = 1594323 (only 4 multiplications instead of 13!)
```

### Dry-Run Table: 3^13

| Step | n (binary) | n & 1 | base | result | Action |
|---|---|---|---|---|---|
| 1 | 1101 | 1 | 3 | 1*3=3 | result *= base |
| 2 | 110 | 0 | 9 | 3 | skip |
| 3 | 11 | 1 | 81 | 3*81=243 | result *= base |
| 4 | 1 | 1 | 6561 | 243*6561=1594323 | result *= base |
| 5 | 0 | — | — | — | done |

Wait, let me recalculate. 3^13 = 1594323. That's correct for 3^13.

Actually, 3^13 = 1594323? Let me verify: 3^1=3, 3^2=9, 3^3=27, 3^4=81, 3^5=243, 3^6=729, 3^7=2187, 3^8=6561, 3^9=19683, 3^10=59049, 3^11=177147, 3^12=531441, 3^13=1594323. Yes.

```cpp
long long power(long long base, long long exp) {
    long long result = 1;
    base %= MOD;
    
    while (exp > 0) {
        if (exp & 1) {
            result = result * base % MOD;
        }
        base = base * base % MOD;
        exp >>= 1;
    }
    
    return result;
}
```

**What's happening:**
```cpp
long long result = 1;
base %= MOD;  // Bring base into valid range

while (exp > 0) {
    if (exp & 1) {
        result = result * base % MOD;
        // If current bit of exp is 1, multiply result by current base
    }
    base = base * base % MOD;
    // Square the base: base^1 -> base^2 -> base^4 -> base^8...
    // This corresponds to processing each bit of the exponent
    exp >>= 1;
    // Shift exponent right to process next bit
}
// We only do O(log n) multiplications instead of O(n)
```

---

## 5. Matrix Rotation Trick

**Trigger:** Rotate an N x N matrix by 90 degrees clockwise in-place.
Rotating an image pixel-by-pixel involves horrific boundary math. Instead, apply these two simple mathematical transformations:
1. **Transpose the matrix:** Swap `matrix[i][j]` with `matrix[j][i]`. (This mirrors the matrix across its main diagonal).
2. **Reverse every row.**

### Matrix Transformation Visualization

```
Original Matrix:
  1  2  3
  4  5  6
  7  8  9

Step 1: Transpose (swap [i][j] with [j][i]):
  1  4  7
  2  5  8
  3  6  9

Step 2: Reverse each row:
  7  4  1
  8  5  2
  9  6  3

Result: Matrix rotated 90 degrees clockwise!
```

```cpp
void rotate(vector<vector<int>>& matrix) {
    int n = matrix.size();
    
    // 1. Transpose
    for (int i = 0; i < n; i++) {
        // Notice j starts at i! Otherwise we swap things twice and undo the work.
        for (int j = i; j < n; j++) {
            swap(matrix[i][j], matrix[j][i]);
        }
    }
    
    // 2. Reverse each row
    for (int i = 0; i < n; i++) {
        reverse(matrix[i].begin(), matrix[i].end());
    }
}
```

**What's happening:**
```cpp
for (int i = 0; i < n; i++) {
    for (int j = i; j < n; j++) {
    //        ^ j starts at i, not 0!
    // Why? If j < i, we'd swap [i][j] and [j][i], then later
    // when we reach row j, we'd swap them BACK. Starting at j=i
    // ensures each pair is swapped exactly once.
        swap(matrix[i][j], matrix[j][i]);
    }
}

for (int i = 0; i < n; i++) {
    reverse(matrix[i].begin(), matrix[i].end());
    // Reverse each row to complete the 90-degree rotation
}
```

---

## 6. Spiral Matrix Traversal

**Trigger:** Return all elements of an M x N matrix in spiral order.

### Boundary Pointer Visualization

```
Matrix:
  1  2  3  4
  5  6  7  8
  9  10 11 12

Pointers: top=0, bottom=2, left=0, right=3

Pass 1: Top row (left -> right): 1, 2, 3, 4  -> top++ (top=1)
Pass 2: Right col (top -> bottom): 8, 12 -> right-- (right=2)
Pass 3: Bottom row (right -> left): 11, 10, 9 -> bottom-- (bottom=1)
Pass 4: Left col (bottom -> top): 5 -> left++ (left=1)

Pass 1: Top row: 6, 7 -> top++ (top=2)
Now top > bottom, STOP.

Result: [1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7]
```

```cpp
vector<int> spiralOrder(vector<vector<int>>& matrix) {
    vector<int> result;
    if (matrix.empty()) return result;
    
    int top = 0, bottom = matrix.size() - 1;
    int left = 0, right = matrix[0].size() - 1;
    
    while (top <= bottom && left <= right) {
        // Move right across top row
        for (int j = left; j <= right; j++)
            result.push_back(matrix[top][j]);
        top++;
        
        // Move down along right column
        for (int i = top; i <= bottom; i++)
            result.push_back(matrix[i][right]);
        right--;
        
        // Move left across bottom row
        if (top <= bottom) {
            for (int j = right; j >= left; j--)
                result.push_back(matrix[bottom][j]);
            bottom--;
        }
        
        // Move up along left column
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
while (top <= bottom && left <= right) {
// Four boundaries that shrink inward as we consume elements

    for (int j = left; j <= right; j++)
        result.push_back(matrix[top][j]);
    top++;  // Top row consumed, move boundary down

    for (int i = top; i <= bottom; i++)
        result.push_back(matrix[i][right]);
    right--;  // Right column consumed, move boundary left

    if (top <= bottom) {  // Check: might have consumed all rows!
        for (int j = right; j >= left; j--)
            result.push_back(matrix[bottom][j]);
        bottom--;  // Bottom row consumed, move boundary up
    }

    if (left <= right) {  // Check: might have consumed all columns!
        for (int i = bottom; i >= top; i--)
            result.push_back(matrix[i][left]);
        left++;  // Left column consumed, move boundary right
    }
}
```

---

## Quick Reference

| Concept | Formula/Method | Time | Space |
|---|---|---|---|
| **Modular Addition** | `(a + b) % M` | O(1) | O(1) |
| **Modular Multiplication** | `(1LL * a * b) % M` | O(1) | O(1) |
| **GCD** | `gcd(b, a % b)` until b=0 | O(log min(a,b)) | O(log min(a,b)) |
| **LCM** | `(a / gcd(a,b)) * b` | O(log min(a,b)) | O(1) |
| **Sieve of Eratosthenes** | Mark multiples of each prime | O(N log log N) | O(N) |
| **Binary Exponentiation** | Square base, check bits of exp | O(log N) | O(1) |
| **Matrix Rotation 90°** | Transpose + Reverse rows | O(N^2) | O(1) |
| **Spiral Matrix** | 4 boundary pointers, shrink inward | O(M*N) | O(1) |
| **Set Matrix Zeroes** | Use first row/col as flags | O(M*N) | O(1) |
| **Prime Check** | Trial division up to sqrt(n) | O(sqrt(N)) | O(1) |
| **Fast Power (Mod)** | Binary exponentiation with mod | O(log N) | O(1) |

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Chapter 1: Essential Math & Matrix Algorithms**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **chapter1 math matrix tricks** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.


# Part 2, Topic 2: Prefix Sum
## Chapter 3: 2D Prefix Sums

While 1D Prefix Sums are extremely common, high-tier companies (like Google or Meta) love to ask 2D Prefix Sum questions to test your mathematical reasoning.

### 1. The Problem
Given a 2D matrix, write a function `sumRegion(row1, col1, row2, col2)` that returns the sum of the elements inside the rectangle defined by its upper-left corner `(row1, col1)` and lower-right corner `(row2, col2)`.

If you use nested loops to calculate the area every time the function is called, your time complexity is $O(\text{Area})$. For a $1000 \times 1000$ matrix, querying it multiple times will cause a TLE. We need $O(1)$ query time.

#### ASCII Diagram: Brute Force Problem
```
Matrix:
| 1  2  3 |
| 4  5  6 |
| 7  8  9 |

Query: sumRegion(1, 1, 2, 2)
Expected: 5+6+8+9 = 28

Brute Force would iterate:
row 1, col 1: 5
row 1, col 2: 6
row 2, col 1: 8
row 2, col 2: 9
Total: 28 (after 4 operations)

For a 1000x1000 matrix, worst case = 1,000,000 operations per query!
```

### 2. The 2D Prefix Matrix

Just like in 1D, we can precompute the sums. However, a 2D prefix array `prefix[r][c]` does NOT represent just the sum of row `r`. 
**`prefix[r][c]` represents the sum of the entire rectangle from the top-left corner `(0, 0)` down to `(r, c)`.**

```
Original Matrix (3x3):        Prefix Sum Matrix (4x4 with padding):
+-------+-------+-------+    +-------+-------+-------+-------+
|   1   |   2   |   3   |    |   0   |   0   |   0   |   0   |
+-------+-------+-------+    +-------+-------+-------+-------+
|   4   |   5   |   6   |    |   0   |   1   |   3   |   6   |
+-------+-------+-------+    +-------+-------+-------+-------+
|   7   |   8   |   9   |    |   0   |   5   |  12   |  21   |
+-------+-------+-------+    +-------+-------+-------+-------+
                               |   0   |  12   |  27   |  45   |
                               +-------+-------+-------+-------+

prefix[2][2] = 12 → sum of matrix[0..1][0..1] = 1+2+4+5 = 12 ✓
prefix[3][3] = 45 → sum of entire matrix = 1+2+3+4+5+6+7+8+9 = 45 ✓
```

#### ASCII Diagram: Prefix Matrix Values
```
matrix:               prefix (with padding):
|  1   2   3  |      |  0   0   0   0  |
|  4   5   6  |  →   |  0   1   3   6  |
|  7   8   9  |      |  0   5  12  21  |
                      |  0  12  27  45  |

How each value is calculated:
prefix[1][1] = 1 (just matrix[0][0])
prefix[1][2] = 1+2 = 3 (row 0, cols 0-1)
prefix[1][3] = 1+2+3 = 6 (entire row 0)
prefix[2][1] = 1+4 = 5 (col 0, rows 0-1)
prefix[2][2] = 1+2+4+5 = 12 (top-left 2x2 block)
prefix[3][3] = 1+2+3+4+5+6+7+8+9 = 45 (entire matrix)
```

#### Building the Matrix (The Inclusion-Exclusion Principle)
To calculate the sum for the rectangle ending at `(r, c)`, we can use the blocks we have already calculated, but we must be careful not to double-count overlapping areas.

Formula to build:
`prefix[r][c] = matrix[r][c] + prefix[r-1][c] + prefix[r][c-1] - prefix[r-1][c-1]`

Why subtract `prefix[r-1][c-1]`?
Because adding the rectangle directly above us (`prefix[r-1][c]`) and the rectangle directly to our left (`prefix[r][c-1]`) means the top-left section was added *twice*. We subtract it once to balance it out.

```
Inclusion-Exclusion Visual:
+---------------+---------------+
|               |               |
|  prefix[r-1][c-1]  |  prefix[r-1][c]    |
|  (double counted) |  (above us) |
|               |               |
+---------------+---------------+
|               |               |
|  prefix[r][c-1]    |  matrix[r][c]       |
|  (left of us) |  (current)   |
|               |               |
+---------------+---------------+

prefix[r][c] = (above) + (left) + (current) - (overlap)
             = prefix[r-1][c] + prefix[r][c-1] + matrix[r][c] - prefix[r-1][c-1]
```

#### Dry-Run: Building First Few Cells
```
matrix:
| 1  2  3 |
| 4  5  6 |
| 7  8  9 |

Step 1: r=0, c=0
prefix[1][1] = matrix[0][0] + prefix[0][1] + prefix[1][0] - prefix[0][0]
             = 1 + 0 + 0 - 0 = 1

Step 2: r=0, c=1
prefix[1][2] = matrix[0][1] + prefix[0][2] + prefix[1][1] - prefix[0][1]
             = 2 + 0 + 1 - 0 = 3

Step 3: r=0, c=2
prefix[1][3] = matrix[0][2] + prefix[0][3] + prefix[1][2] - prefix[0][2]
             = 3 + 0 + 3 - 0 = 6

Step 4: r=1, c=0
prefix[2][1] = matrix[1][0] + prefix[1][1] + prefix[2][0] - prefix[1][0]
             = 4 + 1 + 0 - 0 = 5

Step 5: r=1, c=1
prefix[2][2] = matrix[1][1] + prefix[1][2] + prefix[2][1] - prefix[1][1]
             = 5 + 3 + 5 - 1 = 12  ← The overlap subtraction!
```

### 3. The Clean Template (1-Based Indexing)

Just like in 1D, we pad the top row and left column with `0`s to avoid out-of-bounds checks.

```cpp
class NumMatrix {
private:
    vector<vector<int>> prefix;

public:
    NumMatrix(vector<vector<int>>& matrix) {
        int ROWS = matrix.size();
        int COLS = matrix[0].size();
        
        // Pad with +1 for the dummy row and column
        prefix = vector<vector<int>>(ROWS + 1, vector<int>(COLS + 1, 0));
        
        // Build the 2D prefix array
        for (int r = 0; r < ROWS; r++) {
            for (int c = 0; c < COLS; c++) {
                // Notice the +1 padding shift
                prefix[r + 1][c + 1] = matrix[r][c] 
                                     + prefix[r][c + 1] 
                                     + prefix[r + 1][c] 
                                     - prefix[r][c]; // Remove the double-counted area
            }
        }
    }
    
    int sumRegion(int r1, int c1, int r2, int c2) {
        // Because of the +1 padding, the bottom right corner is r2+1, c2+1
        // The top left corner to subtract is r1, c1
        
        int bottom_right = prefix[r2 + 1][c2 + 1];
        int top_rectangle = prefix[r1][c2 + 1];
        int left_rectangle = prefix[r2 + 1][c1];
        int top_left_overlap = prefix[r1][c1];
        
        // Same inclusion-exclusion principle!
        return bottom_right - top_rectangle - left_rectangle + top_left_overlap;
    }
};
```

**What's happening (Building):**
- We create a `(ROWS+1) x (COLS+1)` prefix matrix filled with zeros.
- For each cell `(r, c)` in the original matrix, we compute `prefix[r+1][c+1]` by adding the current cell value to the sum of the rectangle above, to the left, and subtracting the overlap.
- The `+1` shift ensures we never access negative indices.

**What's happening (Querying):**
- `sumRegion(r1, c1, r2, c2)` uses the inclusion-exclusion principle to extract any sub-rectangle in O(1).
- `prefix[r2+1][c2+1]` is the sum of everything from `(0,0)` to `(r2, c2)`.
- We subtract the rectangle above (`r1, c2+1`) and left (`r2+1, c1`), then add back the double-subtracted overlap (`r1, c1`).

### 4. Dry-Run Table: Building the Prefix Matrix

Given the matrix:
```
| 1  2  3 |
| 4  5  6 |
| 7  8  9 |
```

| Step | r | c | matrix[r][c] | prefix[r][c+1] (above) | prefix[r+1][c] (left) | prefix[r][c] (overlap) | prefix[r+1][c+1] (result) |
|------|---|---|-------------|----------------------|---------------------|----------------------|--------------------------|
| 1    | 0 | 0 | 1           | 0                    | 0                   | 0                    | 1                        |
| 2    | 0 | 1 | 2           | 0                    | 1                   | 0                    | 3                        |
| 3    | 0 | 2 | 3           | 0                    | 3                   | 0                    | 6                        |
| 4    | 1 | 0 | 4           | 1                    | 0                   | 0                    | 5                        |
| 5    | 1 | 1 | 5           | 3                    | 5                   | 1                    | 12                       |
| 6    | 1 | 2 | 6           | 6                    | 12                  | 3                    | 21                       |
| 7    | 2 | 0 | 7           | 5                    | 0                   | 0                    | 12                       |
| 8    | 2 | 1 | 8           | 12                   | 12                  | 5                    | 27                       |
| 9    | 2 | 2 | 9           | 21                   | 27                  | 12                   | 45                       |

Final prefix matrix:
```
|  0   0   0   0 |
|  0   1   3   6 |
|  0   5  12  21 |
|  0  12  27  45 |
```

### 5. Dry-Run Table: Querying `sumRegion(1, 1, 2, 2)`

We want the sum of the sub-matrix:
```
| 5  6 |
| 8  9 |
```
Expected sum: 5+6+8+9 = 28

| Variable             | Value | Source                          |
|---------------------|-------|---------------------------------|
| r1=1, c1=1, r2=2, c2=2 | —   | Input                           |
| bottom_right        | 45    | prefix[3][3] = sum(0,0 → 2,2)   |
| top_rectangle       | 6     | prefix[1][3] = sum(0,0 → 0,2)   |
| left_rectangle      | 12    | prefix[3][1] = sum(0,0 → 2,0)   |
| top_left_overlap    | 1     | prefix[1][1] = sum(0,0 → 0,0)   |
| Result              | 28    | 45 - 6 - 12 + 1 = 28 ✓         |

### 6. How `sumRegion` Works Visually

If you want the sum of a specific sub-rectangle in the bottom right:
1. Start with the massive rectangle from `(0,0)` to your bottom-right corner.
2. Subtract the large rectangle completely above your region.
3. Subtract the large rectangle completely to the left of your region.
4. You just subtracted the top-left corner *twice*. Add it back once!

```
Step 1: Take full rectangle        Step 2: Subtract top rectangle
+---+---+---+---+                  +---+---+---+---+
| A | B | C | D |                  |///|///|///|///|  ← remove
+---+---+---+---+                  +---+---+---+---+
| E | F | G | H |                  |   |   |   |   |
+---+---+---+---+    →             +---+---+---+---+
| I | J | K | L |                  |   | [ | ] |   |
+---+---+---+---+                  +---+---+---+---+
| M | N | O | P |                  |   |   |   |   |
+---+---+---+---+                  +---+---+---+---+

Step 3: Subtract left rectangle    Step 4: Add back overlap
+---+---+---+---+                  +---+---+---+---+
|///|   |   |   |                  |   |   |   |   |
+---+---+---+---+                  +---+---+---+---+
|///|   |   |   |                  |   |   |   |   |
+---+---+---+---+    →             +---+---+---+---+
|///| [ | ] |   |                  |   | + |   |   |
+---+---+---+---+                  +---+---+---+---+
|///|   |   |   |                  |   |   |   |   |
+---+---+---+---+                  +---+---+---+---+
          ↑ overlap removed twice        ↑ added back once
```

#### ASCII Diagram: Query Process with Numbers
```
Matrix with values:
| 1  2  3  4 |
| 5  6  7  8 |
| 9 10 11 12 |
|13 14 15 16 |

Query: sumRegion(1, 1, 2, 2) → sub-matrix:
| 6  7 |
|10 11 |
Expected: 6+7+10+11 = 34

prefix matrix:
|  0   0   0   0   0 |
|  0   1   3   6  10 |
|  0   6  15  27  43 |
|  0  15  36  63  99 |
|  0  28  63 114 180 |

bottom_right = prefix[3][3] = 63 (sum of 0,0 → 2,2)
top_rectangle = prefix[1][3] = 6 (sum of 0,0 → 0,2)
left_rectangle = prefix[3][1] = 15 (sum of 0,0 → 2,0)
top_left_overlap = prefix[1][1] = 1 (sum of 0,0 → 0,0)

Result = 63 - 6 - 15 + 1 = 43
Wait, let me recalculate...

Actually for sumRegion(1,1,2,2):
bottom_right = prefix[3][3] = 63
top_rectangle = prefix[1][3] = 6
left_rectangle = prefix[3][1] = 15
overlap = prefix[1][1] = 1

63 - 6 - 15 + 1 = 43

But actual sum should be 6+7+10+11 = 34...

Let me recalculate prefix:
| 1  2  3  4 |
| 5  6  7  8 |
| 9 10 11 12 |
|13 14 15 16 |

prefix[1][1] = 1
prefix[1][2] = 1+2 = 3
prefix[1][3] = 1+2+3 = 6
prefix[1][4] = 1+2+3+4 = 10

prefix[2][1] = 1+5 = 6
prefix[2][2] = 1+2+5+6 = 14
prefix[2][3] = 1+2+3+5+6+7 = 24
prefix[2][4] = 1+2+3+4+5+6+7+8 = 36

prefix[3][1] = 1+5+9 = 15
prefix[3][2] = 1+2+5+6+9+10 = 33
prefix[3][3] = 1+2+3+5+6+7+9+10+11 = 54
prefix[3][4] = 1+2+3+4+5+6+7+8+9+10+11+12 = 78

So sumRegion(1,1,2,2):
= prefix[3][3] - prefix[1][3] - prefix[3][1] + prefix[1][1]
= 54 - 6 - 15 + 1 = 34 ✓
```

### 7. Code Variation: Edge Case — Single Cell Query

```cpp
// Query a single cell: sumRegion(1, 1, 1, 1) → should return matrix[1][1]
int singleCell = sumRegion(1, 1, 1, 1);
// bottom_right = prefix[2][2], top_rectangle = prefix[1][2], 
// left_rectangle = prefix[2][1], overlap = prefix[1][1]
// Result: prefix[2][2] - prefix[1][2] - prefix[2][1] + prefix[1][1]
```

**What's happening:** The formula works for single cells too — the inclusion-exclusion collapses to just the cell value. This is why the 1-based padding is so important: it keeps the formula uniform.

#### Dry-Run: Single Cell Query
```
Query: sumRegion(1, 1, 1, 1) on matrix:
| 1  2  3 |
| 4  5  6 |
| 7  8  9 |

Expected: matrix[1][1] = 5

prefix:
|  0   0   0   0 |
|  0   1   3   6 |
|  0   5  12  21 |
|  0  12  27  45 |

bottom_right = prefix[2][2] = 12
top_rectangle = prefix[1][2] = 3
left_rectangle = prefix[2][1] = 5
overlap = prefix[1][1] = 1

Result = 12 - 3 - 5 + 1 = 5 ✓
```

### 8. Common Mistake: Off-By-One Errors

```cpp
// ❌ WRONG: Forgetting the +1 padding shift
int sumRegion(int r1, int c1, int r2, int c2) {
    return prefix[r2][c2] - prefix[r1][c2] - prefix[r2][c1] + prefix[r1][c1];
}

// ✅ CORRECT: Account for 1-based indexing
int sumRegion(int r1, int c1, int r2, int c2) {
    return prefix[r2 + 1][c2 + 1] - prefix[r1][c2 + 1] - prefix[r2 + 1][c1] + prefix[r1][c1];
}
```

**What's happening:** Without the `+1` shift, you're indexing into the wrong cells. The padded zero row/column exists specifically so `sumRegion(0, 0, 0, 0)` works correctly — `prefix[1][1] - prefix[0][1] - prefix[1][0] + prefix[0][0]`.

#### Dry-Run: Off-By-One Error
```
Query: sumRegion(0, 0, 0, 0) on matrix:
| 1  2  3 |
| 4  5  6 |
| 7  8  9 |

Correct formula:
prefix[1][1] - prefix[0][1] - prefix[1][0] + prefix[0][0]
= 1 - 0 - 0 + 0 = 1 ✓

Wrong formula (no +1):
prefix[0][0] - prefix[0][0] - prefix[0][0] + prefix[0][0]
= 0 - 0 - 0 + 0 = 0 ✗ (should be 1!)
```

### 9. Common Mistake: Forgetting the Overlap Add-Back

```cpp
// ❌ WRONG: Only subtracting, not adding back the overlap
int sumRegion(int r1, int c1, int r2, int c2) {
    return prefix[r2+1][c2+1] - prefix[r1][c2+1] - prefix[r2+1][c1];
    // Missing: + prefix[r1][c1]
}
```

**What's happening:** The top-left rectangle `prefix[r1][c1]` is included in BOTH `prefix[r1][c2+1]` and `prefix[r2+1][c1]`. If you only subtract, you remove it twice. Adding it back once corrects the double-subtraction.

#### Dry-Run: Missing Overlap Add-Back
```
Query: sumRegion(1, 1, 2, 2) on matrix:
| 1  2  3 |
| 4  5  6 |
| 7  8  9 |

Correct: 45 - 6 - 12 + 1 = 28
Wrong (no add-back): 45 - 6 - 12 = 27 ✗

The overlap (prefix[1][1] = 1) was subtracted twice:
- Once in prefix[1][3] = 6 (includes matrix[0][0])
- Once in prefix[3][1] = 12 (includes matrix[0][0])
So we add it back once: +1
```

### 10. Production Variation: Using Long Long for Large Matrices

```cpp
class NumMatrix {
private:
    vector<vector<long long>> prefix;

public:
    NumMatrix(vector<vector<int>>& matrix) {
        int ROWS = matrix.size();
        int COLS = matrix[0].size();
        prefix = vector<vector<long long>>(ROWS + 1, vector<long long>(COLS + 1, 0));
        
        for (int r = 0; r < ROWS; r++) {
            for (int c = 0; c < COLS; c++) {
                prefix[r + 1][c + 1] = (long long)matrix[r][c] 
                                     + prefix[r][c + 1] 
                                     + prefix[r + 1][c] 
                                     - prefix[r][c];
            }
        }
    }
    
    long long sumRegion(int r1, int c1, int r2, int c2) {
        return prefix[r2 + 1][c2 + 1] - prefix[r1][c2 + 1] 
             - prefix[r2 + 1][c1] + prefix[r1][c1];
    }
};
```

**What's happening:** For large matrices (1000x1000) with large values (up to 10^4), the total sum can exceed `int` range (max ~2.1 billion). Using `long long` prevents overflow in competitive programming and production systems.

#### Overflow Example
```
Matrix: 1000x1000, all values = 10000
Total sum = 1000 * 1000 * 10000 = 10^10
int max = ~2.1 * 10^9

10^10 > 2.1 * 10^9 → OVERFLOW!

With long long:
long long max = ~9.2 * 10^18
10^10 < 9.2 * 10^18 → Safe ✓
```

### 11. Error Scenario: Empty Matrix

```cpp
// What happens if matrix is empty?
NumMatrix obj({});  // matrix.size() == 0
// prefix becomes a 1x1 matrix: {{0}}
// Any call to sumRegion will access out-of-bounds indices

// ✅ Defensive check
NumMatrix(vector<vector<int>>& matrix) {
    if (matrix.empty() || matrix[0].empty()) {
        prefix = {{0}};
        return;
    }
    // ... normal construction
}
```

**What's happening:** An empty matrix means `ROWS = 0` or `COLS = 0`. The prefix matrix would be `1x1` with just a zero, but any query would try to access indices beyond the bounds. Always check for empty input.

#### Edge Case: Single Row Matrix
```
Matrix: | 1  2  3 |

This is a valid 1x3 matrix.
prefix:
| 0  0  0  0 |
| 0  1  3  6 |

Query: sumRegion(0, 1, 0, 2)
= prefix[1][3] - prefix[0][3] - prefix[1][1] + prefix[0][1]
= 6 - 0 - 1 + 0 = 5
Verify: matrix[0][1] + matrix[0][2] = 2 + 3 = 5 ✓
```

### 12. Error Scenario: Negative Values

```cpp
// Negative values work fine with the same formula!
// matrix: | -1  2 |
//         |  3 -4 |
// prefix: |  0  0  0 |
//         |  0 -1  1 |
//         |  0  2 -1 |
//
// sumRegion(0, 0, 1, 1) = prefix[2][2] - prefix[0][2] - prefix[2][0] + prefix[0][0]
//                       = -1 - 0 - 0 + 0 = -1 ✓ (which is -1+2+3-4 = 0... wait)
// Actually: -1 + 2 + 3 + (-4) = 0 ✓
```

**What's happening:** The inclusion-exclusion principle works regardless of sign. Negative values don't break the prefix sum — they're just added normally during the build phase.

#### Dry-Run: Matrix with Negatives
```
Matrix:
| -1   2 |
|  3  -4 |

Building prefix:
prefix[1][1] = -1
prefix[1][2] = -1 + 2 = 1
prefix[2][1] = -1 + 3 = 2
prefix[2][2] = -1 + 2 + 3 + (-4) = 0

Query: sumRegion(0, 0, 1, 1)
= prefix[2][2] - prefix[0][2] - prefix[2][0] + prefix[0][0]
= 0 - 0 - 0 + 0 = 0 ✓

Query: sumRegion(0, 0, 0, 0)
= prefix[1][1] - prefix[0][1] - prefix[1][0] + prefix[0][0]
= -1 - 0 - 0 + 0 = -1 ✓
```

### 13. Comparison: Brute Force vs 2D Prefix Sum

| Aspect              | Brute Force              | 2D Prefix Sum            |
|---------------------|--------------------------|--------------------------|
| Build Time          | O(1) (no build)          | O(R × C)                 |
| Query Time          | O(R × C) per query       | O(1) per query           |
| Space               | O(1) extra               | O(R × C) extra           |
| Best For            | Single query             | Multiple queries         |
| Q queries total     | O(Q × R × C)             | O(R × C + Q)             |
| When to use         | Q ≤ 10                   | Q > 10 or frequent queries |

#### Code Comparison
```cpp
// Brute Force: Simple but slow for many queries
int sumRegion(vector<vector<int>>& matrix, int r1, int c1, int r2, int c2) {
    int sum = 0;
    for (int r = r1; r <= r2; r++) {
        for (int c = c1; c <= c2; c++) {
            sum += matrix[r][c];
        }
    }
    return sum;
}

// 2D Prefix Sum: Build once, query fast
NumMatrix obj(matrix);  // O(R×C) build
obj.sumRegion(r1, c1, r2, c2);  // O(1) query
```

### 14. Comparison: 1D vs 2D Prefix Sum

| Aspect              | 1D Prefix Sum            | 2D Prefix Sum            |
|---------------------|--------------------------|--------------------------|
| Input               | Single array             | 2D matrix                |
| Build formula       | `prefix[i] = prefix[i-1] + arr[i-1]` | `prefix[r][c] = matrix[r][c] + prefix[r-1][c] + prefix[r][c-1] - prefix[r-1][c-1]` |
| Query formula       | `prefix[r+1] - prefix[l]` | Inclusion-exclusion with 4 corners |
| Padding needed      | 1 dummy element          | Dummy row + column       |
| Time complexity     | O(N) build, O(1) query   | O(R×C) build, O(1) query |
| Space complexity    | O(N)                     | O(R×C)                   |

### 15. Advanced: Row-Column Compression

Sometimes you need sum of entire rows or columns efficiently:

```cpp
// Row sum: sum of entire row r
int rowSum = prefix[r+1][COLS+1] - prefix[r][COLS+1] - prefix[r+1][0] + prefix[r][0];
// Simplifies to: prefix[r+1][COLS+1] - prefix[r][COLS+1]

// Column sum: sum of entire column c
int colSum = prefix[ROWS+1][c+1] - prefix[0][c+1] - prefix[ROWS+1][c] + prefix[0][c];
// Simplifies to: prefix[ROWS+1][c+1] - prefix[ROWS+1][c]
```

#### What's Happening
```
Row sum for row r (0-indexed):
= sum of matrix[r][0..COLS-1]
= prefix[r+1][COLS] - prefix[r][COLS]

Column sum for column c (0-indexed):
= sum of matrix[0..ROWS-1][c]
= prefix[ROWS][c+1] - prefix[ROWS][c]

These are O(1) lookups using the prefix matrix!
```

### 16. Quick Reference Table

| Concept               | Formula / Detail                                    |
|-----------------------|-----------------------------------------------------|
| Build                 | `prefix[r+1][c+1] = matrix[r][c] + prefix[r][c+1] + prefix[r+1][c] - prefix[r][c]` |
| Query                 | `prefix[r2+1][c2+1] - prefix[r1][c2+1] - prefix[r2+1][c1] + prefix[r1][c1]` |
| Padding               | +1 row and +1 column of zeros (1-based indexing)    |
| Build Time            | O(R × C)                                            |
| Query Time            | O(1)                                                |
| Space                 | O(R × C)                                            |
| Handles negatives?    | Yes                                                 |
| Edge: empty matrix    | Check `matrix.empty()` before building              |
| Edge: single cell     | Formula works naturally with padding                |
| Common bug            | Off-by-one: forgetting `+1` in query indices        |
| Common bug            | Missing overlap add-back in query formula           |
| Use case              | Multiple range-sum queries on a static 2D matrix    |
| Row sum               | `prefix[r+1][COLS] - prefix[r][COLS]`               |
| Column sum            | `prefix[ROWS][c+1] - prefix[ROWS][c]`               |

### Summary
- **Trigger:** "Find the sum of elements in a 2D sub-matrix multiple times."
- **Logic:** Build a padded 2D prefix array using the Inclusion-Exclusion principle.
- **Complexity:** $O(R \times C)$ Time to build, $O(1)$ Time per query. $O(R \times C)$ Space.

---

## Interactive Visualization & `shadcn/ui` Specification (For Claude)

> **UI Constraint:** Use **`shadcn/ui` primitives exclusively** (`<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`, `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>`, `<Slider>`, `<Button>`, `<Badge>`, `<Select>`, `<Switch>`, `<Table>`, `<Tooltip>`, `<ScrollArea>`). Do **not** use raw browser `<input type="range">`, `<select>`, or default checkboxes.

### 1. Interactive Canvas / Diagram to Render for **Chapter 3: 2D Prefix Sums**
- **Step-by-Step Memory & Algorithm State Visualizer:**
  - Render an interactive visual state diagram for **chapter3 2d prefix sums** showing each element, index, and active pointer (`i`, `j`, `left`, `right`, `mid`, `curr`, or recursion stack frame) as animated `<Card>` / SVG nodes with `<Badge>` pointer tags.
  - Highlight active comparisons in **cyan (`#38BDF8`)**, confirmed matches/optimal path in **emerald (`#10B981`)**, and pruned/rejected branches or evicted elements in **rose (`#F43F5E`)**.
- **Synchronized Code & Dry-Run Trace:**
  - Highlight the currently executing C++ line as the user steps through the algorithm, updating a live `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) with all local variable values and time/space counters at step $k$.

### 2. Required `shadcn/ui` Controls
- **Playback Toolbar:** `<Button variant="outline" size="sm">` controls for **Reset**, **Step Back**, **Play / Pause**, and **Step Forward**.
- **Speed & Input Controls:** `<Slider>` for execution speed ($0.25\times$ to $4\times$) and input size $N$, plus `<Select>` to switch between preset test cases (*Standard Case*, *Worst-Case / Edge Case*, *Duplicates / Empty*).
- **Code Variation Switcher:** `<Tabs>` switching between *Brute Force*, *Optimal C++ STL Template*, and *Edge-Case Hardened* implementations.


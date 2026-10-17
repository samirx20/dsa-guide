# Part 0, Topic 1: C++ & Memory From Scratch
## Chapter 1: How RAM Works, Variables, Types & Stack vs. Heap

Before you write a single data structure or algorithm in C++, you need a rock-solid mental model of **where your data actually lives**. Languages like Python and JavaScript hide the hardware from you behind layers of abstraction. C++ does not. It puts you directly in the driver's seat of the computer's physical memory.

Once you can picture RAM as a physical grid of numbered byte boxes, concepts that terrify most beginners — pointers, references, stack overflows, memory leaks, and $O(1)$ array indexing — become completely obvious.

---

### 1. What is RAM, Really?

**RAM** (*Random Access Memory*) is your computer's short-term workbench. Physically, you can picture all of RAM as one **giant, continuous street of numbered mailboxes** stretching from box `0` up to box `17,179,869,183` (on a 16 GB machine).

Every single mailbox on this street has two things:
1. **An Address (The House Number):** A unique number identifying *where* the box is located, almost always written in hexadecimal (base-16, prefixed with `0x`, like `0x7ffee4b0`).
2. **A Value (The Contents):** Exactly **1 byte** (**8 bits**, or eight `0`/`1` switches) of data stored inside that box. Because 8 bits have $2^8 = 256$ possible combinations, a single byte box can hold a raw number from `0` (`00000000` in binary, `0x00` in hex) to `255` (`11111111` in binary, `0xFF` in hex).

```
Physical View of RAM (A Giant Array of 1-Byte Boxes):

  Address:   0x1000      0x1001      0x1002      0x1003      0x1004      0x1005
           +-----------+-----------+-----------+-----------+-----------+-----------+
  Binary:  | 01000001  | 00000000  | 00101010  | 00000000  | 00000000  | 00000001  |
           +-----------+-----------+-----------+-----------+-----------+-----------+
  Hex:     |   0x41    |   0x00    |   0x2A    |   0x00    |   0x00    |   0x01    |
           +-----------+-----------+-----------+-----------+-----------+-----------+
             (1 byte)    (1 byte)    (1 byte)    (1 byte)    (1 byte)    (1 byte)
```

Why is it called **Random Access** Memory? Because the CPU can jump directly to *any* address — whether `0x1000` or `0x9F804420` — in the exact same amount of time (roughly a few nanoseconds). It does not have to walk past boxes `0` through `999` to reach box `1000`. That hardware property is the entire reason array indexing `arr[i]` runs in $O(1)$ constant time!

---

### 2. Variables & Fundamental Types: Claiming Contiguous Bytes

Writing `0x7ffee4b0` every time you want to store a player's score would drive you insane. A **variable** is simply a human-readable nickname that the C++ compiler maps to a specific memory address.

Wait: if a single byte box can only hold numbers up to `255`, how do we store the number `1,000,000` or `-42` or `3.14159`?
**By gluing multiple adjacent (contiguous) byte boxes together!**

That is what a **Data Type** (`int`, `double`, `char`, `bool`) tells the compiler:
1. **How many consecutive bytes** of RAM to reserve.
2. **How to interpret the bits** inside those bytes (e.g., as a whole number, a decimal number, or an ASCII character).

```
How Different Types Occupy Contiguous Bytes in RAM:

  bool isReady = true;        (1 byte at 0x1000)
  char grade   = 'A';         (1 byte at 0x1001, ASCII 65 = 0x41)
  int  score   = 258;         (4 bytes combined: 0x1004 .. 0x1007)
  double pi    = 3.14159265;  (8 bytes combined: 0x1008 .. 0x100F)

  Addr:  0x1000  0x1001  0x1002..03  0x1004  0x1005  0x1006  0x1007  0x1008 .. 0x100F
        +-------+-------+-----------+-------+-------+-------+-------+-----------------+
  RAM:  |  0x01 |  'A'  | (padding) |  0x02 |  0x01 |  0x00 |  0x00 |   3.14159265    |
        +-------+-------+-----------+-------+-------+-------+-------+-----------------+
        |_______|_______|           |_______________________________|_________________|
         isReady  grade                     score (4 bytes)             pi (8 bytes)
         (1 B)    (1 B)
```

Let's see this in action with real C++ code using the built-in `sizeof()` operator, which asks the compiler how many bytes a type or variable occupies:

```cpp
#include <iostream>
using namespace std;

int main() {
    bool isAlive = true;          // 1 byte  (true = 1, false = 0)
    char initial = 'S';           // 1 byte  (stores ASCII code 83)
    int health = 100;             // 4 bytes (32 bits: ~ -2.14B to +2.14B)
    long long population = 8000000000LL; // 8 bytes (64 bits: up to ~9e18)
    double velocity = 9.81;       // 8 bytes (64-bit IEEE-754 floating point)

    cout << "bool bytes:      " << sizeof(isAlive) << "\n";
    cout << "char bytes:      " << sizeof(initial) << "\n";
    cout << "int bytes:       " << sizeof(health) << "\n";
    cout << "long long bytes: " << sizeof(population) << "\n";
    cout << "double bytes:    " << sizeof(velocity) << "\n";

    return 0;
}
```

**What's happening:**
```cpp
bool isAlive = true;
//   ^^^^^^^   ^^^^
//   Name of   Stored as 00000001 in 1 byte of RAM.
//   the box   Why 1 full byte for a single true/false bit? Because the
//             smallest addressable unit in RAM is 1 byte!

char initial = 'S';
//             ^^^
//             Single quotes mean a single character literal.
//             In RAM, there are no letters — only numbers. 'S' is stored
//             as the number 83 (0x53 in hex) per the ASCII table.

int health = 100;
//  ^^^^^^
//  Reserves 4 contiguous bytes (32 bits). Out of 32 bits, 1 bit stores
//  the sign (+/-) and 31 bits store the magnitude.

long long population = 8000000000LL;
//                     ^^^^^^^^^^^^
//                     8 billion exceeds the max of a 4-byte int (~2.14 billion).
//                     The 'LL' suffix tells C++ this literal is a 64-bit long long.

cout << sizeof(health);
//      ^^^^^^^^^^^^^^
//      Evaluated at compile time! Replaced directly with the number 4.
//      Time complexity: O(1) — zero runtime cost.
```

---

### 3. Signed vs. Unsigned & The Integer Overflow Trap

A standard `int` uses **32 bits** (4 bytes). That gives $2^{32} = 4,294,967,296$ possible bit patterns. How we split those patterns depends on whether the integer is **signed** or **unsigned**:

- **`int` (Signed by default):** Splits the range in half so we can represent negative numbers using **Two's Complement** encoding.
  - Range: $-2^{31}$ to $2^{31} - 1$ $\longrightarrow$ **`-2,147,483,648` to `+2,147,483,647`** (roughly $\pm 2.14 \times 10^9$).
- **`unsigned int`:** Uses all 32 bits for non-negative numbers only.
  - Range: $0$ to $2^{32} - 1$ $\longrightarrow$ **`0` to `4,294,967,295`** (roughly $4.29 \times 10^9$).

#### What Happens When You Run Out of Bits? (The Odometer Wrap-Around)

Imagine a 3-digit mechanical car odometer at `999`. If you drive 1 more mile, the fourth digit has nowhere to go, so the odometer wraps back around to `000`.

Binary numbers in fixed-width byte boxes behave the exact same way!

```
The 32-Bit Signed int Number Wheel (Two's Complement):

                     0  (0x00000000)
                  .  |  .
              -1     |     +1
            .        |        .
          -2         |         +2
         .           |           .
        .            |            .
         .           |           .
   -2,147,483,647    |    +2,147,483,646
            .        |        .
              .      |      .
   -2,147,483,648 ---+--- +2,147,483,647 (INT_MAX = 0x7FFFFFFF)
   (INT_MIN = 0x80000000)
                  ^     ^
                  |_____|
          Adding +1 to INT_MAX crosses
          the boundary into INT_MIN!
```

Let's inspect the exact bits when we add `1` to `INT_MAX`, or subtract `1` from an unsigned `0`:

```cpp
#include <iostream>
#include <climits> // Provides INT_MAX and INT_MIN
using namespace std;

int main() {
    int maxScore = INT_MAX;          // 2,147,483,647
    cout << "Max int: " << maxScore << "\n";

    // DANGER: Signed integer overflow (Undefined Behavior in C++, wraps on x86/ARM)
    int wrapped = maxScore + 1;      // Wraps to -2,147,483,648!
    cout << "Max + 1: " << wrapped << "\n";

    // DANGER: Unsigned underflow (Wraps around modulo 2^32)
    unsigned int items = 0;
    unsigned int underflowed = items - 1; // Wraps to 4,294,967,295!
    cout << "Unsigned 0 - 1: " << underflowed << "\n";

    return 0;
}
```

**What's happening:**
```cpp
int maxScore = INT_MAX;
//  In binary: 01111111 11111111 11111111 11111111
//             ^
//             Sign bit is 0 (positive). All 31 value bits are 1.

int wrapped = maxScore + 1;
//            ^^^^^^^^^^^^
//  Binary addition:
//    01111111 11111111 11111111 11111111  (+2,147,483,647)
//  + 00000000 00000000 00000000 00000001  (+1)
//  -------------------------------------
//    10000000 00000000 00000000 00000000  (-2,147,483,648 = INT_MIN!)
//    ^
//    The carry spilled into the sign bit, flipping the number negative!

unsigned int underflowed = items - 1;
//                         ^^^^^^^^^
//  Binary subtraction on 0:
//    00000000 00000000 00000000 00000000  (0)
//  - 00000000 00000000 00000000 00000001  (1)
//  -------------------------------------
//    11111111 11111111 11111111 11111111  (4,294,967,295 = UINT_MAX!)
```

> **Rule of Thumb for Interviews & Robotics:** Whenever two numbers multiplied or added together might exceed $2 \times 10^9$ (for example, $10^5 \times 10^5 = 10^{10}$), **always use `long long`** (64-bit integer, up to $\approx 9.22 \times 10^{18}$). And be extremely careful with `vector.size() - 1` when a vector is empty, because `size()` returns an unsigned `size_t` — so `0 - 1` becomes `18,446,744,073,709,551,615`!

---

### 4. How a C++ Program Compiles & Loads Into RAM

Your CPU cannot read C++ text like `int x = 5;`. It only understands raw binary machine instructions (like `MOV DWORD PTR [rbp-4], 5`). To bridge that gap, your code goes through a 4-stage compilation pipeline before it ever runs:

```
The C++ Compilation Pipeline:

  main.cpp               main.ii                main.s                 main.o               a.out / main.exe
 (Source Code)          (Expanded C++)         (Assembly)            (Machine Code)          (Executable)
+---------------+     +----------------+     +---------------+     +----------------+     +------------------+
| #include ...  | --> | 20,000 lines   | --> | mov eax, 5    | --> | 01001000 1000  | --> | Final runnable   |
| int main() {} |     | pasted in      |     | add eax, 10   |     | 11000111 ...   |     | binary program   |
+---------------+     +----------------+     +---------------+     +----------------+     +------------------+
                 1. Preprocessor        2. Compiler           3. Assembler          4. Linker
                 (Expands #include)     (C++ -> Assembly)     (Asm -> Object .o)    (Combines .o + libs)
```

When you double-click or run `./main`, the Operating System (Linux, macOS, or Windows) creates a **Process** and carves out a dedicated virtual memory layout in RAM divided into four distinct zones:

```
Process Memory Layout in RAM (High Address -> Low Address):

  High Address (e.g., 0x7FFF_FFFF_FFFF)
  +-----------------------------------+
  |             THE STACK             |  <-- Local variables, function arguments,
  |  (Grows DOWNWARD as functions     |      return addresses. Managed AUTOMATICALLY!
  |   are called: main -> foo -> bar) |
  |                 |                 |
  |                 v                 |
  |                                   |
  |         (Free Space Gap)          |
  |                                   |
  |                 ^                 |
  |                 |                 |
  |             THE HEAP              |  <-- Dynamic memory (new, malloc, std::vector's
  |  (Grows UPWARD when you allocate  |      internal buffer). Managed via pointers!
  |   large/dynamic data at runtime)  |
  +-----------------------------------+
  |      DATA / BSS SEGMENT           |  <-- Global and static variables
  +-----------------------------------+
  |      TEXT (CODE) SEGMENT          |  <-- Your compiled machine instructions (Read-Only)
  +-----------------------------------+
  Low Address (e.g., 0x0040_0000)
```

---

### 5. The Stack vs. The Heap

Understanding the difference between **The Stack** and **The Heap** is one of the most important milestones in becoming a real systems or algorithms engineer.

#### 1. The Stack (Automatic, Ultra-Fast, Scratchpad Memory)
Think of the Stack like a **stack of cafeteria trays** (Last-In, First-Out — **LIFO**):
- Every time you call a function (like `main()` calling `calculateTax()`), the CPU pushes a new block of memory called a **Stack Frame** onto the top of the stack.
- All local variables declared inside `calculateTax()` live inside that frame.
- The instant `calculateTax()` hits its closing brace `}` or `return`, its entire stack frame is **popped off and reclaimed automatically** in a single CPU instruction (by simply moving a hardware register called the *Stack Pointer*).
- **Catch:** Stack memory is small (typically **1 MB to 8 MB** total), and every variable placed directly on the stack must have a **known, fixed size at compile time**.

#### 2. The Heap (Dynamic, Huge, Long-Lived Memory)
Think of the Heap like a **massive hotel where you check in and check out of rooms on demand**:
- When you don't know ahead of time how much data you'll need (e.g., loading a 500 MB LiDAR point cloud or growing a `std::vector` from 10 items to 1,000,000 items at runtime), you request memory from the **Heap**.
- The Heap is huge — bounded only by your computer's gigabytes of physical RAM.
- Unlike the Stack, data on the Heap does **not** vanish automatically when the function that created it returns. It stays alive until it is explicitly freed (either manually with `delete`, or automatically by an RAII container like `std::vector` or `std::unique_ptr`).
- **Catch:** Finding an open block of memory on the Heap takes more bookkeeping work by the OS allocator, so Heap allocation is significantly slower than bumping the Stack pointer.

| Feature | The Stack | The Heap |
|---------|-----------|----------|
| **How it's managed** | Automatically by CPU on function call/return (LIFO) | Dynamically at runtime (`new`/`delete`, or inside `std::vector`) |
| **Allocation speed** | Instantaneous (1 CPU instruction moves Stack Pointer) | Slower (OS allocator searches for a free block) |
| **Size limit** | Small (~1 MB – 8 MB; exceeding causes **Stack Overflow**) | Huge (Gigabytes — limited by system RAM) |
| **Lifetime** | Dies immediately at the closing `}` of its scope | Lives until explicitly deallocated |
| **Access pattern** | Direct variable access (e.g., `int x = 10;`) | Accessed via a pointer stored on the stack (`int* p = new int(10);`) |

---

### 6. Dry-Run Trace: Watching Stack Frames Grow and Shrink

Let's trace a complete C++ program line-by-line to watch how the CPU pushes and pops **Stack Frames** in RAM, and how a Stack pointer can point to a block on the **Heap**.

```cpp
#include <iostream>
using namespace std;

int square(int n) {                  // Step 3: square() frame pushed
    int result = n * n;              // Step 4: result computed on stack
    return result;                   // Step 5: square() frame popped!
}

int sumOfSquares(int a, int b) {     // Step 2: sumOfSquares() frame pushed
    int sqA = square(a);             // Calls square(3)
    int sqB = square(b);             // Step 6: Calls square(4)
    return sqA + sqB;                // Step 7: sumOfSquares() frame popped!
}

int main() {                         // Step 1: main() frame pushed
    int x = 3;
    int y = 4;
    int total = sumOfSquares(x, y);  // Step 7: receives 25

    // Allocating a dynamic integer on the Heap:
    int* heapVal = new int(999);     // Step 8: pointer on Stack, 999 on Heap
    cout << total << " " << *heapVal << "\n";

    delete heapVal;                  // Step 9: frees the Heap memory
    return 0;                        // Step 10: main() frame popped!
}
```

#### Visual Stack & Heap Snapshot at Peak Depth (Inside `square(3)` at Step 4):

```
STACK (Grows Downward)                                   HEAP (Grows Upward)
+----------------------------------------------+         +----------------------------------+
| [Frame 1: main()]                            |         | (Empty at Step 4; at Step 8,     |
|   x       = 3          (Addr: 0x7FFF_0030)   |         |  Address 0x5500_00A0 will hold   |
|   y       = 4          (Addr: 0x7FFF_002C)   |         |  the 4-byte integer 999)         |
|   total   = <waiting>  (Addr: 0x7FFF_0028)   |         +----------------------------------+
+----------------------------------------------+
| [Frame 2: sumOfSquares(a=3, b=4)]            |
|   a       = 3          (Addr: 0x7FFF_0018)   |
|   b       = 4          (Addr: 0x7FFF_0014)   |
|   sqA     = <waiting>  (Addr: 0x7FFF_0010)   |
|   sqB     = <uninit>   (Addr: 0x7FFF_000C)   |
+----------------------------------------------+
| [Frame 3: square(n=3)]  <-- ACTIVE TOP FRAME |
|   n       = 3          (Addr: 0x7FFE_FFF8)   |
|   result  = 9          (Addr: 0x7FFE_FFF4)   |
+----------------------------------------------+
  ^-- Stack Pointer (RSP) is here right now!
```

#### Full Step-by-Step Dry-Run Trace Table

| Step | Active Function | Action Executed | Active Stack Frames (Bottom $\to$ Top) | Top Frame Variables | Heap Contents |
|------|-----------------|-----------------|----------------------------------------|---------------------|---------------|
| **1** | `main()` | `int x = 3; int y = 4;` | `[main]` | `x=3, y=4` | *(empty)* |
| **2** | `sumOfSquares()` | Called with `(3, 4)` | `[main] -> [sumOfSquares]` | `a=3, b=4` | *(empty)* |
| **3** | `square()` | Called with `a` (`3`) | `[main] -> [sumOfSquares] -> [square]` | `n=3` | *(empty)* |
| **4** | `square()` | `int result = 3 * 3;` | `[main] -> [sumOfSquares] -> [square]` | `n=3, result=9` | *(empty)* |
| **5** | `sumOfSquares()` | `square(3)` returns `9` & pops | `[main] -> [sumOfSquares]` | `a=3, b=4, sqA=9` | *(empty)* |
| **6** | `square()` | Called with `b` (`4`), returns `16` | `[main] -> [sumOfSquares] -> [square]` | `n=4, result=16` | *(empty)* |
| **7** | `sumOfSquares()` | Returns `9 + 16 = 25` & pops | `[main]` | `x=3, y=4, total=25` | *(empty)* |
| **8** | `main()` | `int* heapVal = new int(999);` | `[main]` | `x=3, y=4, total=25, heapVal=0x550000A0` | `0x550000A0: [999]` |
| **9** | `main()` | `delete heapVal;` | `[main]` | `x=3, y=4, total=25, heapVal=0x550000A0` | *(freed!)* |
| **10** | `main()` | `return 0;` (program exits) | *(empty — all popped)* | *(none)* | *(empty)* |

---

### 7. Common Mistakes & How to Fix Them

#### Mistake 1: Reading an Uninitialized Local Variable (Garbage RAM!)
When a function's stack frame is pushed, C++ does **not** waste CPU cycles wiping the old bytes in RAM to zero. Whatever bits were left behind by a previous function call are still sitting in those byte boxes!

```cpp
// BAD: sum is never initialized!
int sum;
for (int i = 1; i <= 5; i++) {
    sum += i; // Undefined Behavior! Adds 1..5 to random leftover garbage (e.g., -842150451)
}

// FIX: Always initialize stack variables at declaration!
int sum = 0;
for (int i = 1; i <= 5; i++) {
    sum += i; // Guaranteed to start at 0 and end at 15
}
```

#### Mistake 2: Integer Overflow Before Casting to `long long`
Even if you store the final answer in a `long long`, multiplying two `int` variables performs **32-bit `int` multiplication first** (which overflows!) and only afterwards copies the already-corrupted result into the `long long`.

```cpp
int width = 100000;
int height = 100000;

// BAD: width * height is computed as a 32-bit int first!
// 10,000,000,000 overflows 32-bit int -> becomes 1,410,065,408!
long long badArea = width * height;

// FIX: Cast at least one operand to long long (or multiply by 1LL) FIRST:
long long goodArea = 1LL * width * height;
//                   ^^^
//                   Forces the entire multiplication to happen in 64-bit math!
//                   Result: 10,000,000,000 (Correct!)
```

#### Mistake 3: Blowing Up the Stack (Stack Overflow)
Because the Stack is only a few megabytes in size, allocating a massive raw array on the stack (or recursing infinitely without a base case) crashes your program immediately with a `Segmentation fault (core dumped)`.

```cpp
int main() {
    // BAD: 10,000,000 ints * 4 bytes = 40 MB on the Stack!
    // Exceeds the ~8 MB stack limit -> instant crash (Stack Overflow)!
    // int hugeArray[10000000];

    // FIX: Use std::vector, which puts a tiny 24-byte handle on the Stack
    // and allocates the 40 MB array safely on the spacious Heap!
    vector<int> safeArray(10000000, 0);
}
```

---

### 8. Quick Reference

#### Fundamental C++ Types (64-bit Systems)

| Type | Size | Bit Width | Approximate Range | Primary Use Case |
|------|------|-----------|-------------------|------------------|
| `bool` | 1 Byte | 8 bits | `false` (`0`) or `true` (`1`) | Logical flags and conditions |
| `char` | 1 Byte | 8 bits | `-128` to `127` (or ASCII characters) | Single characters and raw byte buffers |
| `int` | 4 Bytes | 32 bits | $-2.14 \times 10^9$ to $+2.14 \times 10^9$ | Default whole numbers, loop counters |
| `unsigned int` | 4 Bytes | 32 bits | $0$ to $4.29 \times 10^9$ | Bitmasks (avoid for general subtraction!) |
| `long long` | 8 Bytes | 64 bits | $-9.22 \times 10^{18}$ to $+9.22 \times 10^{18}$ | Large sums, products, timestamps |
| `float` | 4 Bytes | 32 bits | ~7 decimal digits of precision | 3D graphics, lightweight sensor floats |
| `double` | 8 Bytes | 64 bits | ~15–17 decimal digits of precision | Default decimal/scientific calculations |
| `size_t` | 8 Bytes | 64 bits | $0$ to $1.84 \times 10^{19}$ (unsigned) | Return type of `.size()` and `sizeof()` |

---

## Practice & Self-Check

Work through these with pen and paper first. Picture RAM as numbered 1-byte boxes, then check yourself against the answers at the end.

### Predict the Output / Trace by Hand

**Q1. Counting bytes.** On a 64-bit system (same sizes as the Quick Reference table), what does this print?

```cpp
bool ready = false;
char tag = 'Q';
int lives = 3;
long long steps = 5000000000LL;
double speed = 2.5;
cout << sizeof(ready) + sizeof(tag) + sizeof(lives) << " "
     << sizeof(steps) + sizeof(speed) << "\n";
```

**Q2. The unsigned odometer.** What does this print?

```cpp
unsigned int stock = 2;
unsigned int left = stock - 5;
cout << left << "\n";
```

**Q3. Overflow before the cast.** This is a smaller version of Mistake 2. On a typical x86/ARM machine (where signed overflow wraps), what are `badArea` and `goodArea`?

```cpp
int width = 50000;
int height = 50000;
long long badArea  = width * height;
long long goodArea = 1LL * width * height;
```

**Q4. Re-trace the stack frames.** In the Section 6 program, change `main` to call `sumOfSquares(2, 5)` instead of `sumOfSquares(3, 4)`. Fill in the blanks:

| Step | Active Function | Top Frame Variables |
|------|-----------------|---------------------|
| 4 | `square()` (first call) | `n=2, result=?` |
| 5 | `sumOfSquares()` | `a=2, b=5, sqA=?` |
| 6 | `square()` (second call) | `n=5, result=?` |
| 7 | `main()` | `total=?` |

Also: what is the **maximum** number of stack frames alive at the same moment, and how many frames are pushed in total over the whole run?

**Q5. Stack or Heap?** For the function below, say where `p` lives, where the value `7` lives, and what happens to each one when `leaky()` returns.

```cpp
void leaky() {
    int* p = new int(7);
    cout << *p << "\n";
}   // no delete!
```

### Coding Exercises

**E1 (Easy). Safe area.** Write `long long safeArea(int w, int h)` that returns $w \times h$ without 32-bit overflow.
- `safeArea(100000, 100000)` returns `10000000000`
- `safeArea(3, 4)` returns `12`

**E2 (Easy–Medium). Print all but the last element.** Write `void printAllButLast(const vector<int>& v)` that prints every element except the last one, separated by spaces. It must behave correctly on an empty vector (remember that `v.size() - 1` is an unsigned `size_t`).
- `{4, 8, 15}` prints `4 8`
- `{}` prints nothing (and does not crash or loop billions of times)

**E3 (Medium). Overflow detector.** Write `bool addWouldOverflow(int a, int b)` that returns `true` if `a + b` would leave the range $[-2^{31},\ 2^{31}-1]$ — **without ever computing the overflowing sum** (since signed overflow is Undefined Behavior).
- `addWouldOverflow(INT_MAX, 1)` returns `true`
- `addWouldOverflow(-5, 3)` returns `false`
- `addWouldOverflow(INT_MIN, -1)` returns `true`

#### Dry-Run: Answers

**Q1.** Prints `6 16`.

| Variable | Type | Bytes |
|----------|------|-------|
| `ready` | `bool` | 1 |
| `tag` | `char` | 1 |
| `lives` | `int` | 4 |
| `steps` | `long long` | 8 |
| `speed` | `double` | 8 |

First sum: $1 + 1 + 4 = 6$. Second sum: $8 + 8 = 16$. Note that `sizeof` depends only on the **type**, never on the value — `false` and `true` both take 1 byte, and `2.5` takes the same 8 bytes as `3.14159265`.

**Q2.** Prints `4294967293`. Unsigned arithmetic wraps modulo $2^{32}$: $2 - 5 = -3 \equiv 2^{32} - 3 = 4{,}294{,}967{,}296 - 3 = 4{,}294{,}967{,}293$. Think of the odometer rolling backward past `0` three steps: `UINT_MAX` ($4{,}294{,}967{,}295$), then $...294$, then $...293$.

**Q3.** `badArea = -1794967296`, `goodArea = 2500000000`.
- The true product is $50{,}000 \times 50{,}000 = 2{,}500{,}000{,}000$, which is larger than `INT_MAX` ($2{,}147{,}483{,}647$).
- `width * height` is computed in 32-bit `int` math **first**, so it wraps: $2{,}500{,}000{,}000 - 2^{32} = 2{,}500{,}000{,}000 - 4{,}294{,}967{,}296 = -1{,}794{,}967{,}296$. Only then is that already-wrong value copied into the `long long`.
- `1LL * width` is a `long long`, so the whole chain is done in 64-bit math and stays exact.

**Q4.**

| Step | Active Function | Top Frame Variables |
|------|-----------------|---------------------|
| 4 | `square()` (first call) | `n=2, result=4` |
| 5 | `sumOfSquares()` | `a=2, b=5, sqA=4` |
| 6 | `square()` (second call) | `n=5, result=25` |
| 7 | `main()` | `total=29` |

Maximum depth is **3 frames** (`[main] -> [sumOfSquares] -> [square]`), reached twice — once per `square` call. The two `square` frames are never alive together: the first is popped before the second is pushed. Frames pushed in total: **4** (`main`, `sumOfSquares`, `square(2)`, `square(5)`).

**Q5.**
- `p` is a local variable, so the **8-byte pointer lives on the Stack** inside `leaky()`'s frame.
- `new int(7)` puts the **4-byte integer `7` on the Heap**.
- At the closing `}`, the frame is popped and `p` is gone. The Heap block is **not** freed automatically, and now nothing holds its address — that is a **memory leak** of 4 bytes per call. Fix: `delete p;` before returning, or better, use an RAII owner (covered in Part 0, Topic 2).

**E1 — reference solution**

```cpp
long long safeArea(int w, int h) {
    return 1LL * w * h;   // promote to 64-bit BEFORE multiplying
}
```

$O(1)$ time and space. Writing `(long long)w * h` works too; `(long long)(w * h)` does **not**, because the parentheses force the 32-bit multiply to happen first.

**E2 — reference solution**

```cpp
#include <iostream>
#include <vector>
using namespace std;

void printAllButLast(const vector<int>& v) {
    // i + 1 < v.size() never subtracts, so it is safe when v is empty.
    for (size_t i = 0; i + 1 < v.size(); i++) {
        if (i > 0) cout << " ";
        cout << v[i];
    }
    cout << "\n";
}
```

$O(N)$ time, $O(1)$ extra space. The buggy version `i < v.size() - 1` computes `0 - 1` on an empty vector, which wraps to $18{,}446{,}744{,}073{,}709{,}551{,}615$, so the loop would read far past the end of the (empty) buffer.

**E3 — reference solution**

```cpp
#include <climits>

bool addWouldOverflow(int a, int b) {
    if (b > 0 && a > INT_MAX - b) return true;  // too big
    if (b < 0 && a < INT_MIN - b) return true;  // too small
    return false;
}
```

$O(1)$. Why it is safe: when `b > 0`, `INT_MAX - b` cannot overflow; when `b < 0`, `INT_MIN - b` cannot overflow. Checks: `(INT_MAX, 1)`: $a = 2{,}147{,}483{,}647 > 2{,}147{,}483{,}646$, so `true`. `(-5, 3)`: $-5 > 2{,}147{,}483{,}644$ is false, so `false`. `(INT_MIN, -1)`: $INT\_MIN - (-1) = -2{,}147{,}483{,}647$ and $-2{,}147{,}483{,}648 < -2{,}147{,}483{,}647$, so `true`.

---

## Interactive Visualization & shadcn/ui Specification

### Component Blueprint for Claude
Build an interactive **RAM, Integer Overflow & Stack/Heap Explorer** using **shadcn/ui** primitives so the learner can physically manipulate bytes, trigger two's complement wrap-around, and step through live stack frame execution.

#### 1. Top-Level Layout (`<Card>` & `<Tabs>`)
- Wrap the entire interactive module in a `<Card className="p-6 border-border bg-card">` with three `<Tabs>` (`<TabsList>`, `<TabsTrigger>`, `<TabsContent>`):
  - **Tab 1: Street of Byte Boxes (RAM Inspector)**
  - **Tab 2: Two's Complement Odometer (Overflow Simulator)**
  - **Tab 3: Stack vs. Heap Step-Debugger**

#### 2. Tab 1: Street of Byte Boxes (RAM Inspector)
- **Controls:**
  - A `<Select>` dropdown to pick a variable declaration (`bool isReady = true`, `char grade = 'A'`, `int score = 258`, `long long pop = 8000000000LL`, `double pi = 3.14159`).
  - A `<Slider>` (or numeric `<Input>`) to scrub the variable's value in real time.
  - A `<Switch>` to toggle between **Hex (`0x41`)**, **Binary (`01000001`)**, and **Decimal (`65`)** byte display modes.
- **Visual Canvas:**
  - Render a horizontal strip of 16 contiguous memory cells (`0x1000` through `0x100F`).
  - Highlight the exact contiguous slice of bytes claimed by the selected type using color-coded `<Badge>` labels (e.g., 1 byte in emerald for `char`, 4 contiguous bytes in indigo for `int`, 8 bytes in amber for `double`).
  - Wrapping each byte cell in a `<Tooltip>` (`<TooltipTrigger>`, `<TooltipContent>`) shows its exact memory address, bit pattern (`b7..b0`), and endianness byte order (`Least Significant Byte` to `Most Significant Byte`).

#### 3. Tab 2: Two's Complement Odometer (Overflow Simulator)
- **Controls:**
  - A `<Switch>` to toggle between **Signed (`int`)** and **Unsigned (`unsigned int`)**.
  - Quick-jump preset `<Button variant="outline">` controls: `"Jump to INT_MAX"`, `"Jump to 0"`, `"Jump to INT_MIN"`, plus `"-1"` and `"+1"` step `<Button>` triggers.
- **Visual Canvas:**
  - Render a circular SVG number wheel alongside a 32-bit binary register strip (with bit 31 highlighted with a `<Badge variant="destructive">Sign Bit</Badge>` when in Signed mode).
  - Clicking `"+1"` at `2,147,483,647` animates the carry cascading across all 31 bits into the sign bit, flashing a warning banner and updating the readout to `-2,147,483,648`.

#### 4. Tab 3: Stack vs. Heap Step-Debugger
- **Controls:**
  - Step controls (`<Button>` group: `"Reset"`, `"Step Back"`, `"Step Forward"`, `"Auto-Play"` with a speed `<Slider>`) and a `<Switch>` to toggle `"Allocate 40 MB Array on Stack (Crash)"` vs. `"Allocate via std::vector on Heap (Safe)"`.
- **Visual Canvas:**
  - Two side-by-side vertical memory columns inside `<Card>` containers: **The Stack (Grows Downward $\downarrow$)** and **The Heap (Grows Upward $\uparrow$)**, plus a `<Table>` (`<TableHeader>`, `<TableRow>`, `<TableCell>`) displaying the live Dry-Run Trace state (`Step`, `Active Function`, `Stack Pointer RSP`, `Heap Allocations`).
  - When `heapVal = new int(999)` executes, draw an animated SVG arrow from the pointer box on the Stack (`0x7FFF_0020`) across the gap to the allocated block on the Heap (`0x5500_00A0`).

# Part 0, Topic 2: Structs, Classes & Deterministic Memory
## Chapter 1: Structs, Constructors, Destructors & RAII

In Topic 1, we saw how individual variables (`int`, `double`, `int*`) occupy contiguous byte boxes in RAM. But real-world data structures and robotics systems aren't built out of loose integers floating around in isolation:
- A 2D robot pose has `(x, y, theta)` that belong together.
- A Linked List node has a `val` and a `next` pointer glued into a single package.
- A Binary Tree node has `val`, `left`, and `right` bundled together.
- A `std::vector` has a Heap pointer `data`, a `size`, and a `capacity` managed as a single unit.

In this chapter, you will learn how **`struct`** and **`class`** let you design your own custom composite types, how **Constructors** and **Destructors** automate setup and cleanup, and how C++'s most celebrated design philosophy — **RAII** (*Resource Acquisition Is Initialization*) — guarantees zero memory leaks by building our own miniature `SimpleVector` from scratch!

---

### 1. Grouping Data Together with `struct`

A **`struct`** (structure) glues multiple variables (called **member variables** or **fields**) together into one **contiguous block of memory**.

In C++, `struct` and `class` are **99% identical** under the hood. There is only **one** difference between them:
- In a **`struct`**, members are **`public` by default** (anyone can read or write `pt.x`). In competitive programming and data structures (`ListNode`, `TreeNode`, `Point2D`), we almost always use `struct` because it saves boilerplate.
- In a **`class`**, members are **`private` by default** (only member functions inside the class can touch the internal variables directly).

```
Memory Layout of a Custom struct vs. a Self-Referential ListNode:

  1. struct Point2D { int x; int y; };  (8 contiguous bytes in RAM)
     Address:   0x1000         0x1004
              +--------------+--------------+
     Point2D: |    x = 10    |    y = 25    |
              +--------------+--------------+
                 (4 bytes)      (4 bytes)

  2. struct ListNode { int val; ListNode* next; };
     Address:   0x5500_0010    0x5500_0018
              +--------------+--------------------+      +--------------+--------------------+
     Node 1:  |   val = 42   |  next = 0x5500_0040| ---> |   val = 99   |   next = nullptr   |
              +--------------+--------------------+      +--------------+--------------------+
```

Let's see how we define and use `Point2D`, `ListNode`, and `TreeNode` in C++, including the difference between the **Dot operator (`.`)** (used on an object or reference) and the **Arrow operator (`->`)** (used on a pointer to an object):

```cpp
#include <iostream>
#include <cmath>
using namespace std;

// 1. A 2D coordinate struct with a member function
struct Point2D {
    double x;
    double y;

    // Member function: can directly access this struct's x and y!
    double distanceToOrigin() const {
        return sqrt(x * x + y * y);
    }
};

// 2. The classic LeetCode Singly-Linked List Node
struct ListNode {
    int val;
    ListNode* next;

    // Constructor with initializer list
    ListNode(int v) : val(v), next(nullptr) {}
};

// 3. The classic LeetCode Binary Tree Node
struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;

    TreeNode(int v) : val(v), left(nullptr), right(nullptr) {}
};

int main() {
    // Creating a Point2D directly on the Stack: use DOT (.)
    Point2D robotPos = {3.0, 4.0};
    cout << "Robot X: " << robotPos.x << "\n";                  // 3
    cout << "Dist:    " << robotPos.distanceToOrigin() << "\n"; // 5

    // Creating Linked List nodes on the Heap: use ARROW (->) on pointers!
    ListNode* first = new ListNode(42);
    ListNode* second = new ListNode(99);
    first->next = second; // Wire first node's arrow to second node!

    cout << "First val:  " << first->val << "\n";       // 42
    cout << "Second val: " << first->next->val << "\n"; // 99

    delete second;
    delete first;
    return 0;
}
```

**What's happening:**
```cpp
ListNode(int v) : val(v), next(nullptr) {}
//              ^^^^^^^^^^^^^^^^^^^^^^^
//              Member Initializer List!
//              Initializes 'val' to 'v' and 'next' to 'nullptr' the instant
//              the struct's memory box is created.

first->next = second;
//   ^^
//   The Arrow Operator (ptr->member) is 100% shorthand for (*ptr).member!
//   Because 'first' is a pointer (ListNode*), we write 'first->val' instead of
//   the clunky '(*first).val'.
//   - Have an object or reference (Point2D p)?  Use DOT:   p.x
//   - Have a pointer (ListNode* ptr)?           Use ARROW: ptr->val
```

---

### 2. Constructors & Destructors: Birth and Death of an Object

Remember from Chapter 1 that uninitialized memory contains random leftover garbage bits. To prevent you from ever forgetting to initialize a `struct` or `class`, C++ gives every type two special lifecycle hooks:

1. **The Constructor (`TypeName(...)`):**
   - Has the **exact same name** as the `struct`/`class` and **no return type**.
   - Runs **automatically at the exact microsecond the object is born** to set up its member variables and acquire any resources it needs.
2. **The Destructor (`~TypeName()`):**
   - Has a tilde **`~`** in front of the type name, takes **zero parameters**, and has **no return type**.
   - Runs **automatically at the exact microsecond the object dies** (when execution reaches the closing curly brace `}` of its scope, or when `delete` is called on a heap pointer).

```
Deterministic Object Lifecycle in C++:

  {                                 <-- Scope begins
      SensorLogger log("imu.txt");  <-- 1. CONSTRUCTOR SensorLogger() runs IMMEDIATELY!
                                           (Opens file / allocates heap buffer)
      log.record(9.81);             <-- 2. Object is used normally
      log.record(9.80);
  }                                 <-- 3. Closing brace '}' reached!
                                           DESTRUCTOR ~SensorLogger() runs AUTOMATICALLY!
                                           (Closes file / frees heap buffer — even if an
                                            early 'return' or exception happened!)
```

---

### 3. Why Deterministic Destruction (`}` — RAII) Prevents Memory Leaks

If you allocate memory manually on the Heap with `int* arr = new int[1000];` and your function returns early (or throws an error) before reaching `delete[] arr;`, that Heap block is **leaked forever** — orphaned in RAM with no pointer pointing to it! In a 24/7 autonomous robot running a 100 Hz control loop, leaking just 4 KB per iteration will exhaust 16 GB of RAM and crash the robot in **66 minutes**.

C++ solves this with **RAII** (**Resource Acquisition Is Initialization**). Despite the intimidating academic name, the idea is dead simple:

> **RAII Golden Rule:** Never hold raw Heap pointers (`new`/`delete`) loose in your application code. Instead, wrap the Heap resource inside a **Stack object** whose **Constructor** acquires the resource (`new`) and whose **Destructor** automatically frees it (`delete`) when the Stack object goes out of scope at `}`!

```
Why RAII Works (Stack Object Owning a Heap Buffer):

  STACK (Automatic Lifetime)              HEAP (Dynamic Memory)
  +-------------------------------+       +----+----+----+----+----+
  | [Frame: processData()]        |       | 10 | 20 | 30 | 40 | 50 |
  |   SimpleVector v              |       +----+----+----+----+----+
  |     data_     = 0x5500_0080 --|----->   ^ (Address 0x5500_0080)
  |     size_     = 5             |
  |     capacity_ = 8             |
  +-------------------------------+
  When processData() hits '}', 'v' is popped off the Stack.
  Before 'v' vanishes, C++ AUTOMATICALLY invokes ~SimpleVector(),
  which executes 'delete[] data_'. Zero leaks possible!
```

---

### 4. Building `SimpleVector` From Scratch (Demystifying `std::vector`)

Have you ever wondered how `std::vector<int>` actually works under the hood? It isn't magic — it is just a 24-byte `struct`/`class` on the Stack holding three variables (`int* data_`, `size_t size_`, `size_t capacity_`) that uses **RAII** to manage a dynamically resizing array on the **Heap**!

Let's write a working `SimpleVector` from scratch so you see Constructors, Destructors, RAII, and dynamic array doubling working together:

```cpp
#include <iostream>
using namespace std;

class SimpleVector {
private:
    int* data_;        // Pointer to our contiguous array on the HEAP
    int size_;         // Number of elements currently stored
    int capacity_;     // Total slots allocated on the HEAP

public:
    // 1. CONSTRUCTOR: Acquires initial Heap buffer when SimpleVector is born
    SimpleVector(int initialCap = 2) {
        size_ = 0;
        capacity_ = initialCap;
        data_ = new int[capacity_]; // Allocate array on the Heap
        cout << "[Constructor] Allocated Heap buffer of capacity " << capacity_ << "\n";
    }

    // 2. DESTRUCTOR: Automatically frees the Heap buffer at '}' (RAII!)
    ~SimpleVector() {
        delete[] data_;             // Free the Heap array!
        data_ = nullptr;
        cout << "[Destructor]  Freed Heap buffer of capacity " << capacity_ << "!\n";
    }

    // Disable raw shallow copying to prevent double-free bugs (Rule of Three note)
    SimpleVector(const SimpleVector&) = delete;
    SimpleVector& operator=(const SimpleVector&) = delete;

    // 3. PUSH_BACK: Amortized O(1) dynamic growth
    void push_back(int val) {
        if (size_ == capacity_) {
            // Out of room! Double the capacity on the Heap:
            int newCap = capacity_ * 2;
            int* newBlock = new int[newCap];
            for (int i = 0; i < size_; i++) {
                newBlock[i] = data_[i]; // Copy old elements over
            }
            delete[] data_;             // Free old smaller Heap block
            data_ = newBlock;           // Point to new larger Heap block
            capacity_ = newCap;
            cout << "[Resize]      Doubled capacity to " << capacity_ << "\n";
        }
        data_[size_] = val;
        size_++;
    }

    // 4. Operator[] for O(1) random access: v[i]
    int& operator[](int index) { return data_[index]; }
    int size() const { return size_; }
    int capacity() const { return capacity_; }
};

int main() {
    cout << "--- Entering inner scope ---\n";
    {
        SimpleVector v(2);  // Constructor runs! (cap = 2)
        v.push_back(10);    // [10, _]          (size = 1, cap = 2)
        v.push_back(20);    // [10, 20]         (size = 2, cap = 2)
        v.push_back(30);    // Triggers 2x resize! [10, 20, 30, _] (size = 3, cap = 4)

        cout << "v[2] = " << v[2] << "\n";
    } // <-- Closing brace '}' reached! ~SimpleVector() runs automatically!
    cout << "--- Left inner scope safely (0 bytes leaked!) ---\n";
    return 0;
}
```

**What's happening:**
```cpp
data_ = new int[capacity_];
//      ^^^^^^^^^^^^^^^^^^
//      Requests a contiguous block of 'capacity_' integers on the HEAP
//      and stores its starting address inside 'data_' on the Stack.

~SimpleVector() {
    delete[] data_;
//  ^^^^^^^^^^^^^^
//  Notice 'delete[]' (with brackets!) because we allocated an ARRAY with 'new int[...]'.
//  The compiler automatically inserts a call to ~SimpleVector() at the closing '}'
//  of the scope where 'v' was declared!

SimpleVector(const SimpleVector&) = delete;
//                                ^^^^^^^^
//  Why did we delete the default copy constructor?
//  Because if C++ blindly copied 'data_' (the pointer address) into a second
//  SimpleVector, BOTH destructors would call 'delete[]' on the SAME Heap address
//  at scope exit ("Double Free Crash")! In real production code, you either
//  deep-copy the Heap array or disable copying.
```

---

### 5. Modern C++ Smart Pointers: `std::unique_ptr<T>`

What if you need a single heap-allocated object (like a `TreeNode` or polymorphic sensor driver) and don't want to write your own RAII wrapper class or remember to call `delete`?

Modern C++ (`#include <memory>`) gives you **`std::unique_ptr<T>`** — a built-in zero-overhead RAII wrapper around a raw pointer!
- Created with **`std::make_unique<T>(args...)`** (no raw `new` needed!).
- Works just like a pointer (`*ptr` and `ptr->member`).
- Automatically `delete`s its Heap object the instant the `unique_ptr` goes out of scope at `}`!

```cpp
#include <iostream>
#include <memory> // Required for std::unique_ptr and std::make_unique
using namespace std;

struct RobotArm {
    int joints;
    RobotArm(int j) : joints(j) { cout << "RobotArm(" << joints << "-DOF) online!\n"; }
    ~RobotArm() { cout << "RobotArm safely powered down & freed!\n"; }
};

int main() {
    {
        // Allocate on the Heap using RAII smart pointer (zero raw 'new' or 'delete'!):
        unique_ptr<RobotArm> arm = make_unique<RobotArm>(6);
        cout << "Operating " << arm->joints << " joints...\n";
    } // <-- 'arm' goes out of scope here; ~RobotArm() and delete run automatically!
    return 0;
}
```

---

### 6. Dry-Run Trace: `SimpleVector` Lifecycle in RAM

Let's trace the exact Stack and Heap state for the inner scope of `main()` in our `SimpleVector` program:

| Step | Statement Executed | Stack: `v.data_` | Stack: `v.size_` | Stack: `v.capacity_` | Heap Allocations | Console Output / Event |
|------|--------------------|------------------|------------------|----------------------|------------------|------------------------|
| **1** | `SimpleVector v(2);` | `0x5500_0010` | `0` | `2` | `0x5500_0010: [?, ?]` | `[Constructor] Allocated cap 2` |
| **2** | `v.push_back(10);` | `0x5500_0010` | `1` | `2` | `0x5500_0010: [10, ?]` | Writes `10` at index `0` |
| **3** | `v.push_back(20);` | `0x5500_0010` | `2` | `2` | `0x5500_0010: [10, 20]` | Writes `20` at index `1` (Full!) |
| **4** | `v.push_back(30);` | **`0x5500_0090`** | `3` | **`4`** | `0x5500_0010` freed; `0x5500_0090: [10, 20, 30, ?]` | `[Resize] Doubled capacity to 4` |
| **5** | `cout << v[2];` | `0x5500_0090` | `3` | `4` | `0x5500_0090: [10, 20, 30, ?]` | Prints `v[2] = 30` |
| **6** | `}` *(Scope exit)* | *(popped)* | *(popped)* | *(popped)* | `0x5500_0090` **freed!** | `[Destructor] Freed cap 4!` |

---

### 7. Common Mistakes & How to Fix Them

#### Mistake 1: Forgetting the Semicolon `;` After a `struct` or `class` Definition
Unlike functions, a `struct` or `class` closing brace **must** end with a semicolon `};`. Omitting it causes cryptic compiler errors on the line *after* the struct!

```cpp
// BAD: Missing semicolon after '}'
struct Point {
    int x, y;
} // <-- COMPILER ERROR: "expected ';' after struct definition"

// FIX: Always close struct/class definitions with '};'
struct Point {
    int x, y;
};
```

#### Mistake 2: Mixing Up `.` (Dot) and `->` (Arrow)
In linked list and tree problems, beginners frequently write `curr.val` when `curr` is a `ListNode*` pointer.

```cpp
ListNode nodeObj(10);
ListNode* nodePtr = &nodeObj;

// BAD: nodePtr is a pointer (ListNode*), NOT a ListNode object!
// cout << nodePtr.val;  // Compiler Error!

// FIX: Use '.' on objects/references, and '->' on pointers!
cout << nodeObj.val << "\n";  // Dot on object
cout << nodePtr->val << "\n"; // Arrow on pointer
```

#### Mistake 3: Using `delete` Instead of `delete[]` (Or Vice Versa)
In C++, `new T` pairs with `delete ptr`, while `new T[N]` pairs with `delete[] ptr`. Mixing them up corrupts the Heap allocator metadata! Better yet: use `std::vector<T>` for arrays and `std::make_unique<T>()` for single objects so you never write manual `delete` at all.

---

### 8. Quick Reference

| Concept / Syntax | What It Does | When to Use |
|------------------|--------------|-------------|
| `struct Name { ... };` | Bundles fields + methods (`public` by default) | Data nodes (`ListNode`, `TreeNode`, `Point2D`) |
| `class Name { ... };` | Bundles fields + methods (`private` by default) | Encapsulated objects with invariants (`SimpleVector`) |
| `Obj(int v) : x(v) {}` | **Constructor** with member initializer list | Automatically initializes fields on creation |
| `~Obj() { ... }` | **Destructor** | Automatically cleans up resources at `}` scope exit |
| `obj.field` | **Dot operator** | When `obj` is a value or reference (`T` or `T&`) |
| `ptr->field` | **Arrow operator** (shorthand for `(*ptr).field`) | When `ptr` is a pointer (`T*` or `unique_ptr<T>`) |
| `make_unique<T>(args)` | Creates an RAII-managed `unique_ptr<T>` on Heap | Safe single-object Heap allocation without leaks |

---

## Interactive Visualization & shadcn/ui Specification

### Component Blueprint for Claude
Build an interactive **RAII Lifecycle & `SimpleVector` Under-the-Hood Visualizer** using **shadcn/ui** components so the learner can watch constructors, dynamic heap reallocations, and deterministic destructors execute live.

#### 1. Top-Level Layout (`<Card>` & `<Tabs>`)
- Wrap the experience in a `<Card className="p-6 border-border bg-card">` with three `<Tabs>` (`<TabsList>`, `<TabsTrigger>`, `<TabsContent>`):
  - **Tab 1: `struct` Memory Packer & Dot (`.`) vs. Arrow (`->`) Explorer**
  - **Tab 2: `SimpleVector` Doubling & RAII Scope Exit Simulator**
  - **Tab 3: Raw `new`/`delete` Leak vs. `std::unique_ptr` RAII Guard**

#### 2. Tab 1: `struct` Memory Packer & Dot vs. Arrow Explorer
- **Controls:**
  - A `<Select>` to inspect `Point2D (8B)`, `ListNode (16B)`, or `TreeNode (24B)`.
  - Interactive `<Button>` actions: `"Append ListNode(99)"`, `"Traverse curr = curr->next"`, and a `<Switch>` toggling how `curr` is accessed (`curr->val` vs. `(*curr).val`).
- **Visual Canvas:**
  - Show the contiguous field layout inside each `struct` node `<Card>` with byte offsets (`+0x00: val`, `+0x08: next`) and animated pointer arrows linking `ListNode` or `TreeNode` instances on the Heap.

#### 3. Tab 2: `SimpleVector` Doubling & RAII Scope Exit Simulator
- **Controls:**
  - `<Button>` controls: `"push_back(randomInt)"`, `"Trigger Scope Exit '}'"`, and `"Reset Scope"`.
  - A `<Slider>` to set initial capacity (`1`, `2`, or `4`).
- **Visual Canvas:**
  - Left panel: The Stack frame holding the `SimpleVector v` struct box (`data_`, `size_`, `capacity_`).
  - Right panel: The Heap arena showing the allocated `int[]` array slots.
  - When `size_ == capacity_` and `"push_back"` is clicked, animate the 4-step reallocation sequence with `<Badge>` status indicators:
    1. Allocate new $2\times$ array on Heap
    2. Copy existing elements `[0 .. size_-1]`
    3. `delete[]` old Heap array
    4. Repoint `data_` arrow to the new array.
  - Clicking `"Trigger Scope Exit '}'"` flashes the closing brace `}`, highlights `~SimpleVector()`, and animates the Heap buffer being reclaimed cleanly with `<Badge variant="default">0 Bytes Leaked (RAII)</Badge>`.

#### 4. Tab 3: Raw `new` Leak vs. `std::unique_ptr` Guard
- **Controls:**
  - A `<Switch>` toggling between `"Raw Pointer (int* p = new int)"` and `"RAII Smart Pointer (unique_ptr<int>)"`.
  - A `<Button variant="destructive">` labeled `"Trigger Early Return / Exception Before Function End!"`.
- **Visual Canvas:**
  - Side-by-side comparison table (`<Table>`) and memory map showing how an early return orphans the Heap block in Raw Pointer mode (`<Badge variant="destructive">MEMORY LEAK!</Badge>`), whereas `std::unique_ptr` automatically invokes its destructor during stack unwinding.

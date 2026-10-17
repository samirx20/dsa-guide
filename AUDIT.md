# Curriculum Audit

A correctness and consistency pass over every chapter in `dsa/` and `robotics/`, done on 2026-10-17.

**Totals:** 246 confirmed errors fixed in place (each entry below is one fix, sometimes covering several cells of one table). 89 suspected issues were left unedited because they could not be confirmed or would need more than a minimal fix.

## How the audit was done

- Every chapter was read in full. Dry-run and trace tables, worked numeric examples and stated outputs were re-executed on the chapter's own inputs with throwaway scripts kept outside the repo. Those scripts used Python 3.13, Node, g++ 6.3, sqlite3, pydantic 2.13, fastapi 0.139, tiktoken and numpy.
- Claims about API behaviour were checked by running them where the library was installed (asyncio, FastAPI, Pydantic v2, sqlite3, json, dataclasses, libstdc++). Where it wasn't installed, they were checked against documented behaviour, and the entry says so (ROS2, MuJoCo, Redis, BullMQ, GitHub Actions, uv, mypy).
- Fixes are minimal and in place: the wrong cell, number or sentence is corrected and everything else is left alone. No content was summarised or deleted. A few trace tables lost a row or gained one where the original showed a step the code never runs, or skipped a step it does run. Each of those is called out in its entry.
- Anything that could not be confirmed is listed under **Suspected** and was not edited.
- Caveat: in `robotics/part4/topic2/chapter2-ros2-architecture-and-mujoco-simulation.md`, the corrected MuJoCo dry-run rows come from an independent 2-link rigid-body simulation, not from MuJoCo itself (it isn't installed). The old values were off by tens of degrees; the new ones may still differ from MuJoCo's own printout in the last decimal place.

Errors fixed before this pass, in commit `a74cdba`:
- `dsa/part13/topic1/chapter1-greedy-patterns.md`: activity-selection dry run sorted the intervals in the wrong order.
- `dsa/part6/topic1/chapter3-divide-and-conquer.md`: `findMaxDC` was said to be O(N log N); it is O(N).
- `robotics/part5/topic1/chapter2-concurrent-execution.md`: the chapter said `asyncio.gather` cancels sibling tasks on an exception; it doesn't (TaskGroup does).

## Header numbering (robotics phases 5–8)

Phases 5–8 were written as a separate curriculum and kept its old "Part" numbers in their H1 lines.

- **41 files** in `robotics/part5` … `robotics/part8`: the `# Part X, Topic Y:` H1 now uses the folder's part number. For example, `robotics/part5/**` said "Part 1" and `robotics/part8/**` said "Part 3"–"Part 6". The topic number and title text are unchanged.
- `robotics/part6/topic2/chapter1-docker-containers.md`: a "Next" link pointed to "Part 5, Topic 3" at `../topic3/chapter2-redis-caching.md`, which doesn't exist. It now points to "Part 6, Topic 2" at `./chapter3-redis-caching.md`.
- `robotics/part6/topic2/chapter3-redis-caching.md`: "Ties back to Part 4 auth" referred to an auth chapter that doesn't exist in this repo. It now reads "Ties back to session-based authentication".

Left as-is (out of scope, follow-up candidates):
- Several H1 **topic** numbers don't match their folders:
  - `robotics/part0/topic2/*` says "Topic 0" or "Topic 1".
  - `robotics/part6/topic2/*` says Topic 2, 3, 4 and 1.
  - `robotics/part8/topic1/*` and `robotics/part8/topic2/*` mix Topic 1 and Topic 2.
- `robotics/INTERVIEW_OVERVIEW.md` still uses the old Part 0–6 numbering for the phase 5–8 material.

# Fixes and suspected issues by section


## DSA Parts 0–1

### Fixed
- `dsa/part0/topic1/chapter1-cpp-memory-and-variables.md` (~305-312, 321): The step numbers in the code comments (8 = receives 25, 9 = new, 10 = delete, 11 = return) did not match the dry-run table (7, 8, 9, 10). The comments are now Step 7/8/9/10, and the heap snapshot note now says "at Step 8". Verified by comparing the comments with the table rows.
- `dsa/part0/topic1/chapter2-pointers-and-references.md` (~348): Passing the vector by value to a recursive binary search was said to cost "O(N) per call -> O(N^2) total". The recursion is only log N deep, so the total is O(N log N). It now reads "O(N log N) total instead of O(log N)".
- `dsa/part0/topic2/chapter1-structs-classes-and-raii.md` (~143): A leak of 4 KB per iteration at 100 Hz would exhaust 16 GB in "66 minutes". The real figure is about 11 hours (16e9 / 4e5 B/s = 40,000 s = 11.1 h; binary units give 11.65 h). Computed in Python.
- `dsa/part1/topic1/chapter1-vector.md` (~254): The vector after `remove()` was shown as `{1,3,4,5,2,2,5}`. It is now `{1,3,4,5,4,2,5}`, which is what libstdc++ produces when run with g++.
- `dsa/part1/topic1/chapter1-vector.md` (~169): Inserting at index 0 shifts "5, 4, 3, 2". It now says "5, 4, 3, 2, 1", which matches "All 5 elements had to move".
- `dsa/part1/topic1/chapter2-strings.md` (~100): The index ruler under "algorithm" (9 characters) was `01234567`. It is now `012345678`.
- `dsa/part1/topic1/chapter2-strings.md` (~245-249): The "BAD O(N^2)" example used `result += ...`, so it was the same as the GOOD example, and its comment claimed "+= copies the entire string". The code is now `result = result + to_string(i) + ", "; // Each + copies the entire string`.
- `dsa/part1/topic1/chapter2-strings.md` (~291, 295): `s[1]='A'` on "Hello" gives "HAllo", not "HAello". After toupper it is "HALLO", not "HAELLO".
- `dsa/part1/topic1/chapter2-strings.md` (~314): `s.substr(i, 1)` was called "O(N) per call". It is now "O(K) per call", which matches the chapter's own substr rule.
- `dsa/part1/topic1/chapter3-pairs-and-tuples.md` (~51): `auto p4 = make_pair(4, "Diana")` was commented as `pair<int, string>`. It is `pair<int, const char*>`, as the chapter itself says at line 66.
- `dsa/part1/topic1/chapter4-maps.md` (~200-201): The identifier `sorted Ages` contains a space and would not compile. It is now `sortedAges`.
- `dsa/part1/topic1/chapter6-stacks-queues.md` (~75): `stack::swap` was listed as O(N). It is O(1) because it swaps the underlying containers.
- `dsa/part1/topic1/chapter6-stacks-queues.md` (~239): The stack's memory layout was listed as "Contiguous". `std::stack` uses `deque` by default, so it is now "Chunked (deque by default)".
- `dsa/part1/topic1/chapter6-stacks-queues.md` (~222-223): Deque `insert`/`erase` were listed with O(N) space. The extra space is O(1); the time stays O(N).
- `dsa/part1/topic1/chapter7-priority-queue.md` (~74-81, 86): After pushing 40, the max-heap was shown as `[50,10,20,40]` with 40 as a child of 10, and the pop was described as "move 40 to root". The heap is `[50,40,20,10]`, which matches the chapter's own table. The pop now says "move last element 10 to root, bubble down (swap with 40)". Verified with push_heap/pop_heap in g++, which gives 50 40 20 10, then 40 10 20.
- `dsa/part1/topic1/chapter7-priority-queue.md` (~299): `priority_queue::swap` was listed as O(N). It is O(1).
- `dsa/part1/topic1/chapter7-priority-queue.md` (~265-268): The lambda example declared `pair<int,int>` but pushed `{3, "A"}`, which does not compile. It now uses `pair<int,string>`. Compiled and ran with g++; it prints 1.
- `dsa/part1/topic1/chapter8-algorithm-stl.md` (~303-307): The `next_permutation` walkthrough for {1,2,3} → {1,3,2} used the wrong pivot (1,2) and produced {2,1,3}. It now uses pivot (2,3) at indices 1,2, swaps 2 with 3 to get {1,3,2}, and reverses the suffix from index 2.
- `dsa/part1/topic1/chapter8-algorithm-stl.md` (~232): The nth_element output element was called "the median-of-medians". That is an algorithm, not the element. It now says "exactly where full sort would put it".
- `dsa/part1/topic1/chapter8-algorithm-stl.md` (~172): The text said `cout << max_element(...)` prints an address. With vector iterators this does not compile. g++ gives "no match for 'operator<<' ... __normal_iterator".
- `dsa/part1/topic2/chapter1-big-o-notation.md` (~296): 2^100 was given as 1.26×10³⁰. It is 1.27×10³⁰ (1.2677e30).
- `dsa/part1/topic2/chapter1-big-o-notation.md` (~229-230): The text equated "best case = Big Omega" and "average case = Big Theta". Ω and Θ are bounds, not cases. The two lines now say so.
- `dsa/part1/topic2/chapter2-time-complexity.md` (~246-275): `for (i < arr.size()) arr.insert(arr.begin(), 99)` never ends, because the vector grows on every iteration. The shift counts were also wrong (0, 1, 2; inserting at the front of {1,2,3} shifts 3, then 4, then 5). The loop bound is now fixed (`n = arr.size()`), and the trace says 3/4/5 shifts. The total is now N + ... + (2N-1) = N(3N-1)/2, which is still O(N²). The contradictory line "Even worse than O(N²) ... it's actually O(N²)" is reworded.
- `dsa/part1/topic2/chapter2-time-complexity.md` (~347): fib(40) was said to make "≈ 2.4 billion calls". It makes 331,160,281 calls. Counted in Python; the same script confirmed fib(5) = 15 calls and fib(30) ≈ 2.7M.
- `dsa/part1/topic2/chapter2-time-complexity.md` (~409): The O(N!) row gave the pattern `f(n) = f(n-1) * n`. That is the factorial computation, which the chapter itself shows is O(N). It is now `T(n) = n * T(n-1)` (n calls of size n-1).
- `dsa/part1/topic2/chapter2-time-complexity.md` (11 cells, tables at ~360-365 and ~404-410): The math was opened with `$` and closed with a backtick (for example `$O(NM)``), which breaks KaTeX rendering. These are now closed with `$`.
- `dsa/part1/topic2/chapter3-space-complexity.md` (~289): The Two-Sum memory box showed `seen = {2:0, 7:1}`, but the function returns at i=1 before inserting 7. It is now `{2:0}`.
- `dsa/part1/topic2/chapter3-space-complexity.md` (~85): The text said evens "stores up to N/2 elements in worst case", which contradicts line 100 ("Worst case: all N elements are even"). It now reads "stores N/2 elements here (up to N in the worst case)".
- `dsa/part1/topic2/chapter3-space-complexity.md` (13 cells, Quick Reference table ~418-428): The same `$...`` broken KaTeX delimiters, now closed with `$`.

### Suspected (not fixed)
- `dsa/part1/topic1/chapter3-pairs-and-tuples.md` (~243): `tuple<pair<int,int>, string> t = {{{5, 10}, "target"}};` (triple braces) fails to compile on the local g++ 6.3. The double-brace form `{{5,10},"target"}` does compile. A modern C++17 compiler might accept the triple-brace form through the tuple move constructor, which is why it was not changed. Worth checking on GCC 11+ or Clang.
- `dsa/part1/topic1/chapter2-strings.md` (~309): The comment "npos is not always -1!" is misleading. `npos` is defined as `size_type(-1)`, and with `int pos` the comparison `pos == -1` works in practice. The advice to compare against npos is still good style, so it was left alone.
- `dsa/part1/topic1/chapter1-vector.md` (~226-229): The "Speed ranking" says index access is slower than a const-ref range-for, and by-value is slowest for `int`. In practice there is no difference for `int`. It is framed as "for large types", so it was left alone.
- `dsa/part1/topic1/chapter1-vector.md` / `chapter2-strings.md` / others, "Common Mistakes" blocks: several snippets re-declare the same variable (`vector<int> v`, `string s`) in one block. As a whole block they would not compile, but they read as separate illustrative fragments.
- `dsa/part1/topic1/chapter8-algorithm-stl.md` (~355): `int maxVal = max_element(...)` is described as "maxVal is an iterator". In fact it is a compile error, not an iterator stored in an int. The mistake being taught is still conveyed.
- `dsa/part1/topic1/chapter4-maps.md` (~51) and `chapter5-sets.md` (~42): The tables say `map`/`set` use "Lower" memory than the unordered versions. This depends on the load factor and node overhead; red-black tree nodes carry 3 pointers plus a colour field. It is debatable, so it was not changed.
- `dsa/part1/topic2/chapter1-big-o-notation.md` (~19-28): The ASCII growth chart puts the curves at inconsistent heights (for example 2^N below N!, and N² flat at 1K). It is only an illustration.
- `dsa/part1/topic2/chapter1-big-o-notation.md` (~292): log2(10000) is listed as 14; it is 13.3. Using the ceiling is defensible as a count of binary-search comparisons.

## DSA Parts 2–3

### Fixed
- `dsa/part2/topic1/chapter1-array-traversal.md` (~68): the dry-run table under "Backward Traversal" actually traces forward traversal (i = 0..4, output 1 2 3...). Its label is now "Dry-Run Table (Forward Traversal)". Verified by reading the code.
- `dsa/part2/topic1/chapter3-kadanes-algorithm.md` (~325, ~328): the "With Indices" dry-run showed end=2 at i=2 and end=4 at i=4. `end` only changes when currentSum > globalMax (-2 > 1 and 3 > 4 are both false), so it is now end=1 and end=3. Verified by hand trace of the chapter's code.
- `dsa/part2/topic1/chapter3-kadanes-algorithm.md` (~462): "Starting loop at index 0" said the comparison is `nums[0]` vs `0 + nums[0]` and "harmless". With currentSum = nums[0] the comparison is nums[0] vs 2*nums[0], which double-counts a positive first element (`[5]` returns 10). The text now says this.
- `dsa/part2/topic1/interview-problems-array-basics.md` (~61, ~82): the Two Sum trace showed map `{2:0,7:1}` at i=1. The code returns before inserting 7, so it is now `{2:0}`.
- `dsa/part2/topic2/chapter2-subarray-sums.md` (~15): the table said "Prefix Sum Array + Binary Search" handles negatives = Yes. Binary search needs monotonic prefix sums, which negatives break, so it is now "No".
- `dsa/part2/topic2/chapter3-2d-prefix-sums.md` (~272-292): the 4x4 prefix matrix was wrong (rows 6 15 27 43 / 15 36 63 99 / 28 63 114 180), which led to 63-6-15+1=43. It is now 6 14 24 36 / 15 33 54 78 / 28 60 96 136 and 54-6-15+1=34. Re-ran in Python.
- `dsa/part2/topic2/chapter3-2d-prefix-sums.md` (~505-508): for the negatives example, prefix[2][2] was shown as -1 and the query result as -1. It is 0, and the query is 0-0-0+0=0. Python confirms.
- `dsa/part2/topic2/chapter3-2d-prefix-sums.md` (~581-586): the row/column sum code indexed `prefix[..][COLS+1]` and `prefix[ROWS+1][..]`, which is out of bounds for a (ROWS+1)x(COLS+1) array. It now uses COLS and ROWS, matching the chapter's own "What's happening" and reference table.
- `dsa/part2/topic2/chapter3-2d-prefix-sums.md` (~467, ~480): it claimed an empty matrix makes "prefix become a 1x1 matrix". With the shown constructor, `matrix[0].size()` on an empty vector is UB. The comment and explanation now say this, and the 1x1 prefix is credited to the defensive check.
- `dsa/part2/topic2/interview-problems-prefix-sum.md` (~340): Contiguous Array said "Subarray [4..7] = [0,0,1,1]". nums[4..7] = [0,0,0,1]. The length-4 answer at i=8 with firstSeen[-3]=4 is nums[5..8] = [0,0,1,1].
- `dsa/part2/topic3/chapter1-two-pointers.md` (~246): it claimed an empty array makes nums[0] go out of bounds. In fact the loop doesn't run and slow+1 = 1 is returned (wrong answer, no OOB). The comment is corrected.
- `dsa/part2/topic3/interview-problems-two-pointers.md` (~447-460): the Trapping Rain Water dry-run had wrong rows (it skipped the right-- step when left_max == right_max) and the answer 5. The table is rebuilt from execution and the answer is now 6, the known answer for [0,1,0,2,1,0,1,3,2,1,2,1]. Re-ran the chapter's code in Python.
- `dsa/part2/topic3/interview-problems-two-pointers.md` (~76-77): the Valid Palindrome table had left=1 and 2 at iterations 2 and 3. The space at index 1 is skipped, so they are now 2 and 3. Python trace.
- `dsa/part2/topic4/interview-problems-sliding-window.md` (~95-97): Longest Substring table rows 6-8 used char 'b' at right=5. s[5]='c'. The rows are fixed to match execution ({a,b,c}; erase a,b -> {c,b}; erase c,b -> {b}). Python.
- `dsa/part2/topic4/interview-problems-sliding-window.md` (~207-228): the Character Replacement trace and table showed two shrinks at right=4 and an inconsistent "replacements=2" while keeping maxFreq=3. The code uses `if` (and the while version would stop too), so there is one shrink per step. The trace is fixed, and table rows 6-7 now show real steps right=5 and right=6. Python, both versions; answer 4 unchanged.
- `dsa/part2/topic4/interview-problems-sliding-window.md` (~324, ~328): the Permutation in String windowCount arrays for [e,i] and [i,d] had the 1s at wrong indices (9 and 5). They are now at 4/8 and 3/8.
- `dsa/part2/topic4/interview-problems-sliding-window.md` (~471, ~475-476, ~486): Minimum Window claimed "ADOBEC" shrinks through OBEC/BEC/EC. Shrinking stops after removing A. It also showed the window "CODEBANC", but the valid window at right=12 is "ODEBANC". Both are fixed. Python trace.
- `dsa/part2/topic4/interview-problems-sliding-window.md` (~497-500): the "Common Mistake" header and its first "WRONG" snippet were identical to the CORRECT `==` check. They now show the real mistake (`>=` re-increments matched for every extra copy).
- `dsa/part3/topic1/chapter1-O-n2-sorts.md` (~365, ~384): the selection sort comments claimed strict `<` "ensures stability" and that "3a and 3b stay in relative order". Swapping 3a with the 1 gives [1,2,3b,3a], so the comments are corrected.
- `dsa/part3/topic1/chapter2-O-nlogn-sorts.md` (~481, ~490): the partition result diagram showed [...,70,80,90] and Right: [80,90]. The chapter's own step trace gives [...,70,90,80], and the diagram now matches.
- `dsa/part3/topic1/chapter2-O-nlogn-sorts.md` (~545): the median-of-three comment said "Put median at right-1", but the code swaps it to `right`. Comment fixed.
- `dsa/part3/topic1/chapter2-O-nlogn-sorts.md` (~605): it called N*ceil(log2 N) the "exact" merge sort comparison count. It is an upper bound (exact worst case is N*ceil(lg N) - 2^ceil(lg N) + 1), so it now says "upper bound".
- `dsa/part3/topic1/chapter3-non-comparison-sorts-and-stability.md` (~70): the flow diagram for input [4,2,2,8,3] showed counts [0,1,2,2..] and output [1,2,2,3,4]. They are now [0,0,2,1..] and [2,2,3,4,8].
- `dsa/part3/topic1/chapter3-non-comparison-sorts-and-stability.md` (~260-261, ~274-275): the radix pass-1 order was wrong (66 before 75, 802 in bucket 0, 75 in bucket 7). It is now [170,90,802,2,24,45,75,66] with corrected buckets, and the pass-2 input matches. Python LSD simulation; later passes unchanged.
- `dsa/part3/topic1/chapter3-non-comparison-sorts-and-stability.md` (~327): bucket[2] insertion order is [0.42, 0.32] (before the per-bucket sort), not [0.32, 0.42]. Python.
- `dsa/part3/topic1/chapter3-non-comparison-sorts-and-stability.md` (~385, ~392): it said a dept-sort followed by a stable name-sort keeps "names within each department grouped". It actually yields name order with department as the tiebreak, as the code's own line ~395 says. Text fixed.
- `dsa/part3/topic1/interview-problems-sorting.md` (~72-77): the merge sort dry-run split [38..10] as [38,27,43]+[3,9,82,10]. With mid=3 the split is [38,27,43,3]+[9,82,10]. Rows 2-6 are corrected; the final result is unchanged.
- `dsa/part3/topic1/interview-problems-sorting.md` (~156-161): the Dutch National Flag table advanced mid after the swap with high, and low was stuck at 1. The table is rebuilt from execution (7 rows; low ends at 2). Python.

### Suspected (not fixed)
- `dsa/part2/topic1/interview-problems-array-basics.md` (~256-263): the "Error Scenario: Starting at Index 0" code (profit then minPrice update) is not buggy. It is the same order as the basic solution, and both orders are correct. Fixing it would mean rewriting the scenario.
- `dsa/part2/topic1/interview-problems-array-basics.md` (~454-463): the division "WRONG" snippet uses undeclared `n` and won't compile. It is illustrative wrong code, so I left it.
- `dsa/part2/topic2/chapter2-subarray-sums.md` (~17): the Sliding Window row says "Handles Zeros? Yes". The shown counting window miscounts with zeros ([0,0,0], k=0 gives 3, not 6), but an at-most-K variant could handle them. The claim is ambiguous.
- `dsa/part2/topic2/interview-problems-prefix-sum.md` (~27): the "Prefix Sum" column says "O(N) prefix only" for Subarray Sum = K. A prefix array without a map needs O(N^2) to count. It may only mean build time.
- `dsa/part2/topic4/chapter1-sliding-window.md` (~348-367): the "When Window Breaks" example ([10,-5,10,-5,10], sum <= 15) doesn't show a failure. After one left shrink the window [-5,10,-5,10] is valid with length 4, which is optimal. The second "shrink" removes from the right, which the template never does. It needs a rewrite.
- `dsa/part2/topic4/chapter1-sliding-window.md` (~306-325): the "Why Erase Matters" ("abba") narrative contradicts itself and its counts don't match any execution. It needs a rewrite.
- `dsa/part2/topic3/interview-problems-two-pointers.md` (~430-441): the ASCII elevation and water art doesn't match heights [0,1,0,2,1,0,1,3,2,1,2,1].
- `dsa/part3/topic1/chapter2-O-nlogn-sorts.md` (~355): the comment "Strict less than (not <= for stability)" is misleading because Lomuto quicksort is unstable either way. Also, quicksort space is listed as O(log N) without noting the O(N) worst-case stack of the shown naive recursion.
- `dsa/part3/topic1/chapter1-O-n2-sorts.md` (~589): the `comparisons` counter in insertionSortAdaptive counts outer iterations, not comparisons.
- `dsa/part3/topic1/chapter3-non-comparison-sorts-and-stability.md` (~399, ~449): Bucket Sort is listed as stable, but the shown implementation sorts each bucket with std::sort, which is unstable. That's harmless for plain floats.

## DSA Parts 4–6

### Fixed
- `dsa/part4/topic1/chapter2-advanced-binary-search.md` (line ~99): rotated-search dry run, iteration 2 said target "No (0∉[0,1))", but 0 ∈ [0,1) and the action `right = 4` only happens because the target IS in range → "Yes (0∈[0,1))". Also line ~115 diagram text "No (0 >= 0 but 0 < 1 is true... wait)" → "Yes → go LEFT". Verified by hand-trace against the code's condition `target >= nums[left] && target < nums[mid]`.
- `dsa/part4/topic1/chapter2-advanced-binary-search.md` (line ~86-87): illustration for `[6,7,1,2,3,4,5]` put mid on value 1 and compared "6 > 1"; mid of 0..6 is index 3 = 2 → marker moved, "6 > 2".
- `dsa/part4/topic1/chapter3-search-on-answer-space.md` (line ~148): Koko feasibility row "Hours: 27 14 10 8 7 6 5 5 4 4 4" → "27 15 10 8 8 6 5 5 5 5 4". Recomputed sum(ceil(p/k)) for piles [3,6,7,11] in Python. First-True (4) unchanged.
- `dsa/part4/topic1/interview-problems-binary-search.md` (line ~31): rotated array search listed space O(log N); the shown solution is iterative → O(1) (matches the code's own "Space: O(1)" comment).
- `dsa/part5/topic1/chapter2-palindromes-anagrams.md` (lines ~90-107): expand-around-center example for "abacaba" claimed index 3 is 'a' and traced a,b,a then a 'c' mismatch giving length 5 "bacab". Index 3 is 'c'; expansion matches c,a,b,a then goes out of bounds, length 7 = "abacaba". Comment trace and dry-run table corrected (one row added for the out-of-bounds stop). Re-ran in Python.
- `dsa/part5/topic1/chapter3-kmp-overview.md` (lines ~21, ~30): naive-search trace on text AAABAB / pattern AAB said pos 1 fails and "FOUND at pos 4"; text[1..3]="AAB" matches at pos 1, and at pos 4 the 3-char pattern doesn't fit. Step 2 → FOUND at pos 1, step 5 → can't fit / stop. Matches the chapter's own KMP trace (found at 1). Verified in Python.
- `dsa/part5/topic1/chapter3-kmp-overview.md` (line ~53): naive "5 × 5 = 25 comparisons" for AAAAAAAAB vs AAAAAB → "6 × 4 = 24" (4 positions × 6 comparisons; counted in Python).
- `dsa/part5/topic1/chapter3-kmp-overview.md` (lines ~254-269): "Why KMP is O(N)" example (text AAAAAB, pattern AAB): naive claimed positions 0-3 fail and found at 4, total 14; actually match at position 3, total 3×3+3 = 12. KMP part claimed found right after the first fallback with ~6 comparisons; actually it falls back once per extra 'A', finds at 3, 9 comparisons. Both corrected; counts from Python instrumentation.
- `dsa/part5/topic1/interview-problems-strings.md` (line ~179): "Counting only (±1) ✗ Wrong for "{[]}"" — counting gives the correct answer (valid) for "{[]}"; the real counterexample is "([)]" → changed.
- `dsa/part6/topic1/interview-problems-recursion.md` (lines ~78-82): fib(5) dry-run table had impossible rows (a fib(1) child of fib(4), and fib(2)/fib(1) appearing *after* fib(3) returned with stack [fib(5)]). Replaced those 5 rows with the correct order: fib(4) returns 3, fib(3) called, its fib(2)/fib(1) children, fib(3) returns 2. Same row count.
- `dsa/part6/topic1/interview-problems-recursion.md` (line ~258): fastPow(2,10) "5 multiplications (log₂(10))" → 6 multiplications (2+1+2+1 across the 4 non-base levels).
- `dsa/part6/topic2/chapter2-pruning.md` (line ~6): "N=20, O(N!) would take longer than the age of the universe" — 20! ≈ 2.4×10^18 ≈ 77 years at 10^9 ops/s → reworded to that (computed in Python).
- `dsa/part6/topic2/chapter2-pruning.md` (lines ~147-156): Combination Sum [2,3,6,7] t=7 dry run (sorted + break) had rows after a `break` (e.g. trying 3 at [2,2,2], 6 at [2,3]), skipped the whole [3] branch, and pruned [6] with i=3/7 instead of i=2/6. Rewrote rows 5-16 to the actual execution (re-ran the chapter's code in Python, logged every choose/break).
- `dsa/part6/topic2/chapter2-pruning.md` (lines ~299-304): Combination Sum II [1,1,2,5,6,7,10] t=8 dry run: row 3 claimed the second 1 is skipped inside [1] (it is not: i == index there, which is how [1,1] is formed), and row 5 "chose" 5 to reach sum 9 although the break check fires first. Corrected rows to actual execution (finds [1,1,6]) and placed the duplicate skip where it actually occurs (root level, i=1). Verified with Python trace.
- `dsa/part6/topic2/chapter3-combinations-permutations-subsets.md` (line ~283): "[2,7] target=-5" → -2 (5-7).
- `dsa/part6/topic2/chapter3-combinations-permutations-subsets.md` (line ~354): "Permutations: [1] can reach [1,2], [2,1]" — a path starting with [1] cannot produce [2,1] → "[2] can reach [2,1] (looks backwards)".
- `dsa/part6/topic2/chapter3-combinations-permutations-subsets.md` (line ~634): "Combination Sum (reuse allowed)" code had no overshoot check; with reuse (recurse with `i`) target goes negative forever → infinite recursion / stack overflow. Added `if (target < 0) return;`.
- `dsa/part6/topic2/interview-problems-backtracking.md` (lines ~310-311): N=4 queens dry run placed row 2 at col 3 as valid; (2,3) shares the r-c diagonal with (1,2). Actual: row 2 has no valid column → backtrack → row 1 col 3. Fixed the two rows. Verified with a Python 4-Queens trace.
- `dsa/part6/topic2/interview-problems-backtracking.md` (line ~248): Word Search tree said "Explore Left: out of bounds → false" after Right already returned true; the code's `||` short-circuits so Left is never called → "skipped (|| short-circuits ...)".

### Suspected (not fixed)
- `dsa/part6/topic2/chapter2-pruning.md` (lines ~86, ~214-220): "Nodes with/without pruning" numbers (~15/~25, and the impact table, e.g. [2,3,7] t=18 "~40 → 15") look invented. Counting recursive calls with the chapter's code I get 28→10, 23→13, 93→57, 35→23, 38→18 for the five rows. Not edited since "node" is undefined and values are marked "~".
- `dsa/part6/topic2/chapter2-pruning.md` (lines ~68-83): the Combination Sum decision tree omits the [6] branch and the [2,2,3] solution node (listed only in the summary line). Sloppy diagram rather than a false claim.
- `dsa/part6/topic2/chapter2-pruning.md` (lines ~366-367): "Early termination ... check sum > target BEFORE recursion → saves function call overhead" contradicts the shown code, which checks at the top of the callee (after the call). Also the complexity table (~456-457, ~474: "O(2^N * target) → O(2^(N/2)) avg") has no clear basis.
- `dsa/part6/topic2/chapter1-backtracking-template.md` (lines ~180-201): "Visual Walkthrough: Subsets of {1,2,3}" records only leaves ([1,2,3],[1,3],[2,3],[3]); consistent with a base case like index==n, but labelled as subsets (misses [], [1], [2], [1,2]).
- `dsa/part5/topic1/interview-problems-strings.md` (line ~379): myAtoi uses `long` "to catch overflow"; on Windows/MSVC `long` is 32-bit so `result*10` can overflow there (fine on LP64 Linux/LeetCode). `long long` would be portable.
- `dsa/part5/topic1/chapter3-kmp-overview.md` (line ~353): `kmpSearchReturnBool` is never defined (illustrative). Line ~54 "KMP ~10 comparisons" is 12 with the shown code (approximate claim, left).
- `dsa/part6/topic2/chapter3-combinations-permutations-subsets.md` (lines ~20, ~587): Combinations time O(C(N,K)) omits the O(K) copy factor that the Subsets/Permutations entries include. `interview-problems-backtracking.md` lists Subsets as O(2^n) (vs O(n·2^n) elsewhere): inconsistent shorthand.
- `dsa/part6/topic2/interview-problems-backtracking.md` (line ~264): "BFS with queue ... same choose/unchoose pattern with board[r][c]='#'": in-place marking does not work with BFS across different paths; it needs per-path visited state.
- `dsa/part4/topic1/chapter2-advanced-binary-search.md` (line ~33): decision-tree text says "[mid, right]" while the code uses (mid, right]; harmless since mid==target already returned.

## DSA Parts 7, 8, 9, 12

### Fixed
- `dsa/part7/topic1/chapter1-listnode-and-reversal.md` (~286, ~297): iterative-reversal ASCII diagrams drew the reversed chain backwards (`nullptr <-- [2] <-- [1]`, `nullptr <-- [3] <-- [2] <-- [1]`, meaning 1->2) → `nullptr <-- [1] <-- [2]` / `nullptr <-- [1] <-- [2] <-- [3]`, `prev` label moved under the right node. Traced the code by hand.
- `dsa/part7/topic1/chapter1-listnode-and-reversal.md` (~350): recursive call chain listed `reverseList(2)` twice → `reverseList(1) calls reverseList(2) calls reverseList(3)`.
- `dsa/part7/topic1/chapter2-dummy-heads.md` (~231): "Head might be duplicated" was given as Remove Duplicates from Sorted List (LC 83), where the head is never removed → "Remove Duplicates from Sorted List II" (LC 82).
- `dsa/part7/topic1/chapter3-fast-slow-pointers.md` (~101): middle-of-list dry run (odd length) had a third row `slow=node(4), fast=nullptr`. With `fast` on node(5), `fast->next==nullptr` stops the loop, so it never runs → `node(3) | node(5)`. That matches "Return slow = node(3)".
- `dsa/part7/topic1/chapter3-fast-slow-pointers.md` (~321): cycle-start walkthrough said `b = 2 (nodes 4,5)`. The distance from start (4) to the meeting point (5) is 1, and a = nc - b gives 3 = 4 - 1 → `b = 1 (4 -> 5)`.
- `dsa/part7/topic1/chapter3-fast-slow-pointers.md` (~341): the cycle-start dry-run header listed `1..6 -> (back to 4)` but the table uses node(7). Without 7, slow and fast meet at node 4 in iteration 3 → header now `1 -> ... -> 6 -> 7 -> (back to 4)`. Simulated both lists.
- `dsa/part7/topic1/interview-problems-linked-lists.md` (~108-110): merge walkthrough step 4 action said "5 < 6, attach 4" → "5 > 4, attach 4". Step 6 showed list2=nullptr and tail=node(6), but the code attaches the rest without advancing → list2=node(6), tail=node(5).
- `dsa/part7/topic1/interview-problems-linked-lists.md` (~190-192): Find Duplicate phase 1 for [1,3,4,2,2] showed 4 iterations. The do-while exits at iteration 2 (slow=fast=2), so the two impossible rows were removed and row 2 is marked as the stop. Phase 2 was already correct.
- `dsa/part8/topic1/chapter2-monotonic-stack.md` (~159-172): Daily Temperatures table was wrong. Index 0/1 were never removed from the stack column, it invented a pop of index 1 at i=6, and its final result was `[1,5,4,2,1,1,0]`. The rows now show the stack after each action, and the final result is `[1,1,4,2,1,1,0]`. Re-ran in Python.
- `dsa/part8/topic1/chapter2-monotonic-stack.md` (~304, 314, 318, 324): Stock Span stack was called "Increasing". The stack holds strictly decreasing prices (e.g. 100,80,70) → "Decreasing" in the heading, sentence, code comment and quick-ref row. Also the trace said `70 > 70? No` → `70 > 80? No` (top after the pop is 80).
- `dsa/part8/topic1/chapter2-monotonic-stack.md` (~436): histogram final flush showed widths 1,3,6 and areas 3,6,6. For index 4 (h=2) the width is 6-1-1=4 → widths 1,4,6, areas 3,8,6. Re-ran in Python. The max of 10 is unchanged.
- `dsa/part8/topic2/chapter1-queue-and-deque.md` (~258-263): Sliding Window Max "Result" column was inconsistent: [3] after i=3, then [3,5], [5,6], [6,7]. It is now the cumulative result: [3,3], [3,3,5], [3,3,5,5], [3,3,5,5,6], [3,3,5,5,6,7].
- `dsa/part8/topic2/chapter1-queue-and-deque.md` (~348): "Mistake 2" labelled `dq.front() <= i - k` as WRONG, but it is equivalent to the RIGHT `< i - k + 1`. The wrong example is now the real off-by-one `dq.front() < i - k`.
- `dsa/part8/interview-problems-stacks-queues.md` (~251-262): Daily Temperatures table showed the stack as `[]` before push 5, was missing the "76>75 pop 2, result[2]=4" step, and its last row result `[1,1,0,2,1,1,0]` contradicted the final answer. The stack column was rewritten, the missing row added, and the last row's result is now `[1,1,4,2,1,1,0]`.
- `dsa/part8/interview-problems-stacks-queues.md` (~308): Car Fleet last row pushes 12.0, but the stack showed `[1.0, 7.0]` → `[1.0, 7.0, 12.0]`. That matches the size of 3.
- `dsa/part8/interview-problems-stacks-queues.md` (~367, 376, 377): histogram areas. Row 2 formula `2*(1-0-1)=2` (evaluates to 0; the stack is empty so width = i = 1) → `2*1=2`. Row 11 `2*(6-1-1)=10` → `=8`. Row 12 `1*(6-0-1)=5` (stack empty, width = 6) → `1*6=6`. Re-ran in Python.
- `dsa/part8/interview-problems-stacks-queues.md` (~435, 438): Queue-using-stacks. After pouring at step 3, s1 is empty, not [1,2]. At step 6, s2=[2] is non-empty, so no pour happens → action "s2 not empty, no pour; pop s2".
- `dsa/part8/interview-problems-stacks-queues.md` (~507-511): same Sliding Window Max result-column fix as the queue chapter.
- `dsa/part9/topic1/chapter1-hashing-internals.md` (~258): the resize diagram put keys at impossible slots. h%10=0 cannot become h%20=1. Keys moved to valid h%20 slots (A 0->10, C 2->2, D 3->13, F 6->6, G 7->17, H 8->8).
- `dsa/part9/topic1/chapter2-hashing-patterns.md` (~241): "xyz" and "aza" were claimed to be in the same shifted group. They are not (keys a,b,c vs a,z,a under the chapter's own code) → `"az" and "ba"` (both key a,z).
- `dsa/part9/topic1/chapter2-hashing-patterns.md` (~384): subarray-sum result named `[1,2,3,-2,5]` (sum 9) as the second subarray. Prefix pair 4->9 means it is `[5]`.
- `dsa/part9/topic1/chapter2-hashing-patterns.md` (~536): `map[nums[i]]++` was claimed to do two lookups. `operator[]` does a single find-or-insert and returns a reference → the comment now says one lookup.
- `dsa/part12/topic2/interview-problems-2d-dp.md` (~374-375): the Target Sum conversion said 1 subset sums to 4 ("all positive"). For [1,1,1,1,1] it is C(5,4)=5, which matches the chapter's own dp table → "5 ways".
- `dsa/part12/topic2/interview-problems-2d-dp.md` (~466-472): edit-distance grid annotations had wrong cell references and values (`o==o: dp[1][0]+0=2`, `r==r -> ... dp[2][1]`, `s==s -> dp[2][2]`, `e!=s -> min(dp[3][3],dp[3][2],dp[4][3])`) → `dp[1][1]+0=1`, `dp[2][0]`, `dp[3][2]`, `min(dp[4][2],dp[4][3],dp[5][2])`. Re-ran the DP in Python; the grid values were already correct.
- `dsa/part12/topic2/interview-problems-2d-dp.md` (~556): Burst Balloons. Left subproblem [1,1] was described as "just the padding 1, 0 balloons". In the padded array, index 1 is balloon 3 → "(balloon 3)".

### Suspected (not fixed)
- `dsa/part7/topic1/chapter2-dummy-heads.md` (~232): the pattern table lists "Intersection of Two Linked Lists" as a dummy-node problem with the reason "Both lists might be modified". That problem neither uses a dummy node nor modifies the lists (it must keep their structure). Fixing it needs a row rewrite, so it was left.
- `dsa/part9/topic1/chapter1-hashing-internals.md` (~250-252): the "Before resize" diagram says 8 elements, alpha=0.8, but only 6 keys (A,C,D,F,G,H) are drawn. With 6 keys, alpha=0.6 would not trigger a 0.75 resize. This is an illustration inconsistency; I did not choose which side to change.
- `dsa/part9/topic1/interview-problems-hashing.md` (~112-116): the Ransom Note dry-run table has a 3rd 'a' row ("a=0 -> return false") that matches neither stated example ("aa"/"aab" returns true after 2 rows; "aa"/"ab" fails at the 2nd row). It probably assumes an unstated "aaa"/"aab" input.
- `dsa/part9/topic1/interview-problems-hashing.md` (~274, 34, 454): 4Sum is claimed O(N^2) with a pair-sum map. That is not true worst-case for "find all unique quadruplets" (many pairs can share a sum and output can be large). It is a common simplification, so it was left.
- `dsa/part8/topic1/chapter2-monotonic-stack.md` (~4) and `dsa/part8/topic2/chapter1-queue-and-deque.md` (~241): "strictly" increasing/decreasing. The code pops only on strict `>`/`<`, so equal values stay and the structure is non-strict. Pedantic.
- `dsa/part8/interview-problems-stacks-queues.md` (~42-54): the Valid Parentheses intuition and table push the *closing* bracket, but the code pushes the *opening* bracket. Both approaches are valid, just inconsistent.
- `dsa/part9/topic1/chapter2-hashing-patterns.md` (~184-186): the "tree" -> "eetr" output is not deterministic (unordered_map order plus unstable sort could give "eert").

## DSA Parts 10–11

### Fixed
- `dsa/part10/topic1/interview-problems-binary-trees.md` (~257-266): Path Sum trace had the wrong arguments (hasPathSum(11, 6), and so on), showed 5→4→11→2 returning false, and listed a "13" under node 4. → Fixed to hasPathSum(11,13), (7,2)→false, (2,2)→true. It now notes that `||` short-circuits, so the 8-subtree is never called. Verified by re-running the code in Python: True on the left branch.
- `dsa/part10/topic1/interview-problems-binary-trees.md` (~318-338): Count Good Nodes treated the bottom-left 3 as a child of 4 (path [3,4,3]), so the count came out as 3. In the drawn tree it is 1's left child (path [3,1,3]), 3>=3 makes it good, and the answer is 4 (LC 1448 example). The trace and dry-run table now follow the real DFS order. Verified in Python: count 4.
- `dsa/part10/topic1/interview-problems-binary-trees.md` (~409-411, 454, 486): `serialize` added an extra "," between children while the null case already returns "N,". That gave "1,2,N,,N,,..." and an empty token, so `stoi("")` would throw in deserialize. Removed the extra separator. The result string and the last table row are now "1,2,N,N,3,4,N,N,5,N,N," (trailing comma). Verified in Python for both versions.
- `dsa/part10/topic2/chapter1-bst-fundamentals.md` (~322): "height never exceeds log N" → "always stays O(log N) (about 1.44 log2 N for AVL, 2 log2(N+1) for Red-Black)". These are standard bounds.
- `dsa/part10/topic2/interview-problems-bst.md` (~98): Validate BST table gave the bounds of node 4 as (5,+∞). It is 7's left child, so the bounds are (5,7), which matches the trace above the table.
- `dsa/part10/topic2/interview-problems-bst.md` (~255-276): Insert 5 trace went 7 → "5 > 3 → go right". Node 3 is not under 7, and 7's left is null. Fixed the trace and the table so node 5 is created as 7's left, which matches the result diagram.
- `dsa/part10/topic2/interview-problems-bst.md` (~427): Greater Sum Tree result diagram showed the root as 28. The trace's own numbers give 22 (4+5+6+7). Verified in Python: 22 28 13 28 27 25 18 7.
- `dsa/part10/topic2/interview-problems-bst.md` (~487-491): BST-from-preorder trace said build(12, 8, 10) creates 12. Since 12>10 it returns null, and 12 is created by build(12, 10, +inf). Verified in Python.
- `dsa/part10/topic3/chapter1-heap-properties.md` (~317-340): Build-heap trace for [4,1,3,2,16,9,10,14,8,7] gave index 4 the children "8, 7" (it has only index 9 = 7). The sift-down swaps that followed were wrong, and so was the final heap. Correct final heap: [16,14,10,8,7,9,3,2,4,1]. Verified in Python.
- `dsa/part10/topic3/chapter1-heap-properties.md` (~428-431): heapSort called `make_heap` on the prefix in every iteration. That is O(N) per step, so O(N^2), which contradicts the claimed O(N log N). Replaced it with `pop_heap(nums.begin(), nums.begin()+i+1)` and a comment.
- `dsa/part10/topic3/interview-problems-heaps.md` (~66-85): Last Stone Weight rounds 2-3 were wrong: heap [2,2,1,1,1] and y=2,x=2. After round 2 the heap is [2,1,1,1], and round 3 is y=2,x=1 → push 1. The final answer of 1 is unchanged. Verified in Python.
- `dsa/part10/topic3/interview-problems-heaps.md` (~182): K Closest result order was [[3,3],[-2,4]]. The code pops the max-heap farthest first, so the output is [[-2,4],[3,3]]. Added a note that any order is accepted.
- `dsa/part10/topic3/interview-problems-heaps.md` (~244-266): The Task Scheduler trace ran a task at time 3 (and later times) in the same step it re-entered the heap, and gave a total time of 6. In the code the pop happens before the cooldown check, so times 3 and 6 are idle and the result is 8 (A B idle A B idle A B, LC 621 = 8). Rewrote the trace. Simulated the exact code in Python: 8.
- `dsa/part10/topic3/interview-problems-heaps.md` (~430): Ugly number was defined as "divisible by 2, 3, or 5". → "only prime factors are 2, 3, and 5".
- `dsa/part10/topic4/interview-problems-tries.md` (~241): Removed a garbled trie line, `→ d* (word: "oad"... wait, no)`, which claimed a branch that does not exist.
- `dsa/part10/topic4/interview-problems-tries.md` (~541-544): The Longest Word example claimed "apply", said "appl is not a word" (it is in the list), and assumed "ap", which is not in the list. The code returns "a". Fixed, with a note that adding "ap" gives "apply". Verified in Python: "a".
- `dsa/part11/topic1/chapter1-graph-representations-and-traversals.md` (~51): Adjacency list for edges 0-1,1-2,2-0,2-3 showed `0: [1]`. → `0: [1, 2]`. This also makes the "8 entries total" claim consistent.
- `dsa/part11/topic1/chapter1-graph-representations-and-traversals.md` (~224-225): BFS table visited[] after pushing 1 and 3 was [T,T,T,F]. → [T,T,F,T]. Verified in Python.
- `dsa/part11/topic1/chapter1-graph-representations-and-traversals.md` (~211): "marking AFTER pop causes O(V*E) queue bloat" → O(E). There can be at most one push per edge.
- `dsa/part11/topic1/chapter1-graph-representations-and-traversals.md` (~318, 323): Grid DFS table labels: (2,0) was "Out of bounds (water)" and (1,1) was "Already visited". Both are in-bounds water cells. → "Water, return".
- `dsa/part11/topic1/interview-problems-graphs.md` (~53-56): The Number of Islands sink order did not match the code's direction order (down, up, right, left). Actual order: (0,0),(1,0),(1,1),(0,1). Verified in Python.
- `dsa/part11/topic1/interview-problems-graphs.md` (~148-151): Max Area said (1,0) is water and the second island has area 4. Both islands have area 3, so max = 3. Verified in Python.
- `dsa/part11/topic1/interview-problems-graphs.md` (~219-228): The Clone Graph table had the "already cloned" hits in the wrong order and was missing one. Rewrote it in the real DFS order (9 steps). Verified in Python.
- `dsa/part11/topic1/interview-problems-graphs.md` (~255-270): The Rotting Oranges table rotted only (0,1) in minute 1, never rotted (2,1)/(2,2), and returned 3. The code rots (1,0) and (0,1) in minute 1 and returns 4 (LC 994 example = 4). Rewrote the table. Simulated the code in Python.
- `dsa/part11/topic1/interview-problems-graphs.md` (~464): Word Ladder said "Return level 4" for hit→hot→dot→dog→cog. The code returns level+1 = 5 (LC 127 = 5).
- `dsa/part11/topic2/chapter1-topological-sort.md` (~221-231): The DFS topo-sort trace visited 2 as if it were a child of 1. In the graph 1→3 only, and 2 is visited from 0 after 1 finishes. Post-order is [4,3,1,2,0], so the stack/topological order is [0,2,1,3,4], not [0,1,2,3,4]. Fixed rows 7-11 and the conclusion.
- `dsa/part11/topic2/chapter1-topological-sort.md` (~494): The Alien Dictionary explanation had the prefix rule backwards ("longer word equals prefix of shorter word"). Fixed to match the code: a longer word placed before its own prefix.
- `dsa/part11/topic2/interview-problems-topological-sort.md` (~23): The example order [C0, C1, C3, C2] is invalid for the chapter's graph (3 requires 2). → [C0, C1, C2, C3].
- `dsa/part11/topic3/interview-problems-shortest-path.md` (~41, 54): Network Delay init dist[] had 4 entries and was labelled "src=0". The array has n+1=5 entries and src=2. → [INF, INF, 0, INF, INF], dist[src=2]=0.
- `dsa/part11/topic3/interview-problems-shortest-path.md` (~120-136): The Path With Minimum Effort trace had |2-8| = 7 (it is 6) and returned 3 the first time (2,2) was relaxed. The correct answer is 2 (LC 1631 example), via path 1→3→5→3→5. Rewrote the walkthrough and table from a Python run of the exact algorithm.
- `dsa/part11/topic4/chapter1-dsu-structure.md` (~423): The table row for find(3) "path compress" left parent[] unchanged ([0,0,0,2,0], 3→2→0). With path compression, parent[3] becomes 0: [0,0,0,0,0].
- `dsa/part11/topic4/interview-problems-union-find.md` (~71): Redundant Connection parent[] after the first union was [0,1,1]. The DSU has size n+1=4, so it is [0,1,1,3]. Verified in Python.
- `dsa/part11/topic4/interview-problems-union-find.md` (~396-400): Kruskal table find() values assumed root 0. Under the chapter's union-by-rank UnionFind, unite(1,3) makes 1 the root, and 0 and 4 then attach under 1. find columns corrected (1|4, 1|1, 1|1, 1|1, 1|2). The total of 20 is unchanged. Verified in Python.

### Suspected (not fixed)
- `dsa/part11/topic3/chapter1-dijkstras-algorithm.md` (~93-110): The trace pops (6,E) before (6,C) "tie broken by heap order". If nodes are ints A..F = 0..5, `greater<pair>` pops (6,C) first, so F would first be set to 9 and then improved to 7. Final distances are identical. Not edited because the trace uses letter labels and doesn't specify a node mapping.
- `dsa/part11/topic1/chapter1-graph-representations-and-traversals.md` (~316-323): The Grid DFS table skips the (-1,0) out-of-bounds call from (0,0) before (0,1). It is an omission, not a wrong value, so it was left alone to avoid restructuring.
- `dsa/part11/topic1/chapter1-graph-representations-and-traversals.md` (~78-94): The "Infinite Loop Example" ASCII graph is ambiguous: it is unclear which edges exist, and DFS(2)->DFS(0) implies a 2-0 edge that the drawing routes via 3. Left as is.
- `dsa/part10/topic3/chapter1-heap-properties.md` (~52): The "NOT Complete" caption says "gap at 6's left". The gap is actually node 3's missing left child. This is a wording issue only.
- `dsa/part10/topic4/chapter1-trie-architecture.md` (~350): The Delete operation lists O(1) space, but it is recursive (O(L) stack). Minor, so it was left alone.
- `dsa/part11/topic1/interview-problems-graphs.md` (~459): The Word Ladder step-1 row says "h->*: ait,bit,...,zit". That changes the 1st letter, which is not how hot is found, and the code tries every position anyway. Loose description, left as is.
- `dsa/part11/topic4/interview-problems-union-find.md` (~477): Accounts Merge complexity "O(E log E)" is vague: E is undefined here, and the true cost is dominated by sorting the emails, O(NK log NK). Not edited.

## DSA Parts 13–14 and Robotics Part 0

### Fixed
- `dsa/part13/topic1/chapter1-greedy-patterns.md` (line ~59): exchange-argument step said "B ends before A started", which is false in general → now "B ends no later than A, and every other interval in O starts after A ends, so no new overlaps". Checked by reasoning (B and A can overlap; only end(B) <= end(A) is guaranteed).
- `dsa/part13/topic1/interview-problems-greedy.md` (Jump Game II table, ~137-140): the table had the first jump at i=1, and a row for i=3. The code jumps at i=0 (currentEnd 0→2) and at i=2 (currentEnd 2→4, then break), so i=3 never runs → rows now i=0 (jumps=1), i=1 (—), i=2 (jumps=2, break). The unreachable i=3 row was replaced. Re-ran the code in Python.
- `dsa/part13/topic1/interview-problems-greedy.md` (Gas Station visual, ~221-223): "tank = 3+3 = 6" was unlabelled and then "station 4: 6 + (-2) = 4 → done". Station 4's diff is +3, and the loop has to wrap through stations 0, 1 and 2 → now "station 4: 3+3=6", then "wrap to stations 0,1,2: 6-2-2-2 = 0 → done". Checked by arithmetic.
- `dsa/part13/topic1/interview-problems-greedy.md` (Partition Labels table, ~440-444): rows "7 | a" and "8 | d | 14" were wrong (s[7]='c', s[8]='a' closes partition 1 with size 9, and 'd' is at i=9). Rows "14 | e" and "15 | d" were also swapped (s[14]='d', s[15]='e') → corrected, and the missing i=8 partition row and i=9 row were added. Re-ran the trace in Python, which gives [9,7,8].
- `dsa/part14/topic1/interview-problems-bit-manipulation.md` (Missing Number table, ~317-326): the table XORed 3,0,1,2,3 to a final value of 3, which does not match the code (result = n; result ^= i ^ nums[i]) → it now traces the code (3 → 0 → 1 → 2). The stray "Wait, let me redo this properly" line was reworded into a lead-in sentence. Re-ran in Python.
- `dsa/part14/topic1/interview-problems-bit-manipulation.md` (Sum of Two Integers table, ~406): iteration 3 showed a&b=0000 and carry=0000, but it is 0100 & 0100 = 0100 → carry 1000. The missing iteration 4 (a=1000, b=0000) was added, matching the chapter's own 4-iteration visual. Re-ran in Python.
- `dsa/part14/topic1/interview-problems-bit-manipulation.md` (Counting Bits, ~182): "call the $O(1)$ function ... resulting in $O(N \log N)$" contradicted itself → now "$O(\log N)$ function". Kernighan's loop is O(set bits) <= O(log N).
- `dsa/part14/topic2/chapter1-math-matrix-tricks.md` (Fast exponentiation visual, ~230-236): it multiplied by 9 and 81 at bits 2 and 3 and concluded "3^13 = 2187" (that is 3^7). The correct bases are 81 and 6561, giving 243 and then 1594323 → fixed, and 3^13 = 1594323 now matches the dry-run table. Checked in Python (3**13).
- `dsa/part14/topic2/interview-problems-math-matrix.md` (Happy Number n=4 table, ~141-151): fast.next values from step 1 onward were wrong (for example d(d(58)) = 145, not 89). The real Floyd run meets at slow=fast=20 at step 7 → rows corrected, and the final row now says "Yes, 20 != 1 → not happy". Re-ran in Python.
- `dsa/part14/topic2/interview-problems-math-matrix.md` (Spiral table, ~245): the B→T row showed left=1. The other rows show state before each pass, and B→T runs with left=0 → set to 0.
- `dsa/part14/topic2/interview-problems-math-matrix.md` (Set Matrix Zeroes edge case, ~337-353): the walkthrough said Step 3 makes "No changes" and the final matrix has rows 2-3 as [1,1,1]. But matrix[0][1]=0 is itself a column flag, so the code zeroes column 1 → final is now [[0,0,0],[1,0,1],[1,0,1]], and the walkthrough and table are updated to match. Re-ran the code in Python.
- `dsa/part14/topic2/interview-problems-math-matrix.md` (Multiply Strings, ~388-443): the walkthrough and table used a 5-element result array (the code allocates m+n = 6), and the wrong indices produced "1337 wait, let me recalculate". The partial-product figure showed 738 / 615 / 456 instead of 1368 / 912 / 456 and labelled rows with j instead of i → the walkthrough, figure and 9-row table now follow the real execution, ending at [0,5,6,0,8,8] = "56088". Re-ran in Python.
- `robotics/part0/topic1/chapter1-the-cli-and-linux.md` (~202): "kill sends SIGTERM (15) — identical to pressing Ctrl+C (SIGINT = 2)" → changed to "similar in spirit"; they are different signals.
- `robotics/part0/topic1/chapter1-the-cli-and-linux.md` (~314): the claim that `export ROS_DOMAIN_ID = 42` fails because ROS_DOMAIN_ID is treated as a command name is wrong. That explanation fits `ROS_DOMAIN_ID = 42` without export. With export, bash reports "export: '=': not a valid identifier" → both cases are now explained. Ran both in bash.
- `robotics/part0/topic2/chapter2-apis-and-json.md` (Mistake 1, ~461): `json.dumps({123: "value"})` was said to raise "TypeError: keys must be strings". It actually returns '{"123": "value"}' (int keys are coerced; tuple keys raise TypeError) → comment corrected. Ran in Python.
- `robotics/part0/topic2/chapter2-apis-and-json.md` (Mistake 2, ~470): `json.load(json_str)` raises AttributeError ('str' object has no attribute 'read'), not TypeError → fixed. Ran in Python.
- `robotics/part0/topic2/chapter2-apis-and-json.md` (~352): an annotation labelled `[0]` as 'Key "id"' → "Index 0 — first sensor".
- `robotics/part0/topic2/chapter3-class-refresher.md` (~372-377): `@dataclass` with `readings: list = []` was said to share the list so that `r2.readings` prints [22.5]. In fact dataclass raises "ValueError: mutable default <class 'list'> for field readings is not allowed: use default_factory" at class definition → comments corrected. Ran in Python.
- `robotics/part0/topic2/chapter3-class-refresher.md` (~333): "For mutable defaults (like datetime)" → "For per-instance defaults (like now())". The isoformat string is immutable; the point is evaluation per instance.
- `robotics/part0/topic2/chapter4-virtual-environments.md` (~68): "FastAPI was upgraded" → "downgraded" (0.110 → 0.100).
- `robotics/part0/topic2/chapter4-virtual-environments.md` (~77): the conflict diagram said "Project B: requires fastapi>=0.100", which 0.110 satisfies, so there was no conflict → "==0.100", matching the pip commands shown.
- `robotics/part0/topic2/chapter4-virtual-environments.md` (~200): "uv venv creates .venv/ with Python interpreter and pip" → uv does not seed pip by default (`--seed` adds it). Based on uv behaviour; I did not run uv here.
- `robotics/part0/topic2/chapter4-virtual-environments.md` (~296-297): the diagram showed a `[project.dependencies]` table with `fastapi = ">=0.110"`. That is Poetry-style and invalid under PEP 621 → now `dependencies = [ "fastapi>=0.110" ]`, with box widths kept at 64 chars.
- `robotics/part0/topic2/chapter5-advanced-type-hinting.md` (~159-160): `first_item([1, "hello"])` was said to be "flagged: T can't be both int and str". Type checkers widen T instead (mypy: object; pyright: int | str), so there is no error → corrected. Based on known checker behaviour; mypy is not installed here.
- `robotics/part0/topic2/chapter5-advanced-type-hinting.md` (~383): the "What's happening" code line was truncated (`status: Literal["idle", "gather`) → completed with the full Literal.
- `robotics/part0/topic2/chapter6-error-handling.md` (~568): "`except Exception` catches EVERYTHING — even KeyboardInterrupt, SystemExit" → corrected; both derive from BaseException only. Checked with issubclass in Python.
- `robotics/part0/topic2/chapter6-error-handling.md` (~315-318): "with sqlite3.connect(...) — Connection is automatically closed" → the sqlite3 context manager only commits or rolls back and does not close. Verified that the connection is still usable after the with block.
- `robotics/part0/topic2/chapter6-error-handling.md` (~164): `except httpx.HTTPStatusError` could never trigger because httpx does not raise on 4xx/5xx unless `raise_for_status()` is called → added `response.raise_for_status()` inside the try.
- `robotics/part0/topic2/chapter6-error-handling.md` (~526): `extra={"query": ...}` was said to "show as: query=...". The default formatter does not show extra fields (verified with basicConfig) → now "Stored as record.query (shown only if your formatter includes it)".

### Suspected (not fixed)
- `robotics/part0/topic2/chapter1-intro-type-hinting.md` (~246-253): `get_sensor_config(config: dict[str, float])` is called with `{"name": "TempSensor", ...}`, a str value, which a type checker would flag. That is ironic in a type-hinting lesson, but fixing it means changing the code's hint.
- `robotics/part0/topic2/chapter6-error-handling.md` (~133, ~278): top-level `await` in snippets is a SyntaxError in a normal script (it works only in the asyncio REPL or notebooks). These are illustrative fragments.
- `robotics/part0/topic2/chapter6-error-handling.md` (~426): "If you forget one [match case], mypy will warn you". mypy does not check match exhaustiveness by default (it needs assert_never or a return-type gap).
- `robotics/part0/topic1/chapter2-git-and-github-workflows.md` (~90, ~131): "40-byte" branch ref file. A loose ref is 41 bytes (40 hex chars plus newline), and refs may live in packed-refs. Pedantic.
- `robotics/part0/topic2/chapter4-virtual-environments.md` (~340, ~368): "uv add ... Pins to pyproject.toml". uv add writes a lower-bound constraint (>=) to pyproject; exact pins live in uv.lock.
- `robotics/part0/topic2/project-strict-python-cli.md` (~36): it requires exit code 1 when the file argument is missing, but argparse exits with code 2 by default. This is a project spec, not a claim.
- `dsa/part14/topic1/chapter1-bit-manipulation.md` (~301): `result |= (1 << i)` for i=31 on a signed int is UB before C++20. Common interview idiom; left as is.
- `dsa/part14/topic2/chapter1-math-matrix-tricks.md` (~249-251): the leftover "Wait, let me recalculate..." commentary after the 3^13 table is correct but reads as AI scratch text; left in place.
- `dsa/part13/topic1/chapter1-greedy-patterns.md` (~236): "Sort by Value/Weight" lists Jump Game and Gas Station as examples, but neither sorts. Taxonomy quibble.

## Robotics Parts 1–3

### Fixed
- `robotics/part1/topic2/chapter3-homogeneous-transforms-se2-se3.md` (line ~156): The robot is at (3, 2) facing +Y, and the text said the world origin was "3 m to your **right** ($y_B = -3$), which is $[-2, -3]^T$". It is now "3 m to your **left** ($y_B = +3$), which is $[-2, +3]^T$". Verified with $-\mathbf{R}^T\mathbf{t}$, where $\mathbf{R}^T = [[0,1],[-1,0]]$ and $\mathbf{t} = [3,2]$, giving $[-2, +3]$. Physically, the origin lies to the west, which is on your left when you face north.
- `robotics/part1/topic2/chapter1-matrices-as-space-transformers.md` (line ~421): The chapter recommended `A.ldlt().solve(b)` as Eigen's general solver for $\mathbf{A}\mathbf{x}=\mathbf{b}$. LDLT is only valid for symmetric (semi)definite matrices. It now reads "`A.partialPivLu().solve(b)` in C++ Eigen, `A.ldlt().solve(b)` when $\mathbf{A}$ is symmetric". Checked against the Eigen decomposition API.
- `robotics/part2/topic1/chapter1-derivatives-and-integrals-in-code.md` (line ~480): The text claimed Forward Euler energy "balloons from 9.81 J to over 26.4 J" and that the arm "starts spinning over the top like a propeller". The chapter's own script prints **16.747 J** (Semi-Implicit gives 9.575 J). That is below the 2mgL = 19.62 J needed to go over the top. The text now says about 16.7 J (a 70% gain), with the arm swinging to roughly 134°. Verified by running the chapter's Python block.
- `robotics/part2/topic1/chapter1-derivatives-and-integrals-in-code.md` (line ~280): RK4 "halving Δt reduces **single-step** error by 16×" is now "accumulated (global) error by 16×". The local error is O(Δt^5), so halving Δt cuts it 32×; the global error is O(Δt^4), so 16× applies there.
- `robotics/part3/topic1/chapter2-cascaded-and-state-space-control.md` (line ~426): The text said that using degrees (100) instead of radians (1.74) changes $x^TQx$ by "$100^2 = 10{,}000\times$". The real factor is $(180/\pi)^2 \approx 3{,}283\times$, and the text now says that.
- `robotics/part3/topic2/project-closed-loop-waypoint-follower.md` (line ~398, Milestone 1): With the robot facing +178° and the goal at about -178°, the text said "$e_\theta = -4^\circ$ (-0.07 rad); robot turns 4° right". wrapToPi(-178° - 178°) = wrapToPi(-356°) = **+4°**, so it now says +4° (+0.07 rad) and that the robot turns left across the seam. Verified numerically: atan2(-0.2,-5) = -177.7°, and the wrapped error is +4.29°.

### Suspected (not fixed)
- `robotics/part1/topic2/chapter2-rotation-matrices-euler-and-quaternions.md` (line ~168, gimbal-lock ASCII diagram): The diagram is labelled "Pitch = +90 deg, Nose Straight Up!". The chapter's own convention is that $R_y(+90^\circ)$ points the nose down (line ~124 says "Pitch nose down", and $R_y(90^\circ)\hat{\mathbf{i}} = [0,0,-1]$). So $X_{body}$ ends up anti-parallel to $Z_{world}$, not parallel as drawn. Left unchanged because fixing it means redrawing the ASCII art.
- `robotics/part3/topic1/chapter1-pid-control-from-scratch.md` (lines ~232-237): One bullet says the integral is 3 deg·s (6 V) after 0.5 s and "keeps growing". The next says it "freezes at whatever value it accumulated (1.5 deg·s, 3.0 V)". The 1.5 deg·s figure is the equilibrium value, not what has been accumulated by that point, so the narrative is internally inconsistent. It reads as a teaching simplification, so I left it.
- `robotics/part3/topic1/chapter2-cascaded-and-state-space-control.md` (cascaded dry-run table, line ~126): Each row's arithmetic is correct. However, the given positions 0 → 3.0 → 8.5 → 10.0 rad over Δt = 0.1 s steps cannot happen with velocities capped at 5 rad/s (that is at most 0.5 rad per tick). The trajectory inputs are physically inconsistent with the stated Δt.
- `robotics/part3/topic1/chapter2-cascaded-and-state-space-control.md` (LQR scenario 1, line ~236): "Leaning Forward → u = -4 N, drives wheels backward/under the fall". The phrase contradicts itself: to catch a forward lean you drive forward under the fall. Whether the sign is right depends on an unstated θ convention.
- `robotics/part3/topic2/project-closed-loop-waypoint-follower.md` (C++ `EKFStateEstimator`, lines ~151-186): The "concise" $FPF^T$ never updates `P_[0][1]`. Its true value is $P_{01} + F_{02}P_{21} + F_{12}P_{02} + F_{02}F_{12}P_{22}$. `updateGPS` also never shrinks `P_[2][2]`, which should be reduced by $K_{20}P_{02} + K_{21}P_{12}$. The heading variance therefore only grows. The code is approximate rather than a crash, and fixing it would mean adding code lines.
- `robotics/part3/topic2/chapter2-kalman-filter-and-sensor-fusion.md` (line ~9): "In May 1960, Kálmán published…". The paper in the ASME Journal of Basic Engineering is usually dated March 1960. I could not verify this offline.
- `robotics/part1/topic2/chapter3-homogeneous-transforms-se2-se3.md` (line ~408): The text says that applying `transform_point` to a 1 m/s velocity at (100, 50) makes the velocity "101 m/s". In fact it gives (101, 50), which is about 112.7 m/s. The figure is illustrative and only roughly right.
- `robotics/part1/topic1/chapter1-coordinates-radians-and-trig.md` (line ~290): The text says atan2 returns $(-\pi, \pi]$. With signed zeros, IEEE atan2 can also return $-\pi$. This is a pedantic point and was not changed.

### Verified clean (recomputed)
I recomputed the following and they match:
- Trig/wrap dry-run table
- Vector dot/cross table
- Matrix products HR90 and R90H, and the basis-vector table
- SO(2) rotation table
- Gimbal-lock matrix, which matches numerically
- Quaternion formulas: Hamilton product, rpy→quat, quat→R
- SE(2) chain/inverse table
- The tf-tree project: I ran the code, the test suite passes, and all 5 expected rows match
- Derivative-noise/EMA table
- Integrator comparison table
- FK/IK tables and det(J)
- DLS IK, which converges to the target
- Diff-drive regime table
- Saturation radii
- Mecanum matrix
- Quadrature tick count
- 4-tick odometry table
- 10 m drift of 34.9 cm
- PID 5-tick table
- LQR K·x table
- Gaussian statistics, the 4-sample covariance table, ρ = 0.949, and the bell-curve peak heights
- 1D Kalman 5-tick table, which matches within rounding
- EKF Jacobians, including the range/bearing H
- Waypoint dry run

The Python blocks also run.

## Robotics Parts 4–5

### Fixed
- `robotics/part4/topic1/chapter1-modern-cpp-memory-raii-and-smart-pointers.md` (line ~196): BloatedImuPacket comment said "16 bytes of actual data + 17 bytes wasted" (16+17 != 40) → "23 bytes of actual data" (1+8+1+4+8+1 = 23; padding 7+3+7 = 17). Verified by compiling the chapter's code with g++: sizeof = 40, Aligned = 32.
- `robotics/part4/topic1/chapter2-ring-buffers-threads-and-deterministic-loops.md` (line ~254): the intro listed `pop_latest()`, but the code defines `pop_oldest()` → now `pop_oldest()`.
- `robotics/part4/topic2/chapter1-occupancy-grids-astar-and-rrt.md` (line ~169-180): the A* trace table skipped expanding (2,0) (f=8) and went straight to (3,1) (f=10). Inserted the missing row "(2,0) g2 h6 f8 → push (3,0): 3+7=10" and renumbered steps 6-11 → 7-12. Verified by re-running 4-connected Manhattan A* with ties broken on lower h (the order this table already used). The other rows matched exactly.
- same file (line ~154-157): the grid diagram's step numbers didn't match the stated 10-step path. It had (3,2)=4, G=8; now (3,1)=4, (3,2)=5, (3,3)=6, (2,3)=7, (1,3)=8, (0,3)=9, G=10. I kept the `*` markers.
- same file (line ~53): "we subtract l_free = -0.4" would raise the log-odds (sign error) → "we add l_free = -0.4".
- same file (line ~391): the RRT docstring said "Checks 10 interpolated points", but `range(11)` checks 11 → "11". Also ran the RRT script (it works, 22 waypoints).
- `robotics/part4/topic2/chapter2-ros2-architecture-and-mujoco-simulation.md` (line ~87): the prose said SensorDataQoS is `KeepLast(1)`. rmw sensor-data profile depth is 5, and the chapter's own code comment and summary table say KeepLast(5) → `KeepLast(5)`.
- same file (line ~350): the code comment said the start is "hanging straight down (q = [90 deg, 0 deg])", but the code sets [60, 30] → "drooping downward (q = [60 deg, 30 deg])".
- same file (line ~406-409): the MuJoCo dry-run table didn't match the code. The steady-state gravity bias/torque on the shoulder was -13.31 N·m. Static check: at q=[0,-45°], g·(2·0.25 + 1·(0.5 + 0.2·cos45°)) = 11.20 N·m, so the correct value is -11.20 (the elbow -1.39 and EE z = 1.283 were right). The transients (8.42° at 0.2 s, 0.31° at 0.4 s) are also impossible: Kp=120, Kd=22, M11≈0.6 gives an overdamped slow pole with τ≈0.15 s, plus saturation at the start. Replaced rows 100/200/300/500 with output from an independent Lagrangian 2-link RK4 re-implementation (MuJoCo capsule inertia formula, joint damping, ctrl clamping, same 500 Hz loop). For example, t=0.20 s: q=[25.77°, -20.07°], bias [-9.95, -2.28], tau [4.54, 1.20], z 0.743; t=1.00 s: [0.08°, -44.82°], bias [-11.20, -1.39], z 1.281. Row 0 already matched. CAVEAT: `mujoco` isn't installed, so these are not MuJoCo's own printout. Hundredths of a degree could differ slightly from real MuJoCo; the old values were off by tens of degrees.
- `robotics/part4/topic2/project-cpp-autonomous-robot-daemon.md` (line ~585): "sub-microsecond loop body times (`Exec=1.40 us`)". 1.40 µs is not sub-µs → "few-microsecond".
- same file (line ~34): the architecture diagram labelled the call `pop_latest()`, but the code uses `pop_latest_and_clear()` → updated the label.
- `robotics/part5/topic1/chapter1-the-event-loop.md` (line ~314-321): claimed asyncio.run() can be called only once per program and that a second call raises "RuntimeError: This event loop is already running". Verified that two sequential calls work. The RuntimeError only occurs when it is called inside a running loop ("asyncio.run() cannot be called from a running event loop"). Rewrote those comments.
- same file (line ~70): "Equivalent to: loop = asyncio.get_event_loop()" → `asyncio.new_event_loop()`. asyncio.run creates a new loop; get_event_loop with no loop is deprecated (3.12+) or an error (3.14).
- same file (lines ~77, ~148, ~152): said Python threads give "true parallelism (multiple cores)" and are "best for CPU-bound work". In CPython the GIL serialises bytecode, and CPU-bound work needs processes. Corrected the prose sentence and the two table cells.
- `robotics/part5/topic1/chapter2-concurrent-execution.md` (line ~272): "task1 and task3 are cancelled because task2 failed". Running the exact example on 3.13 shows task1 and task3 finish successfully (no awaits, same loop iteration). Comment now says still-pending siblings get cancelled, and that here they had already finished.
- same file (line ~394): said a GC'd unreferenced task is cancelled with "no error, no warning". asyncio logs "Task was destroyed but it is pending!" → corrected.
- `robotics/part5/topic1/chapter3-async-http.md` (line ~336): "httpx automatically follows redirects (up to 30 by default)" → it does NOT follow redirects unless follow_redirects=True, and then max_redirects=20. Verified from the AsyncClient signature in httpx 0.28.1.
- same file (lines ~224, ~235): backoff text said waits of 1, 2, 4 s, but with max_retries=3 the third attempt re-raises, so only 1 s and 2 s happen. Updated the attempt=2 comment and the prose sentence.
- `robotics/part5/topic2/chapter1-fastapi-basics.md` (line ~395): `HTTP_403_FORBIDDEN  # 402` → `# 403`.
- same file (line ~543): sync `def` endpoint "blocks the event loop". FastAPI runs `def` endpoints in a threadpool, so it blocks a worker thread, not the loop → corrected comment.
- `robotics/part5/topic2/chapter2-dependency-injection.md` (lines ~522, ~563-569): claimed multiple dependencies "run concurrently / in parallel". Verified with FastAPI 0.139: two 0.3 s sync deps took 0.63 s total and logged start/end strictly in sequence → now says sequential, in declaration order.
- same file (line ~172-173): lifecycle listed teardown before "Response is sent". On FastAPI 0.139 the log shows setup → endpoint → middleware receives the response → teardown (default `scope="request"`). Swapped steps 6/7.
- same file (line ~401): "If the header is missing or invalid, this runs" contradicts the chapter's own (correct) note that a missing header gives 422 before the dependency body runs. Verified the 422 "Field required" → comment fixed.
- same file (line ~735): quick-ref `@asynccontextmanager def lifespan(app):` → `async def` (an async context manager needs an async generator).

### Suspected (not fixed)
- `robotics/part5/topic2/chapter2-dependency-injection.md` (line ~61-64): `async def main()` imports `asgiref` (not a dependency) and calls `uvicorn.run()` inside a coroutine. If someone ran it with asyncio.run it would fail (uvicorn.run → asyncio.run inside a running loop). It is never invoked, so I left it alone.
- same file (line ~578-611): the "Sharing Dependencies" section is muddled ("WRONG: sharing a yield dependency between endpoints" / "if you WANT to share... use a class-based dependency" followed by code showing different instances). It is more confused than strictly false.
- `robotics/part5/topic1/chapter3-async-http.md` (line ~112-114): the comparison table says requests' connection pool is "Manual" (Session pools automatically) and httpx retries are "Built-in" (only transport-level connect retries via `AsyncHTTPTransport(retries=N)`). Both are overstated but arguable.
- `robotics/part5/topic1/chapter1-the-event-loop.md` (lines ~77, ~141): says coroutines have "no race conditions". Interleaving at `await` can still race on shared state (the table elsewhere hedges with "Rarely"). Left as a teaching simplification.
- `robotics/part5/topic2/chapter1-fastapi-basics.md` (line ~397): `status.HTTP_422_UNPROCESSABLE_ENTITY` is deprecated in recent Starlette in favour of `HTTP_422_UNPROCESSABLE_CONTENT` (still works).
- `robotics/part4/topic2/chapter1-occupancy-grids-astar-and-rrt.md` (line ~133): the optimality argument cites only admissibility, but the C++ code uses a closed set without re-opening, which needs a consistent heuristic. Octile is consistent, so the code is fine; the claim is a simplification.
- `robotics/part4/topic2/chapter2-ros2-architecture-and-mujoco-simulation.md` (line ~37): attributes unique_ptr zero-copy passing to "DDS". In practice it is rclcpp intra-process comms (or iceoryx/loaned messages). Wording issue.
- `robotics/part4/topic2/project-cpp-autonomous-robot-daemon.md` (line ~15): calls the mutex-guarded shared_ptr swap an "atomic pointer swap"; line ~378 correctly says lock-guarded. I couldn't compile the C++20 project (local g++ is 6.3), and the expected telemetry output is timing-dependent. Its ω values are self-consistent with 2.5·(π/4 − θ).
- `robotics/part4/topic1/chapter2-ring-buffers-threads-and-deterministic-loops.md` (line ~13 vs ~26): objectives say "20 Hz LiDAR path planning", body/diagram say 10 Hz. Inconsistent but neither is wrong per se. Line ~246: steady_clock "can never be adjusted by NTP" — CLOCK_MONOTONIC is still slewed in rate by NTP but never jumps.
- `robotics/part4/topic1/chapter1-modern-cpp-memory-raii-and-smart-pointers.md` (line ~72): the legend's "Avg = 0.22 ms" for the GC runtime. Over the stated 10,000 ticks the average is ≈0.20 ms. Minor.

## Robotics Parts 6–7

### Fixed
- `robotics/part6/topic1/chapter3-foreign-keys-constraints.md` (lines ~130, ~213, ~288): claimed the default FK delete behaviour is `RESTRICT`. The PostgreSQL default is `NO ACTION` (it also blocks the delete, but it is a different, deferrable action). Heading and both table rows now say the default is `NO ACTION`, which also blocks. Verified against the PostgreSQL FK semantics (the default referential action is NO ACTION).
- `robotics/part6/topic1/chapter4-advanced-sql.md` (line ~26): the "Scalar Subquery" example selected `username` from a derived table that only has `user_id, post_count`, so it errors. Added `JOIN users ON users.id = user_posts.user_id`. Verified with sqlite3: before the fix it fails with "no such column: username"; after the fix it runs.
- `robotics/part6/topic2/chapter2-background-queues.md` (line ~224): the comment said BullMQ exponential backoff with `attempts: 3, delay: 1000` waits "1s, 2s, 4s". 3 attempts means only 2 retries (2^(n-1)·delay), so the waits are 1s and 2s. Changed to "1s, 2s (3 attempts = 2 retries)". Verified from BullMQ's documented backoff formula.
- `robotics/part6/topic2/chapter3-redis-caching.md` (lines ~166, ~216, ~306): `const products = await db.select().from(products)` shadows the `products` table inside its own initializer. That throws a TDZ ReferenceError, so the code cannot run. Renamed the local to `rows` / `productList`. Verified from JS `const` TDZ semantics.
- `robotics/part6/topic2/chapter4-websockets.md` (line ~82): the install command left out `@hono/node-ws`, which the code imports. Added it.
- `robotics/part6/topic2/chapter4-websockets.md` (line ~354): the Redis sub handler looked up `rooms.get(channel)` with channel `room:general`, but `rooms` is keyed by the bare roomId, so nothing was ever delivered. Changed to `rooms.get(channel.replace('room:', ''))`.
- `robotics/part6/topic2/chapter5-cicd.md` (lines ~131, ~147): claimed that `setup-node` `cache: 'npm'` caches `node_modules`. It caches npm's download cache (`~/.npm`), and `npm ci` always deletes and rebuilds `node_modules`. Both sentences are corrected.
- `robotics/part7/topic1/chapter1-basemodels.md` (lines ~136, ~360, ~511): the error type was shown as `type=number_parsing`. For a `float` field Pydantic emits `float_parsing`, in both Python and JSON mode. Verified with pydantic 2.13.
- `robotics/part7/topic1/chapter1-basemodels.md` (line ~564): the v1 table listed `.from_dict(dict)`, which does not exist. The v1 method is `.parse_obj(dict)`.
- `robotics/part7/topic1/chapter2-field-constraints.md` (lines ~164, ~193): the "valid" example used `sensor_id="T-001"`, which fails its own pattern `^[A-Z]{2}-\d{3}$`. Changed it to `TC-001` and updated the output. The bad case (`"bad_id"`, `"v2"`) actually produces **2** validation errors (sensor_id and firmware_version), not 1, so the output now shows both. Verified with pydantic 2.13.
- `robotics/part7/topic1/chapter2-field-constraints.md` (line ~237): the output showed the pattern as `'^\\d{3}$'`, but Pydantic prints `'^\d{3}$'`. Verified.
- `robotics/part7/topic1/chapter2-field-constraints.md` (lines ~340, ~349): claimed that `active_alarms: list[str] = []` makes all Pydantic instances share the same list. Pydantic copies mutable defaults per instance (verified: `m1.a.append` leaves `m2.a == []`). The text now says it is safe in Pydantic, a bug in plain Python, and that `default_factory` is the explicit, portable habit.
- `robotics/part7/topic1/chapter2-field-constraints.md` (line ~406): the "What Happens When Each Constraint Fails" block used `Literal` without importing it, which raises NameError. Added `from typing import Literal`.
- `robotics/part7/topic1/chapter3-custom-validators.md` (line ~297): the output showed `Differential: 5.0`, but the code prints `Differential: 5.0C`. Verified.
- `robotics/part7/topic1/chapter3-custom-validators.md` (lines ~353-358): the wrap-validator output for `print(str(e)[:200])` was wrong. It had a spurious leading `CoolantSystem` line, nested lines beyond the 200-char cut, and `number_parsing`. Replaced with the actual first 200 chars from pydantic 2.13.
- `robotics/part7/topic1/chapter3-custom-validators.md` (line ~202): the mode table said `wrap` validators receive "Typed Python" input. They receive the raw input, before `handler(v)` runs. Changed to "Anything (raw input)".
- `robotics/part7/topic2/chapter1-middleware-interceptors.md` (line ~180): the decorator example output contained `[PRE-CHECK] ...` and `[POST-CHECK] ...` lines that the code never prints. Removed them; the output is now the single dict line. Verified by running.
- `robotics/part7/topic2/chapter1-middleware-interceptors.md` (line ~273): the comment said "ignores extra fields (strict=False)". Ignoring extras is controlled by `extra="ignore"`, not `strict`. Fixed the comment.
- `robotics/part7/topic2/chapter1-middleware-interceptors.md` (line ~440): said `@safety_interceptor` is "applied first" and `@log_interceptor` second, while also saying decorators apply bottom-up. That contradicts itself and the diagram below it. Corrected: log is applied first (inner), safety second (outer), and safety runs first at call time.
- `robotics/part7/topic2/chapter1-middleware-interceptors.md` (line ~656): the JSONDecodeError message for the missing-brace input is `Expecting ',' delimiter: line 1 column 39 (char 38)`, not "Expecting property name...". Verified with Python 3.13.
- `robotics/part7/topic2/chapter1-middleware-interceptors.md` (line ~689): `{"no_action": True}` against MotorCommand gives "3 validation errors" (action, motor_id and speed_rpm are all missing), not "1 validation error". Verified.
- `robotics/part7/topic2/chapter2-deterministic-fallbacks.md` (lines ~93-99): the FallbackChain output showed 4 lines for 3 contexts, and claimed that 500 gets clipped to 100 and that `{}` hits safe_default. The real output is `ai_recommendation 80`, `ai_recommendation 500`, and `{} -> physics_rule 100`. Fixed the output. Replaced the false sentence with a note: the first non-None answer wins and the AI step runs first, so physics never clips here. Verified by running.
- `robotics/part7/topic2/chapter2-deterministic-fallbacks.md` (line ~451): output said `freezer: rejected — freezer min temp is -40C` for -10°C, which is inside [-40, 0]. The actual output is `freezer: accepted — Within limits`. Verified by running.

### Suspected (not fixed)
- `robotics/part7/topic2/chapter1-middleware-interceptors.md` (throughout): the "**Line N-M:**" references in the "What's happening" bullets (e.g. "Line 20-21", "Line 168-171") do not match the line numbers of the code blocks they describe. They look like leftovers from an older numbering. Not changed, because fixing them means renumbering many bullets.
- `robotics/part7/topic2/chapter1-middleware-interceptors.md` (line ~629): says a pre-check that returns `True` "works by accident". In fact `execute` would return `True` rather than a dict, and any caller doing `.get` on it would crash. Debatable wording, so left alone.
- `robotics/part7/topic2/chapter1-middleware-interceptors.md` (line ~718): heading typo "What's hanging:" (should be "What's happening:"). Not a factual error.
- `robotics/part6/topic1/chapter4-advanced-sql.md` (lines ~161-168): the recursive-CTE illustration lists depth 0,1,2,0, but the query has `ORDER BY depth, id`, so both depth-0 rows would come first. The block is labelled as the CTE contents and reads as a conceptual tree, so it was left alone.
- `robotics/part6/topic1/chapter2-sql-queries.md` (line ~30): `INSERT INTO users VALUES (DEFAULT, 'dave', 'dave@email.com', DEFAULT, DEFAULT, DEFAULT)` supplies 6 values. The chapter-1 `users` table has either 4 columns (Section 2) or 7 (Section 6), so neither matches. Which schema is meant is unclear.
- `robotics/part7/topic1/project-sensor-schema-validator.md` (line ~35): the `@field_validator` that rejects values below -273.15 can never fire, because `Field(ge=-40.0)` rejects them first. This is a design oddity, not a wrong output; the expected output table was verified as correct.
- Pydantic error outputs throughout part7 leave out the trailing `For further information visit https://errors.pydantic.dev/...` line, and some leave out the `[type=value_error, input_value=...]` suffix. Treated as deliberate abbreviation, not an error.
- `robotics/part7/topic2/chapter1-middleware-interceptors.md` (line ~523): the audit-trail output is shown wrapped over two lines. `print(list)` prints it on one line. Cosmetic only.

## Robotics Part 8

### Fixed
- `robotics/part8/topic1/chapter1-chat-completions-api.md` (lines ~438, 454, 603): finish_reason `"tool"` → `"tool_calls"`. That is the OpenAI Chat Completions value, and chapter6 of the same part already uses `"tool_calls"`.
- `robotics/part8/topic1/chapter1-chat-completions-api.md` (~601): Quick-ref temperature range `0.0 to 1.0` → `0.0 to 2.0` (OpenAI accepts 0–2).
- `robotics/part8/topic1/chapter2-context-windows.md` (~56-57, 78): token count 17 → 15. The shown ID list had only 16 IDs; replaced it with the real o200k IDs. "71 characters" → 73. Verified with tiktoken; cl100k also gives 15.
- `chapter2-context-windows.md` (table ~87, 89): "temperature" 3 tokens → 1 (11:1). "450°C" 3 → 2 (2.5:1). o200k and cl100k agree.
- `chapter2-context-windows.md` (~102): "# 14 tokens" → 10 (tiktoken).
- `chapter2-context-windows.md` (output ~146-148): the loop with `"padding " * 200` x50 never reaches 90% of 128k. Ran the code; the real output is `Final message count: 51` / `Estimated tokens: 10256`, with no warning line.
- `chapter2-context-windows.md` (sliding-window diagram ~289-302): the 20 non-system messages are u1..u10/a1..a10, not u1..u20/a20. Last 6 = u8..a10; dropped = u1-a7 (was "u15..a17" and "u1-a14, a14-u14"). Box widths preserved.
- `chapter2-context-windows.md` (output ~399): ran the code; with `[:80]` the summary line actually ends "...temperature of senso". The shown text ran past 80 characters.
- `chapter2-context-windows.md` (output ~522-524), cost demo, via tiktoken:
  - input tokens 756 → 1612
  - cost $0.0039 → $0.0060
  - input cost $0.0019 → $0.0040
- `chapter2-context-windows.md` (~544-546): 100,000/1000*0.0025 = $0.25, not $2.50, so the total is ~$0.26, not $2.51. This now matches the chapter's own cost table.
- `chapter2-context-windows.md` (~156, 175): GPT-3.5-turbo context 16,384 → 16,385, the value OpenAI documents.
- `robotics/part8/topic1/chapter4-json-schema-generation.md` (~341): ran under Python 3.13. `advanced_type_to_schema(Optional[float])` returns `{'type': 'string'}`, not `{'type': 'number'}`, because the origin is Union and it falls through to the default.
- `chapter4-json-schema-generation.md` (~255, 271): the code uses `func.__doc__` verbatim, so the generated description keeps the docstring's trailing period ("...from a sensor.", "...for a sensor.").
- `robotics/part8/topic1/chapter5-dynamic-execution.md` (~168-169): `read_sensor` returns `{..., metric: 72.5}` with `metric` as a variable. The keys are therefore `'temperature'` / `'humidity'`, not a literal `'metric'`.
- `robotics/part8/topic1/chapter6-real-agent-loop.md` (~298): `execute_tool_parallel(message.tool_calls)` would raise TypeError. The SDK tool-call objects can't be subscripted, but the function uses `tc["function"]["name"]`. Changed to `execute_tool_parallel([tc.model_dump() for tc in message.tool_calls])`.
- `robotics/part8/topic2/chapter1-embeddings.md` (~267): `hashlib.sha256(encoded_key)` was a NameError → `encoded_text`. That is the variable defined on the line above, and the name the walkthrough uses.
- `robotics/part8/topic2/chapter2-cosine-similarity.md`, all checked with numpy:
  - cos(v1,v3) ~0.85 → ~0.64 (exact 0.636)
  - |v2| ≈ 1.11 → 0.84
  - "v2 is roughly 1.5x v1" → "v1 + 0.05 in every dimension"
  - Euclidean sqrt(40.5) ≈ 6.7 / 6.71 → 6.36 (3 places)
  - doc2 score ≈ 0.19 → 0.22
  - "Similar topic" +0.9877 → +0.9788
- `robotics/part8/topic2/chapter3-chunking-strategies.md` (~108-110): ran the code. Chunk 0 is pure A, chunk 1 mixed A/B, chunk 2 pure B. The comments wrongly said A+B, B+C, B+C.
- `chapter3-chunking-strategies.md` (~127-129): `text[:30]` = "Before installing the pump, ve" and `text[30:]` = "rify alignment...". The comments showed a clean split at "pump,"; the problem line was updated to match.
- `chapter3-chunking-strategies.md` (~200-202): sentence lengths 31/35/51 → 30/34/50, so the running sums 66/117 → 64/114 (checked with len()).
- `chapter3-chunking-strategies.md` (~287): the claim "overlap > chunk_size so the fallback character split kicks in" was false. Running the code shows the "\n\n" split already succeeds (3 chunks). Added that the fallback, if reached, would get a negative step and return an empty list.
- `chapter3-chunking-strategies.md` (~366-375), overlap demo strings:
  - text[:45] ends "Attac"
  - text[35:80] starts "p 2: Attach..."
  - the overlap text[35:45] is "p 2: Attac" (was "e plate. S")
- `robotics/part8/topic2/chapter4-vector-databases.md` (~118): doc1 score ≈ 0.19 → 0.24 (numpy).
- `robotics/part8/topic2/chapter5-metadata-filtering.md` (~231-232): post-filter scores, via numpy: chunk1 ≈ 0.98 → 0.99 (0.9975), chunk2 ≈ 0.15 → 0.29.
- `robotics/part8/topic2/chapter6-state-dictionary.md` (~415): the function has no `return`, so `state = None` and `state["phase"]` raises TypeError. It does not print "idle".
- `robotics/part8/topic2/chapter8-self-correction-loops.md` (~317, ~370-372): Pydantic v2 lax mode coerces `"4"` to float, so only `priority` fails (int_parsing). Updated the prose and the log illustration.
- `chapter8-self-correction-loops.md` (error taxonomy table ~435-442), error types verified with pydantic 2.13:
  - `string_type` means a non-string where a string is expected; the example is now `"machine_id": 101`.
  - `"priority": "high"` is `int_parsing`.
  - `"1"` and `"4.5"` parse fine, so those examples were changed to strings that can't be parsed.
  - `value_error` comes from a custom validator raising ValueError; a bad enum value is `enum`.
  - v1 names `assertion` / `value_error.url` → v2 `assertion_error` / `url_parsing`.
- `chapter8-self-correction-loops.md` (~500): sample raw error `[type=string_type]` → `[type=int_parsing]`, with a `priority:` prefix. This matches pydantic's actual str(e).
- `robotics/part8/topic2/chapter9-architecture-review.md` (~184): with temp 87.3, pressure 142.1 and vibration 4.2, the validator gives `errors = []`, not a "96.5C exceeds" error.
- `robotics/part8/topic2/chapter10-observability.md` (~112): `redact("sk-1234567890abcdef")` gives 15 asterisks + "cdef" (the text showed 12).

### Suspected (not fixed)
- `topic1/chapter2-context-windows.md` (~112, 166-168, 199-200): claims the API "either truncates older messages (silently) or returns an error", and gives the error as "max_tokens is too large". OpenAI Chat Completions actually returns a 400 context_length_exceeded and does not silently truncate. Not changed because the behaviour depends on the vendor; some APIs or SDK options do truncate.
- `topic1/chapter1-chat-completions-api.md` (~161, 250): "temperature 0.0 = deterministic / same input → same output". In practice outputs aren't guaranteed identical. The table also calls 1.0 "Maximum creativity", though OpenAI goes up to 2.0. Both are teaching simplifications.
- `topic1/chapter5-dynamic-execution.md` (~258-271): the ThreadPoolExecutor timeout wrapper uses `with`, whose exit calls `shutdown(wait=True)`. The caller therefore still blocks for the full 5 s before seeing TimeoutError, so the "timeout" doesn't actually unblock it. The printed output is correct. A fix would mean restructuring the code.
- `topic1/chapter6-real-agent-loop.md` (~197-200): "Exit 3: Error … break out of loop". The error-recovery loop in the same chapter uses `continue`, not `break`.
- `topic2/chapter3-chunking-strategies.md` (~41, 75), two claims I believe are wrong but did not check online:
  - "Beyond [8191 tokens], text is silently truncated": the OpenAI embeddings API returns an error instead.
  - voyage-2 context is listed as 32,000 tokens; I believe voyage-2 is 4K.
- `topic2/chapter4-vector-databases.md` (~247-249, 258): `WHERE machine_id = 'P101'` with an ivfflat index is called a "pre-filter". With an ANN index, pgvector applies the filter after the index scan, so a query can return fewer rows than LIMIT. This depends on version; pgvector 0.8 added iterative scans.
- `topic2/chapter4-vector-databases.md` (~450-453): implies it is fine to mix ada-002 and text-embedding-3-small vectors because their dimensions match. Different models' embedding spaces can't be compared.
- `topic2/chapter6-state-dictionary.md` (~248-266): `run_diagnostic` calls `initialize_state()`, whose DiagnosticState has no `collected_facts` or `analysis_result` keys, together with `gather_input`/`analyze` from section 1. As written it raises KeyError 'collected_facts'. Fixing it needs code restructuring.
- `topic2/chapter8-self-correction-loops.md` (~374-375): the hypothetical log shows "machine_id: String should have at least 1 character", but MaintenancePlan has no min_length. Also, the dummy `call_llm` always returns the same output, so attempts 2 and 3 can't succeed. It is illustrative only.
- `topic2/chapter9-architecture-review.md`, two inconsistencies:
  - The data-flow diagram runs Planner→Retriever, but the orchestrator runs the Retriever first.
  - In ProductionPipeline `stage_status` is never filled, so `stages_completed` is always 0.
- `topic2/chapter10-observability.md` (~536-539): the log example shows the retry's second attempt passing. But `validator_with_logging` re-validates the same unchanged data, so a retry can never change the outcome.
- `topic2/project-industrial-rag-pipeline.md` (~14 vs 35): the spec requires a 200-character overlap, but the starter `chunk_manual` defaults to overlap=100.
- `topic2/chapter1-embeddings.md` (~312-326, 369): the comment "Hash is normalized" is contradicted by the lines right after it. The closing claim that hash keys handle "whitespace or encoding differences" really comes from the strip/lower normalization, and that only covers leading and trailing whitespace.

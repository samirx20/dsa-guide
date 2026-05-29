import { useState } from "react";

const STORAGE_KEY = "dsa-guide-v3";

const CURRICULUM = [
  {
    id:"p1", phase:1, title:"Foundations", accent:"#5F5E5A",
    subtitle:"C++ STL & Big O — learn these before touching a problem",
    topics:[
      { id:"p1t1", title:"C++ STL Essentials", items:[
        {id:"p1t1c1",type:"concept",text:"vector<T> — push_back, pop_back, size, resize, reverse, sort, erase"},
        {id:"p1t1c2",type:"concept",text:"string — length, substr, find, stoi, to_string, append, compare"},
        {id:"p1t1c3",type:"concept",text:"pair<A,B> and tuple — make_pair, get<>, structured bindings (auto& [a,b])"},
        {id:"p1t1c4",type:"concept",text:"unordered_map & map — insert, find, count, erase, iteration, operator[]"},
        {id:"p1t1c5",type:"concept",text:"unordered_set & set — insert, count, erase, lower_bound, upper_bound"},
        {id:"p1t1c6",type:"concept",text:"stack<T>, queue<T>, deque<T> — push/pop patterns and when to use each"},
        {id:"p1t1c7",type:"concept",text:"priority_queue — max-heap by default; min-heap with greater<int>"},
        {id:"p1t1c8",type:"concept",text:"Algorithm STL — sort(), min/max, accumulate, lower_bound, upper_bound, binary_search"},
        {id:"p1t1c9",type:"concept",text:"Range-based for loops, auto keyword, lambda functions & custom comparators"},
      ]},
      { id:"p1t2", title:"Time & Space Complexity", items:[
        {id:"p1t2c1",type:"concept",text:"Big O notation — O(1), O(log n), O(n), O(n log n), O(n²), O(2ⁿ), O(n!)"},
        {id:"p1t2c2",type:"concept",text:"Analyzing single loops, nested loops, and consecutive function calls"},
        {id:"p1t2c3",type:"concept",text:"Space complexity — auxiliary space vs input space; stack frames in recursion"},
        {id:"p1t2c4",type:"concept",text:"Recursion complexity — draw the recursion tree, count nodes and depth"},
        {id:"p1t2c5",type:"concept",text:"Best / Average / Worst case — know when each matters"},
      ]},
    ]
  },
  {
    id:"p2", phase:2, title:"Arrays & Core Techniques", accent:"#185FA5",
    subtitle:"Master these patterns cold — they appear everywhere",
    topics:[
      { id:"p2t1", title:"Array Basics & Kadane's Algorithm", items:[
        {id:"p2t1c1",type:"concept",text:"1D and 2D array traversal — row-major, column-major, diagonal"},
        {id:"p2t1c2",type:"concept",text:"In-place modifications and when you need extra space"},
        {id:"p2t1c3",type:"concept",text:"Kadane's Algorithm — max subarray sum, track current and global max"},
        {id:"p2t1p1",type:"problem",num:1,   slug:"two-sum",                          title:"Two Sum",                       difficulty:"Easy"},
        {id:"p2t1p2",type:"problem",num:217, slug:"contains-duplicate",               title:"Contains Duplicate",            difficulty:"Easy"},
        {id:"p2t1p3",type:"problem",num:121, slug:"best-time-to-buy-and-sell-stock",  title:"Best Time to Buy and Sell Stock",difficulty:"Easy"},
        {id:"p2t1p4",type:"problem",num:53,  slug:"maximum-subarray",                 title:"Maximum Subarray (Kadane's)",   difficulty:"Medium"},
        {id:"p2t1p5",type:"problem",num:238, slug:"product-of-array-except-self",     title:"Product of Array Except Self",  difficulty:"Medium"},
        {id:"p2t1p6",type:"problem",num:152, slug:"maximum-product-subarray",         title:"Maximum Product Subarray",      difficulty:"Medium"},
      ]},
      { id:"p2t2", title:"Prefix Sum", items:[
        {id:"p2t2c1",type:"concept",text:"Prefix sum array — build once O(n), then answer range queries in O(1)"},
        {id:"p2t2c2",type:"concept",text:"prefix[i] - prefix[j] trick for subarray sums"},
        {id:"p2t2c3",type:"concept",text:"2D prefix sums for matrix rectangle queries"},
        {id:"p2t2p1",type:"problem",num:1480,slug:"running-sum-of-1d-array",          title:"Running Sum of 1d Array",       difficulty:"Easy"},
        {id:"p2t2p2",type:"problem",num:724, slug:"find-pivot-index",                 title:"Find Pivot Index",              difficulty:"Easy"},
        {id:"p2t2p3",type:"problem",num:303, slug:"range-sum-query-immutable",        title:"Range Sum Query - Immutable",   difficulty:"Easy"},
        {id:"p2t2p4",type:"problem",num:560, slug:"subarray-sum-equals-k",            title:"Subarray Sum Equals K",         difficulty:"Medium"},
        {id:"p2t2p5",type:"problem",num:525, slug:"contiguous-array",                 title:"Contiguous Array",              difficulty:"Medium"},
      ]},
      { id:"p2t3", title:"Two Pointers", items:[
        {id:"p2t3c1",type:"concept",text:"Opposite-end pointers — squeeze inward, classic for sorted arrays"},
        {id:"p2t3c2",type:"concept",text:"Same-direction pointers — slow/fast, read/write pattern"},
        {id:"p2t3c3",type:"concept",text:"When two pointers work: sorted input, find pair with target sum/diff"},
        {id:"p2t3p1",type:"problem",num:125, slug:"valid-palindrome",                 title:"Valid Palindrome",              difficulty:"Easy"},
        {id:"p2t3p2",type:"problem",num:167, slug:"two-sum-ii-input-array-is-sorted", title:"Two Sum II - Input Array Is Sorted",    difficulty:"Medium"},
        {id:"p2t3p3",type:"problem",num:15,  slug:"3sum",                             title:"3Sum",                         difficulty:"Medium"},
        {id:"p2t3p4",type:"problem",num:11,  slug:"container-with-most-water",       title:"Container With Most Water",    difficulty:"Medium"},
        {id:"p2t3p5",type:"problem",num:42,  slug:"trapping-rain-water",             title:"Trapping Rain Water",           difficulty:"Hard"},
      ]},
      { id:"p2t4", title:"Sliding Window", items:[
        {id:"p2t4c1",type:"concept",text:"Fixed-size window — maintain running sum/count, slide by one"},
        {id:"p2t4c2",type:"concept",text:"Variable-size window — expand right, shrink left when condition violated"},
        {id:"p2t4c3",type:"concept",text:"Using frequency maps inside a window for character count problems"},
        {id:"p2t4p1",type:"problem",num:643, slug:"maximum-average-subarray-i",              title:"Maximum Average Subarray I",               difficulty:"Easy"},
        {id:"p2t4p2",type:"problem",num:3,   slug:"longest-substring-without-repeating-characters",title:"Longest Substring Without Repeating Characters",difficulty:"Medium"},
        {id:"p2t4p3",type:"problem",num:424, slug:"longest-repeating-character-replacement", title:"Longest Repeating Character Replacement",  difficulty:"Medium"},
        {id:"p2t4p4",type:"problem",num:567, slug:"permutation-in-string",                   title:"Permutation in String",                    difficulty:"Medium"},
        {id:"p2t4p5",type:"problem",num:76,  slug:"minimum-window-substring",               title:"Minimum Window Substring",                 difficulty:"Hard"},
      ]},
    ]
  },
  {
    id:"p3", phase:3, title:"Sorting Algorithms", accent:"#0F6E56",
    subtitle:"Understand the internals — don't just call sort()",
    topics:[
      { id:"p3t1", title:"All Major Sorts", items:[
        {id:"p3t1c1",type:"concept",text:"Bubble Sort — O(n²), stable, good for nearly-sorted"},
        {id:"p3t1c2",type:"concept",text:"Selection Sort — O(n²), unstable, min swaps"},
        {id:"p3t1c3",type:"concept",text:"Insertion Sort — O(n²) worst / O(n) best, stable, great for small n"},
        {id:"p3t1c4",type:"concept",text:"Merge Sort — O(n log n), stable, O(n) extra space — implement from scratch"},
        {id:"p3t1c5",type:"concept",text:"Quick Sort — O(n log n) avg / O(n²) worst, in-place, partition logic"},
        {id:"p3t1c6",type:"concept",text:"Counting Sort & Radix Sort — O(n+k) for limited range integers"},
        {id:"p3t1c7",type:"concept",text:"Stability — when does sort order of equal elements matter?"},
        {id:"p3t1p1",type:"problem",num:912, slug:"sort-an-array",          title:"Sort an Array (implement merge sort)", difficulty:"Medium"},
        {id:"p3t1p2",type:"problem",num:75,  slug:"sort-colors",            title:"Sort Colors (Dutch National Flag)",    difficulty:"Medium"},
        {id:"p3t1p3",type:"problem",num:56,  slug:"merge-intervals",        title:"Merge Intervals",                     difficulty:"Medium"},
        {id:"p3t1p4",type:"problem",num:179, slug:"largest-number",         title:"Largest Number (custom comparator)",   difficulty:"Medium"},
      ]},
    ]
  },
  {
    id:"p4", phase:4, title:"Binary Search", accent:"#3B6D11",
    subtitle:"If the input is sorted (or the answer space is bounded), think binary search",
    topics:[
      { id:"p4t1", title:"Binary Search Patterns", items:[
        {id:"p4t1c1",type:"concept",text:"Classic template — left, right, mid=(l+r)/2, termination: l <= r"},
        {id:"p4t1c2",type:"concept",text:"lower_bound / upper_bound — first position ≥ target / > target"},
        {id:"p4t1c3",type:"concept",text:"Binary search on answer space — the most powerful pattern (feasibility check)"},
        {id:"p4t1c4",type:"concept",text:"Binary search on rotated/mountain arrays — tricky but common"},
        {id:"p4t1c5",type:"concept",text:"Binary search in 2D matrices — treat as 1D or binary search rows then cols"},
        {id:"p4t1p1",type:"problem",num:704, slug:"binary-search",                                             title:"Binary Search",                             difficulty:"Easy"},
        {id:"p4t1p2",type:"problem",num:35,  slug:"search-insert-position",                                   title:"Search Insert Position",                    difficulty:"Easy"},
        {id:"p4t1p3",type:"problem",num:34,  slug:"find-first-and-last-position-of-element-in-sorted-array",  title:"First and Last Position of Element",        difficulty:"Medium"},
        {id:"p4t1p4",type:"problem",num:153, slug:"find-minimum-in-rotated-sorted-array",                     title:"Find Minimum in Rotated Sorted Array",       difficulty:"Medium"},
        {id:"p4t1p5",type:"problem",num:33,  slug:"search-in-rotated-sorted-array",                           title:"Search in Rotated Sorted Array",             difficulty:"Medium"},
        {id:"p4t1p6",type:"problem",num:875, slug:"koko-eating-bananas",                                       title:"Koko Eating Bananas (search on answer)",     difficulty:"Medium"},
        {id:"p4t1p7",type:"problem",num:74,  slug:"search-a-2d-matrix",                                       title:"Search a 2D Matrix",                        difficulty:"Medium"},
      ]},
    ]
  },
  {
    id:"p5", phase:5, title:"Strings", accent:"#534AB7",
    subtitle:"Often combined with hashing, sliding window, and two pointers",
    topics:[
      { id:"p5t1", title:"String Manipulation & Patterns", items:[
        {id:"p5t1c1",type:"concept",text:"ASCII values, char arithmetic — 'a'+i, c-'0', tolower/toupper"},
        {id:"p5t1c2",type:"concept",text:"Palindrome — two pointer check, expand around center technique"},
        {id:"p5t1c3",type:"concept",text:"Anagram detection — sort both or use frequency array of size 26"},
        {id:"p5t1c4",type:"concept",text:"String parsing — istringstream for splitting by spaces/delimiters"},
        {id:"p5t1c5",type:"concept",text:"KMP algorithm — pattern matching in O(n+m) using failure function"},
        {id:"p5t1p1",type:"problem",num:344, slug:"reverse-string",                  title:"Reverse String",                    difficulty:"Easy"},
        {id:"p5t1p2",type:"problem",num:242, slug:"valid-anagram",                   title:"Valid Anagram",                     difficulty:"Easy"},
        {id:"p5t1p3",type:"problem",num:20,  slug:"valid-parentheses",               title:"Valid Parentheses",                 difficulty:"Easy"},
        {id:"p5t1p4",type:"problem",num:49,  slug:"group-anagrams",                  title:"Group Anagrams",                    difficulty:"Medium"},
        {id:"p5t1p5",type:"problem",num:5,   slug:"longest-palindromic-substring",   title:"Longest Palindromic Substring",     difficulty:"Medium"},
        {id:"p5t1p6",type:"problem",num:647, slug:"palindromic-substrings",          title:"Palindromic Substrings",            difficulty:"Medium"},
        {id:"p5t1p7",type:"problem",num:8,   slug:"string-to-integer-atoi",          title:"String to Integer (atoi)",          difficulty:"Medium"},
      ]},
    ]
  },
  {
    id:"p6", phase:6, title:"Recursion & Backtracking", accent:"#993C1D",
    subtitle:"The foundation for trees, graphs, and dynamic programming",
    topics:[
      { id:"p6t1", title:"Recursion Fundamentals", items:[
        {id:"p6t1c1",type:"concept",text:"Base case + recursive case — every function needs both, no exceptions"},
        {id:"p6t1c2",type:"concept",text:"Call stack visualization — draw the recursion tree for every problem"},
        {id:"p6t1c3",type:"concept",text:"Tail recursion vs head recursion — where does work happen?"},
        {id:"p6t1c4",type:"concept",text:"Divide and Conquer — split into independent subproblems, solve, merge"},
        {id:"p6t1p1",type:"problem",num:509, slug:"fibonacci-number",           title:"Fibonacci Number",            difficulty:"Easy"},
        {id:"p6t1p2",type:"problem",num:70,  slug:"climbing-stairs",            title:"Climbing Stairs",             difficulty:"Easy"},
        {id:"p6t1p3",type:"problem",num:231, slug:"power-of-two",               title:"Power of Two",                difficulty:"Easy"},
        {id:"p6t1p4",type:"problem",num:50,  slug:"powx-n",                     title:"Pow(x, n) — fast exponentiation",difficulty:"Medium"},
        {id:"p6t1p5",type:"problem",num:22,  slug:"generate-parentheses",       title:"Generate Parentheses",        difficulty:"Medium"},
      ]},
      { id:"p6t2", title:"Backtracking", items:[
        {id:"p6t2c1",type:"concept",text:"Backtracking template — choose → explore → unchoose (undo)"},
        {id:"p6t2c2",type:"concept",text:"State-space tree — visualize all choices as branches"},
        {id:"p6t2c3",type:"concept",text:"Pruning — detect invalid states early to cut branches"},
        {id:"p6t2c4",type:"concept",text:"Subset, permutation, combination generation patterns"},
        {id:"p6t2p1",type:"problem",num:78,  slug:"subsets",                    title:"Subsets",                     difficulty:"Medium"},
        {id:"p6t2p2",type:"problem",num:46,  slug:"permutations",               title:"Permutations",                difficulty:"Medium"},
        {id:"p6t2p3",type:"problem",num:39,  slug:"combination-sum",            title:"Combination Sum",             difficulty:"Medium"},
        {id:"p6t2p4",type:"problem",num:79,  slug:"word-search",                title:"Word Search",                 difficulty:"Medium"},
        {id:"p6t2p5",type:"problem",num:51,  slug:"n-queens",                   title:"N-Queens",                    difficulty:"Hard"},
        {id:"p6t2p6",type:"problem",num:37,  slug:"sudoku-solver",              title:"Sudoku Solver",               difficulty:"Hard"},
      ]},
    ]
  },
  {
    id:"p7", phase:7, title:"Linked Lists", accent:"#854F0B",
    subtitle:"Always draw pointers on paper before touching the keyboard",
    topics:[
      { id:"p7t1", title:"Linked List Operations", items:[
        {id:"p7t1c1",type:"concept",text:"ListNode struct — val + next pointer; implement insert/delete from scratch"},
        {id:"p7t1c2",type:"concept",text:"Dummy/sentinel head node — eliminates head-specific edge cases"},
        {id:"p7t1c3",type:"concept",text:"Slow & fast pointers — find middle, detect cycle, find cycle start"},
        {id:"p7t1c4",type:"concept",text:"Reversing a linked list — iterative (prev/curr/next) and recursive"},
        {id:"p7t1p1",type:"problem",num:206, slug:"reverse-linked-list",                  title:"Reverse Linked List",                  difficulty:"Easy"},
        {id:"p7t1p2",type:"problem",num:21,  slug:"merge-two-sorted-lists",               title:"Merge Two Sorted Lists",               difficulty:"Easy"},
        {id:"p7t1p3",type:"problem",num:141, slug:"linked-list-cycle",                    title:"Linked List Cycle",                    difficulty:"Easy"},
        {id:"p7t1p4",type:"problem",num:876, slug:"middle-of-the-linked-list",            title:"Middle of the Linked List",            difficulty:"Easy"},
        {id:"p7t1p5",type:"problem",num:2,   slug:"add-two-numbers",                      title:"Add Two Numbers",                      difficulty:"Medium"},
        {id:"p7t1p6",type:"problem",num:19,  slug:"remove-nth-node-from-end-of-list",    title:"Remove Nth Node From End of List",     difficulty:"Medium"},
        {id:"p7t1p7",type:"problem",num:143, slug:"reorder-list",                         title:"Reorder List",                         difficulty:"Medium"},
        {id:"p7t1p8",type:"problem",num:138, slug:"copy-list-with-random-pointer",        title:"Copy List with Random Pointer",        difficulty:"Medium"},
        {id:"p7t1p9",type:"problem",num:287, slug:"find-the-duplicate-number",            title:"Find the Duplicate Number",            difficulty:"Medium"},
        {id:"p7t1p10",type:"problem",num:146, slug:"lru-cache",                           title:"LRU Cache (doubly linked list + map)",  difficulty:"Medium"},
        {id:"p7t1p11",type:"problem",num:23,  slug:"merge-k-sorted-lists",               title:"Merge K Sorted Lists",                 difficulty:"Hard"},
        {id:"p7t1p12",type:"problem",num:25,  slug:"reverse-nodes-in-k-group",           title:"Reverse Nodes in k-Group",             difficulty:"Hard"},
      ]},
    ]
  },
  {
    id:"p8", phase:8, title:"Stacks & Queues", accent:"#993556",
    subtitle:"LIFO, FIFO, and the powerful monotonic pattern",
    topics:[
      { id:"p8t1", title:"Stack", items:[
        {id:"p8t1c1",type:"concept",text:"Stack — LIFO, push/pop/top; implement using vector or deque"},
        {id:"p8t1c2",type:"concept",text:"Monotonic stack — maintains strictly increasing/decreasing order for next-greater-element problems"},
        {id:"p8t1c3",type:"concept",text:"Recognizing stack problems — matching brackets, undo operations, DFS simulation"},
        {id:"p8t1p1",type:"problem",num:20,  slug:"valid-parentheses",                      title:"Valid Parentheses",                    difficulty:"Easy"},
        {id:"p8t1p2",type:"problem",num:232, slug:"implement-queue-using-stacks",           title:"Implement Queue using Stacks",         difficulty:"Easy"},
        {id:"p8t1p3",type:"problem",num:155, slug:"min-stack",                              title:"Min Stack",                            difficulty:"Medium"},
        {id:"p8t1p4",type:"problem",num:150, slug:"evaluate-reverse-polish-notation",       title:"Evaluate Reverse Polish Notation",     difficulty:"Medium"},
        {id:"p8t1p5",type:"problem",num:739, slug:"daily-temperatures",                     title:"Daily Temperatures (monotonic stack)", difficulty:"Medium"},
        {id:"p8t1p6",type:"problem",num:853, slug:"car-fleet",                              title:"Car Fleet",                            difficulty:"Medium"},
        {id:"p8t1p7",type:"problem",num:84,  slug:"largest-rectangle-in-histogram",         title:"Largest Rectangle in Histogram",       difficulty:"Hard"},
      ]},
      { id:"p8t2", title:"Queue & Monotonic Deque", items:[
        {id:"p8t2c1",type:"concept",text:"Queue — FIFO, push/pop/front; essential for BFS traversal"},
        {id:"p8t2c2",type:"concept",text:"Deque (double-ended queue) — push/pop from both ends in O(1)"},
        {id:"p8t2c3",type:"concept",text:"Monotonic deque — sliding window maximum/minimum in O(n) total"},
        {id:"p8t2p1",type:"problem",num:225, slug:"implement-stack-using-queues",  title:"Implement Stack using Queues",         difficulty:"Easy"},
        {id:"p8t2p2",type:"problem",num:622, slug:"design-circular-queue",          title:"Design Circular Queue",               difficulty:"Medium"},
        {id:"p8t2p3",type:"problem",num:239, slug:"sliding-window-maximum",         title:"Sliding Window Maximum (deque)",      difficulty:"Hard"},
      ]},
    ]
  },
  {
    id:"p9", phase:9, title:"Hashing", accent:"#185FA5",
    subtitle:"O(1) average lookup — the most versatile tool in your kit",
    topics:[
      { id:"p9t1", title:"Hash Maps & Sets", items:[
        {id:"p9t1c1",type:"concept",text:"Hash function internals — how keys map to buckets, collision handling"},
        {id:"p9t1c2",type:"concept",text:"unordered_map O(1) avg vs map O(log n) — choose based on need"},
        {id:"p9t1c3",type:"concept",text:"Frequency counting pattern — count chars, words, or elements"},
        {id:"p9t1c4",type:"concept",text:"Two-sum pattern — store complement in map, look up as you iterate"},
        {id:"p9t1c5",type:"concept",text:"Grouping by key — sort string as key for anagram groups"},
        {id:"p9t1p1",type:"problem",num:1,   slug:"two-sum",                           title:"Two Sum",                      difficulty:"Easy"},
        {id:"p9t1p2",type:"problem",num:383, slug:"ransom-note",                       title:"Ransom Note",                  difficulty:"Easy"},
        {id:"p9t1p3",type:"problem",num:49,  slug:"group-anagrams",                    title:"Group Anagrams",              difficulty:"Medium"},
        {id:"p9t1p4",type:"problem",num:347, slug:"top-k-frequent-elements",           title:"Top K Frequent Elements",     difficulty:"Medium"},
        {id:"p9t1p5",type:"problem",num:128, slug:"longest-consecutive-sequence",      title:"Longest Consecutive Sequence",difficulty:"Medium"},
        {id:"p9t1p6",type:"problem",num:18,  slug:"4sum",                              title:"4Sum",                        difficulty:"Medium"},
      ]},
    ]
  },
  {
    id:"p10", phase:10, title:"Trees", accent:"#0F6E56",
    subtitle:"Binary trees, BSTs, heaps, and tries — the whole tree family",
    topics:[
      { id:"p10t1", title:"Binary Trees & Traversals", items:[
        {id:"p10t1c1",type:"concept",text:"TreeNode struct — val, left, right; build trees from arrays"},
        {id:"p10t1c2",type:"concept",text:"DFS — Preorder (NLR), Inorder (LNR), Postorder (LRN): recursive + iterative"},
        {id:"p10t1c3",type:"concept",text:"BFS / Level-order traversal using a queue — add left then right"},
        {id:"p10t1c4",type:"concept",text:"Tree height, depth, diameter, and path sum patterns"},
        {id:"p10t1p1",type:"problem",num:226,  slug:"invert-binary-tree",                                          title:"Invert Binary Tree",                                   difficulty:"Easy"},
        {id:"p10t1p2",type:"problem",num:104,  slug:"maximum-depth-of-binary-tree",                               title:"Maximum Depth of Binary Tree",                         difficulty:"Easy"},
        {id:"p10t1p3",type:"problem",num:101,  slug:"symmetric-tree",                                             title:"Symmetric Tree",                                       difficulty:"Easy"},
        {id:"p10t1p4",type:"problem",num:100,  slug:"same-tree",                                                  title:"Same Tree",                                            difficulty:"Easy"},
        {id:"p10t1p5",type:"problem",num:112,  slug:"path-sum",                                                   title:"Path Sum",                                             difficulty:"Easy"},
        {id:"p10t1p6",type:"problem",num:102,  slug:"binary-tree-level-order-traversal",                          title:"Binary Tree Level Order Traversal",                    difficulty:"Medium"},
        {id:"p10t1p7",type:"problem",num:199,  slug:"binary-tree-right-side-view",                                title:"Binary Tree Right Side View",                          difficulty:"Medium"},
        {id:"p10t1p8",type:"problem",num:1448, slug:"count-good-nodes-in-binary-tree",                            title:"Count Good Nodes in Binary Tree",                      difficulty:"Medium"},
        {id:"p10t1p9",type:"problem",num:105,  slug:"construct-binary-tree-from-preorder-and-inorder-traversal", title:"Construct Binary Tree from Preorder & Inorder",        difficulty:"Medium"},
        {id:"p10t1p10",type:"problem",num:114, slug:"flatten-binary-tree-to-linked-list",                         title:"Flatten Binary Tree to Linked List",                   difficulty:"Medium"},
        {id:"p10t1p11",type:"problem",num:124, slug:"binary-tree-maximum-path-sum",                               title:"Binary Tree Maximum Path Sum",                         difficulty:"Hard"},
        {id:"p10t1p12",type:"problem",num:297, slug:"serialize-and-deserialize-binary-tree",                      title:"Serialize and Deserialize Binary Tree",                difficulty:"Hard"},
      ]},
      { id:"p10t2", title:"Binary Search Trees (BST)", items:[
        {id:"p10t2c1",type:"concept",text:"BST property — left subtree < node < right subtree (all nodes)"},
        {id:"p10t2c2",type:"concept",text:"Search O(log n) avg / O(n) worst; insert and delete logic"},
        {id:"p10t2c3",type:"concept",text:"Inorder traversal of BST yields sorted sequence — key insight"},
        {id:"p10t2c4",type:"concept",text:"Balanced BST — AVL trees and Red-Black trees (understand concepts)"},
        {id:"p10t2p1",type:"problem",num:98,  slug:"validate-binary-search-tree",                           title:"Validate Binary Search Tree",                difficulty:"Medium"},
        {id:"p10t2p2",type:"problem",num:230, slug:"kth-smallest-element-in-a-bst",                         title:"Kth Smallest Element in a BST",              difficulty:"Medium"},
        {id:"p10t2p3",type:"problem",num:235, slug:"lowest-common-ancestor-of-a-binary-search-tree",        title:"Lowest Common Ancestor of a BST",            difficulty:"Medium"},
        {id:"p10t2p4",type:"problem",num:701, slug:"insert-into-a-binary-search-tree",                      title:"Insert into a Binary Search Tree",           difficulty:"Medium"},
        {id:"p10t2p5",type:"problem",num:450, slug:"delete-node-in-a-bst",                                  title:"Delete Node in a BST",                       difficulty:"Medium"},
      ]},
      { id:"p10t3", title:"Heaps & Priority Queues", items:[
        {id:"p10t3c1",type:"concept",text:"Heap property — max-heap: parent ≥ children; always complete binary tree"},
        {id:"p10t3c2",type:"concept",text:"Operations — insert O(log n) heapify-up, extract-max O(log n) heapify-down"},
        {id:"p10t3c3",type:"concept",text:"Build heap in O(n) — heapify downward from last non-leaf"},
        {id:"p10t3c4",type:"concept",text:"Top-K pattern — min-heap of size K; Two-heap pattern for median"},
        {id:"p10t3p1",type:"problem",num:1046,slug:"last-stone-weight",                     title:"Last Stone Weight",                  difficulty:"Easy"},
        {id:"p10t3p2",type:"problem",num:703, slug:"kth-largest-element-in-a-stream",       title:"Kth Largest Element in a Stream",    difficulty:"Easy"},
        {id:"p10t3p3",type:"problem",num:973, slug:"k-closest-points-to-origin",            title:"K Closest Points to Origin",         difficulty:"Medium"},
        {id:"p10t3p4",type:"problem",num:215, slug:"kth-largest-element-in-an-array",       title:"Kth Largest Element in an Array",    difficulty:"Medium"},
        {id:"p10t3p5",type:"problem",num:621, slug:"task-scheduler",                        title:"Task Scheduler",                     difficulty:"Medium"},
        {id:"p10t3p6",type:"problem",num:355, slug:"design-twitter",                        title:"Design Twitter",                     difficulty:"Medium"},
        {id:"p10t3p7",type:"problem",num:295, slug:"find-median-from-data-stream",          title:"Find Median from Data Stream",       difficulty:"Hard"},
      ]},
      { id:"p10t4", title:"Trie (Prefix Tree)", items:[
        {id:"p10t4c1",type:"concept",text:"TrieNode struct — children[26] array + isEnd flag"},
        {id:"p10t4c2",type:"concept",text:"Insert and search in O(L) where L is word length"},
        {id:"p10t4c3",type:"concept",text:"When to use a Trie — prefix queries, autocomplete, word dictionaries"},
        {id:"p10t4p1",type:"problem",num:208, slug:"implement-trie-prefix-tree",                           title:"Implement Trie (Prefix Tree)",                   difficulty:"Medium"},
        {id:"p10t4p2",type:"problem",num:211, slug:"design-add-and-search-words-data-structure",           title:"Design Add and Search Words Data Structure",     difficulty:"Medium"},
        {id:"p10t4p3",type:"problem",num:212, slug:"word-search-ii",                                       title:"Word Search II",                                 difficulty:"Hard"},
      ]},
    ]
  },
  {
    id:"p11", phase:11, title:"Graphs", accent:"#534AB7",
    subtitle:"BFS, DFS, shortest paths, topological sort, and Union-Find",
    topics:[
      { id:"p11t1", title:"Graph Fundamentals & BFS/DFS", items:[
        {id:"p11t1c1",type:"concept",text:"Representations — adjacency list (sparse) vs adjacency matrix (dense)"},
        {id:"p11t1c2",type:"concept",text:"Directed vs undirected, weighted vs unweighted, cyclic vs acyclic"},
        {id:"p11t1c3",type:"concept",text:"BFS — level-by-level via queue; finds shortest path in unweighted graphs"},
        {id:"p11t1c4",type:"concept",text:"DFS — depth-first via recursion/stack; cycle detection, connected components"},
        {id:"p11t1c5",type:"concept",text:"visited set or boolean array — essential to avoid revisiting nodes"},
        {id:"p11t1p1",type:"problem",num:733, slug:"flood-fill",                   title:"Flood Fill",                          difficulty:"Easy"},
        {id:"p11t1p2",type:"problem",num:200, slug:"number-of-islands",            title:"Number of Islands",                   difficulty:"Medium"},
        {id:"p11t1p3",type:"problem",num:695, slug:"max-area-of-island",           title:"Max Area of Island",                  difficulty:"Medium"},
        {id:"p11t1p4",type:"problem",num:133, slug:"clone-graph",                  title:"Clone Graph",                         difficulty:"Medium"},
        {id:"p11t1p5",type:"problem",num:994, slug:"rotting-oranges",              title:"Rotting Oranges (multi-source BFS)",  difficulty:"Medium"},
        {id:"p11t1p6",type:"problem",num:417, slug:"pacific-atlantic-water-flow",  title:"Pacific Atlantic Water Flow",         difficulty:"Medium"},
        {id:"p11t1p7",type:"problem",num:130, slug:"surrounded-regions",           title:"Surrounded Regions",                  difficulty:"Medium"},
        {id:"p11t1p8",type:"problem",num:127, slug:"word-ladder",                  title:"Word Ladder",                         difficulty:"Hard"},
      ]},
      { id:"p11t2", title:"Topological Sort & Cycle Detection", items:[
        {id:"p11t2c1",type:"concept",text:"DAG — Directed Acyclic Graph; only DAGs have valid topological orderings"},
        {id:"p11t2c2",type:"concept",text:"Kahn's Algorithm — BFS using in-degree counts, O(V+E)"},
        {id:"p11t2c3",type:"concept",text:"DFS-based topological sort — push to result on node completion"},
        {id:"p11t2p1",type:"problem",num:207, slug:"course-schedule",      title:"Course Schedule",       difficulty:"Medium"},
        {id:"p11t2p2",type:"problem",num:210, slug:"course-schedule-ii",   title:"Course Schedule II",    difficulty:"Medium"},
      ]},
      { id:"p11t3", title:"Shortest Path Algorithms", items:[
        {id:"p11t3c1",type:"concept",text:"Dijkstra's — single source, non-negative weights, O((V+E) log V) with priority queue"},
        {id:"p11t3c2",type:"concept",text:"Bellman-Ford — handles negative weights, detects negative cycles, O(VE)"},
        {id:"p11t3c3",type:"concept",text:"Floyd-Warshall — all pairs shortest paths, O(V³)"},
        {id:"p11t3p1",type:"problem",num:743,  slug:"network-delay-time",                 title:"Network Delay Time (Dijkstra)",                    difficulty:"Medium"},
        {id:"p11t3p2",type:"problem",num:1631, slug:"path-with-minimum-effort",            title:"Path with Minimum Effort",                         difficulty:"Medium"},
        {id:"p11t3p3",type:"problem",num:787,  slug:"cheapest-flights-within-k-stops",    title:"Cheapest Flights Within K Stops (Bellman-Ford)",   difficulty:"Medium"},
        {id:"p11t3p4",type:"problem",num:778,  slug:"swim-in-rising-water",               title:"Swim in Rising Water",                             difficulty:"Hard"},
      ]},
      { id:"p11t4", title:"Union-Find (Disjoint Set Union)", items:[
        {id:"p11t4c1",type:"concept",text:"DSU structure — parent[] + rank/size arrays"},
        {id:"p11t4c2",type:"concept",text:"Path compression — find() collapses paths to root, nearly O(1) amortized"},
        {id:"p11t4c3",type:"concept",text:"Union by rank — merge smaller tree under larger, keeps height O(log n)"},
        {id:"p11t4c4",type:"concept",text:"Kruskal's MST — sort edges by weight, union components greedily"},
        {id:"p11t4p1",type:"problem",num:684,  slug:"redundant-connection",                           title:"Redundant Connection",                        difficulty:"Medium"},
        {id:"p11t4p2",type:"problem",num:1319, slug:"number-of-operations-to-make-network-connected", title:"Number of Operations to Connect Network",    difficulty:"Medium"},
        {id:"p11t4p3",type:"problem",num:721,  slug:"accounts-merge",                                 title:"Accounts Merge",                             difficulty:"Medium"},
        {id:"p11t4p4",type:"problem",num:1584, slug:"min-cost-to-connect-all-points",                 title:"Min Cost to Connect All Points (Kruskal's)", difficulty:"Medium"},
      ]},
    ]
  },
  {
    id:"p12", phase:12, title:"Dynamic Programming", accent:"#993C1D",
    subtitle:"Overlapping subproblems + optimal substructure = always think DP",
    topics:[
      { id:"p12t0", title:"DP Fundamentals", items:[
        {id:"p12t0c1",type:"concept",text:"Identify DP — overlapping subproblems AND optimal substructure both required"},
        {id:"p12t0c2",type:"concept",text:"Top-down (memoization) — recursion + cache map, intuitive to write"},
        {id:"p12t0c3",type:"concept",text:"Bottom-up (tabulation) — iterative DP table, often faster in practice"},
        {id:"p12t0c4",type:"concept",text:"State definition — what does dp[i] or dp[i][j] mean? Write it in English first"},
        {id:"p12t0c5",type:"concept",text:"Transition relation — how to compute dp[i] from dp[i-1] or smaller states"},
        {id:"p12t0c6",type:"concept",text:"Space optimization — rolling array or 1D reduction from 2D tables"},
      ]},
      { id:"p12t1", title:"1D Dynamic Programming", items:[
        {id:"p12t1p1",type:"problem",num:70,  slug:"climbing-stairs",                               title:"Climbing Stairs",                             difficulty:"Easy"},
        {id:"p12t1p2",type:"problem",num:198, slug:"house-robber",                                  title:"House Robber",                                difficulty:"Medium"},
        {id:"p12t1p3",type:"problem",num:213, slug:"house-robber-ii",                               title:"House Robber II (circular array)",             difficulty:"Medium"},
        {id:"p12t1p4",type:"problem",num:91,  slug:"decode-ways",                                   title:"Decode Ways",                                 difficulty:"Medium"},
        {id:"p12t1p5",type:"problem",num:322, slug:"coin-change",                                   title:"Coin Change",                                 difficulty:"Medium"},
        {id:"p12t1p6",type:"problem",num:139, slug:"word-break",                                    title:"Word Break",                                  difficulty:"Medium"},
        {id:"p12t1p7",type:"problem",num:300, slug:"longest-increasing-subsequence",                title:"Longest Increasing Subsequence",              difficulty:"Medium"},
        {id:"p12t1p8",type:"problem",num:416, slug:"partition-equal-subset-sum",                    title:"Partition Equal Subset Sum",                  difficulty:"Medium"},
        {id:"p12t1p9",type:"problem",num:309, slug:"best-time-to-buy-and-sell-stock-with-cooldown", title:"Buy and Sell Stock with Cooldown",            difficulty:"Medium"},
      ]},
      { id:"p12t2", title:"2D Dynamic Programming", items:[
        {id:"p12t2c1",type:"concept",text:"2D DP — dp[i][j] = result using first i chars/items and first j chars/items"},
        {id:"p12t2p1",type:"problem",num:62,   slug:"unique-paths",                title:"Unique Paths",                difficulty:"Medium"},
        {id:"p12t2p2",type:"problem",num:1143, slug:"longest-common-subsequence", title:"Longest Common Subsequence",  difficulty:"Medium"},
        {id:"p12t2p3",type:"problem",num:518,  slug:"coin-change-ii",             title:"Coin Change II (unbounded knapsack)",difficulty:"Medium"},
        {id:"p12t2p4",type:"problem",num:494,  slug:"target-sum",                 title:"Target Sum",                  difficulty:"Medium"},
        {id:"p12t2p5",type:"problem",num:97,   slug:"interleaving-string",        title:"Interleaving String",         difficulty:"Medium"},
        {id:"p12t2p6",type:"problem",num:72,   slug:"edit-distance",              title:"Edit Distance",               difficulty:"Medium"},
        {id:"p12t2p7",type:"problem",num:115,  slug:"distinct-subsequences",      title:"Distinct Subsequences",       difficulty:"Hard"},
        {id:"p12t2p8",type:"problem",num:312,  slug:"burst-balloons",             title:"Burst Balloons",              difficulty:"Hard"},
        {id:"p12t2p9",type:"problem",num:10,   slug:"regular-expression-matching",title:"Regular Expression Matching", difficulty:"Hard"},
      ]},
    ]
  },
  {
    id:"p13", phase:13, title:"Greedy Algorithms", accent:"#854F0B",
    subtitle:"Make the locally optimal choice — then prove it leads to the global optimum",
    topics:[
      { id:"p13t1", title:"Greedy Patterns & Intervals", items:[
        {id:"p13t1c1",type:"concept",text:"Greedy choice property — local optimum = global optimum (not always true, must verify)"},
        {id:"p13t1c2",type:"concept",text:"Exchange argument proof — show swapping greedy choice with any other is never better"},
        {id:"p13t1c3",type:"concept",text:"Interval scheduling — sort by end time, greedily pick non-overlapping intervals"},
        {id:"p13t1p1",type:"problem",num:55,  slug:"jump-game",                                 title:"Jump Game",                            difficulty:"Medium"},
        {id:"p13t1p2",type:"problem",num:45,  slug:"jump-game-ii",                              title:"Jump Game II",                         difficulty:"Medium"},
        {id:"p13t1p3",type:"problem",num:134, slug:"gas-station",                               title:"Gas Station",                          difficulty:"Medium"},
        {id:"p13t1p4",type:"problem",num:435, slug:"non-overlapping-intervals",                  title:"Non-overlapping Intervals",            difficulty:"Medium"},
        {id:"p13t1p5",type:"problem",num:452, slug:"minimum-number-of-arrows-to-burst-balloons", title:"Minimum Arrows to Burst Balloons",    difficulty:"Medium"},
        {id:"p13t1p6",type:"problem",num:763, slug:"partition-labels",                           title:"Partition Labels",                    difficulty:"Medium"},
        {id:"p13t1p7",type:"problem",num:846, slug:"hand-of-straights",                          title:"Hand of Straights",                   difficulty:"Medium"},
      ]},
    ]
  },
  {
    id:"p14", phase:14, title:"Bit Manipulation & Math", accent:"#5F5E5A",
    subtitle:"Often one-liners in interviews once you see the trick",
    topics:[
      { id:"p14t1", title:"Bit Manipulation", items:[
        {id:"p14t1c1",type:"concept",text:"Bitwise ops — AND (&), OR (|), XOR (^), NOT (~), left (<<) and right (>>) shift"},
        {id:"p14t1c2",type:"concept",text:"XOR trick — a^a=0, a^0=a → find single/missing element in O(n) O(1)"},
        {id:"p14t1c3",type:"concept",text:"Bit masking — check bit i: (n>>i)&1; set: n|(1<<i); clear: n&~(1<<i)"},
        {id:"p14t1c4",type:"concept",text:"n & (n-1) clears lowest set bit — count set bits, power-of-2 check"},
        {id:"p14t1p1",type:"problem",num:136, slug:"single-number",            title:"Single Number",                        difficulty:"Easy"},
        {id:"p14t1p2",type:"problem",num:191, slug:"number-of-1-bits",        title:"Number of 1 Bits (Hamming weight)",     difficulty:"Easy"},
        {id:"p14t1p3",type:"problem",num:338, slug:"counting-bits",           title:"Counting Bits",                        difficulty:"Easy"},
        {id:"p14t1p4",type:"problem",num:190, slug:"reverse-bits",            title:"Reverse Bits",                         difficulty:"Easy"},
        {id:"p14t1p5",type:"problem",num:268, slug:"missing-number",          title:"Missing Number",                       difficulty:"Easy"},
        {id:"p14t1p6",type:"problem",num:371, slug:"sum-of-two-integers",     title:"Sum of Two Integers (no + operator)",  difficulty:"Medium"},
      ]},
      { id:"p14t2", title:"Math & Matrix Tricks", items:[
        {id:"p14t2c1",type:"concept",text:"Modular arithmetic — (a*b)%m = ((a%m)*(b%m))%m; overflow prevention"},
        {id:"p14t2c2",type:"concept",text:"GCD via Euclidean algorithm — gcd(a,b)=gcd(b,a%b); LCM = a*b/gcd(a,b)"},
        {id:"p14t2c3",type:"concept",text:"Sieve of Eratosthenes — all primes ≤ N in O(N log log N)"},
        {id:"p14t2c4",type:"concept",text:"Fast exponentiation — pow(x, n) in O(log n) via repeated squaring"},
        {id:"p14t2p1",type:"problem",num:202, slug:"happy-number",       title:"Happy Number",        difficulty:"Easy"},
        {id:"p14t2p2",type:"problem",num:48,  slug:"rotate-image",       title:"Rotate Image",        difficulty:"Medium"},
        {id:"p14t2p3",type:"problem",num:54,  slug:"spiral-matrix",      title:"Spiral Matrix",       difficulty:"Medium"},
        {id:"p14t2p4",type:"problem",num:73,  slug:"set-matrix-zeroes",  title:"Set Matrix Zeroes",   difficulty:"Medium"},
        {id:"p14t2p5",type:"problem",num:43,  slug:"multiply-strings",   title:"Multiply Strings",    difficulty:"Medium"},
      ]},
    ]
  },
];

const DIFF_STYLE = {
  Easy:   { bg:"var(--color-background-success)", color:"var(--color-text-success)" },
  Medium: { bg:"var(--color-background-warning)", color:"var(--color-text-warning)" },
  Hard:   { bg:"var(--color-background-danger)",  color:"var(--color-text-danger)"  },
};

function PhaseProgress({ phase, checked }) {
  const items = phase.topics.flatMap(t => t.items);
  const done = items.filter(i => checked[i.id]).length;
  const total = items.length;
  const pct = total ? Math.round((done/total)*100) : 0;
  return (
    <div style={{display:"flex",alignItems:"center",gap:8,marginLeft:"auto"}}>
      <span style={{fontSize:12,color:"var(--color-text-secondary)",whiteSpace:"nowrap"}}>{done}/{total}</span>
      <div style={{width:60,height:4,borderRadius:2,background:"var(--color-border-tertiary)",overflow:"hidden"}}>
        <div style={{width:`${pct}%`,height:"100%",background:phase.accent,borderRadius:2,transition:"width 0.3s"}}/>
      </div>
    </div>
  );
}

function Item({ item, done, onToggle }) {
  const isLC = item.type === "problem";
  const url = isLC ? `https://leetcode.com/problems/${item.slug}/` : null;
  return (
    <div style={{
      display:"flex",alignItems:"flex-start",gap:10,
      padding:"7px 16px",cursor:"pointer",
      background: done ? "var(--color-background-secondary)" : "transparent",
      transition:"background 0.15s",
    }}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(item.id); }}}
      onClick={() => onToggle(item.id)}
      role="checkbox"
      aria-checked={done}
      tabIndex={0}
    >
      <div style={{
        width:16,height:16,borderRadius:3,flexShrink:0,marginTop:2,
        border:`1.5px solid ${done ? "var(--color-border-primary)" : "var(--color-border-secondary)"}`,
        background: done ? "var(--color-text-secondary)" : "transparent",
        display:"flex",alignItems:"center",justifyContent:"center",
        transition:"all 0.15s",
      }}>
        {done && <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path d="M1 4L3.5 6.5L9 1" stroke="var(--color-background-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>}
      </div>
      {isLC ? (
        <div style={{display:"flex",alignItems:"baseline",gap:6,flexWrap:"wrap",flex:1,opacity:done?0.5:1}}>
          <span style={{fontSize:11,fontFamily:"var(--font-mono)",color:"var(--color-text-tertiary)",flexShrink:0}}>#{item.num}</span>
          <span style={{fontSize:13,color:"var(--color-text-primary)",fontWeight:400}}>{item.title}</span>
          <span style={{
            fontSize:10,fontWeight:500,padding:"1px 6px",borderRadius:3,flexShrink:0,
            background:DIFF_STYLE[item.difficulty].bg,
            color:DIFF_STYLE[item.difficulty].color,
          }}>{item.difficulty}</span>
          <a href={url} target="_blank" rel="noreferrer"
            onClick={e => e.stopPropagation()}
            style={{fontSize:11,color:"var(--color-text-info)",textDecoration:"none",flexShrink:0,display:"flex",alignItems:"center",gap:2}}>
            <i className="ti ti-external-link" style={{fontSize:11}} aria-hidden="true"/>
          </a>
        </div>
      ) : (
        <span style={{fontSize:13,color:done?"var(--color-text-tertiary)":"var(--color-text-primary)",lineHeight:1.5,flex:1,opacity:done?0.5:1}}>
          {item.text}
        </span>
      )}
    </div>
  );
}

function Topic({ topic, checked, expanded, onToggle, onToggleItem }) {
  const items = topic.items;
  const done = items.filter(i => checked[i.id]).length;
  const total = items.length;
  const isOpen = !!expanded[topic.id];

  return (
    <div style={{borderTop:"0.5px solid var(--color-border-tertiary)"}}>
      <div
        onClick={() => onToggle(topic.id)}
        style={{
          display:"flex",alignItems:"center",gap:8,
          padding:"8px 16px",cursor:"pointer",
          background: isOpen ? "var(--color-background-secondary)" : "transparent",
        }}
      >
        <i className="ti ti-chevron-down" aria-hidden="true" style={{
          fontSize:13,color:"var(--color-text-tertiary)",
          transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
          transition:"transform 0.2s",
        }}/>
        <span style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)"}}>{topic.title}</span>
        <span style={{fontSize:11,color:"var(--color-text-tertiary)",marginLeft:"auto"}}>
          {done}/{total}
        </span>
      </div>
      {isOpen && (
        <div>
          {items.map(item => (
            <Item key={item.id} item={item} done={!!checked[item.id]} onToggle={onToggleItem}/>
          ))}
        </div>
      )}
    </div>
  );
}

function Phase({ phase, checked, expandedPhases, expandedTopics, onTogglePhase, onToggleTopic, onToggleItem }) {
  const isOpen = !!expandedPhases[phase.id];
  return (
    <div style={{
      borderRadius:"var(--border-radius-lg)",
      border:"0.5px solid var(--color-border-tertiary)",
      overflow:"hidden",
      marginBottom:8,
    }}>
      <div
        onClick={() => onTogglePhase(phase.id)}
        style={{
          display:"flex",alignItems:"center",gap:10,
          padding:"12px 16px",cursor:"pointer",
          background:"var(--color-background-secondary)",
          borderLeft:`3px solid ${phase.accent}`,
        }}
      >
        <span style={{
          fontSize:11,fontWeight:500,padding:"2px 7px",borderRadius:3,
          background: phase.accent + "22",
          color: phase.accent,
          flexShrink:0,
          fontFamily:"var(--font-mono)",
        }}>P{phase.phase}</span>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:14,fontWeight:500,color:"var(--color-text-primary)"}}>{phase.title}</div>
          {isOpen && <div style={{fontSize:11,color:"var(--color-text-secondary)",marginTop:1}}>{phase.subtitle}</div>}
        </div>
        <PhaseProgress phase={phase} checked={checked}/>
        <i className="ti ti-chevron-down" aria-hidden="true" style={{
          fontSize:14,color:"var(--color-text-tertiary)",flexShrink:0,
          transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
          transition:"transform 0.2s",
        }}/>
      </div>
      {isOpen && (
        <div style={{background:"var(--color-background-primary)"}}>
          {phase.topics.map(topic => (
            <Topic
              key={topic.id} topic={topic} checked={checked}
              expanded={expandedTopics}
              onToggle={onToggleTopic}
              onToggleItem={onToggleItem}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      return {
        c: d.c || {},
        ep: d.ep || { p1: true },
        et: d.et || { p1t1: true, p1t2: true },
      };
    }
  } catch { /* localStorage unavailable */ }
  return { c: {}, ep: { p1: true }, et: { p1t1: true, p1t2: true } };
}

function saveState(c, ep, et) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ c, ep, et }));
  } catch { /* localStorage unavailable */ }
}

export default function DSAGuide() {
  const [checked, setChecked]           = useState(() => loadState().c);
  const [expandedPhases, setEP]         = useState(() => loadState().ep);
  const [expandedTopics, setET]         = useState(() => loadState().et);
  const [filter, setFilter]             = useState("all");
  const [showReset, setShowReset]       = useState(false);

  const persist = (c, ep, et) => {
    saveState(c, ep, et);
  };

  const handleToggleItem = (id) => {
    const nc = { ...checked, [id]: !checked[id] };
    setChecked(nc);
    persist(nc, expandedPhases, expandedTopics);
  };
  const handleTogglePhase = (id) => {
    const nep = { ...expandedPhases, [id]: !expandedPhases[id] };
    setEP(nep);
    persist(checked, nep, expandedTopics);
  };
  const handleToggleTopic = (id) => {
    const net = { ...expandedTopics, [id]: !expandedTopics[id] };
    setET(net);
    persist(checked, expandedPhases, net);
  };
  const handleReset = () => {
    setChecked({});
    persist({}, expandedPhases, expandedTopics);
    setShowReset(false);
  };

  const allItems = CURRICULUM.flatMap(p => p.topics.flatMap(t => t.items));
  const total = allItems.length;
  const done  = allItems.filter(i => checked[i.id]).length;
  const pct   = total ? Math.round((done/total)*100) : 0;

  const lcItems    = allItems.filter(i => i.type==="problem");
  const lcDone     = lcItems.filter(i => checked[i.id]).length;
  const concepts   = allItems.filter(i => i.type==="concept");
  const concDone   = concepts.filter(i => checked[i.id]).length;

  const visibleCurriculum = filter === "all" ? CURRICULUM : CURRICULUM.map(p => ({
    ...p,
    topics: p.topics.map(t => ({
      ...t,
      items: t.items.filter(i => filter==="todo" ? !checked[i.id] : !!checked[i.id])
    })).filter(t => t.items.length > 0)
  })).filter(p => p.topics.length > 0);

  return (
    <div style={{padding:"1rem 0",maxWidth:720,margin:"0 auto"}}>
      <h2 className="sr-only">DSA Mastery Guide — C++ Interview Roadmap</h2>

      <div style={{marginBottom:"1.5rem",padding:"0 4px"}}>
        <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",marginBottom:4}}>
          <div>
            <span style={{fontSize:20,fontWeight:500,color:"var(--color-text-primary)"}}>DSA Mastery Guide</span>
            <span style={{fontSize:13,color:"var(--color-text-secondary)",marginLeft:10}}>C++ · Interview Prep Roadmap</span>
          </div>
          <span style={{fontSize:13,color:"var(--color-text-secondary)"}}>{pct}% complete</span>
        </div>

        <div style={{height:6,borderRadius:3,background:"var(--color-border-tertiary)",overflow:"hidden",marginBottom:12}}>
          <div style={{
            width:`${pct}%`,height:"100%",borderRadius:3,
            background:"linear-gradient(90deg,#0F6E56,#185FA5)",
            transition:"width 0.4s ease",
          }}/>
        </div>

        <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:16}}>
          {[
            {label:"Total",     val:`${done}/${total}`,      color:"var(--color-text-primary)"},
            {label:"LeetCode",  val:`${lcDone}/${lcItems.length}`,   color:"var(--color-text-warning)"},
            {label:"Concepts",  val:`${concDone}/${concepts.length}`,color:"var(--color-text-info)"},
          ].map(s => (
            <div key={s.label} style={{
              background:"var(--color-background-secondary)",
              borderRadius:"var(--border-radius-md)",
              border:"0.5px solid var(--color-border-tertiary)",
              padding:"6px 14px",display:"flex",gap:6,alignItems:"baseline",
            }}>
              <span style={{fontSize:11,color:"var(--color-text-secondary)"}}>{s.label}</span>
              <span style={{fontSize:14,fontWeight:500,color:s.color,fontFamily:"var(--font-mono)"}}>{s.val}</span>
            </div>
          ))}
          <button onClick={() => setShowReset(!showReset)} style={{
            marginLeft:"auto",fontSize:11,color:"var(--color-text-tertiary)",
            background:"transparent",border:"none",cursor:"pointer",padding:"6px 8px",
          }} aria-label="Reset progress">
            <i className="ti ti-refresh" aria-hidden="true" style={{fontSize:13}}/>
          </button>
        </div>

        {showReset && (
          <div style={{
            padding:12,borderRadius:"var(--border-radius-md)",
            background:"var(--color-background-danger)",
            border:"0.5px solid var(--color-border-danger)",
            display:"flex",alignItems:"center",gap:12,marginBottom:12,
          }}>
            <span style={{fontSize:13,color:"var(--color-text-danger)",flex:1}}>Reset all progress? This cannot be undone.</span>
            <button onClick={handleReset} style={{
              fontSize:12,padding:"4px 12px",borderRadius:4,
              background:"var(--color-background-danger)",
              color:"var(--color-text-danger)",
              border:"0.5px solid var(--color-border-danger)",cursor:"pointer",fontWeight:500,
            }}>Reset</button>
            <button onClick={()=>setShowReset(false)} style={{
              fontSize:12,padding:"4px 12px",borderRadius:4,
              background:"var(--color-background-secondary)",
              color:"var(--color-text-secondary)",
              border:"0.5px solid var(--color-border-tertiary)",cursor:"pointer",
            }}>Cancel</button>
          </div>
        )}

        <div style={{display:"flex",gap:6}}>
          {[
            {key:"all",   label:"All"},
            {key:"todo",  label:"To Do"},
            {key:"done",  label:"Completed"},
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              fontSize:12,padding:"5px 14px",borderRadius:"var(--border-radius-md)",cursor:"pointer",
              border: filter===f.key ? "0.5px solid var(--color-border-primary)" : "0.5px solid var(--color-border-tertiary)",
              background: filter===f.key ? "var(--color-background-primary)" : "transparent",
              color: filter===f.key ? "var(--color-text-primary)" : "var(--color-text-secondary)",
              fontWeight: filter===f.key ? 500 : 400,
            }}>{f.label}</button>
          ))}
        </div>
      </div>

      <div style={{display:"flex",gap:16,marginBottom:12,padding:"0 4px"}}>
        {[
          {icon:"ti-book",    label:"Concept to learn", color:"var(--color-text-secondary)"},
          {icon:"ti-code",    label:"LeetCode problem",  color:"var(--color-text-secondary)"},
        ].map(l => (
          <div key={l.label} style={{display:"flex",alignItems:"center",gap:4}}>
            <i className={`ti ${l.icon}`} style={{fontSize:12,color:l.color}} aria-hidden="true"/>
            <span style={{fontSize:11,color:"var(--color-text-tertiary)"}}>{l.label}</span>
          </div>
        ))}
        <div style={{display:"flex",gap:8,marginLeft:"auto"}}>
          {["Easy","Medium","Hard"].map(d => (
            <span key={d} style={{
              fontSize:10,padding:"1px 6px",borderRadius:3,
              background:DIFF_STYLE[d].bg,color:DIFF_STYLE[d].color,fontWeight:500,
            }}>{d}</span>
          ))}
        </div>
      </div>

      <div>
        {visibleCurriculum.length === 0 ? (
          <div style={{textAlign:"center",padding:"2rem",color:"var(--color-text-secondary)",fontSize:14}}>
            {filter==="done" ? "Nothing completed yet — keep going!" : "All done! 🎉"}
          </div>
        ) : visibleCurriculum.map(phase => (
          <Phase
            key={phase.id}
            phase={phase}
            checked={checked}
            expandedPhases={expandedPhases}
            expandedTopics={expandedTopics}
            onTogglePhase={handleTogglePhase}
            onToggleTopic={handleToggleTopic}
            onToggleItem={handleToggleItem}
          />
        ))}
      </div>

      <div style={{marginTop:16,textAlign:"center",fontSize:11,color:"var(--color-text-tertiary)"}}>
        Progress is saved automatically · Click any item to mark it done
      </div>
    </div>
  );
}

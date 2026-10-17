import { useMemo, useState } from "react";
import { Shuffle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { C, CodePanel, LabShell, Legend, Narration, PlaybackBar, SliderControl, Split, Stage, Stat, StatGrid, rng, useStepper } from "@/viz/kit";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Algorithms (pure step generators over items {v, id, tag})           */
/* ------------------------------------------------------------------ */

const CODE = {
  bubble: `void bubbleSort(vector<int>& arr) {
    int n = arr.size();
    bool swapped;
    for (int i = 0; i < n - 1; i++) {
        swapped = false;
        for (int j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                swap(arr[j], arr[j + 1]);
                swapped = true;
            }
        }
        if (!swapped) break;   // early exit: already sorted
    }
}`,
  selection: `void selectionSort(vector<int>& arr) {
    int n = arr.size();
    for (int i = 0; i < n - 1; i++) {
        int min_idx = i;
        for (int j = i + 1; j < n; j++) {
            if (arr[j] < arr[min_idx]) {
                min_idx = j;
            }
        }
        if (min_idx != i) {
            swap(arr[i], arr[min_idx]);
        }
    }
}`,
  insertion: `void insertionSort(vector<int>& arr) {
    int n = arr.size();
    for (int i = 1; i < n; i++) {
        int key = arr[i];
        int j = i - 1;
        while (j >= 0 && arr[j] > key) {
            arr[j + 1] = arr[j];   // shift right
            j--;
        }
        arr[j + 1] = key;
    }
}`,
  merge: `void merge(vector<int>& arr, int left, int mid, int right) {
    vector<int> temp;
    int i = left, j = mid + 1;
    while (i <= mid && j <= right) {
        if (arr[i] <= arr[j]) temp.push_back(arr[i++]);
        else                  temp.push_back(arr[j++]);
    }
    while (i <= mid)   temp.push_back(arr[i++]);
    while (j <= right) temp.push_back(arr[j++]);
    for (int k = left; k <= right; k++) arr[k] = temp[k - left];
}

void mergeSort(vector<int>& arr, int left, int right) {
    if (left >= right) return;            // size 1: sorted
    int mid = left + (right - left) / 2;
    mergeSort(arr, left, mid);
    mergeSort(arr, mid + 1, right);
    merge(arr, left, mid, right);
}`,
  quick: `int partition(vector<int>& arr, int left, int right) {
    int pivot = arr[right];      // Lomuto: last element
    int i = left - 1;
    for (int j = left; j < right; j++) {
        if (arr[j] < pivot) {
            i++;
            swap(arr[i], arr[j]);
        }
    }
    swap(arr[i + 1], arr[right]);
    return i + 1;
}

void quickSort(vector<int>& arr, int left, int right) {
    if (left >= right) return;
    int pivotIndex = partition(arr, left, right);
    quickSort(arr, left, pivotIndex - 1);
    quickSort(arr, pivotIndex + 1, right);
}`,
  counting: `void countingSortStable(vector<int>& arr) {
    int maxVal = *max_element(arr.begin(), arr.end());
    vector<int> counts(maxVal + 1, 0);
    for (int num : arr) counts[num]++;
    // prefix sums: counts[i] = number of elements <= i
    for (int i = 1; i <= maxVal; i++) counts[i] += counts[i - 1];
    // build output right-to-left (stable!)
    vector<int> output(arr.size());
    for (int i = arr.size() - 1; i >= 0; i--) {
        output[counts[arr[i]] - 1] = arr[i];
        counts[arr[i]]--;
    }
    arr = output;
}`,
  radix: `void countingSortByDigit(vector<int>& arr, int exp) {
    vector<int> output(arr.size()), counts(10, 0);
    for (int num : arr) counts[(num / exp) % 10]++;
    for (int i = 1; i < 10; i++) counts[i] += counts[i - 1];
    for (int i = arr.size() - 1; i >= 0; i--) {
        int digit = (arr[i] / exp) % 10;
        output[counts[digit] - 1] = arr[i];
        counts[digit]--;
    }
    arr = output;
}

void radixSort(vector<int>& arr) {
    int maxVal = *max_element(arr.begin(), arr.end());
    for (int exp = 1; maxVal / exp > 0; exp *= 10)
        countingSortByDigit(arr, exp);
}`,
};

const ALGOS = {
  bubble: { label: "Bubble sort", time: "O(N²)", stable: true, chapter: [5, 3, 8, 1, 2] },
  selection: { label: "Selection sort", time: "O(N²)", stable: false, chapter: [64, 25, 12, 22, 11] },
  insertion: { label: "Insertion sort", time: "O(N²) / O(N) best", stable: true, chapter: [5, 2, 4, 6, 1, 3] },
  merge: { label: "Merge sort", time: "O(N log N)", stable: true, chapter: [38, 27, 43, 3, 9, 82, 10] },
  quick: { label: "Quick sort (Lomuto)", time: "O(N log N) avg", stable: false, chapter: [10, 80, 30, 90, 40, 50, 70] },
  counting: { label: "Counting sort", time: "O(N + K)", stable: true, chapter: [4, 2, 2, 8, 3, 3, 1] },
  radix: { label: "Radix sort (LSD)", time: "O(d·(N + 10))", stable: true, chapter: [170, 45, 75, 90, 802, 24, 2, 66] },
};

const fmt = (x) => `${x.v}${x.tag ?? ""}`;

function bubbleSteps(input) {
  const a = [...input], n = a.length, s = [], sorted = new Set();
  let comps = 0, writes = 0;
  const snap = (o) => s.push({ arr: [...a], comps, writes, sorted: [...sorted], ...o });
  snap({ line: 2, note: `Bubble sort: compare neighbours and swap if out of order. Each pass floats the largest remaining value to the end.` });
  for (let i = 0; i < n - 1; i++) {
    let swapped = false;
    for (let j = 0; j < n - i - 1; j++) {
      comps++;
      const out = a[j].v > a[j + 1].v;
      snap({ cmp: [j, j + 1], line: 7, note: `Pass ${i + 1}: is ${fmt(a[j])} > ${fmt(a[j + 1])}? ${out ? "Yes → swap." : "No."}`, tone: "active" });
      if (out) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        writes++;
        swapped = true;
        snap({ swap: [j, j + 1], line: [8, 9], note: `Swapped → ${fmt(a[j])}, ${fmt(a[j + 1])}.`, tone: "warn" });
      }
    }
    sorted.add(n - 1 - i);
    if (!swapped) {
      for (let k = 0; k < n; k++) sorted.add(k);
      snap({ line: 12, note: `Pass ${i + 1} made no swaps → the array is already sorted. Early exit (this is why best case is O(N)).`, tone: "ok" });
      break;
    }
    snap({ line: 4, note: `End of pass ${i + 1}: ${fmt(a[n - 1 - i])} is locked in its final position.`, tone: "ok" });
  }
  for (let k = 0; k < n; k++) sorted.add(k);
  snap({ line: 14, done: true, note: `Sorted with ${comps} comparisons and ${writes} swaps.`, tone: "ok" });
  return s;
}

function selectionSteps(input) {
  const a = [...input], n = a.length, s = [], sorted = new Set();
  let comps = 0, writes = 0;
  const snap = (o) => s.push({ arr: [...a], comps, writes, sorted: [...sorted], ...o });
  snap({ line: 2, note: `Selection sort: scan the unsorted part for its minimum, then swap it to the front. At most N−1 swaps.` });
  for (let i = 0; i < n - 1; i++) {
    let m = i;
    snap({ minIdx: m, line: 4, note: `i = ${i}: assume min_idx = ${i} (${fmt(a[i])}).`, tone: "default" });
    for (let j = i + 1; j < n; j++) {
      comps++;
      const less = a[j].v < a[m].v;
      snap({ cmp: [j, m], minIdx: m, line: 6, note: `Is ${fmt(a[j])} < current min ${fmt(a[m])}? ${less ? "Yes" : "No"}.`, tone: "active" });
      if (less) {
        m = j;
        snap({ minIdx: m, line: 7, note: `New minimum: min_idx = ${j} (${fmt(a[j])}).`, tone: "default" });
      }
    }
    if (m !== i) {
      [a[i], a[m]] = [a[m], a[i]];
      writes++;
      sorted.add(i);
      snap({ swap: [i, m], line: 11, note: `swap(arr[${i}], arr[${m}]) — this long-distance jump is what makes selection sort UNSTABLE.`, tone: "warn" });
    } else {
      sorted.add(i);
      snap({ line: 10, note: `Minimum is already at index ${i}; no swap.`, tone: "ok" });
    }
  }
  for (let k = 0; k < n; k++) sorted.add(k);
  snap({ line: 14, done: true, note: `Sorted with ${comps} comparisons (always N(N−1)/2) and only ${writes} swaps.`, tone: "ok" });
  return s;
}

function insertionSteps(input) {
  const a = [...input], n = a.length, s = [];
  let comps = 0, writes = 0, upto = 0;
  const snap = (o, hole, key) => {
    const arr = [...a];
    if (hole != null) arr[hole] = key;
    s.push({ arr, comps, writes, sorted: Array.from({ length: upto + 1 }, (_, k) => k).filter((k) => k !== hole), ...o, hole });
  };
  snap({ line: 2, note: `Insertion sort: grow a sorted prefix; take the next card and slide it left into place.` });
  for (let i = 1; i < n; i++) {
    const key = a[i];
    let j = i - 1;
    snap({ key: i, line: [4, 5], note: `Pick key = ${fmt(key)} (index ${i}). Sorted prefix is [0..${i - 1}].`, tone: "default" }, i, key);
    while (j >= 0) {
      comps++;
      const bigger = a[j].v > key.v;
      snap({ cmp: [j, j + 1], line: 6, note: `Is ${fmt(a[j])} > key ${fmt(key)}? ${bigger ? "Yes → shift it right." : "No → stop, the slot is found."}`, tone: "active" }, j + 1, key);
      if (!bigger) break;
      a[j + 1] = a[j];
      writes++;
      j--;
      snap({ line: [7, 8], note: `Shifted ${fmt(a[j + 2])} right; the gap moves to index ${j + 1}.`, tone: "warn" }, j + 1, key);
    }
    a[j + 1] = key;
    writes++;
    upto = i;
    snap({ line: 10, placed: j + 1, note: `Insert ${fmt(key)} at index ${j + 1}. Prefix [0..${i}] is sorted.`, tone: "ok" });
  }
  upto = n - 1;
  snap({ line: 12, done: true, note: `Sorted with ${comps} comparisons and ${writes} writes. Nearly-sorted input → almost no shifts (adaptive).`, tone: "ok" });
  return s;
}

function mergeSegments(n) {
  const segs = [];
  const rec = (lo, hi, d) => {
    segs.push({ lo, hi, d });
    if (lo >= hi) return;
    const mid = lo + Math.floor((hi - lo) / 2);
    rec(lo, mid, d + 1);
    rec(mid + 1, hi, d + 1);
  };
  if (n) rec(0, n - 1, 0);
  return segs;
}

function mergeSteps(input) {
  const a = [...input], n = a.length, s = [];
  const segs = mergeSegments(n);
  const status = segs.map(() => 0); // 0 unseen, 1 split, 2 merged
  const segIdx = (lo, hi) => segs.findIndex((g) => g.lo === lo && g.hi === hi);
  let comps = 0, writes = 0;
  const snap = (o) => s.push({ arr: [...a], comps, writes, sorted: [], status: [...status], ...o });
  const rec = (lo, hi) => {
    const id = segIdx(lo, hi);
    status[id] = 1;
    if (lo >= hi) {
      status[id] = 2;
      snap({ range: [lo, hi], seg: id, line: 14, note: `[${lo}] = ${fmt(a[lo])} has size 1 → already sorted.`, tone: "default" });
      return;
    }
    const mid = lo + Math.floor((hi - lo) / 2);
    snap({ range: [lo, hi], seg: id, line: [15, 16, 17], note: `Split [${lo}..${hi}] at mid = ${mid} → [${lo}..${mid}] and [${mid + 1}..${hi}].`, tone: "default" });
    rec(lo, mid);
    rec(mid + 1, hi);
    const temp = [];
    let i = lo, j = mid + 1;
    while (i <= mid && j <= hi) {
      comps++;
      const takeLeft = a[i].v <= a[j].v;
      snap({ range: [lo, hi], seg: id, cmp: [i, j], temp: [...temp], line: takeLeft ? 5 : 6, note: `Merge [${lo}..${mid}] + [${mid + 1}..${hi}]: ${fmt(a[i])} <= ${fmt(a[j])}? ${takeLeft ? "Yes → take left (<= keeps it stable)." : "No → take right."}`, tone: "active" });
      temp.push(takeLeft ? a[i++] : a[j++]);
    }
    if (i <= mid || j <= hi) {
      while (i <= mid) temp.push(a[i++]);
      while (j <= hi) temp.push(a[j++]);
      snap({ range: [lo, hi], seg: id, temp: [...temp], line: [8, 9], note: `One half is exhausted → copy the leftovers into temp.`, tone: "default" });
    }
    for (let k = lo; k <= hi; k++) {
      a[k] = temp[k - lo];
      writes++;
    }
    status[id] = 2;
    snap({ range: [lo, hi], seg: id, temp: [...temp], written: [lo, hi], line: 10, note: `Copy temp back → [${lo}..${hi}] = ${temp.map(fmt).join(", ")} is sorted.`, tone: "ok" });
  };
  snap({ line: 13, status: [...status], note: `Merge sort: split down to size-1 pieces, then merge sorted halves back up. Needs O(N) extra temp space.` });
  if (n) rec(0, n - 1);
  s.push({ arr: [...a], comps, writes, sorted: a.map((_, k) => k), status: status.map(() => 2), line: 19, done: true, note: `Sorted with ${comps} comparisons and ${writes} writes across ⌈log₂ ${n}⌉ = ${Math.ceil(Math.log2(Math.max(n, 2)))} levels.`, tone: "ok" });
  return s;
}

function quickSteps(input) {
  const a = [...input], n = a.length, s = [], sorted = new Set();
  let comps = 0, writes = 0;
  const stack = [];
  const snap = (o) => s.push({ arr: [...a], comps, writes, sorted: [...sorted], stack: stack.map((r) => `[${r[0]}..${r[1]}]`), ...o });
  snap({ line: 14, note: `Quick sort: partition around a pivot (last element), so the pivot lands in its final spot; recurse on both sides.` });
  const rec = (lo, hi) => {
    if (lo > hi) return;
    if (lo === hi) {
      sorted.add(lo);
      snap({ range: [lo, hi], line: 15, note: `[${lo}] is a single element → final.`, tone: "ok" });
      return;
    }
    stack.push([lo, hi]);
    const pivot = a[hi];
    let i = lo - 1;
    snap({ range: [lo, hi], pivot: hi, iPtr: i, line: [2, 3], note: `Partition [${lo}..${hi}] with pivot = ${fmt(pivot)}. i = ${i} marks the end of the "< pivot" zone.`, tone: "default" });
    for (let j = lo; j < hi; j++) {
      comps++;
      const less = a[j].v < pivot.v;
      snap({ range: [lo, hi], pivot: hi, iPtr: i, jPtr: j, cmp: [j, hi], line: 5, note: `Is ${fmt(a[j])} < pivot ${fmt(pivot)}? ${less ? "Yes → grow the small zone." : "No → leave it on the big side."}`, tone: "active" });
      if (less) {
        i++;
        [a[i], a[j]] = [a[j], a[i]];
        if (i !== j) writes++;
        snap({ range: [lo, hi], pivot: hi, iPtr: i, jPtr: j, swap: i !== j ? [i, j] : null, line: [6, 7], note: i !== j ? `i → ${i}; swap(arr[${i}], arr[${j}]).` : `i → ${i} (same slot, swap is a no-op).`, tone: "warn" });
      }
    }
    [a[i + 1], a[hi]] = [a[hi], a[i + 1]];
    writes++;
    sorted.add(i + 1);
    snap({ range: [lo, hi], pivot: i + 1, swap: [i + 1, hi], line: [10, 11], note: `Place pivot: swap(arr[${i + 1}], arr[${hi}]). ${fmt(pivot)} is now in its FINAL position ${i + 1}.`, tone: "ok" });
    stack.pop();
    rec(lo, i);
    rec(i + 2, hi);
  };
  rec(0, n - 1);
  for (let k = 0; k < n; k++) sorted.add(k);
  snap({ line: 19, done: true, note: `Sorted with ${comps} comparisons and ${writes} swaps, in place (O(log N) stack).`, tone: "ok" });
  return s;
}

function countingSteps(input) {
  const a = [...input], n = a.length, s = [];
  const maxVal = Math.max(...a.map((x) => x.v), 0);
  const counts = Array(maxVal + 1).fill(0);
  const out = Array(n).fill(null);
  let writes = 0;
  const snap = (o) => s.push({ arr: [...a], comps: 0, writes, sorted: [], counts: [...counts], out: [...out], keyOf: (x) => x.v, ...o });
  snap({ phase: "count", line: [2, 3], note: `maxVal = ${maxVal} → allocate counts[0..${maxVal}]. No comparisons will ever be made.` });
  a.forEach((x, k) => {
    counts[x.v]++;
    snap({ phase: "count", cur: k, ci: x.v, line: 4, note: `counts[${x.v}]++ → ${counts[x.v]}.`, tone: "active" });
  });
  for (let i = 1; i <= maxVal; i++) counts[i] += counts[i - 1];
  snap({ phase: "prefix", line: 6, note: `Prefix sums: counts[v] now = how many elements are ≤ v, i.e. one past the last slot for value v.`, tone: "warn" });
  for (let i = n - 1; i >= 0; i--) {
    const pos = counts[a[i].v] - 1;
    out[pos] = a[i];
    counts[a[i].v]--;
    writes++;
    snap({ phase: "place", cur: i, ci: a[i].v, outPos: pos, line: [10, 11], note: `Right-to-left: ${fmt(a[i])} → output[counts[${a[i].v}] − 1] = output[${pos}]. Walking backwards keeps equal keys in original order (stable).`, tone: "active" });
  }
  for (let k = 0; k < n; k++) a[k] = out[k];
  s.push({ arr: [...a], comps: 0, writes, sorted: a.map((_, k) => k), counts: [...counts], out: [...out], phase: "done", line: 13, done: true, note: `Sorted in O(N + K) = O(${n} + ${maxVal + 1}) with 0 comparisons.`, tone: "ok" });
  return s;
}

function radixSteps(input) {
  const a = [...input], n = a.length, s = [];
  const maxVal = Math.max(...a.map((x) => x.v), 0);
  let writes = 0;
  const snap = (o) => s.push({ arr: [...a], comps: 0, writes, sorted: [], ...o });
  snap({ line: [14, 15], note: `maxVal = ${maxVal} has ${String(maxVal).length} digit${maxVal > 9 ? "s" : ""} → ${String(maxVal).length} stable counting-sort pass${maxVal > 9 ? "es" : ""}, least significant digit first.` });
  for (let exp = 1; Math.floor(maxVal / exp) > 0; exp *= 10) {
    const place = exp === 1 ? "1s" : exp === 10 ? "10s" : exp === 100 ? "100s" : `${exp}s`;
    const dig = (x) => Math.floor(x.v / exp) % 10;
    const counts = Array(10).fill(0);
    const out = Array(n).fill(null);
    a.forEach((x) => counts[dig(x)]++);
    snap({ exp, place, counts: [...counts], out: [...out], keyOf: dig, phase: "count", line: 3, note: `Pass on the ${place} digit: count each digit.`, tone: "active" });
    for (let i = 1; i < 10; i++) counts[i] += counts[i - 1];
    snap({ exp, place, counts: [...counts], out: [...out], keyOf: dig, phase: "prefix", line: 4, note: `Prefix sums give each digit's bucket boundary in the output.`, tone: "warn" });
    for (let i = n - 1; i >= 0; i--) {
      const d = dig(a[i]);
      const pos = counts[d] - 1;
      out[pos] = a[i];
      counts[d]--;
      writes++;
      snap({ exp, place, counts: [...counts], out: [...out], keyOf: dig, phase: "place", cur: i, ci: d, outPos: pos, line: [6, 7, 8], note: `${a[i].v}: ${place} digit = ${d} → output[${pos}].`, tone: "active" });
    }
    for (let k = 0; k < n; k++) a[k] = out[k];
    snap({ exp, place, counts: [...counts], out: [...out], keyOf: dig, phase: "copy", line: 10, note: `After the ${place} pass: [${a.map((x) => x.v).join(", ")}]. Ties keep the order from the previous pass — that's why each pass must be stable.`, tone: "ok" });
  }
  s.push({ arr: [...a], comps: 0, writes, sorted: a.map((_, k) => k), line: 16, done: true, note: `Sorted with 0 comparisons: ${writes} placements over ${String(maxVal).length} digit pass${maxVal > 9 ? "es" : ""}.`, tone: "ok" });
  return s;
}

const GEN = { bubble: bubbleSteps, selection: selectionSteps, insertion: insertionSteps, merge: mergeSteps, quick: quickSteps, counting: countingSteps, radix: radixSteps };

/* ------------------------------------------------------------------ */
/* Inputs                                                              */
/* ------------------------------------------------------------------ */

const PRESETS = { chapter: "Chapter example", random: "Random", nearly: "Nearly sorted", reversed: "Reversed", dups: "Many duplicates" };

function makeInput(algo, preset, n, seed) {
  if (preset === "chapter") return ALGOS[algo].chapter;
  const rand = rng(seed * 7919 + n);
  const hi = algo === "radix" ? 999 : algo === "counting" ? 9 : 60;
  const lo = algo === "counting" ? 0 : 1;
  const r = () => lo + Math.floor(rand() * (hi - lo + 1));
  let a = Array.from({ length: n }, r);
  if (preset === "nearly" || preset === "reversed") a.sort((x, y) => x - y);
  if (preset === "reversed") a.reverse();
  if (preset === "nearly") for (let k = 0; k < 2; k++) {
    const p = Math.floor(rand() * (n - 1));
    [a[p], a[p + 1]] = [a[p + 1], a[p]];
  }
  if (preset === "dups") {
    const pool = [r(), r(), r()];
    a = a.map(() => pool[Math.floor(rand() * pool.length)]);
  }
  return a;
}

const toItems = (vals) => vals.map((v, id) => ({ v, id }));

/** Records with tagged duplicate keys for the stability demo (letters = original order among equal keys). */
const STABLE_INPUT = [
  { v: 3, tag: "a" }, { v: 2, tag: "a" }, { v: 3, tag: "b" }, { v: 1, tag: "a" }, { v: 2, tag: "b" }, { v: 1, tag: "b" }, { v: 3, tag: "c" },
].map((x, id) => ({ ...x, id }));

function isStableResult(items) {
  const seen = {};
  for (const x of items) {
    if (seen[x.v] != null && seen[x.v] > x.id) return false;
    seen[x.v] = x.id;
  }
  return true;
}

/* ------------------------------------------------------------------ */
/* Visuals                                                             */
/* ------------------------------------------------------------------ */

const PURPLE_LABEL = { quick: "Pivot", insertion: "Key (gap)", selection: "Current min" };
const TAG_COLOR = { a: C.active, b: C.purple, c: C.warn };

function Bars({ step, showTags }) {
  const a = step.arr;
  const W = 600, H = showTags ? 220 : 205, pad = 14, base = H - (showTags ? 36 : 22);
  const max = Math.max(...a.map((x) => x?.v ?? 0), 1);
  const bw = (W - pad * 2) / Math.max(a.length, 1);
  const sorted = new Set(step.sorted);
  const cmp = new Set(step.cmp ?? []);
  const swp = new Set(step.swap ?? []);
  const inRange = (k) => !step.range || (k >= step.range[0] && k <= step.range[1]);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full font-mono">
      {step.range && <rect x={pad + step.range[0] * bw} y={4} width={(step.range[1] - step.range[0] + 1) * bw} height={base - 2} rx={6} fill={C.active} opacity={0.06} />}
      <line x1={pad} x2={W - pad} y1={base} y2={base} stroke={C.muted} opacity={0.4} />
      {a.map((x, k) => {
        if (!x) return null;
        const h = Math.max(3, (x.v / max) * (base - 26));
        let color = C.ink;
        if (sorted.has(k) || (step.written && k >= step.written[0] && k <= step.written[1])) color = C.ok;
        if (step.pivot === k || step.key === k || step.hole === k || step.minIdx === k) color = C.purple;
        if (cmp.has(k)) color = C.active;
        if (swp.has(k)) color = C.warn;
        if (step.cur === k) color = C.active;
        const dim = !inRange(k) && !sorted.has(k);
        return (
          <g key={k} opacity={dim ? 0.3 : 1} className="transition-all duration-200">
            <rect x={pad + k * bw + bw * 0.14} y={base - h} width={bw * 0.72} height={h} rx={3} fill={color} opacity={0.88} strokeDasharray={step.hole === k ? "3 2" : undefined} stroke={step.hole === k ? C.fg : "none"} />
            <text x={pad + k * bw + bw / 2} y={base - h - 4} textAnchor="middle" fontSize={bw < 30 ? 10 : 11} fill={C.fg}>{x.v}</text>
            {showTags && x.tag && (
              <text x={pad + k * bw + bw / 2} y={base + 14} textAnchor="middle" fontSize={12} fontWeight={700} fill={TAG_COLOR[x.tag] ?? C.fg}>{x.v}{x.tag}</text>
            )}
            <text x={pad + k * bw + bw / 2} y={H - 6} textAnchor="middle" fontSize={10} fill={C.muted}>{k}</text>
          </g>
        );
      })}
      {step.iPtr != null && step.iPtr >= 0 && <text x={pad + step.iPtr * bw + bw / 2} y={14} textAnchor="middle" fontSize={11} fontWeight={700} fill={C.warn}>i</text>}
      {step.iPtr != null && step.iPtr < 0 && step.range && <text x={pad + step.range[0] * bw + 4} y={14} fontSize={11} fontWeight={700} fill={C.warn}>i=−1</text>}
      {step.jPtr != null && <text x={pad + step.jPtr * bw + bw / 2} y={26} textAnchor="middle" fontSize={11} fontWeight={700} fill={C.active}>j</text>}
    </svg>
  );
}

/** Recursion levels of merge sort: one row per depth, one bracket per subarray. */
function MergeLevels({ n, step }) {
  const segs = useMemo(() => mergeSegments(n), [n]);
  const depth = Math.max(...segs.map((g) => g.d), 0) + 1;
  const W = 600, pad = 14, rowH = 18, H = depth * rowH + 18;
  const bw = (W - pad * 2) / Math.max(n, 1);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full font-mono">
      <text x={pad} y={11} fontSize={10} fill={C.muted}>recursion levels (split ↓, merge ↑)</text>
      {segs.map((g, k) => {
        const st = step.status?.[k] ?? 0;
        const cur = step.seg === k;
        const color = cur ? C.active : st === 2 ? C.ok : st === 1 ? C.warn : C.grid;
        return (
          <g key={k}>
            <rect x={pad + g.lo * bw + 2} y={16 + g.d * rowH} width={(g.hi - g.lo + 1) * bw - 4} height={rowH - 5} rx={4} fill={color} fillOpacity={cur ? 0.35 : st ? 0.16 : 0.05} stroke={color} strokeWidth={cur ? 2 : 1} />
            {(g.hi - g.lo + 1) * bw > 34 && <text x={pad + ((g.lo + g.hi + 1) / 2) * bw} y={16 + g.d * rowH + 10} textAnchor="middle" fontSize={10} fill={C.fg}>{g.lo}..{g.hi}</text>}
          </g>
        );
      })}
    </svg>
  );
}

function Cells({ items, label, highlight, groupOf, tone = "active", showTags }) {
  return (
    <div className="overflow-x-auto pb-1">
      <div className="mb-1 font-mono text-[11px] text-muted-foreground">{label}</div>
      <div className="inline-flex gap-1">
        {items.map((x, k) => {
          const g = groupOf ? groupOf(x, k) : null;
          return (
            <div key={k} className="flex flex-col items-center gap-0.5">
              {groupOf && <span className="font-mono text-[10px] text-muted-foreground">{g ?? " "}</span>}
              <div
                className={cn(
                  "flex h-9 min-w-9 items-center justify-center rounded-md border bg-card px-1 font-mono text-[13px] font-semibold tabular-nums transition-all",
                  x == null && "border-dashed text-muted-foreground",
                  highlight === k && tone === "active" && "border-viz-active bg-viz-active/15 text-viz-active",
                  highlight === k && tone === "warn" && "border-viz-warn bg-viz-warn/15 text-viz-warn"
                )}
              >
                {x == null ? "·" : typeof x === "object" ? (showTags && x.tag ? `${x.v}${x.tag}` : x.v) : x}
              </div>
              <span className="font-mono text-[10px] text-muted-foreground">{k}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Lab                                                                 */
/* ------------------------------------------------------------------ */

const VARIANT_ALGOS = {
  n2: ["bubble", "selection", "insertion"],
  nlogn: ["merge", "quick"],
  "non-comparison": ["counting", "radix", "stability"],
  all: ["bubble", "selection", "insertion", "merge", "quick", "counting", "radix"],
};

const META = {
  n2: { title: "O(N²) Sorts — Bubble, Selection, Insertion", desc: "Watch comparisons (cyan), swaps/shifts (amber) and the growing sorted region (green). Count the work as N grows.", badges: ["in place"] },
  nlogn: { title: "O(N log N) Sorts — Merge Sort & Quick Sort", desc: "Merge sort splits then merges level by level; quick sort partitions around a pivot first, then recurses.", badges: ["divide & conquer"] },
  "non-comparison": { title: "Non-Comparison Sorts & Stability", desc: "Counting and radix sort never compare two elements — they index by value or digit. Then test which algorithms keep equal keys in order.", badges: ["0 comparisons", "stability"] },
  all: { title: "Sorting Algorithm Explorer", desc: "Run any algorithm on the same input and compare the work each one does.", badges: ["7 algorithms"] },
};

export default function SortingLab({ variant = "n2" }) {
  // remount per variant so per-variant state (selected algorithm) never leaks across chapters
  return <SortingExplorer key={variant} variant={variant} />;
}

function SortingExplorer({ variant }) {
  const choices = VARIANT_ALGOS[variant] ?? VARIANT_ALGOS.all;
  const meta = META[variant] ?? META.all;
  const [algoSel, setAlgo] = useState(choices[0]);
  const stability = algoSel === "stability";
  const [stableAlgo, setStableAlgo] = useState("selection");
  const algo = stability ? stableAlgo : algoSel;
  const [preset, setPreset] = useState("chapter");
  const [n, setN] = useState(10);
  const [seed, setSeed] = useState(1);

  const items = useMemo(() => (stability ? STABLE_INPUT : toItems(makeInput(algo, preset, n, seed))), [stability, algo, preset, n, seed]);
  const steps = useMemo(() => GEN[algo](items), [algo, items]);
  const st = useStepper(steps, { baseMs: 520 });
  const step = st.step;
  const final = steps.at(-1);

  const race = useMemo(() => {
    if (variant !== "all") return null;
    return choices.map((k) => {
      const vals = items.map((x) => x.v);
      // counting needs small non-negative ints; radix needs non-negative ints — both hold for generated inputs
      const okInput = k !== "counting" || Math.max(...vals) <= 1000;
      const last = okInput ? GEN[k](items).at(-1) : null;
      return { k, comps: last?.comps ?? "—", writes: last?.writes ?? "—" };
    });
  }, [variant, choices, items]);

  const stableOk = stability ? isStableResult(final.arr) : null;
  const showCounts = algo === "counting" || algo === "radix";
  const tabsList = choices;

  return (
    <LabShell title={meta.title} description={meta.desc} badges={[...meta.badges, ALGOS[algo].time]}>
      <div className="flex flex-wrap items-center gap-2">
        {variant === "all" ? (
          <Select value={algoSel} onValueChange={(v) => (setAlgo(v), setPreset("chapter"))}>
            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              {tabsList.map((k) => <SelectItem key={k} value={k}>{ALGOS[k].label}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : (
          <Tabs value={algoSel} onValueChange={(v) => (setAlgo(v), setPreset("chapter"))}>
            <TabsList>
              {tabsList.map((k) => <TabsTrigger key={k} value={k}>{k === "stability" ? "Stability demo" : ALGOS[k].label.replace(/ \(.*\)/, "")}</TabsTrigger>)}
            </TabsList>
          </Tabs>
        )}
        {stability ? (
          <Select value={stableAlgo} onValueChange={setStableAlgo}>
            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.keys(ALGOS).map((k) => <SelectItem key={k} value={k}>{ALGOS[k].label}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : (
          <>
            <Select value={preset} onValueChange={setPreset}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(PRESETS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => (setSeed((x) => x + 1), preset === "chapter" && setPreset("random"))}>
              <Shuffle /> Shuffle
            </Button>
            <div className="ml-auto w-40">
              <SliderControl label="N" value={preset === "chapter" ? items.length : n} min={4} max={16} onChange={(v) => (setN(v), preset === "chapter" && setPreset("random"))} />
            </div>
          </>
        )}
      </div>

      <Split>
        <div className="space-y-3">
          <Stage className="p-2">
            <Bars step={step} showTags={stability} />
            {algo === "merge" && <MergeLevels n={items.length} step={step} />}
          </Stage>
          {algo === "merge" && step.temp && <Cells items={step.temp} label="temp (merge buffer)" />}
          {algo === "quick" && step.stack && (
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
              call stack: {step.stack.length ? step.stack.map((r, k) => <Badge key={k} variant="outline" className="font-mono">{r}</Badge>) : <span>empty</span>}
            </div>
          )}
          {showCounts && step.counts && (
            <Stage className="space-y-2 p-3">
              <Cells items={step.counts} label={algo === "radix" ? `counts[digit] — ${step.place} place` : "counts[value]"} highlight={step.ci} tone={step.phase === "prefix" ? "warn" : "active"} />
              <Cells items={step.out} label="output" highlight={step.outPos} groupOf={step.keyOf ? (x) => (x ? (algo === "radix" ? `d${step.keyOf(x)}` : `=${step.keyOf(x)}`) : null) : null} showTags={stability} />
            </Stage>
          )}
          <Legend
            items={[
              [C.active, "Comparing / reading"],
              [C.warn, "Swap / shift"],
              ...(PURPLE_LABEL[algo] ? [[C.purple, PURPLE_LABEL[algo]]] : []),
              [C.ok, "Sorted"],
            ]}
          />
          <Narration tone={step.tone}>{step.note}</Narration>
          {stability && step.done && (
            <Narration tone={stableOk ? "ok" : "bad"}>
              {ALGOS[algo].label}: equal keys came out as {final.arr.map(fmt).join(", ")} → {stableOk ? "relative order preserved — STABLE on this input." : "a later duplicate jumped ahead of an earlier one — UNSTABLE."}
            </Narration>
          )}
        </div>
        <div className="space-y-3">
          <CodePanel code={CODE[algo]} active={step.line} maxHeight={300} />
          <StatGrid cols={2}>
            <Stat label="Comparisons" value={step.comps} tone="active" />
            <Stat label={algo === "bubble" || algo === "selection" || algo === "quick" ? "Swaps" : "Writes"} value={step.writes} tone="warn" />
            <Stat label="N" value={items.length} />
            <Stat label="Stable?" value={ALGOS[algo].stable ? "yes" : "no"} tone={ALGOS[algo].stable ? "ok" : "bad"} />
          </StatGrid>
          {race && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Same input</TableHead>
                  <TableHead className="text-right">cmp</TableHead>
                  <TableHead className="text-right">writes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {race.map((r) => (
                  <TableRow key={r.k} className={cn(r.k === algo && "bg-viz-active/10")}>
                    <TableCell className="py-1 text-[12.5px]">{ALGOS[r.k].label}</TableCell>
                    <TableCell className="py-1 text-right font-mono text-[12.5px]">{r.comps}</TableCell>
                    <TableCell className="py-1 text-right font-mono text-[12.5px]">{r.writes}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Split>
      <PlaybackBar stepper={st} />
    </LabShell>
  );
}

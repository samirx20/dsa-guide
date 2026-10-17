// Small layout helpers shared by the recursion / backtracking / tree / trie labs.

/**
 * Leaf-slot layout for any rooted tree: leaves get consecutive x slots (0,1,2,...),
 * parents are centred over their children. `children(key)` returns child keys.
 * Returns { pos: Map(key -> {x, y}), leaves, depth }.
 */
export function layoutTree(root, children) {
  const pos = new Map();
  let slot = 0;
  let depth = 0;
  const walk = (k, d) => {
    depth = Math.max(depth, d);
    const ch = children(k);
    if (!ch.length) {
      pos.set(k, { x: slot++, y: d });
      return;
    }
    ch.forEach((c) => walk(c, d + 1));
    const xs = ch.map((c) => pos.get(c).x);
    pos.set(k, { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: d });
  };
  if (root != null) walk(root, 0);
  return { pos, leaves: Math.max(slot, 1), depth };
}

/**
 * Inorder layout for binary trees made of { id, val, left, right } objects:
 * x = inorder rank, y = depth. Keeps BST order visible left-to-right.
 */
export function layoutBinary(root) {
  const pos = new Map();
  let rank = 0;
  let depth = 0;
  const walk = (n, d) => {
    if (!n) return;
    depth = Math.max(depth, d);
    walk(n.left, d + 1);
    pos.set(n.id, { x: rank++, y: d, node: n });
    walk(n.right, d + 1);
  };
  walk(root, 0);
  return { pos, count: rank, depth };
}

/** Collect parent->child edges of a { id, left, right } binary tree. */
export function binaryEdges(root) {
  const out = [];
  const walk = (n) => {
    if (!n) return;
    for (const c of [n.left, n.right]) if (c) out.push([n.id, c.id]);
    walk(n.left);
    walk(n.right);
  };
  walk(root);
  return out;
}

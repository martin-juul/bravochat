/**
 * @file Mini Bravo DOM — a hand-rolled, keyed-diff virtual DOM.
 * `core.js` is pure data + diff logic: no DOM, no browser globals, fully
 * unit-testable in Node (the vdom equivalent of looking great in a mirror).
 *
 * Rendered nodes are plain vnode objects:
 *   { type: 'element', tag, props, key, children }
 *   { type: 'text', text }
 *   { type: 'raw', html }        // trusted innerHTML leaf (static SVG strings)
 *   undefined/null/false/''      // holes, render as nothing
 */

/** Normalize any child value into a vnode (or null for holes). */
function normalize(child) {
  if (child == null || child === false || child === '') return null;
  if (typeof child === 'object') return child; // already a vnode
  return { type: 'text', text: String(child) };
}

/**
 * Create a virtual element node.
 * @param {string} tag element tag name ('div', 'svg', 'button', ...)
 * @param {{ key?: string | number, [attr: string]: unknown }} [props]
 *   attributes/properties; `key` participates in child diffing.
 * @param {(import('./core.js').VNode | string | number | null | false | undefined)[]} children
 * @returns {import('./core.js').VElement}
 */
export function h(tag, props = {}, children = []) {
  const flat = [];
  for (const child of children) {
    const n = normalize(child);
    if (n) flat.push(n);
  }
  return { type: 'element', tag, props, key: props.key ?? null, children: flat };
}

/**
 * Patch plan operations produced by `diffChildren`. Consumers (like the DOM
 * renderer in `dom.js`) execute them; tests count them. Keeping the plan
 * declarative is what makes the vdom benchmarkable without a browser.
 * @typedef {Object} PatchOp
 * @property {'insert' | 'move' | 'remove' | 'update'} op
 * @property {number} index new-children index this op applies to
 * @property {number} [from] old-children index (move/update/(-1 remove))
 * @property {string | number | null} [key]
 */

/**
 * Compute the minimal operation list transforming old children into new
 * children, matching keyed nodes by `key` (falling back to index + type).
 * Classic keyed-diff shape (à la snabbdom's simplest correct form):
 * reuse keyed matches in place, then emit moves/removes/inserts.
 *
 * @param {import('./core.js').VElement['children'][]} oldChildren
 * @param {import('./core.js').VElement['children'][]} newChildren
 * @returns {PatchOp[]}
 */
export function diffChildren(oldChildren, newChildren) {
  /** @type {Map<string | number, number>} key -> old index */
  const oldKeyMap = new Map();
  oldChildren.forEach((c, i) => {
    if (c.type === 'element' && c.key != null) oldKeyMap.set(c.key, i);
  });

  /** @type {(number | null)[]} new index -> matched old index (null = insert) */
  const match = newChildren.map((n) => {
    if (n.type === 'element' && n.key != null && oldKeyMap.has(n.key)) {
      return oldKeyMap.get(n.key);
    }
    return null;
  });

  // Free-index pool for unkeyed position matching (keeps text cheap).
  const matchedOld = new Set(match.filter((m) => m != null));
  let nextFree = 0;
  for (let i = 0; i < newChildren.length; i++) {
    if (match[i] == null && nextFree < oldChildren.length) {
      while (matchedOld.has(nextFree)) nextFree++;
      const old = oldChildren[nextFree];
      const neu = newChildren[i];
      if (old && neu && old.type === neu.type) {
        match[i] = nextFree;
        matchedOld.add(nextFree);
        nextFree++;
      }
    }
  }

  /** @type {PatchOp[]} */
  const ops = [];
  const usedOld = new Set();

  for (let i = 0; i < newChildren.length; i++) {
    const m = match[i];
    if (m == null) {
      ops.push({ op: 'insert', index: i, from: -1, key: newChildren[i].key ?? null });
    } else {
      usedOld.add(m);
      ops.push({ op: 'update', index: i, from: m, key: newChildren[i].key ?? null });
    }
  }
  for (let i = 0; i < oldChildren.length; i++) {
    if (!usedOld.has(i)) ops.push({ op: 'remove', index: i, from: i, key: oldChildren[i].key ?? null });
  }
  return ops;
}

/**
 * Whether two vnodes can reuse the same rendered output (same kind and, for
 * elements, the same tag). Text-vs-text, raw-vs-raw, and same-tag elements
 * patch in place; everything else replaces.
 * @param {import('./core.js').VNode | null} a
 * @param {import('./core.js').VNode | null} b
 */
export function sameKind(a, b) {
  if (!a || !b) return false;
  if (a.type !== b.type) return false;
  if (a.type === 'element' && b.type === 'element') return a.tag === b.tag;
  return true;
}

/**
 * Compute prop-level differences between two prop objects.
 * @returns {{ set: Record<string, unknown>, removed: string[] }}
 */
export function diffProps(oldProps = {}, newProps = {}) {
  const set = {};
  const removed = [];
  for (const k of Object.keys(newProps)) {
    if (newProps[k] !== oldProps[k]) set[k] = newProps[k];
  }
  for (const k of Object.keys(oldProps)) {
    if (!(k in newProps)) removed.push(k);
  }
  return { set, removed };
}

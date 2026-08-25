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

/** A text vnode. */
export interface VText {
  type: 'text';
  text: string;
}

/** A trusted innerHTML leaf vnode (static SVG strings). */
export interface VRaw {
  type: 'raw';
  html: string;
}

/** A virtual element node. */
export interface VElement {
  type: 'element';
  tag: string;
  props: Record<string, unknown>;
  key: string | number | null;
  children: VChildNode[];
}

/** Any renderable vnode. Holes (`null`/`false`/`undefined`/`''`) normalize away. */
export type VNode = VElement | VText | VRaw;
export type VChildNode = VNode; // holes never survive normalize()

/** Normalize any child value into a vnode (or null for holes). */
function normalize(child: VNode | string | number | null | false | undefined): VNode | null {
  if (child == null || child === false || child === '') return null;
  if (typeof child === 'object') return child; // already a vnode
  return { type: 'text', text: String(child) };
}

/**
 * Create a virtual element node.
 * @param tag element tag name ('div', 'svg', 'button', ...)
 * @param props attributes/properties; `key` participates in child diffing.
 * @param children child values; holes normalize away.
 */
export function h(
  tag: string,
  props: Record<string, unknown> = {},
  children: (VNode | string | number | null | false | undefined)[] = [],
): VElement {
  const flat: VNode[] = [];
  for (const child of children) {
    const n = normalize(child);
    if (n) flat.push(n);
  }
  return { type: 'element', tag, props, key: (props.key as string | number | undefined) ?? null, children: flat };
}

/**
 * Patch plan operations produced by `diffChildren`. Consumers (like the DOM
 * renderer in `dom.ts`) execute them; tests count them. Keeping the plan
 * declarative is what makes the vdom benchmarkable without a browser.
 */
export interface PatchOp {
  op: 'insert' | 'move' | 'remove' | 'update';
  /** new-children index this op applies to */
  index: number;
  /** old-children index (move/update, -1 for insert/remove) */
  from: number;
  key: string | number | null;
}

/**
 * Compute the minimal operation list transforming old children into new
 * children, matching keyed nodes by `key` (falling back to index + type).
 * Classic keyed-diff shape (à la snabbdom's simplest correct form):
 * reuse keyed matches in place, then emit moves/removes/inserts.
 */
export function diffChildren(oldChildren: VElement['children'], newChildren: VElement['children']): PatchOp[] {
  /** key -> old index */
  const oldKeyMap = new Map<string | number, number>();
  oldChildren.forEach((c, i) => {
    if (c.type === 'element' && c.key != null) oldKeyMap.set(c.key, i);
  });

  /** new index -> matched old index (null = insert) */
  const match: (number | null)[] = newChildren.map((n) => {
    if (n.type === 'element' && n.key != null && oldKeyMap.has(n.key)) {
      return oldKeyMap.get(n.key) ?? null;
    }
    return null;
  });

  // Free-index pool for unkeyed position matching (keeps text cheap).
  const matchedOld = new Set(match.filter((m): m is number => m != null));
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

  const ops: PatchOp[] = [];
  const usedOld = new Set<number>();
  const keyOf = (node: VNode | undefined): string | number | null =>
    node && node.type === 'element' ? (node.key ?? null) : null;

  for (let i = 0; i < newChildren.length; i++) {
    const m = match[i];
    const child = newChildren[i];
    if (m == null || !child) {
      ops.push({ op: 'insert', index: i, from: -1, key: keyOf(child) });
    } else {
      usedOld.add(m);
      ops.push({ op: 'update', index: i, from: m, key: keyOf(child) });
    }
  }
  for (let i = 0; i < oldChildren.length; i++) {
    if (!usedOld.has(i)) ops.push({ op: 'remove', index: i, from: i, key: keyOf(oldChildren[i]) });
  }
  // Move detection: a matched old index that breaks ascending order must be
  // repositioned — convert its update op to a move (executed via insertBefore).
  let maxSeen = -1;
  for (let i = 0; i < newChildren.length; i++) {
    const m = match[i];
    if (m == null) continue;
    if (m < maxSeen) {
      const op = ops.find((o) => o.op === 'update' && o.index === i);
      if (op) op.op = 'move';
    } else {
      maxSeen = m;
    }
  }
  return ops;
}

/**
 * Whether two vnodes can reuse the same rendered output (same kind and, for
 * elements, the same tag). Text-vs-text, raw-vs-raw, and same-tag elements
 * patch in place; everything else replaces.
 */
export function sameKind(a: VNode | null, b: VNode | null): boolean {
  if (!a || !b) return false;
  if (a.type !== b.type) return false;
  if (a.type === 'element' && b.type === 'element') return a.tag === b.tag;
  return true;
}

/**
 * Compute prop-level differences between two prop objects.
 */
export function diffProps(
  oldProps: Record<string, unknown> = {},
  newProps: Record<string, unknown> = {},
): { set: Record<string, unknown>; removed: string[] } {
  const set: Record<string, unknown> = {};
  const removed = [];
  for (const k of Object.keys(newProps)) {
    if (newProps[k] !== oldProps[k]) set[k] = newProps[k];
  }
  for (const k of Object.keys(oldProps)) {
    if (!(k in newProps)) removed.push(k);
  }
  return { set, removed };
}

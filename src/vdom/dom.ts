/**
 * @file DOM renderer for the Mini Bravo DOM vdom: executes the diff plans
 * from `core.js` against the real DOM. This is the only vdom file that
 * touches the browser; everything else is pure and Node-testable.
 */

import { diffChildren, diffProps, sameKind, type VElement, type VNode } from './core';

/**
 * Build a real DOM node from a vnode.
 */
export function createEl(vnode: VNode): Node {
  if (vnode.type === 'text') return document.createTextNode(vnode.text);
  if (vnode.type === 'raw') {
    const span = document.createElement('span');
    span.style.display = 'contents'; // transparent wrapper: children style as if direct
    span.innerHTML = vnode.html;
    return span;
  }

  const tag = (vnode as VElement).tag;
  const isSvg = tag === 'svg' || tag === 'path' || tag === 'rect';
  const el = isSvg
    ? document.createElementNS('http://www.w3.org/2000/svg', tag)
    : document.createElement(tag);

  const ve = vnode as VElement;
  applyProps(el, diffProps({}, ve.props));
  for (const child of ve.children) el.appendChild(createEl(child));
  return el;
}

/** Property names assigned directly as DOM properties rather than attributes. */
const livePropNames = new Set(['value', 'checked', 'disabled']);

/**
 * Apply a computed prop diff to a live element.
 */
function applyProps(el: Element, propDiff: { set: Record<string, unknown>; removed: string[] }): void {
  for (const [name, value] of Object.entries(propDiff.set)) {
    if (name === 'key') continue;
    if (name === 'innerHTML') {
      el.innerHTML = String(value);
      continue;
    }
    if (name.startsWith('on') && typeof value === 'function') {
      (el as unknown as Record<string, unknown>)[name] = value; // event handlers assigned as properties (no listener leak on diff)
      continue;
    }
    if (livePropNames.has(name)) {
      (el as unknown as Record<string, unknown>)[name] = value;
      if (name === 'value' && value == null) el.removeAttribute('value');
      continue;
    }
    if (value === true) el.setAttribute(name, '');
    else if (value === false || value == null) el.removeAttribute(name);
    else el.setAttribute(name, String(value));
  }
  for (const name of propDiff.removed) {
    if (name === 'key') continue;
    if (name.startsWith('on')) (el as unknown as Record<string, unknown>)[name] = null;
    else el.removeAttribute(name);
  }
}

/**
 * Patch a live DOM node in place from old vnode to new vnode.
 * @param dom the node rendered from `oldVNode`
 * @returns the (possibly replaced) live node
 */
export function patchEl(dom: Node, oldVNode: VNode | null, newVNode: VNode): Node {
  if (!oldVNode || !sameKind(oldVNode, newVNode)) {
    const fresh = createEl(newVNode);
    dom.parentNode?.replaceChild(fresh, dom);
    return fresh;
  }

  if (newVNode.type === 'text') {
    if (dom.textContent !== newVNode.text) dom.textContent = newVNode.text;
    return dom;
  }
  if (newVNode.type === 'raw') {
    if (oldVNode?.type === 'raw' && oldVNode.html !== newVNode.html) {
      const fresh = createEl(newVNode);
      dom.parentNode?.replaceChild(fresh, dom);
      return fresh;
    }
    return dom;
  }

  const el = dom as Element;
  const oldEl = oldVNode as VElement;
  const newEl = newVNode as VElement;
  applyProps(el, diffProps(oldEl.props, newEl.props));
  patchChildren(el, oldEl.children, newEl.children);
  return el;
}

/**
 * Execute a children diff plan against a live parent, minimizing DOM ops:
 * matched nodes are patched in place, inserts and removes are executed
 * against the live child list.
 */
export function patchChildren(parent: Element, oldChildren: VElement['children'], newChildren: VElement['children']): void {
  const ops = diffChildren(oldChildren, newChildren);
  const liveOld = Array.from(parent.childNodes);

  // Pass 1: removes first so live indices settle before inserts.
  for (const op of ops) {
    if (op.op === 'remove') liveOld[op.from]?.remove();
  }
  // Pass 2: patch matched pairs (updates and moves) and compute a reuse map
  // new-index -> live node.
  const liveFor: (Node | null)[] = new Array(newChildren.length).fill(null);
  for (const op of ops) {
    if (op.op === 'update' || op.op === 'move') {
      liveFor[op.index] = patchEl(liveOld[op.from] as Node, oldChildren[op.from] as VNode, newChildren[op.index] as VNode);
    }
  }
  // Pass 3: inserts and repositioning moves, anchored to whatever follows live.
  for (const op of ops) {
    if (op.op !== 'insert' && op.op !== 'move') continue;
    const node = createEl(newChildren[op.index] as VNode);
    let anchor: Node | null = null;
    for (let i = op.index + 1; i < liveFor.length; i++) {
      const live = liveFor[i];
      if (live) { anchor = live; break; }
    }
    if (anchor) parent.insertBefore(node, anchor);
    else parent.appendChild(node);
    liveFor[op.index] = node;
  }
}

/**
 * Claim a container for rendering: strip whitespace/comment nodes so the
 * live child list is exactly what the renderer put there. Without this,
 * formatting nodes from HTML shift the live indices used by patch ops.
 */
export function ownContainer(container: HTMLElement): void {
  for (const node of Array.from(container.childNodes)) {
    if ((node.nodeType === Node.TEXT_NODE && !(node.textContent ?? '').trim()) || node.nodeType === Node.COMMENT_NODE) {
      node.remove();
    }
  }
}


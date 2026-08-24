/**
 * @file DOM renderer for the Mini Bravo DOM vdom: executes the diff plans
 * from `core.js` against the real DOM. This is the only vdom file that
 * touches the browser; everything else is pure and Node-testable.
 */

import { diffChildren, diffProps, sameKind } from './core.js';

/**
 * Build a real DOM node from a vnode.
 * @param {import('./core.js').VNode} vnode
 * @returns {Node}
 */
export function createEl(vnode) {
  if (vnode.type === 'text') return document.createTextNode(vnode.text);
  if (vnode.type === 'raw') {
    const span = document.createElement('span');
    span.style.display = 'contents'; // transparent wrapper: children style as if direct
    span.innerHTML = vnode.html;
    return span;
  }

  const isSvg = vnode.tag === 'svg' || vnode.tag === 'path' || vnode.tag === 'rect';
  const el = isSvg
    ? document.createElementNS('http://www.w3.org/2000/svg', vnode.tag)
    : document.createElement(vnode.tag);

  applyProps(el, diffProps({}, vnode.props));
  for (const child of vnode.children) el.appendChild(createEl(child));
  return el;
}

/**
 * Apply a computed prop diff to a live element.
 * @param {Element} el
 * @param {{ set: Record<string, unknown>, removed: string[] }} propDiff
 */
function applyProps(el, propDiff) {
  for (const [name, value] of Object.entries(propDiff.set)) {
    if (name === 'key') continue;
    if (name === 'innerHTML') {
      el.innerHTML = String(value);
      continue;
    }
    if (name.startsWith('on') && typeof value === 'function') {
      el[name] = value; // event handlers assigned as properties (no listener leak on diff)
      continue;
    }
    if (name === 'value' || name === 'checked' || name === 'disabled') {
      el[name] = value;
      if (name === 'value' && value == null) el.removeAttribute('value');
      continue;
    }
    if (value === true) el.setAttribute(name, '');
    else if (value === false || value == null) el.removeAttribute(name);
    else el.setAttribute(name, String(value));
  }
  for (const name of propDiff.removed) {
    if (name === 'key') continue;
    if (name.startsWith('on')) el[name] = null;
    else el.removeAttribute(name);
  }
}

/**
 * Patch a live DOM node in place from old vnode to new vnode.
 * @param {Node} dom the node rendered from `oldVNode`
 * @param {import('./core.js').VNode | null} oldVNode
 * @param {import('./core.js').VNode} newVNode
 * @returns {Node} the (possibly replaced) live node
 */
export function patchEl(dom, oldVNode, newVNode) {
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
    if (oldVNode.html !== newVNode.html) {
      const fresh = createEl(newVNode);
      dom.parentNode?.replaceChild(fresh, dom);
      return fresh;
    }
    return dom;
  }

  const el = /** @type {Element} */ (dom);
  applyProps(el, diffProps(oldVNode.props, newVNode.props));
  patchChildren(el, oldVNode.children, newVNode.children);
  return el;
}

/**
 * Execute a children diff plan against a live parent, minimizing DOM ops:
 * matched nodes are patched in place, inserts and removes are executed
 * against the live child list.
 * @param {Element} parent
 * @param {import('./core.js').VElement['children']} oldChildren
 * @param {import('./core.js').VElement['children']} newChildren
 */
export function patchChildren(parent, oldChildren, newChildren) {
  const ops = diffChildren(oldChildren, newChildren);
  const liveOld = Array.from(parent.childNodes);

  // Pass 1: removes first so live indices settle before inserts.
  for (const op of ops) {
    if (op.op === 'remove') liveOld[op.from]?.remove();
  }
  // Pass 2: patch matched pairs and compute a reuse map new-index -> live node.
  const liveFor = new Array(newChildren.length).fill(null);
  for (const op of ops) {
    if (op.op === 'update') liveFor[op.index] = patchEl(liveOld[op.from], oldChildren[op.from], newChildren[op.index]);
  }
  // Pass 3: inserts, positioned by anchoring to whatever follows live.
  for (const op of ops) {
    if (op.op !== 'insert') continue;
    const node = createEl(newChildren[op.index]);
    let anchor = null;
    for (let i = op.index + 1; i < liveFor.length; i++) {
      if (liveFor[i]) { anchor = liveFor[i]; break; }
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
 * @param {HTMLElement} container
 */
export function ownContainer(container) {
  for (const node of Array.from(container.childNodes)) {
    if ((node.nodeType === Node.TEXT_NODE && !node.textContent.trim()) || node.nodeType === Node.COMMENT_NODE) {
      node.remove();
    }
  }
}

/**
 * Mount/patch a vnode into a container. The classic stateful render loop:
 * first call mounts, later calls patch.
 * @param {HTMLElement} container
 * @param {{ current: import('./core.js').VNode | null }} state a mutable box holding the last vnode
 * @param {import('./core.js').VNode} vnode
 */
export function render(container, state, vnode) {
  if (state.current == null) {
    container.replaceChildren(createEl(vnode));
  } else {
    patchEl(container.firstChild, state.current, vnode);
  }
  state.current = vnode;
}

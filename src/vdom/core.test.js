import { describe, expect, it } from 'vitest';
import { h, diffChildren, diffProps, sameKind } from './core.js';

describe('h()', () => {
  it('builds element vnodes, dropping holes', () => {
    const v = h('ul', { key: 'list' }, [h('li', { key: 1 }, ['a']), null, false, 'tail']);
    expect(v.type).toBe('element');
    expect(v.tag).toBe('ul');
    expect(v.key).toBe('list');
    expect(v.children).toHaveLength(2);
    expect(v.children[1].type).toBe('text');
    expect(v.children[1].text).toBe('tail');
  });

  it('coerces primitive children to text nodes', () => {
    const v = h('div', {}, [42, undefined, 'x']);
    expect(v.children.map((c) => (c.type === 'text' ? c.text : null))).toEqual(['42', 'x']);
  });
});

describe('sameKind', () => {
  it('matches same-tag elements and rejects tag changes', () => {
    expect(sameKind(h('div'), h('div'))).toBe(true);
    expect(sameKind(h('div'), h('span'))).toBe(false);
    expect(sameKind({ type: 'text', text: 'a' }, { type: 'text', text: 'b' })).toBe(true);
    expect(sameKind(null, h('div'))).toBe(false);
  });
});

describe('diffProps', () => {
  it('reports sets, changes, and removals', () => {
    const d = diffProps({ class: 'a', id: 'x', title: 't' }, { class: 'b', id: 'x' });
    expect(d.set).toEqual({ class: 'b' });
    expect(d.removed).toEqual(['title']);
  });
});

describe('diffChildren (keyed)', () => {
  const keys = (ops) => ops.filter((o) => o.key != null).map((o) => `${o.op}:${o.key}`);

  it('append: one insert, everything else reused', () => {
    const oldC = [h('li', { key: 'a' }), h('li', { key: 'b' })];
    const newC = [h('li', { key: 'a' }), h('li', { key: 'b' }), h('li', { key: 'c' })];
    const ops = diffChildren(oldC, newC);
    expect(ops.filter((o) => o.op === 'update')).toHaveLength(2);
    expect(ops.filter((o) => o.op === 'insert')).toHaveLength(1);
    expect(ops.filter((o) => o.op === 'remove')).toHaveLength(0);
  });

  it('remove-from-middle: keyed siblings untouched, one remove', () => {
    const oldC = [h('li', { key: 'a' }), h('li', { key: 'b' }), h('li', { key: 'c' })];
    const newC = [h('li', { key: 'a' }), h('li', { key: 'c' })];
    const ops = diffChildren(oldC, newC);
    expect(keys(ops)).toEqual(['update:a', 'update:c', 'remove:b']);
  });

  it('prepend: first child inserts, keyed rest reuse (no cascade)', () => {
    const oldC = [h('li', { key: 'a' }), h('li', { key: 'b' }), h('li', { key: 'c' })];
    const newC = [h('li', { key: 'z' }), ...oldC];
    const ops = diffChildren(oldC, newC);
    expect(ops.filter((o) => o.op === 'update')).toHaveLength(3);
    expect(ops.filter((o) => o.op === 'insert')).toHaveLength(1);
    expect(ops.filter((o) => o.op === 'remove')).toHaveLength(0);
  });

  it('reverse keyed list: only moves, zero inserts/removes', () => {
    const oldC = [h('li', { key: 'a' }), h('li', { key: 'b' }), h('li', { key: 'c' })];
    const ops = diffChildren(oldC, [...oldC].reverse());
    expect(ops.filter((o) => o.op === 'move')).toHaveLength(2); // c and b move; a stays put
    expect(ops.filter((o) => o.op === 'update')).toHaveLength(1); // a patches in place
    expect(ops.filter((o) => o.op === 'insert')).toHaveLength(0);
    expect(ops.filter((o) => o.op === 'remove')).toHaveLength(0);
  });

  it('unkeyed text children patch by position', () => {
    const oldC = [{ type: 'text', text: 'hello' }, { type: 'text', text: 'world' }];
    const newC = [{ type: 'text', text: 'hello' }, { type: 'text', text: 'sugar' }];
    const ops = diffChildren(oldC, newC);
    expect(ops.filter((o) => o.op === 'update')).toHaveLength(2);
    expect(ops.filter((o) => o.op !== 'update')).toHaveLength(0);
  });
});

describe('benchmark: op counts stay minimal at chat scale', () => {
  const message = (i) => h('div', { key: `msg-${i}`, class: 'message' }, [
    h('div', { class: 'avatar' }, ['U']),
    h('div', { class: 'content' }, [h('div', { class: 'name' }, [`You ${i}`]), h('div', { class: 'bubble' }, [`text ${i}`])]),
  ]);

  it('appending one message to a 100-message list costs exactly one insert', () => {
    const oldC = Array.from({ length: 100 }, (_, i) => message(i));
    const newC = [...oldC, message(100)];
    const ops = diffChildren(oldC, newC);
    const inserts = ops.filter((o) => o.op === 'insert');
    expect(inserts).toHaveLength(1);
    // and the 100 existing children are pure in-place updates (prop/text checks), zero DOM churn
    expect(ops.filter((o) => o.op === 'remove')).toHaveLength(0);
  });

  it('regenerate (replace last) touches one child plus zero moves', () => {
    const oldC = Array.from({ length: 50 }, (_, i) => message(i));
    const newC = [...oldC.slice(0, 49), message(999)];
    const ops = diffChildren(oldC, newC);
    expect(ops.filter((o) => o.op === 'remove')).toHaveLength(0);
    expect(ops.filter((o) => o.op === 'insert')).toHaveLength(0);
    expect(ops.filter((o) => o.op === 'update')).toHaveLength(50); // 49 keyed reuse + 1 in-place same-tag
  });

  it('full replace of N messages: O(N) ops, no quadratic blowup', () => {
    const oldC = Array.from({ length: 200 }, (_, i) => message(i));
    const newC = Array.from({ length: 200 }, (_, i) => message(i + 1000));
    const ops = diffChildren(oldC, newC);
    expect(ops.length).toBeLessThanOrEqual(2 * 200 + 200); // updates + removes bounded by linear
  });
});

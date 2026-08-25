import { describe, expect, it, beforeEach } from 'vitest';
import { createChatStore, type ChatStore, type ChatStorage } from './chat-store';
import { deriveTitle, garnishFor } from './titles';
import type { StoredMessage } from './chat-store';

/** Narrow a stored message list to the {text} shape title derivation reads. */
const texts = (msgs: StoredMessage[]): { text: string }[] => msgs;

/** Map-backed storage adapter standing in for localStorage (no browser needed). */
function memStorage(): ChatStorage & { _map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) ?? null : null),
    setItem: (k, v) => {
      map.set(k, v);
    },
    _map: map,
  };
}

/** Fake clock: each call advances by 1, giving deterministic recency order. */
let tick = 0;
const clock = () => ++tick;

let store: ChatStore;
let storage: ChatStorage & { _map: Map<string, string> };
beforeEach(() => {
  tick = 0;
  storage = memStorage();
  store = createChatStore(storage, clock);
});

describe('threshold (R1, AE1)', () => {
  it('stores nothing below 3 messages', () => {
    store.recordMessage('p:a', 'user', 'hello');
    store.recordMessage('p:a', 'ai', 'hey sugar');
    expect(store.listChats()).toEqual([]);
    expect(storage.getItem('bravochat.savedChats')).toBeNull();
  });

  it('persists on the 3rd message and updates the same entry on the 4th', () => {
    store.recordMessage('p:a', 'user', 'tell me about your hair');
    store.recordMessage('p:a', 'ai', 'My HAIR?!');
    store.recordMessage('p:a', 'user', 'yes your hair');
    expect(store.listChats()).toHaveLength(1);
    store.recordMessage('p:a', 'ai', 'Forty-seven minutes, sugar');
    expect(store.listChats()).toHaveLength(1);
    expect(store.getChat('p:a')?.messages).toHaveLength(4);
  });
});

describe('titles (R5–R7)', () => {
  it('derives a deterministic dominant-category title', () => {
    const msgs = [
      { text: 'how do I fix my hair', sender: 'user' as const },
      { text: 'Forty-seven minutes', sender: 'ai' as const },
      { text: 'what about hairspray', sender: 'user' as const },
    ];
    expect(deriveTitle(texts(msgs))).toBe('Hair care tips');
    expect(deriveTitle(texts(msgs))).toBe(deriveTitle(texts(msgs))); // deterministic
  });

  it('hair dominance beats a single date mention', () => {
    const msgs = [
      { text: 'hair question', sender: 'user' as const },
      { text: 'answer', sender: 'ai' as const },
      { text: 'another hair thing', sender: 'user' as const },
      { text: 'one dating mention', sender: 'user' as const },
    ];
    expect(deriveTitle(texts(msgs))).toBe('Hair care tips');
  });

  it('ties break by first-seen category deterministically', () => {
    const msgs = [
      { text: 'gym day', sender: 'user' as const },
      { text: 'x', sender: 'ai' as const },
      { text: 'hair day', sender: 'user' as const },
    ];
    expect(deriveTitle(texts(msgs))).toBe('Workout talk');
  });

  it('falls back to a capitalized extracted mention', () => {
    expect(deriveTitle([{ text: 'Tell me about the quantum toaster' }])).toBe('Toaster');
  });

  it('falls back to "Chat with Johnny" when nothing notable', () => {
    expect(deriveTitle([{ text: 'the and you what' }])).toBe('Chat with Johnny');
  });

  it('garnish comes from the matched category', () => {
    expect(garnishFor([{ text: 'workout routine' }])).toBe('100% bicep-related');
    expect(garnishFor([{ text: 'zzz nothing' }])).toContain('Johnny');
  });

  it('title assigned once and never changes on later drift (R7)', () => {
    store.recordMessage('p:a', 'user', 'hair hair');
    store.recordMessage('p:a', 'ai', 'ok');
    store.recordMessage('p:a', 'user', 'hair');
    expect(store.getChat('p:a')?.title).toBe('Hair care tips');
    store.recordMessage('p:a', 'user', 'muscles muscles gym');
    store.recordMessage('p:a', 'user', 'gym again');
    expect(store.getChat('p:a')?.title).toBe('Hair care tips'); // unchanged
  });
});

describe('cap and eviction (R4, AE4, AE5)', () => {
  it('evicts the oldest when an 11th chat qualifies', () => {
    for (let i = 0; i < 11; i++) {
      const id = `p:${i}`;
      for (let m = 0; m < 3; m++) store.recordMessage(id, m % 2 ? 'ai' : 'user', `msg ${i}-${m}`);
    }
    const ids = store.listChats().map((c) => c.id);
    expect(ids).toHaveLength(10);
    expect(ids).not.toContain('p:0'); // oldest evicted
    expect(ids).toContain('p:10');
  });

  it('touch refreshes eviction recency (AE5)', () => {
    for (let i = 0; i < 10; i++) {
      for (let m = 0; m < 3; m++) store.recordMessage(`p:${i}`, m % 2 ? 'ai' : 'user', `m${m}`);
    }
    store.touch('p:0'); // the oldest gets continued
    store.recordMessage('p:new', 'user', 'a');
    store.recordMessage('p:new', 'ai', 'b');
    store.recordMessage('p:new', 'user', 'c');
    const ids = store.listChats().map((c) => c.id);
    expect(ids).not.toContain('p:1'); // p:1 is now the oldest
    expect(ids).toContain('p:0'); // touched chat survived
  });
});

describe('persistence', () => {
  it('survives storage round-trip (reload simulation, R2/AE2)', () => {
    store.recordMessage('p:a', 'user', 'hair question one');
    store.recordMessage('p:a', 'ai', 'answer');
    store.recordMessage('p:a', 'user', 'hair question two');
    const raw = storage.getItem('bravochat.savedChats');
    const store2 = createChatStore(memStorageWithValue(raw), clock);
    const loaded = store2.getChat('p:a');
    expect(loaded?.messages).toHaveLength(3);
    expect(loaded?.title).toBe('Hair care tips');
  });

  it('degrades to empty on corrupt storage', () => {
    const s = memStorageWithValue('{{{not json');
    expect(createChatStore(s, clock).listChats()).toEqual([]);
  });
});

function memStorageWithValue(raw: string | null): ChatStorage {
  const s = memStorage();
  if (raw != null) s.setItem('bravochat.savedChats', raw);
  return s;
}

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { responses } from './responses.js';

// Recapture a fresh module per test so singleton state never leaks (KTD5 +
// module-singleton engine; vi.resetModules with dynamic imports).
async function freshEngine() {
  vi.resetModules();
  return import('./engine.js');
}

function collector() {
  const events = [];
  return { events, listener: (e) => events.push(e) };
}

beforeEach(() => {
  vi.useFakeTimers();
});

describe('send', () => {
  it('emits typing-started immediately and response-ready after the delay', async () => {
    const engine = await freshEngine();
    const { events, listener } = collector();
    engine.subscribe(listener);

    engine.send('tell me a joke');
    expect(events.map((e) => e.type)).toEqual(['typing-started']);
    expect(engine.getIsResponding()).toBe(true);

    // Randomized delay 1000–2500ms: advancing past the max must fire exactly once.
    vi.advanceTimersByTime(2500);
    const ready = events.find((e) => e.type === 'response-ready');
    expect(ready).toBeDefined();
    expect(typeof ready.text).toBe('string');
    expect(ready.text.length).toBeGreaterThan(0);
    expect(ready.regenerable).toBe(true);
    expect(engine.getIsResponding()).toBe(false);
  });

  it('returns a response drawn from the response pools', async () => {
    const engine = await freshEngine();
    const { events, listener } = collector();
    engine.subscribe(listener);
    engine.send('hello');
    vi.advanceTimersByTime(2500);
    const ready = events.find((e) => e.type === 'response-ready');
    const allPools = Object.values(responses).flat();
    expect(allPools.some((line) => ready.text.includes(line))).toBe(true);
  });

  it('is a no-op with empty text', async () => {
    const engine = await freshEngine();
    const { events, listener } = collector();
    engine.subscribe(listener);
    engine.send('   ');
    expect(events).toEqual([]);
    expect(engine.getIsResponding()).toBe(false);
  });

  it('is a no-op while a response is pending', async () => {
    const engine = await freshEngine();
    const { events, listener } = collector();
    engine.subscribe(listener);
    engine.send('first');
    engine.send('second');
    expect(events.filter((e) => e.type === 'typing-started')).toHaveLength(1);
  });
});

describe('session race guard', () => {
  it('drops a pending send response after loadHistory (AE1)', async () => {
    const engine = await freshEngine();
    const { events, listener } = collector();
    engine.subscribe(listener);

    engine.send('tell me about your mama');
    engine.loadHistory('hairgel');
    vi.advanceTimersByTime(2500);

    expect(events.filter((e) => e.type === 'response-ready')).toHaveLength(0);
    expect(events).toContainEqual(expect.objectContaining({ type: 'history-loaded' }));
  });

  it('drops a pending send response after startNewChat', async () => {
    const engine = await freshEngine();
    const { events, listener } = collector();
    engine.subscribe(listener);

    engine.send('hello');
    engine.startNewChat();
    vi.advanceTimersByTime(2500);

    expect(events.filter((e) => e.type === 'response-ready')).toHaveLength(0);
    expect(events.some((e) => e.type === 'chat-reset')).toBe(true);
    expect(engine.getIsResponding()).toBe(false);
  });

  it('emits session-invalidated on both history load and new chat', async () => {
    const engine = await freshEngine();
    const { events, listener } = collector();
    engine.subscribe(listener);
    engine.startNewChat();
    engine.loadHistory('hairgel');
    expect(events.filter((e) => e.type === 'session-invalidated')).toHaveLength(2);
  });
});

describe('regenerate', () => {
  it('is a no-op while a response is pending (AE2 precondition)', async () => {
    const engine = await freshEngine();
    const { events, listener } = collector();
    engine.subscribe(listener);
    engine.send('hello');
    engine.regenerate();
    expect(events.filter((e) => e.type === 'typing-started')).toHaveLength(1);
  });

  it('is a no-op with no last user message', async () => {
    const engine = await freshEngine();
    const { events, listener } = collector();
    engine.subscribe(listener);
    engine.regenerate();
    expect(events).toEqual([]);
  });

  it('emits a new response-ready within the 800–1600ms range', async () => {
    const engine = await freshEngine();
    const { events, listener } = collector();
    engine.subscribe(listener);

    engine.send('what is your workout routine');
    vi.advanceTimersByTime(2500); // original response lands
    events.length = 0;

    engine.regenerate();
    expect(events.filter((e) => e.type === 'typing-started')).toHaveLength(1);
    vi.advanceTimersByTime(799);
    expect(events.filter((e) => e.type === 'response-ready')).toHaveLength(0);
    vi.advanceTimersByTime(801); // past the 1600ms max
    expect(events.filter((e) => e.type === 'response-ready')).toHaveLength(1);
  });
});

describe('startNewChat', () => {
  it('clears currentChatId, conversation memory, and last-user-message', async () => {
    const engine = await freshEngine();
    const { events, listener } = collector();
    engine.subscribe(listener);

    engine.send('hello there sugar');
    vi.advanceTimersByTime(2500);
    engine.loadHistory('hairgel');
    expect(engine.getCurrentChatId()).toBe('hairgel');

    engine.startNewChat();
    expect(engine.getCurrentChatId()).toBeNull();
    expect(engine.getIsResponding()).toBe(false);

    // lastUserText cleared: regenerate after new chat is a no-op
    events.length = 0;
    engine.regenerate();
    expect(events).toEqual([]);
  });
});

describe('loadHistory', () => {
  it('emits history-loaded with the conversation and sets the chat id', async () => {
    const engine = await freshEngine();
    const { events, listener } = collector();
    engine.subscribe(listener);
    engine.loadHistory('hairgel');
    const loaded = events.find((e) => e.type === 'history-loaded');
    expect(loaded).toBeDefined();
    expect(Array.isArray(loaded.conversation)).toBe(true);
    expect(loaded.historyId).toBe('hairgel');
    expect(engine.getCurrentChatId()).toBe('hairgel');
  });

  it('is a no-op with an unknown id', async () => {
    const engine = await freshEngine();
    const { events, listener } = collector();
    engine.subscribe(listener);
    engine.loadHistory('does-not-exist');
    expect(events).toEqual([]);
    expect(engine.getCurrentChatId()).toBeNull();
  });

  it('is a no-op when that history is already active (id-equality guard)', async () => {
    const engine = await freshEngine();
    const { events, listener } = collector();
    engine.subscribe(listener);
    engine.loadHistory('hairgel');
    events.length = 0;
    engine.loadHistory('hairgel');
    expect(events).toEqual([]);
  });

  it('clears currentChatId when sending from a loaded history (live-chat transition)', async () => {
    const engine = await freshEngine();
    engine.loadHistory('hairgel');
    expect(engine.getCurrentChatId()).toBe('hairgel');
    engine.send('hello');
    expect(engine.getCurrentChatId()).toBeNull();
  });

  it('reloads a history after startNewChat cleared the id (old welcomeShown path)', async () => {
    const engine = await freshEngine();
    const { events, listener } = collector();
    engine.subscribe(listener);
    engine.loadHistory('hairgel');
    engine.startNewChat();
    events.length = 0;
    engine.loadHistory('hairgel'); // re-clicking the just-abandoned history
    expect(events.some((e) => e.type === 'history-loaded')).toBe(true);
  });
});

describe('subscriptions', () => {
  it('unsubscribe stops delivery', async () => {
    const engine = await freshEngine();
    const { events, listener } = collector();
    const unsub = engine.subscribe(listener);
    unsub();
    engine.startNewChat();
    expect(events).toEqual([]);
  });
});

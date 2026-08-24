import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { getResponse, responses, typingPhrases } from './responses.js';
import { chatHistories } from './histories.js';
import { johnnySVG } from '../assets/avatar.js';

// The sidebar history ids in index.html are the contract's other side.
const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const sidebarIds = [...new Set([...html.matchAll(/data-id="([^"]+)"/g)].map((m) => m[1]))];

// assert the drawn response is a member of the given pool

describe('getResponse routing', () => {
  it('routes short greetings to the hello pool', () => {
    expect(responses.hello).toContain(getResponse('hello'));
    expect(responses.hello).toContain(getResponse('hey there, sugar'));
  });

  it('does not route long greetings to the hello pool (length guard)', () => {
    const longHello = 'hello, I was wondering if you could help me understand something today';
    expect(longHello.length).toBeGreaterThanOrEqual(20);
    expect(responses.hello).not.toContain(getResponse(longHello));
  });

  it('routes dating keywords to the date pool', () => {
    expect(responses.date).toContain(getResponse('want to go on a date?'));
  });

  it('routes mama keywords to the mama pool', () => {
    expect(responses.mama).toContain(getResponse('tell me about your mama'));
  });

  it('routes workout keywords to the muscle pool', () => {
    expect(responses.muscle).toContain(getResponse('what\'s your workout routine?'));
  });

  it('routes hair keywords to the hair pool', () => {
    expect(responses.hair).toContain(getResponse('how do you get your hair like that?'));
  });

  it('falls back to the default pool for unmatched input', () => {
    expect(responses.default).toContain(getResponse('quantum chromodynamics'));
  });
});

describe('response pools', () => {
  it('has non-empty arrays for every category', () => {
    for (const [key, pool] of Object.entries(responses)) {
      expect(pool.length, `pool "${key}"`).toBeGreaterThan(0);
      for (const line of pool) expect(typeof line).toBe('string');
    }
  });

  it('exposes a non-empty typing phrase list', () => {
    expect(typingPhrases.length).toBeGreaterThan(0);
  });
});

describe('chat histories', () => {
  it('has a non-empty conversation for each sidebar history id', () => {
    expect(Object.keys(chatHistories).sort()).toEqual([...sidebarIds].sort());
    for (const id of sidebarIds) {
      expect(chatHistories[id].length, `history "${id}"`).toBeGreaterThan(0);
      for (const msg of chatHistories[id]) {
        expect(['user', 'ai']).toContain(msg.sender);
        expect(typeof msg.text).toBe('string');
      }
    }
  });
});

describe('avatar', () => {
  it('exports the Johnny Bravo SVG markup', () => {
    expect(johnnySVG).toContain('<svg viewBox="0 0 100 120"');
    expect(johnnySVG).toContain('</svg>');
  });
});

describe('state', () => {
  it('starts the session token at 0 and increments it', async () => {
    const mod = await import('./state.js');
    expect(mod.currentSessionToken()).toBe(0);
    mod.incrementSessionToken();
    expect(mod.currentSessionToken()).toBe(1);
    expect(mod.getWelcomeShown()).toBe(true);
    expect(mod.getCurrentChatId()).toBeNull();
  });
});

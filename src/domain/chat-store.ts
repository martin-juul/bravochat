/**
 * @file Chat persistence store: threshold, deterministic titles, cap/eviction,
 * and an injectable storage seam (DOM-free per the module boundary rule).
 */

import { deriveTitle, garnishFor } from './titles';
import type { ConversationMemory } from './responses';

/** One stored message in a persisted chat. */
export interface StoredMessage {
  text: string;
  sender: 'user' | 'ai';
}

/** A persisted chat record. */
export interface StoredChat {
  /** unique, `p:`-prefixed */
  id: string;
  /** visible label and hover garnish (assigned once) */
  title: string;
  garnish: string;
  messages: StoredMessage[];
  /** recency marker for eviction ordering */
  updatedAt: number;
  /** response-engine no-repeat snapshot */
  memory?: ConversationMemory;
}

/** Storage seam (localStorage in the browser, a Map in tests). */
export interface ChatStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface ChatStore {
  recordMessage(id: string, sender: 'user' | 'ai', text: string, memory?: ConversationMemory): void;
  touch(id: string): void;
  listChats(): StoredChat[];
  getChat(id: string): StoredChat | undefined;
  saveChat(id: string, chat: StoredChat): void;
  nextId(): string;
}

const THRESHOLD = 3; // messages before persisting
const CAP = 10; // max stored chats; oldest evicted
const STORAGE_KEY = 'bravochat.savedChats';

/** Create a chat store over a storage backend (`now` injectable for tests). */
export function createChatStore(storage: ChatStorage, now: () => number = () => Date.now()): ChatStore {
  let chats: StoredChat[] = read();

  /** below-threshold buffers per chat id */
  const pendingMessages = new Map<string, StoredMessage[]>();

  /** Minimal shape guard: valid JSON of the wrong form degrades to empty. */
  function isStoredChat(value: unknown): value is StoredChat {
    return (
      typeof value === 'object' && value !== null &&
      typeof (value as { id?: unknown }).id === 'string' &&
      Array.isArray((value as { messages?: unknown }).messages)
    );
  }

  function read(): StoredChat[] {
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(isStoredChat) : [];
    } catch {
      return []; // corrupt storage degrades to empty, never crashes the app
    }
  }

  function write(): void {
    storage.setItem(STORAGE_KEY, JSON.stringify(chats));
  }

  /** Record a message against a chat, persisting once the threshold clears. */
  function recordMessage(id: string, sender: 'user' | 'ai', text: string, memory?: ConversationMemory): void {
    // Messages accumulate in a pending buffer; the message that brings
    // the total to THRESHOLD flushes the whole buffer into storage.
    const stored = chats.find((c) => c.id === id);
    const pending = pendingMessages.get(id) ?? [];
    const total = (stored?.messages.length ?? 0) + pending.length;
    if (total + 1 < THRESHOLD) {
      pending.push({ text, sender });
      pendingMessages.set(id, pending);
      return; // below threshold, never stored
    }
    const all = [...(stored?.messages ?? []), ...pending, { text, sender }];
    pendingMessages.delete(id);

    let chat = stored;
    if (!chat) {
      chat = { id, title: '', garnish: '', messages: all, updatedAt: now() };
      chats.push(chat);
    } else {
      chat.messages = all;
    }
    if (memory) chat.memory = memory;
    chat.updatedAt = now();

    if (!chat.title) {
      // Titles derive from user messages only: Johnny's AI lines are saturated
      // with routing keywords and would otherwise dominate the label.
      const userMessages = chat.messages.filter((m) => m.sender === 'user');
      chat.title = deriveTitle(userMessages); // title assigned once
      chat.garnish = garnishFor(userMessages);
    }
    evict();
    write();
  }

  /** Cap enforcement: drop oldest-updated beyond CAP. */
  function evict(): void {
    if (chats.length <= CAP) return;
    const ordered = [...chats].sort((a, b) => a.updatedAt - b.updatedAt);
    const drop = new Set(ordered.slice(0, ordered.length - CAP).map((c) => c.id));
    chats = chats.filter((c) => !drop.has(c.id));
  }

  /** Touch recency so continued use refreshes eviction order. */
  function touch(id: string): void {
    const chat = chats.find((c) => c.id === id);
    if (chat) {
      chat.updatedAt = now();
      evict();
      write();
    }
  }

  /** newest-first for sidebar rendering */
  function listChats(): StoredChat[] {
    return [...chats].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  function getChat(id: string): StoredChat | undefined {
    return chats.find((c) => c.id === id);
  }

  /** Replace a chat wholesale (resume path). */
  function saveChat(id: string, chat: StoredChat): void {
    const i = chats.findIndex((c) => c.id === id);
    if (i >= 0) chats[i] = { ...chat, id, updatedAt: now() };
    else chats.push({ ...chat, id, updatedAt: now() });
    evict();
    write();
  }

  /** Fresh persisted-chat id (`p:` namespace distinguishes real from fake data-ids). */
  function nextId(): string {
    return `p:${now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  }

  return { recordMessage, touch, listChats, getChat, saveChat, nextId };
}

export const CHAT_STORAGE_KEY = STORAGE_KEY;

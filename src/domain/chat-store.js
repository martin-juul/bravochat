/**
 * @file Chat persistence store: threshold, deterministic titles, cap/eviction,
 * and an injectable storage seam (localStorage in the browser via the adapter
 * in ui/, a plain map in tests). DOM-free per the module boundary rule.
 */

import { deriveTitle, garnishFor } from './titles.js';

/** A persisted chat record. */
/**
 * @typedef {Object} StoredChat
 * @property {string} id unique, `p:`-prefixed
 * @property {string} title plain visible label (assigned once)
 * @property {string} garnish hover-text garnish (assigned once)
 * @property {{ text: string, sender: 'user' | 'ai' }[]} messages full conversation
 * @property {number} updatedAt recency marker for eviction ordering
 * @property {object} [memory] response-engine no-repeat snapshot (set by the UI layer on save)
 */

const THRESHOLD = 3; // messages (user + AI combined) before persisting (R1)
const CAP = 10; // max stored chats; oldest evicted (R4)
const STORAGE_KEY = 'bravochat.savedChats';

/**
 * Create a chat store over a storage backend.
 * The seam is synchronous get/set-by-key, so tests pass a Map-backed adapter.
 * @param {{ getItem(key: string): string | null, setItem(key: string, value: string): void }} storage
 * @param {() => number} [now] clock injection for deterministic eviction tests
 */
export function createChatStore(storage, now = () => Date.now()) {
  /** @type {StoredChat[]} */
  let chats = read();

  /** @type {Map<string, {text: string, sender: string}[]>} below-threshold buffers per chat id */
  const pendingMessages = new Map();

  function read() {
    try {
      const raw = storage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return []; // corrupt storage degrades to empty, never crashes the app
    }
  }

  function write() {
    storage.setItem(STORAGE_KEY, JSON.stringify(chats));
  }

  /**
   * Record a message against a chat, persisting once the threshold clears.
   * No-ops below THRESHOLD messages total (R1). Updates recency (R9).
   * @param {string} id the live chat's persisted id (created by the caller via nextId)
   * @param {'user' | 'ai'} sender
   * @param {string} text
   * @param {object} [memory] response-engine snapshot to store with the latest message
   */
  function recordMessage(id, sender, text, memory) {
    // R1: messages accumulate in a pending buffer; the message that brings
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
      chat.title = deriveTitle(chat.messages); // assigned once (R7)
      chat.garnish = garnishFor(chat.messages);
    }
    evict();
    write();
  }

  /** Cap enforcement (R4): drop oldest-updated beyond CAP. */
  function evict() {
    if (chats.length <= CAP) return;
    const ordered = [...chats].sort((a, b) => a.updatedAt - b.updatedAt);
    const drop = new Set(ordered.slice(0, ordered.length - CAP).map((c) => c.id));
    chats = chats.filter((c) => !drop.has(c.id));
  }

  /**
   * Touch recency for a resumed chat so continued use refreshes eviction order (AE5).
   * @param {string} id
   */
  function touch(id) {
    const chat = chats.find((c) => c.id === id);
    if (chat) {
      chat.updatedAt = now();
      evict();
      write();
    }
  }

  /** @returns {StoredChat[]} newest-first for sidebar rendering (R3) */
  function listChats() {
    return [...chats].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /** @param {string} id @returns {StoredChat | undefined} */
  function getChat(id) {
    return chats.find((c) => c.id === id);
  }

  /**
   * Replace a chat wholesale (resume path: engine replays state, UI saves snapshot).
   * @param {string} id @param {StoredChat} chat
   */
  function saveChat(id, chat) {
    const i = chats.findIndex((c) => c.id === id);
    if (i >= 0) chats[i] = { ...chat, id, updatedAt: now() };
    else chats.push({ ...chat, id, updatedAt: now() });
    evict();
    write();
  }

  /** Fresh persisted-chat id (namespace distinguishes real from fake data-ids). */
  function nextId() {
    return `p:${now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  }

  return { recordMessage, touch, listChats, getChat, saveChat, nextId };
}

/** The storage key this store persists under (exported for adapter/tests). */
export const CHAT_STORAGE_KEY = STORAGE_KEY;

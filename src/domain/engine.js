/**
 * @file Conversation engine: DOM-free orchestration of chat behavior.
 * Owns the session-token race guard, response scheduling, responding state,
 * last-user-message memory, and chat switching. The `ui/` layer subscribes
 * to engine events and performs all rendering in reaction to them.
 */

import { composeResponse, resetConversation } from './responses.js';
import { chatHistories } from './histories.js';

// ============ MODULE STATE ============

/** @type {number} increments on every chat switch; pending responses compare before firing */
let sessionToken = 0;
/** @type {boolean} whether a mock AI response is currently pending */
let isResponding = false;
/** @type {string | null} key into `chatHistories`, or null for a live chat */
let currentChatId = null;
/** @type {string} text of the most recent user message, for regeneration */
let lastUserText = '';

// ============ SUBSCRIPTIONS (KTD1) ============

/** @type {Set<(event: object) => void>} */
const listeners = new Set();

/**
 * Register an engine-event listener.
 * @param {(event: { type: string, [key: string]: unknown }) => void} listener
 * @returns {() => void} unsubscribe function
 */
export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Emit an engine event to all subscribers.
 * @param {{ type: string, [key: string]: unknown }} event
 */
function emit(event) {
  for (const listener of listeners) listener(event);
}

// ============ GETTERS ============

/** @returns {boolean} whether a mock AI response is currently pending */
export const getIsResponding = () => isResponding;

/** @returns {string | null} the active chat-history key, or null for a live chat */
export const getCurrentChatId = () => currentChatId;

/** @returns {string} the most recent user message text ("" before any send) */
export const getLastUserText = () => lastUserText;

// ============ INTERNALS ============

/** Invalidate all in-flight responses that captured an older token. */
function invalidateSession() {
  sessionToken++;
  emit({ type: 'session-invalidated' });
}

/**
 * Schedule a response for the given user text after a randomized delay,
 * guarded by the session token captured at schedule time (R1, R2, KTD5).
 * @param {string} text
 * @param {number} minMs
 * @param {number} maxMs
 */
function scheduleResponse(text, minMs, maxMs) {
  const capturedToken = sessionToken;
  const delay = minMs + Math.random() * (maxMs - minMs);

  setTimeout(() => {
    if (capturedToken !== sessionToken) return; // session changed — drop silently

    isResponding = false;
    const response = composeResponse(text);
    emit({ type: 'response-ready', text: response, regenerable: true });
  }, delay);
}

// ============ COMMANDS ============

/**
 * Send the current user message and schedule the mock AI reply.
 * No-op when the text is empty or a response is already pending.
 * @param {string} text
 */
export function send(text) {
  const trimmed = typeof text === 'string' ? text.trim() : '';
  if (!trimmed || isResponding) return;

  if (currentChatId !== null) currentChatId = null; // live chat now

  lastUserText = trimmed;
  isResponding = true;
  emit({ type: 'typing-started' });

  scheduleResponse(text, 1000, 2500);
}

/**
 * Regenerate the last AI response: re-answer the last user message.
 * No-op when a response is pending or there is nothing to regenerate.
 * The UI removes the old AI bubble before calling this.
 */
export function regenerate() {
  if (isResponding || !lastUserText) return;

  isResponding = true;
  emit({ type: 'typing-started' });

  scheduleResponse(lastUserText, 800, 1600);
}

/**
 * Reset to a fresh live chat: invalidate pending responses, clear conversation
 * memory and chat id, and notify the UI to render the welcome screen.
 * Behavior-equivalent to the old startNewChat: clearing currentChatId here
 * makes the old `currentChatId === id && !welcomeShown` guard reducible to
 * plain id equality in loadHistory (see loadHistory).
 */
export function startNewChat() {
  invalidateSession();
  isResponding = false;
  resetConversation();
  lastUserText = '';
  currentChatId = null;
  emit({ type: 'chat-reset' });
}

/**
 * Load a pre-baked history into the conversation, guarding against races.
 * No-op for an unknown id or when that history is already active (id-equality
 * guard; behavior-equivalent to the old combined welcomeShown guard because
 * startNewChat clears currentChatId, making the welcome-screen term redundant).
 * @param {string} historyId key into `chatHistories`
 */
export function loadHistory(historyId) {
  const conversation = chatHistories[historyId];
  if (!conversation) return;
  if (currentChatId === historyId) return; // already viewing this history

  invalidateSession();
  isResponding = false;
  resetConversation();

  currentChatId = historyId;
  emit({ type: 'history-loaded', conversation, historyId });
}

// ============ TEST SEAM ============

/** Reset all engine state to its initial values. Test-only. */
export function _resetForTests() {
  sessionToken = 0;
  isResponding = false;
  currentChatId = null;
  lastUserText = '';
}

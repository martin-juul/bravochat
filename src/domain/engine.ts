/**
 * @file Conversation engine: DOM-free orchestration of chat behavior.
 * Owns the session-token race guard, response scheduling, responding state,
 * last-user-message memory, and chat switching. The `ui/` layer subscribes
 * to engine events and performs all rendering in reaction to them.
 */

import {
  composeResponse,
  resetConversation,
  restoreConversationState,
  exportConversationState,
  type ConversationMemory,
} from './responses';
import type { HistoryMessage } from './histories';
import { chatHistories } from './histories';

// ============ SHARED TYPES ============

/** Events the engine emits to subscribers (`type` discriminates the union). */
export type EngineEvent =
  | { type: 'typing-started' }
  | { type: 'response-ready'; text: string; regenerable: boolean }
  | { type: 'session-invalidated' }
  | { type: 'chat-reset' }
  | { type: 'history-loaded'; conversation: HistoryMessage[]; historyId: string | undefined };

/** A persisted or live chat as `resumeChat` accepts it. */
export interface ResumableChat {
  id?: string;
  conversation: HistoryMessage[];
  memory?: ConversationMemory;
}

type EngineListener = (event: EngineEvent) => void;

// ============ MODULE STATE ============

/** increments on every chat switch; pending responses compare before firing */
let sessionToken = 0;
/** whether a mock AI response is currently pending */
let isResponding = false;
/** key into `chatHistories`, or null for a live chat */
let currentChatId: string | null = null;
/** text of the most recent user message, for regeneration */
let lastUserText = '';

/** whether the active chat is a resumable persisted chat */
let resumed = false;

// ============ SUBSCRIPTIONS (KTD1) ============

const listeners = new Set<EngineListener>();

/**
 * Register an engine-event listener.
 * @returns unsubscribe function
 */
export function subscribe(listener: EngineListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Emit an engine event to all subscribers. */
function emit(event: EngineEvent): void {
  for (const listener of listeners) listener(event);
}

// ============ GETTERS ============

/** whether a mock AI response is currently pending */
export const getIsResponding = (): boolean => isResponding;

/** the active chat-history key, or null for a live chat */
export const getCurrentChatId = (): string | null => currentChatId;

/** the most recent user message text ("" before any send) */
export const getLastUserText = (): string => lastUserText;

// ============ INTERNALS ============

/** Invalidate all in-flight responses that captured an older token. */
function invalidateSession(): void {
  sessionToken++;
  emit({ type: 'session-invalidated' });
}

/**
 * Schedule a response for the given user text after a randomized delay,
 * guarded by the session token captured at schedule time (R1, R2, KTD5).
 */
function scheduleResponse(text: string, minMs: number, maxMs: number): void {
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
 */
export function send(text: string): void {
  const trimmed = typeof text === 'string' ? text.trim() : '';
  if (!trimmed || isResponding) return;

  if (currentChatId !== null && !resumed) currentChatId = null; // fresh live chat; resumed chats keep their id

  lastUserText = trimmed;
  isResponding = true;
  emit({ type: 'typing-started' });

  scheduleResponse(trimmed, 1000, 2500);
}

/**
 * Regenerate the last AI response: re-answer the last user message.
 * No-op when a response is pending or there is nothing to regenerate.
 * The UI removes the old AI bubble before calling this.
 */
export function regenerate(): void {
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
export function startNewChat(): void {
  invalidateSession();
  isResponding = false;
  resetConversation();
  lastUserText = '';
  currentChatId = null;
  resumed = false;
  emit({ type: 'chat-reset' });
}

/**
 * Load a pre-baked history into the conversation, guarding against races.
 * No-op for an unknown id or when that history is already active (id-equality
 * guard; behavior-equivalent to the old combined welcomeShown guard because
 * startNewChat clears currentChatId, making the welcome-screen term redundant).
 * @param historyId key into `chatHistories`
 */
export function loadHistory(historyId: string): void {
  const conversation = chatHistories[historyId];
  if (!conversation) return;
  if (currentChatId === historyId) return; // already viewing this history

  invalidateSession();
  isResponding = false;
  resetConversation();

  currentChatId = historyId;
  resumed = false;
  emit({ type: 'history-loaded', conversation, historyId });
}

/**
 * Resume a persisted chat: load its conversation, restore the response
 * engine's no-repeat memory, and mark it continuable. Subsequent sends
 * append to this chat rather than starting fresh (R8).
 * @param chat the persisted chat to resume
 */
export function resumeChat(chat: ResumableChat): void {
  if (!chat || !Array.isArray(chat.conversation)) return;
  invalidateSession();
  isResponding = false;
  restoreConversationState(chat.memory);
  const lastUser = [...chat.conversation].reverse().find((m) => m.sender === 'user');
  lastUserText = lastUser ? lastUser.text : '';
  currentChatId = chat.id ?? null;
  resumed = true;
  emit({ type: 'history-loaded', conversation: chat.conversation, historyId: chat.id });
}

/** whether the active chat is a resumable persisted chat */
export const isResumedChat = (): boolean => resumed;

/** whether `historyId` names a pre-baked conversation */
export const hasHistory = (historyId: string): boolean => Boolean(chatHistories[historyId]);


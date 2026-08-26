/**
 * @file Conversation engine: DOM-free orchestration of chat behavior.
 * Owns the session-token race guard, response scheduling, and chat switching.
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

let sessionToken = 0; // increments on every chat switch; pending responses compare before firing
let isResponding = false;
let currentChatId: string | null = null; // key into `chatHistories`, or null for a live chat
let lastUserText = '';
let resumed = false; // whether the active chat is a resumable persisted chat

const listeners = new Set<EngineListener>();

export function subscribe(listener: EngineListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(event: EngineEvent): void {
  for (const listener of listeners) listener(event);
}

export const getIsResponding = (): boolean => isResponding;
export const getCurrentChatId = (): string | null => currentChatId;
export const getLastUserText = (): string => lastUserText;

/** Invalidate all in-flight responses that captured an older token. */
function invalidateSession(): void {
  sessionToken++;
  emit({ type: 'session-invalidated' });
}

/** Schedule a response after a randomized delay, guarded by the session token
 * captured at schedule time. */
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

/** Send the current user message and schedule the mock AI reply.
 * No-op when the text is empty or a response is already pending. */
export function send(text: string): void {
  const trimmed = typeof text === 'string' ? text.trim() : '';
  if (!trimmed || isResponding) return;

  if (currentChatId !== null && !resumed) currentChatId = null; // fresh live chat; resumed chats keep their id

  lastUserText = trimmed;
  isResponding = true;
  emit({ type: 'typing-started' });

  scheduleResponse(trimmed, 1000, 2500);
}

/** Regenerate the last AI response: re-answer the last user message.
 * No-op when a response is pending or there is nothing to regenerate;
 * the UI removes the old AI bubble before calling this. */
export function regenerate(): void {
  if (isResponding || !lastUserText) return;

  isResponding = true;
  emit({ type: 'typing-started' });

  scheduleResponse(lastUserText, 800, 1600);
}

/** Reset to a fresh live chat: invalidate pending responses, clear state,
 * notify the UI to render the welcome screen. Clearing currentChatId makes
 * the same-history re-click guard plain id equality in loadHistory. */
export function startNewChat(): void {
  invalidateSession();
  isResponding = false;
  resetConversation();
  lastUserText = '';
  currentChatId = null;
  resumed = false;
  emit({ type: 'chat-reset' });
}

/** Load a pre-baked history. No-op for an unknown id or when that history
 * is already active (id-equality guard). */
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

/** Resume a persisted chat: load its conversation, restore the response
 * engine's no-repeat memory, and mark it continuable — subsequent sends
 * append to this chat rather than starting fresh. */
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

export const isResumedChat = (): boolean => resumed;
export const hasHistory = (historyId: string): boolean => Boolean(chatHistories[historyId]);


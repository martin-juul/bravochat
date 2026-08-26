/**
 * @file Conversation engine: DOM-free orchestration of chat behavior.
 * Owns the session-token race guard, response scheduling, and chat switching.
 */

import {
  composeResponse,
  resetConversation,
  restoreConversationState,
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

/** Chat identity carried by every engine state — survives sends and replies,
 * so getters stay truthful while responding and after a response lands. */
interface ChatContext {
  /** key into `chatHistories`, a persisted-chat id, or null for a live chat */
  chatId: string | null;
  /** whether the active chat is a resumable persisted chat */
  resumed: boolean;
  lastUserText: string;
}

/** Idle, or awaiting the scheduled mock reply. Only `awaiting` may hold a
 * pending response, and it always carries the token captured at send time. */
type EngineState = ({ kind: 'idle' } & ChatContext) | ({ kind: 'awaiting'; token: number } & ChatContext);

let state: EngineState = { kind: 'idle', chatId: null, resumed: false, lastUserText: '' };
let sessionToken = 0; // increments on every chat switch; pending responses compare before firing

const listeners = new Set<EngineListener>();

export function subscribe(listener: EngineListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(event: EngineEvent): void {
  for (const listener of listeners) listener(event);
}

export const getIsResponding = (): boolean => state.kind === 'awaiting';
export const getCurrentChatId = (): string | null => state.chatId;
export const getLastUserText = (): string => state.lastUserText;

/** Invalidate all in-flight responses that captured an older token. */
function invalidateSession(): void {
  sessionToken++;
  emit({ type: 'session-invalidated' });
}

/** Schedule a response after a randomized delay. The callback is dropped
 * unless the engine is still awaiting with the token captured at schedule
 * time — a chat switch in between either left `idle` or took a newer token. */
function scheduleResponse(minMs: number, maxMs: number): void {
  // Callers enter `awaiting` with token = sessionToken immediately before this
  // runs, so the live counter is the captured token by construction.
  const capturedToken = sessionToken;
  const delay = minMs + Math.random() * (maxMs - minMs);

  setTimeout(() => {
    if (state.kind !== 'awaiting' || state.token !== capturedToken) return; // session changed — drop silently

    const response = composeResponse(state.lastUserText);
    state = { ...state, kind: 'idle' };
    emit({ type: 'response-ready', text: response, regenerable: true });
  }, delay);
}

/** Send the current user message and schedule the mock AI reply.
 * No-op when the text is empty or a response is already pending. */
export function send(text: string): void {
  const trimmed = typeof text === 'string' ? text.trim() : '';
  if (!trimmed || state.kind === 'awaiting') return;

  if (state.chatId !== null && !state.resumed) state.chatId = null; // fresh live chat; resumed chats keep their id

  state = { ...state, kind: 'awaiting', token: sessionToken, lastUserText: trimmed };
  emit({ type: 'typing-started' });

  scheduleResponse(1000, 2500);
}

/** Regenerate the last AI response: re-answer the last user message.
 * No-op when a response is pending or there is nothing to regenerate;
 * the UI removes the old AI bubble before calling this. */
export function regenerate(): void {
  if (state.kind === 'awaiting' || !state.lastUserText) return;

  state = { ...state, kind: 'awaiting', token: sessionToken };
  emit({ type: 'typing-started' });

  scheduleResponse(800, 1600);
}

/** Reset to a fresh live chat: invalidate pending responses, clear state,
 * notify the UI to render the welcome screen. Clearing chatId makes
 * the same-history re-click guard plain id equality in loadHistory. */
export function startNewChat(): void {
  invalidateSession();
  state = { kind: 'idle', chatId: null, resumed: false, lastUserText: '' };
  resetConversation();
  emit({ type: 'chat-reset' });
}

/** Load a pre-baked history. No-op for an unknown id or when that history
 * is already active (id-equality guard). */
export function loadHistory(historyId: string): void {
  const conversation = chatHistories[historyId];
  if (!conversation) return;
  if (state.chatId === historyId) return; // already viewing this history

  invalidateSession();
  state = { kind: 'idle', chatId: historyId, resumed: false, lastUserText: '' };
  resetConversation();

  emit({ type: 'history-loaded', conversation, historyId });
}

/** Resume a persisted chat: load its conversation, restore the response
 * engine's no-repeat memory, and mark it continuable — subsequent sends
 * append to this chat rather than starting fresh. */
export function resumeChat(chat: ResumableChat): void {
  if (!chat || !Array.isArray(chat.conversation)) return;
  invalidateSession();
  restoreConversationState(chat.memory);
  const lastUser = chat.conversation.findLast((m) => m.sender === 'user');
  state = { kind: 'idle', chatId: chat.id ?? null, resumed: true, lastUserText: lastUser ? lastUser.text : '' };
  emit({ type: 'history-loaded', conversation: chat.conversation, historyId: chat.id });
}

export const isResumedChat = (): boolean => state.resumed;
export const hasHistory = (historyId: string): boolean => Boolean(chatHistories[historyId]);


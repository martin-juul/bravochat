// Chat wiring: UI commands into the engine, engine events into rendering.
// All orchestration (state, race guards, response scheduling) lives in
// src/domain/engine.js; this module only renders presentation effects and
// feeds the persistence store as a passive subscriber (KTD5).
import {
  send as engineSend,
  regenerate as engineRegenerate,
  startNewChat as engineStartNewChat,
  loadHistory as engineLoadHistory,
  resumeChat as engineResumeChat,
  subscribe,
  getIsResponding,
  getCurrentChatId,
  getLastUserText,
  isResumedChat,
  hasHistory,
} from '../domain/engine.js';
import { exportConversationState } from '../domain/responses.js';
import { spawnSparkles } from './background.js';
import { messagesEl, inputEl, sendBtn, newChatBtn, closeMobileSidebar } from './dom.js';
import {
  addMessage,
  showWelcome,
  showTyping,
  hideTyping,
  renderConversation,
  setActiveHistoryItem,
  removeLastAiMessage,
} from './messages.js';
import { renderSavedChats } from './sidebar-chats.js';

/** @type {import('../domain/chat-store.js').ReturnType<typeof import('../domain/chat-store.js').createChatStore> | null} */
let store = null;

/** @type {HTMLElement | null} the #saved-chats container */
let savedChatsEl = null;

/** @type {string | null} persisted-chat id for the live conversation, if any */
let liveChatId = null;

/** Refresh the saved-chats sidebar section from the store. */
function refreshSavedChats() {
  if (!store || !savedChatsEl) return;
  renderSavedChats(savedChatsEl, store.listChats(), isResumedChat() ? getCurrentChatId() : null);
}

/**
 * Initialize chat flow wiring with the persistence store.
 * @param {ReturnType<typeof import('../domain/chat-store.js').createChatStore>} chatStore
 */
export function initChatFlow(chatStore) {
  store = chatStore;
  savedChatsEl = /** @type {HTMLElement} */ (document.getElementById('saved-chats'));
  subscribe(handleEngineEvent);
  refreshSavedChats();
  setTimeout(() => inputEl.focus(), 300);
}

/**
 * Send the current input: render the user bubble and sparkles around the
 * engine call (commands emit synchronously, so the bubble renders first).
 */
export function sendMessage() {
  const text = inputEl.value.trim();
  if (!text || getIsResponding()) return;

  if (getCurrentChatId() !== null) setActiveHistoryItem(null); // live chat now

  inputEl.value = '';
  inputEl.style.height = 'auto';

  const rect = sendBtn.getBoundingClientRect();
  spawnSparkles(rect.left + rect.width / 2, rect.top + rect.height / 2);

  addMessage(text, 'user');
  sendBtn.disabled = true;

  // Persistence (R1): a resumed chat keeps its id; a fresh chat gets one on
  // its first send and keeps it for the conversation's lifetime.
  try {
    if (!liveChatId) liveChatId = isResumedChat() ? getCurrentChatId() : store?.nextId() ?? null;
    if (liveChatId) store?.recordMessage(liveChatId, 'user', text);
  } catch (err) {
    console.error('[chat-store] recordMessage failed:', err);
  }

  engineSend(text);
}

/**
 * Regenerate the last AI response: remove the old bubble, then ask the
 * engine to re-answer the last user message.
 * No-op when a response is pending or there is nothing to regenerate.
 */
export function regenerateResponse() {
  if (getIsResponding() || !getLastUserText()) return;

  removeLastAiMessage();

  engineRegenerate();
}

/** Reset to the welcome screen via the engine. */
export function startNewChat() {
  newChatBtn.classList.add('pulse');
  setTimeout(() => newChatBtn.classList.remove('pulse'), 500);
  liveChatId = null;
  engineStartNewChat();
  refreshSavedChats();
  inputEl.focus();
}

/**
 * Load a chat from the sidebar: pre-baked fakes by data-id, persisted chats
 * by their `p:`-prefixed id (routed to engine.resumeChat, R8).
 * @param {string} chatId
 */
export function loadChatHistory(chatId) {
  if (chatId.startsWith('p:')) {
    const chat = store?.getChat(chatId);
    if (!chat || getCurrentChatId() === chatId) return;
    liveChatId = chatId;
    store?.touch(chatId); // recency bump (AE5)
    messagesEl.classList.add('switching');
    engineResumeChat({ id: chat.id, conversation: chat.messages, memory: chat.memory });
    refreshSavedChats();
    return;
  }
  if (getCurrentChatId() === chatId || !hasHistory(chatId)) return;
  liveChatId = null;
  messagesEl.classList.add('switching');
  engineLoadHistory(chatId);
}

/**
 * Suggestion-chip click handler: fill the input and send.
 * @param {MouseEvent} e
 */
export function handleChipClick(e) {
  const chip = e.target.closest('.chip');
  if (chip && chip.dataset.text) {
    inputEl.value = chip.dataset.text;
    inputEl.dispatchEvent(new Event('input'));
    sendMessage();
  }
}

/**
 * Render engine events. Presentation only — no state decisions here.
 * @param {{ type: string, [key: string]: unknown }} event
 */
function handleEngineEvent(event) {
  switch (event.type) {
    case 'typing-started':
      showTyping();
      break;

    case 'response-ready':
      hideTyping();
      addMessage(/** @type {string} */ (event.text), 'ai', { regenerable: event.regenerable === true });
      if (liveChatId) store?.recordMessage(liveChatId, 'ai', /** @type {string} */ (event.text), exportConversationState());
      refreshSavedChats();
      sendBtn.disabled = inputEl.value.trim() === '';
      inputEl.focus();
      break;

    case 'session-invalidated':
      hideTyping();
      sendBtn.disabled = inputEl.value.trim() === '';
      break;

    case 'chat-reset':
      showWelcome();
      setActiveHistoryItem(null);
      closeMobileSidebar();
      break;

    case 'history-loaded': {
      // Sidebar highlight updates immediately; the visual switch fade plays out
      // over 220ms (KTD4: the UI owns the presentation delay). The staleness
      // guard keeps a New Chat clicked during the window from being stomped.
      const id = /** @type {string} */ (event.historyId);
      setActiveHistoryItem(id);
      setTimeout(() => {
        if (getCurrentChatId() !== id) return;
        renderConversation(/** @type {import('../domain/histories.js').HistoryMessage[]} */ (event.conversation));
        messagesEl.classList.remove('switching');
        refreshSavedChats(); // highlight the resumed chat as active
        closeMobileSidebar();
      }, 220);
      break;
    }
  }
}

// Chat wiring: UI commands into the engine, engine events into rendering.
// All orchestration (state, race guards, response scheduling) lives in
// src/domain/engine.js; this module only renders presentation effects.
import {
  send as engineSend,
  regenerate as engineRegenerate,
  startNewChat as engineStartNewChat,
  loadHistory as engineLoadHistory,
  subscribe,
  getIsResponding,
  getCurrentChatId,
  getLastUserText,
  hasHistory,
} from '../domain/engine.js';
import { spawnSparkles } from './background.js';
import { messagesEl, inputEl, sendBtn, newChatBtn, closeMobileSidebar } from './dom.js';
import {
  addMessage,
  showWelcome,
  showTyping,
  hideTyping,
  renderConversation,
  setActiveHistoryItem,
} from './messages.js';

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

  engineSend(text);
}

/**
 * Regenerate the last AI response: remove the old bubble, then ask the
 * engine to re-answer the last user message.
 * No-op when a response is pending or there is nothing to regenerate.
 */
export function regenerateResponse() {
  if (getIsResponding() || !getLastUserText()) return;

  const last = /** @type {HTMLElement} */ (messagesEl.querySelector('.message.ai:last-of-type'));
  if (last) last.remove();

  engineRegenerate();
}

/** Reset to the welcome screen via the engine. */
export function startNewChat() {
  newChatBtn.classList.add('pulse');
  setTimeout(() => newChatBtn.classList.remove('pulse'), 500);
  engineStartNewChat();
  inputEl.focus();
}

/**
 * Load a pre-baked history into the chat surface via the engine.
 * Same-history guard mirrors the engine's: re-clicking the active history
 * is a no-op (the engine clears the id on new chat, so this matches the old
 * combined welcome-screen guard).
 * @param {string} historyId key into `chatHistories` (matches sidebar data-id)
 */
export function loadChatHistory(historyId) {
  if (getCurrentChatId() === historyId || !hasHistory(historyId)) return;
  messagesEl.classList.add('switching');
  engineLoadHistory(historyId);
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

/** Wire engine events to rendering and focus the composer. Called once from initApp. */
export function initChatFlow() {
  subscribe(handleEngineEvent);
  setTimeout(() => inputEl.focus(), 300);
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
        closeMobileSidebar();
      }, 220);
      break;
    }
  }
}

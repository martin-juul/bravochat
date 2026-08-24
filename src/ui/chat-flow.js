// Chat orchestration: sending, history loading, new chat, and the session-token race guard.
import { composeResponse, resetConversation } from '../domain/responses.js';
import { chatHistories } from '../domain/histories.js';
import {
  currentSessionToken,
  getCurrentChatId,
  getIsResponding,
  getWelcomeShown,
  incrementSessionToken,
  setCurrentChatId,
  setIsResponding,
  setWelcomeShown,
} from '../domain/state.js';
import { spawnSparkles } from './background.js';
import {
  messagesEl,
  inputEl,
  sendBtn,
  newChatBtn,
  sidebar,
  overlay,
  scrollToBottom,
  closeMobileSidebar,
} from './dom.js';
import { showWelcome, setActiveHistoryItem, addMessage, showTyping, hideTyping, renderConversation } from './messages.js';

/**
 * Load a pre-baked history into the chat surface, guarding against session races.
 * @param {string} historyId key into `chatHistories` (matches sidebar data-id)
 */
export function loadChatHistory(historyId) {
  const conversation = chatHistories[historyId];
  if (!conversation) return;

  if (getCurrentChatId() === historyId && !getWelcomeShown()) return;

  setIsResponding(false);
  hideTyping();
  incrementSessionToken(); // Invalidate any pending live chat responses
  resetConversation();

  setCurrentChatId(historyId);
  setActiveHistoryItem(historyId);

  messagesEl.classList.add('switching');

  setTimeout(() => {
    renderConversation(conversation);
    messagesEl.classList.remove('switching');
    closeMobileSidebar();
  }, 220);
}

/** Reset to the welcome screen, invalidating any pending responses. */
export function startNewChat() {
  incrementSessionToken(); // Invalidate pending responses
  setIsResponding(false);
  hideTyping();
  resetConversation();
  lastUserText = '';
  showWelcome();
  setActiveHistoryItem(null);
  newChatBtn.classList.add('pulse');
  setTimeout(() => newChatBtn.classList.remove('pulse'), 500);
  inputEl.focus();
  closeMobileSidebar();
}

/** @type {string} text of the most recent user message, for regeneration */
let lastUserText = '';

/**
 * Send the current input as a user message and schedule the mock AI reply.
 * No-op when the input is empty or a response is already pending.
 */
export function sendMessage() {
  const text = inputEl.value.trim();
  if (!text || getIsResponding()) return;

  if (getCurrentChatId() !== null) {
    setCurrentChatId(null);
    setActiveHistoryItem(null);
  }

  if (getWelcomeShown()) {
    messagesEl.replaceChildren();
    setWelcomeShown(false);
  }

  const rect = sendBtn.getBoundingClientRect();
  spawnSparkles(rect.left + rect.width / 2, rect.top + rect.height / 2);

  addMessage(text, 'user');
  lastUserText = text;
  inputEl.value = '';
  inputEl.style.height = 'auto';
  sendBtn.disabled = true;

  setIsResponding(true);
  showTyping();

  const currentSession = currentSessionToken();
  const delay = 1000 + Math.random() * 1500;

  setTimeout(() => {
    // If session changed, drop this response entirely
    if (currentSession !== currentSessionToken()) return;

    hideTyping();
    const response = composeResponse(text);
    addMessage(response, 'ai', { regenerable: true });
    setIsResponding(false);
    sendBtn.disabled = inputEl.value.trim() === '';
    inputEl.focus();
  }, delay);
}

/**
 * Regenerate the last AI response: remove it and re-answer the last user message.
 * No-op when a response is pending or there is nothing to regenerate.
 */
export function regenerateResponse() {
  if (getIsResponding() || !lastUserText) return;

  // Remove the last AI message (the one carrying the regenerate button)
  const last = /** @type {HTMLElement} */ (messagesEl.querySelector('.message.ai:last-of-type'));
  if (last) last.remove();

  setIsResponding(true);
  showTyping();

  const currentSession = currentSessionToken();
  const delay = 800 + Math.random() * 800;

  setTimeout(() => {
    if (currentSession !== currentSessionToken()) return;

    hideTyping();
    const response = composeResponse(lastUserText);
    addMessage(response, 'ai', { regenerable: true });
    setIsResponding(false);
    sendBtn.disabled = inputEl.value.trim() === '';
    inputEl.focus();
  }, delay);
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

export { scrollToBottom };

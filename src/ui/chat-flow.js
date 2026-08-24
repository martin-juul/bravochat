// Chat orchestration: sending, history loading, new chat, and the session-token race guard.
import { getResponse } from '../domain/responses.js';
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

export function loadChatHistory(historyId) {
  const conversation = chatHistories[historyId];
  if (!conversation) return;

  if (getCurrentChatId() === historyId && !getWelcomeShown()) return;

  setIsResponding(false);
  hideTyping();
  incrementSessionToken(); // Invalidate any pending live chat responses

  setCurrentChatId(historyId);
  setActiveHistoryItem(historyId);

  messagesEl.classList.add('switching');

  setTimeout(() => {
    renderConversation(conversation);
    messagesEl.classList.remove('switching');
    closeMobileSidebar();
  }, 220);
}

export function startNewChat() {
  incrementSessionToken(); // Invalidate pending responses
  setIsResponding(false);
  hideTyping();
  showWelcome();
  setActiveHistoryItem(null);
  newChatBtn.classList.add('pulse');
  setTimeout(() => newChatBtn.classList.remove('pulse'), 500);
  inputEl.focus();
  closeMobileSidebar();
}

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
    const response = getResponse(text);
    addMessage(response, 'ai');
    setIsResponding(false);
  }, delay);
}

// Suggestion-chip clicks fill the input and send, like typing the text yourself.
export function handleChipClick(e) {
  const chip = e.target.closest('.chip');
  if (chip && chip.dataset.text) {
    inputEl.value = chip.dataset.text;
    inputEl.dispatchEvent(new Event('input'));
    sendMessage();
  }
}

export { scrollToBottom };

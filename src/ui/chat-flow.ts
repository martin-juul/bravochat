// Chat wiring: UI commands into the engine, engine events into rendering.
// All orchestration (state, race guards, scheduling) lives in domain/engine.ts;
// this module only renders presentation effects and feeds the persistence store.
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
} from '../domain/engine';
import { exportConversationState } from '../domain/responses';
import type { ChatStore } from '../domain/chat-store';
import type { EngineEvent, ResumableChat } from '../domain/engine';
import { spawnSparkles } from './background';
import { messagesEl, inputEl, sendBtn, newChatBtn, closeMobileSidebar } from './dom';
import {
  addMessage,
  showWelcome,
  showTyping,
  hideTyping,
  renderConversation,
  setActiveHistoryItem,
  removeLastAiMessage,
} from './messages';
import { renderSavedChats } from './sidebar-chats';

let store: ChatStore | null = null;

let savedChatsEl: HTMLElement | null = null;
let liveChatId: string | null = null;

function refreshSavedChats(): void {
  if (!store || !savedChatsEl) return;
  renderSavedChats(savedChatsEl, store.listChats(), isResumedChat() ? getCurrentChatId() : null);
}

export function initChatFlow(chatStore: ChatStore): void {
  store = chatStore;
  savedChatsEl = document.getElementById('saved-chats');
  subscribe(handleEngineEvent);
  refreshSavedChats();
  setTimeout(() => inputEl.focus(), 300);
}

/** Send the current input: render the user bubble and sparkles around the
 * engine call (commands emit synchronously, so the bubble renders first). */
export function sendMessage(): void {
  const text = inputEl.value.trim();
  if (!text || getIsResponding()) return;

  if (getCurrentChatId() !== null) setActiveHistoryItem(null); // live chat now

  inputEl.value = '';
  inputEl.style.height = 'auto';

  const rect = sendBtn.getBoundingClientRect();
  spawnSparkles(rect.left + rect.width / 2, rect.top + rect.height / 2);

  addMessage(text, 'user');
  sendBtn.disabled = true;

  // A resumed chat keeps its id; a fresh chat gets one on its first send.
  try {
    if (!liveChatId) liveChatId = isResumedChat() ? getCurrentChatId() : (store?.nextId() ?? null);
    if (liveChatId) store?.recordMessage(liveChatId, 'user', text);
  } catch (err) {
    console.error('[chat-store] recordMessage failed:', err);
  }

  engineSend(text);
}

export function regenerateResponse(): void {
  if (getIsResponding() || !getLastUserText()) return;

  removeLastAiMessage();

  engineRegenerate();
}

export function startNewChat(): void {
  newChatBtn.classList.add('pulse');
  setTimeout(() => newChatBtn.classList.remove('pulse'), 500);
  liveChatId = null;
  engineStartNewChat();
  refreshSavedChats();
  inputEl.focus();
}

/** Load a sidebar chat: pre-baked fakes by data-id, persisted chats by their
 * `p:`-prefixed id. */
export function loadChatHistory(chatId: string): void {
  if (chatId.startsWith('p:')) {
    const chat = store?.getChat(chatId);
    if (!chat || getCurrentChatId() === chatId) return;
    liveChatId = chatId;
    store?.touch(chatId); // recency bump
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

export function handleChipClick(e: MouseEvent): void {
  const chip = (e.target as HTMLElement | null)?.closest<HTMLElement>('.chip');
  if (chip && chip.dataset.text) {
    inputEl.value = chip.dataset.text;
    inputEl.dispatchEvent(new Event('input'));
    sendMessage();
  }
}

function handleEngineEvent(event: EngineEvent): void {
  switch (event.type) {
    case 'typing-started':
      showTyping();
      break;

    case 'response-ready':
      hideTyping();
      addMessage(event.text, 'ai', { regenerable: event.regenerable === true });
      if (liveChatId) store?.recordMessage(liveChatId, 'ai', event.text, exportConversationState());
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
      // Sidebar highlight is immediate; the fade plays out over 220ms. The
      // staleness guard keeps a New Chat clicked during the window from being stomped.
      const id = event.historyId ?? null;
      setActiveHistoryItem(id);
      setTimeout(() => {
        if (getCurrentChatId() !== id) return;
        renderConversation(event.conversation);
        messagesEl.classList.remove('switching');
        refreshSavedChats(); // highlight the resumed chat as active
        closeMobileSidebar();
      }, 220);
      break;
    }
  }
}

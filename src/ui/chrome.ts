/**
 * @file App chrome: sidebar, overlay, info modal, and all event-listener wiring (initApp).
 */
import { getIsResponding } from '../domain/engine';
import {
  inputEl,
  sendBtn,
  newChatBtn,
  clearBtn,
  infoBtn,
  hamburger,
  sidebar,
  overlay,
  modalBackdrop,
  modalClose,
  messagesEl,
  autoResize,
} from './dom';
import { showWelcome } from './messages';
import { sendMessage, startNewChat, loadChatHistory, handleChipClick, regenerateResponse, initChatFlow } from './chat-flow';
import { createChatStore, type ChatStorage } from '../domain/chat-store';
import { spawnSparkles } from './background';

/** Open the mobile sidebar overlay. */
function toggleSidebar(): void {
  sidebar.classList.toggle('open');
  overlay.classList.toggle('show');
}

function showInfo(): void {
  modalBackdrop.classList.add('show');
}

function hideInfo(): void {
  modalBackdrop.classList.remove('show');
}

/** Timestamp of the last sparkle easter-egg burst, for throttling. */
let lastSparkleAt = 0;

/** Johnny's trigger words — typing one earns a sparkle burst at the input. */
const sparkleTriggers = /\b(handsome|mama|hair)\b/i;

/** Wire all event listeners (input, buttons, delegation) and show the welcome screen. */
export function initApp(): void {
  inputEl.addEventListener('input', () => {
    autoResize();
    sendBtn.disabled = inputEl.value.trim() === '' || getIsResponding();

    // Sparkle easter egg: trigger word in the input, throttled to 1.5s
    if (sparkleTriggers.test(inputEl.value) && Date.now() - lastSparkleAt > 1500) {
      lastSparkleAt = Date.now();
      const rect = inputEl.getBoundingClientRect();
      spawnSparkles(rect.left + rect.width / 2, rect.top + rect.height / 2);
    }
  });

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  sendBtn.addEventListener('click', sendMessage);
  newChatBtn.addEventListener('click', startNewChat);
  clearBtn.addEventListener('click', startNewChat);
  infoBtn.addEventListener('click', showInfo);
  modalClose.addEventListener('click', hideInfo);
  modalBackdrop.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) hideInfo();
  });

  hamburger.addEventListener('click', toggleSidebar);
  overlay.addEventListener('click', toggleSidebar);

  // Escape closes modal/sidebar; '/' focuses the input
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideInfo();
      if (sidebar.classList.contains('open')) toggleSidebar();
    } else if (e.key === '/' && document.activeElement !== inputEl) {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag !== 'input' && tag !== 'textarea') {
        e.preventDefault();
        inputEl.focus();
      }
    }
  });

  // Event delegation
  const onHistoryClick = (e: MouseEvent) => {
    const item = (e.target as HTMLElement | null)?.closest<HTMLElement>('.history-item');
    if (item?.dataset.id) {
      loadChatHistory(item.dataset.id);
    }
  };
  document.getElementById('chat-history')?.addEventListener('click', onHistoryClick);
  document.getElementById('saved-chats')?.addEventListener('click', onHistoryClick);

  messagesEl.addEventListener('click', handleChipClick);
  messagesEl.addEventListener('click', (e) => {
    if ((e.target as HTMLElement | null)?.closest('.regenerate-btn')) {
      e.stopPropagation();
      regenerateResponse();
    }
  });

  showWelcome();
  initChatFlow(createChatStore(localStorageAdapter()));
}

function localStorageAdapter(): ChatStorage {
  return {
    getItem: (key) => window.localStorage.getItem(key),
    setItem: (key, value) => window.localStorage.setItem(key, value),
  };
}

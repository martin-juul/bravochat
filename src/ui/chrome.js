/**
 * @file App chrome: sidebar, overlay, info modal, and all event-listener wiring (initApp).
 */
import { getIsResponding } from '../domain/state.js';
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
} from './dom.js';
import { showWelcome } from './messages.js';
import { sendMessage, startNewChat, loadChatHistory, handleChipClick } from './chat-flow.js';

/** Open the mobile sidebar overlay. */
function toggleSidebar() {
  sidebar.classList.toggle('open');
  overlay.classList.toggle('show');
}

/** Show the info modal. */
function showInfo() {
  modalBackdrop.classList.add('show');
}

/** Hide the info modal. */
function hideInfo() {
  modalBackdrop.classList.remove('show');
}

/** Wire all event listeners (input, buttons, delegation) and show the welcome screen. */
export function initApp() {
  // ============ EVENT LISTENERS ============
  inputEl.addEventListener('input', () => {
    autoResize();
    sendBtn.disabled = inputEl.value.trim() === '' || getIsResponding();
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

  // Event Delegation for history items
  document.getElementById('chat-history').addEventListener('click', (e) => {
    const item = e.target.closest('.history-item');
    if (item && item.dataset.id) {
      loadChatHistory(item.dataset.id);
    }
  });

  // Event Delegation for suggestion chips
  messagesEl.addEventListener('click', handleChipClick);

  // ============ INIT ============
  showWelcome();
  setTimeout(() => inputEl.focus(), 300);
}

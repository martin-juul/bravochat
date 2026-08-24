/**
 * @file DOM layer: element lookups and small DOM helpers shared across the UI modules.
 */

/** @type {HTMLElement} */
export const messagesEl = /** @type {HTMLElement} */ (document.getElementById('messages'));
/** @type {HTMLTextAreaElement} */
export const inputEl = /** @type {HTMLTextAreaElement} */ (document.getElementById('message-input'));
/** @type {HTMLButtonElement} */
export const sendBtn = /** @type {HTMLButtonElement} */ (document.getElementById('send-btn'));
/** @type {HTMLElement} */
export const chatArea = /** @type {HTMLElement} */ (document.getElementById('chat-area'));
/** @type {HTMLButtonElement} */
export const newChatBtn = /** @type {HTMLButtonElement} */ (document.getElementById('new-chat'));
/** @type {HTMLButtonElement} */
export const clearBtn = /** @type {HTMLButtonElement} */ (document.getElementById('clear-btn'));
/** @type {HTMLButtonElement} */
export const infoBtn = /** @type {HTMLButtonElement} */ (document.getElementById('info-btn'));
/** @type {HTMLButtonElement} */
export const hamburger = /** @type {HTMLButtonElement} */ (document.getElementById('hamburger'));
/** @type {HTMLElement} */
export const sidebar = /** @type {HTMLElement} */ (document.getElementById('sidebar'));
/** @type {HTMLElement} */
export const overlay = /** @type {HTMLElement} */ (document.getElementById('overlay'));
/** @type {HTMLElement} */
export const modalBackdrop = /** @type {HTMLElement} */ (document.getElementById('modal-backdrop'));
/** @type {HTMLButtonElement} */
export const modalClose = /** @type {HTMLButtonElement} */ (document.getElementById('modal-close'));

/** Scrolls the chat area to the bottom on the next frame (batched). */
export function scrollToBottom() {
  requestAnimationFrame(() => {
    chatArea.scrollTop = chatArea.scrollHeight;
  });
}

/** Debounced auto-resize of the message input. */
let resizeTimeout = null;
export function autoResize() {
  if (resizeTimeout) cancelAnimationFrame(resizeTimeout);
  resizeTimeout = requestAnimationFrame(() => {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 150) + 'px';
  });
}

/** Close the mobile sidebar if the viewport is phone-sized. */
export function closeMobileSidebar() {
  if (window.innerWidth <= 768) {
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
  }
}

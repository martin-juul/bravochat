/**
 * @file DOM layer: element lookups and small DOM helpers shared across the UI modules.
 */

/** Single lookup point: throws if the static shell markup is missing. */
function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing required element #${id}`);
  return el as T;
}

export const messagesEl = byId<HTMLElement>('messages');
export const inputEl = byId<HTMLTextAreaElement>('message-input');
export const sendBtn = byId<HTMLButtonElement>('send-btn');
export const chatArea = byId<HTMLElement>('chat-area');
export const newChatBtn = byId<HTMLButtonElement>('new-chat');
export const clearBtn = byId<HTMLButtonElement>('clear-btn');
export const infoBtn = byId<HTMLButtonElement>('info-btn');
export const hamburger = byId<HTMLButtonElement>('hamburger');
export const sidebar = byId<HTMLElement>('sidebar');
export const overlay = byId<HTMLElement>('overlay');
export const modalBackdrop = byId<HTMLElement>('modal-backdrop');
export const modalClose = byId<HTMLButtonElement>('modal-close');

/** Scrolls the chat area to the bottom on the next frame (batched). */
export function scrollToBottom(): void {
  requestAnimationFrame(() => {
    chatArea.scrollTop = chatArea.scrollHeight;
  });
}

/** Debounced auto-resize of the message input. */
let resizeTimeout: number | null = null;
export function autoResize(): void {
  if (resizeTimeout) cancelAnimationFrame(resizeTimeout);
  resizeTimeout = requestAnimationFrame(() => {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 150) + 'px';
  });
}

/** Close the mobile sidebar if the viewport is phone-sized. */
export function closeMobileSidebar(): void {
  if (window.innerWidth <= 768) {
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
  }
}

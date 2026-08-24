// DOM layer: element lookups and small DOM helpers shared across the UI modules.
export const messagesEl = document.getElementById('messages');
export const inputEl = document.getElementById('message-input');
export const sendBtn = document.getElementById('send-btn');
export const chatArea = document.getElementById('chat-area');
export const newChatBtn = document.getElementById('new-chat');
export const clearBtn = document.getElementById('clear-btn');
export const infoBtn = document.getElementById('info-btn');
export const hamburger = document.getElementById('hamburger');
export const sidebar = document.getElementById('sidebar');
export const overlay = document.getElementById('overlay');
export const modalBackdrop = document.getElementById('modal-backdrop');
export const modalClose = document.getElementById('modal-close');

export function scrollToBottom() {
  requestAnimationFrame(() => {
    chatArea.scrollTop = chatArea.scrollHeight;
  });
}

// Debounced auto-resize of the message input.
let resizeTimeout = null;
export function autoResize() {
  if (resizeTimeout) cancelAnimationFrame(resizeTimeout);
  resizeTimeout = requestAnimationFrame(() => {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 150) + 'px';
  });
}

export function closeMobileSidebar() {
  if (window.innerWidth <= 768) {
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
  }
}

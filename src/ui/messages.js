// Rendering: welcome screen, message bubbles, and the typing indicator.
import { johnnySVG } from '../assets/avatar.js';
import { typingPhrases } from '../domain/responses.js';
import { getWelcomeShown, setWelcomeShown } from '../domain/state.js';
import { messagesEl, chatArea, scrollToBottom } from './dom.js';

/** Renders the welcome screen with suggestion chips and clears chat state. */
export function showWelcome() {
  setWelcomeShown(true);
  messagesEl.classList.remove('switching');
  messagesEl.innerHTML = `
    <div class="welcome-screen">
      <div class="welcome-avatar">${johnnySVG}</div>
      <h1 class="welcome-title">Hey There, Sugar!</h1>
      <p class="welcome-subtitle">
        I'm <span class="accent">Chad GPT</span> — your artificially handsome companion. I don't actually know anything, but I look FABULOUS not knowing it. Ask me anything, baby!
      </p>
      <div class="suggestion-chips">
        <button class="chip" data-text="Tell me a joke, pretty boy">
          <span class="chip-dot"></span>Tell me a joke
        </button>
        <button class="chip" data-text="How do I impress the ladies?">
          <span class="chip-dot"></span>Impress the ladies
        </button>
        <button class="chip" data-text="What's your workout routine?">
          <span class="chip-dot"></span>Workout routine
        </button>
        <button class="chip" data-text="Tell me about your mama">
          <span class="chip-dot"></span>Talk about mama
        </button>
        <button class="chip" data-text="How do I get my hair like that?">
          <span class="chip-dot"></span>Hair secrets
        </button>
      </div>
    </div>
  `;
}

/** @param {string | null} id data-id of the history item to highlight, or null to clear */
export function setActiveHistoryItem(id) {
  document.querySelectorAll('.history-item').forEach(item => {
    item.classList.toggle('active', item.dataset.id === id);
  });
}

/**
 * Build a chat message element (avatar, name, bubble) for a sender.
 * @param {string} text message body
 * @param {'user' | 'ai'} sender
 * @returns {HTMLDivElement}
 */
export function createMessageElement(text, sender) {
  const msg = document.createElement('div');
  msg.className = `message ${sender}`;

  const avatarHTML = sender === 'ai'
    ? `<div class="message-avatar ai">${johnnySVG}</div>`
    : `<div class="message-avatar user">U</div>`;

  const nameHTML = sender === 'ai'
    ? `<div class="message-name ai">Johnny Bravo <span class="name-badge">AI</span></div>`
    : `<div class="message-name">You</div>`;

  msg.innerHTML = `
    ${avatarHTML}
    <div class="message-content">
      ${nameHTML}
      <div class="message-bubble">${text}</div>
    </div>
  `;

  if (sender === 'ai') {
    const avatar = msg.querySelector('.message-avatar.ai');
    setTimeout(() => {
      avatar.classList.add('wiggle');
      setTimeout(() => avatar.classList.remove('wiggle'), 600);
    }, 50);
  }

  return msg;
}

/**
 * Append a message bubble, replacing the welcome screen if present.
 * @param {string} text
 * @param {'user' | 'ai'} sender
 */
export function addMessage(text, sender) {
  if (getWelcomeShown()) {
    messagesEl.replaceChildren();
    setWelcomeShown(false);
  }

  const msg = createMessageElement(text, sender);
  messagesEl.appendChild(msg);
  scrollToBottom();
}

/** Append the typing indicator with a random phrase. */
export function showTyping() {
  if (getWelcomeShown()) {
    messagesEl.replaceChildren();
    setWelcomeShown(false);
  }

  const phrase = typingPhrases[Math.floor(Math.random() * typingPhrases.length)];

  const msg = document.createElement('div');
  msg.className = 'message ai';
  msg.id = 'typing-message';
  msg.innerHTML = `
    <div class="message-avatar ai">${johnnySVG}</div>
    <div class="message-content">
      <div class="message-name ai">Johnny Bravo <span class="name-badge">AI</span></div>
      <div class="typing-bubble">
        <span class="typing-text">${phrase}</span>
        <div class="typing-dots">
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
        </div>
      </div>
    </div>
  `;

  messagesEl.appendChild(msg);
  scrollToBottom();
}

/** Remove the typing indicator if present. */
export function hideTyping() {
  const typing = document.getElementById('typing-message');
  if (typing) typing.remove();
}

/**
 * Render a pre-baked conversation with a batched fragment append.
 * @param {import('../domain/histories.js').HistoryMessage[]} conversation
 */
export function renderConversation(conversation) {
  setWelcomeShown(false);
  messagesEl.replaceChildren(); // High performance clear

  // Use DocumentFragment to batch DOM insertions
  const frag = document.createDocumentFragment();
  conversation.forEach((msg) => {
    frag.appendChild(createMessageElement(msg.text, msg.sender));
  });
  messagesEl.appendChild(frag);

  // Force scroll after all messages
  requestAnimationFrame(() => {
    chatArea.scrollTop = chatArea.scrollHeight;
  });
}

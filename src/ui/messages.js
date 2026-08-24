// Rendering: welcome screen, message bubbles, and the typing indicator.
// The message list is a plain data model; every mutation derives new vnodes
// and patches the DOM via the Mini Bravo DOM vdom (keyed diff). Imperative
// DOM access is limited to post-paint animation touches.
import { johnnySVG } from '../assets/avatar.js';
import { typingPhrases } from '../domain/responses.js';
import { h } from '../vdom/core.js';
import { patchChildren, ownContainer } from '../vdom/dom.js';
import { messagesEl, chatArea } from './dom.js';

// The renderer fully owns #messages: strip formatting-only nodes (whitespace,
// comments) so live child indices always match the vnode list.
ownContainer(messagesEl);

/** @typedef {{ id: string, text: string, sender: 'user' | 'ai', regenerable?: boolean }} Message */

/** @type {boolean} whether the welcome screen is currently rendered (UI-only state) */
let welcomeShown = true;

/** @type {Message[]} the message data model; vnodes derive from this */
let messages = [];

/** @type {number} monotonic id source for messages */
let idCounter = 0;

/** @type {import('../vdom/core.js').VElement | null} the typing indicator vnode, when shown */
let typingNode = null;

/**
 * Patch #messages to a new vnode list (the single render entry point).
 * @param {import('../vdom/core.js').VElement['children']} next
 */
function paint(next) {
  patchChildren(messagesEl, rendered, next);
  rendered = next;
}

/** Derive the vnode list: welcome screen OR messages plus optional typing indicator. */
function derive() {
  if (welcomeShown) return [{ type: 'raw', html: welcomeHtml }];
  const list = messages.map((m) => messageVNode(m));
  if (typingNode) list.push(typingNode);
  return list;
}

const welcomeHtml = `
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
  </div>`;

/** @type {import('../vdom/core.js').VElement['children']} the currently rendered vnode list */
let rendered = [];

/** Renders the welcome screen. */
export function showWelcome() {
  welcomeShown = true;
  typingNode = null;
  paint(derive());
}

/** @param {string | null} id data-id of the history item to highlight, or null to clear */
export function setActiveHistoryItem(id) {
  document.querySelectorAll('.history-item').forEach(item => {
    item.classList.toggle('active', item.dataset.id === id);
  });
}

/**
 * Build a chat-message vnode (avatar, name, bubble, optional regenerate control).
 * @param {Message} msg
 * @returns {import('../vdom/core.js').VElement}
 */
export function messageVNode(msg) {
  const avatar = msg.sender === 'ai'
    ? h('div', { class: 'message-avatar ai', innerHTML: johnnySVG })
    : h('div', { class: 'message-avatar user' }, ['U']);

  const name = msg.sender === 'ai'
    ? h('div', { class: 'message-name ai' }, ['Johnny Bravo ', h('span', { class: 'name-badge' }, ['AI'])])
    : h('div', { class: 'message-name' }, ['You']);

  const content = h('div', { class: 'message-content' }, [
    name,
    h('div', { class: 'message-bubble' }, [msg.text]),
    ...(msg.sender === 'ai' && msg.regenerable ? [regenerateBtnVNode()] : []),
  ]);

  return h('div', { class: `message ${msg.sender}`, key: msg.id }, [avatar, content]);
}

/** The "Nah, let me try that again, sugar" control vnode. */
function regenerateBtnVNode() {
  return h('button', {
    class: 'regenerate-btn',
    type: 'button',
    innerHTML: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 4v6h6"/><path d="M3.5 15a9 9 0 1 0 2-9.4L1 10"/></svg>
      Nah, let me try that again, sugar`,
  });
}

/** Post-paint avatar wiggle for the newest AI message. */
function wiggleNewestAi() {
  const avatar = /** @type {HTMLElement} */ (messagesEl.querySelector('.message.ai:last-of-type .message-avatar.ai'));
  if (!avatar) return;
  setTimeout(() => {
    avatar.classList.add('wiggle');
    setTimeout(() => avatar.classList.remove('wiggle'), 600);
  }, 50);
}

/** Batched scroll-to-bottom on the next frame. */
function scrollChat() {
  requestAnimationFrame(() => {
    chatArea.scrollTop = chatArea.scrollHeight;
  });
}

/**
 * Append a message via keyed patch. A new regenerable AI message steals the
 * regenerate control from the previous one (model-level, diff handles the DOM).
 * @param {string} text
 * @param {'user' | 'ai'} sender
 * @param {{ regenerable?: boolean }} [opts] when true (AI only), attach a regenerate control
 */
export function addMessage(text, sender, opts = {}) {
  welcomeShown = false;
  if (sender === 'ai' && opts.regenerable) {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender === 'ai') {
        if (messages[i].regenerable) messages[i] = { ...messages[i], regenerable: false };
        break;
      }
    }
  }
  messages = [...messages, { id: `m${++idCounter}`, text, sender, regenerable: opts.regenerable }];
  paint(derive());
  if (sender === 'ai') wiggleNewestAi();
  scrollChat();
}

/**
 * Remove the last AI message (regenerate flow) via keyed patch.
 */
export function removeLastAiMessage() {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].sender === 'ai') {
      messages = messages.slice(0, i).concat(messages.slice(i + 1));
      paint(derive());
      return;
    }
  }
}

/** @type {ReturnType<typeof setInterval> | null} phrase rotation for the typing indicator */
let typingInterval = null;
/** @type {number} current index into `typingPhrases` for smooth progression */
let typingIndex = 0;

/**
 * Show the typing indicator via keyed patch and cycle its phrase every 2s.
 */
export function showTyping() {
  welcomeShown = false;
  hideTyping(); // never stack indicators
  typingIndex = (typingIndex + 1) % typingPhrases.length; // progress phrases between sessions

  typingNode = h('div', { class: 'message ai', key: 'typing' }, [
    h('div', { class: 'message-avatar ai', innerHTML: johnnySVG }),
    h('div', { class: 'message-content' }, [
      h('div', { class: 'message-name ai' }, ['Johnny Bravo ', h('span', { class: 'name-badge' }, ['AI'])]),
      h('div', { class: 'typing-bubble' }, [
        h('span', { class: 'typing-text' }, [typingPhrases[typingIndex]]),
        h('div', { class: 'typing-dots' }, [
          h('span', { class: 'typing-dot' }), h('span', { class: 'typing-dot' }), h('span', { class: 'typing-dot' }),
        ]),
      ]),
    ]),
  ]);
  paint(derive());
  scrollChat();

  typingInterval = setInterval(() => {
    const textEl = messagesEl.querySelector('.typing-text');
    if (!textEl) return; // indicator was removed; interval cleaned up in hideTyping
    typingIndex = (typingIndex + 1) % typingPhrases.length;
    textEl.textContent = typingPhrases[typingIndex];
  }, 2000);
}

/** Remove the typing indicator via keyed patch, stopping phrase rotation. */
export function hideTyping() {
  if (typingInterval !== null) {
    clearInterval(typingInterval);
    typingInterval = null;
  }
  if (typingNode) {
    typingNode = null;
    paint(derive());
  }
}

/**
 * Render a pre-baked conversation via keyed patch.
 * @param {import('../domain/histories.js').HistoryMessage[]} conversation
 */
export function renderConversation(conversation) {
  welcomeShown = false;
  typingNode = null;
  idCounter = 0;
  messages = conversation.map((msg, i) => ({ id: `h${i}`, text: msg.text, sender: msg.sender }));
  paint(derive());
  scrollChat();
}

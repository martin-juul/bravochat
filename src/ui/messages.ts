// Rendering: welcome screen, message bubbles, and the typing indicator.
// The message list is a plain data model; every mutation derives new vnodes
// and patches the DOM via the Mini Bravo DOM vdom (keyed diff). Imperative
// DOM access is limited to post-paint animation touches.
import { johnnySVG } from '../assets/avatar';
import { typingPhrases } from '../domain/responses';
import type { HistoryMessage } from '../domain/histories';
import { h, type VElement } from '../vdom/core';
import { patchChildren, ownContainer } from '../vdom/dom';
import { messagesEl, chatArea } from './dom';

// The renderer fully owns #messages: strip formatting-only nodes (whitespace,
// comments) so live child indices always match the vnode list.
ownContainer(messagesEl);

/** One rendered chat message in the UI data model. */
export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  regenerable?: boolean;
}

/** whether the welcome screen is currently rendered (UI-only state) */
let welcomeShown = true;

/** the message data model; vnodes derive from this */
let messages: Message[] = [];

/** monotonic id source for messages */
let idCounter = 0;

/** the typing indicator vnode, when shown */
let typingNode: VElement | null = null;

/**
 * Patch #messages to a new vnode list (the single render entry point).
 */
function paint(next: VElement['children']): void {
  patchChildren(messagesEl, rendered, next);
  rendered = next;
}

/** Derive the vnode list: welcome screen OR messages plus optional typing indicator. */
function derive(): VElement['children'] {
  if (welcomeShown) return [{ type: 'raw', html: welcomeHtml }];
  const list: VElement['children'] = messages.map((m) => messageVNode(m));
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

/** the currently rendered vnode list */
let rendered: VElement['children'] = [];

/** Renders the welcome screen. */
export function showWelcome(): void {
  welcomeShown = true;
  typingNode = null;
  messages = [];
  idCounter = 0;
  messagesEl.classList.remove('switching');
  paint(derive());
}

/** Highlight the history item with this data-id, or clear highlights when null. */
export function setActiveHistoryItem(id: string | null): void {
  document.querySelectorAll<HTMLElement>('.history-item').forEach((item) => {
    item.classList.toggle('active', item.dataset.id === id);
  });
}

/**
 * Build a chat-message vnode (avatar, name, bubble, optional regenerate control).
 */
export function messageVNode(msg: Message): VElement {
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
function regenerateBtnVNode(): VElement {
  return h('button', {
    class: 'regenerate-btn',
    type: 'button',
    innerHTML: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 4v6h6"/><path d="M3.5 15a9 9 0 1 0 2-9.4L1 10"/></svg>
      Nah, let me try that again, sugar`,
  });
}

/** Post-paint avatar wiggle for the newest AI message. */
function wiggleNewestAi(): void {
  const avatar = messagesEl.querySelector<HTMLElement>('.message.ai:last-of-type .message-avatar.ai');
  if (!avatar) return;
  setTimeout(() => {
    avatar.classList.add('wiggle');
    setTimeout(() => avatar.classList.remove('wiggle'), 600);
  }, 50);
}

/** Batched scroll-to-bottom on the next frame. */
function scrollChat(): void {
  requestAnimationFrame(() => {
    chatArea.scrollTop = chatArea.scrollHeight;
  });
}

/**
 * Append a message via keyed patch. A new regenerable AI message steals the
 * regenerate control from the previous one (model-level, diff handles the DOM).
 * @param opts when `regenerable` is true (AI only), attach a regenerate control
 */
export function addMessage(text: string, sender: 'user' | 'ai', opts: { regenerable?: boolean } = {}): void {
  welcomeShown = false;
  if (sender === 'ai' && opts.regenerable) {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m && m.sender === 'ai') {
        if (m.regenerable) messages[i] = { ...m, regenerable: false };
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
export function removeLastAiMessage(): void {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.sender === 'ai') {
      messages = messages.slice(0, i).concat(messages.slice(i + 1));
      paint(derive());
      return;
    }
  }
}

/** phrase rotation for the typing indicator */
let typingInterval: ReturnType<typeof setInterval> | null = null;
/** current index into `typingPhrases` for smooth progression */
let typingIndex = 0;

/**
 * Show the typing indicator via keyed patch and cycle its phrase every 2s.
 */
export function showTyping(): void {
  welcomeShown = false;
  hideTyping(); // never stack indicators
  typingIndex = (typingIndex + 1) % typingPhrases.length; // progress phrases between sessions

  typingNode = h('div', { class: 'message ai', key: 'typing', id: 'typing-message' }, [
    h('div', { class: 'message-avatar ai', innerHTML: johnnySVG }),
    h('div', { class: 'message-content' }, [
      h('div', { class: 'message-name ai' }, ['Johnny Bravo ', h('span', { class: 'name-badge' }, ['AI'])]),
      h('div', { class: 'typing-bubble' }, [
        h('span', { class: 'typing-text' }, [typingPhrases[typingIndex] ?? '']),
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
    textEl.textContent = typingPhrases[typingIndex] ?? '';
  }, 2000);
}

/** Remove the typing indicator via keyed patch, stopping phrase rotation. */
export function hideTyping(): void {
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
 */
export function renderConversation(conversation: HistoryMessage[]): void {
  welcomeShown = false;
  typingNode = null;
  idCounter = 0;
  messages = conversation.map((msg, i): Message => ({ id: `h${i}`, text: msg.text, sender: msg.sender }));
  paint(derive());
  wiggleNewestAi();
  scrollChat();
}

// Persisted-chats sidebar section: vdom-rendered, keyed, below the pre-baked
// fake histories. Plain labels, Johnny garnish on hover (R3, R6).
import { h } from '../vdom/core.js';
import { patchChildren, ownContainer } from '../vdom/dom.js';

/** @typedef {import('../domain/chat-store.js').StoredChat} StoredChat */

/**
 * Render the persisted-chats list into its container.
 * @param {HTMLElement} container the #saved-chats element
 * @param {StoredChat[]} chats newest-first from the store
 * @param {string | null} activeId the currently open persisted chat id, if any
 */
export function renderSavedChats(container, chats, activeId) {
  ownContainer(container);
  const next = chats.length
    ? [
        h('div', { class: 'history-label' }, ['Your Chats, Sugar']),
        ...chats.map((chat) =>
          h(
            'div',
            { class: `history-item${chat.id === activeId ? ' active' : ''}`, 'data-id': chat.id, key: chat.id, title: `${chat.title} — ${chat.garnish}` },
            [
              chatIcon(),
              h('span', { class: 'history-item-text' }, [chat.title]),
            ],
          ),
        ),
      ]
    : [];
  patchChildren(container, savedByContainer.get(container) ?? [], next);
  savedByContainer.set(container, next);
}

/** @type {WeakMap<HTMLElement, import('../vdom/core.js').VElement['children']>} */
const savedByContainer = new WeakMap();

/** The chat bubble icon (mirrors the fake history items'). */
function chatIcon() {
  return {
    type: 'raw',
    html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',
  };
}

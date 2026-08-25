// Persisted-chats sidebar section: vdom-rendered, keyed, below the pre-baked
// fake histories. Plain labels, Johnny garnish on hover (R3, R6).
import { h, type VElement, type VRaw } from '../vdom/core';
import { patchChildren, ownContainer } from '../vdom/dom';
import type { StoredChat } from '../domain/chat-store';

/**
 * Render the persisted-chats list into its container.
 * @param container the #saved-chats element
 * @param chats newest-first from the store
 * @param activeId the currently open persisted chat id, if any
 */
export function renderSavedChats(container: HTMLElement, chats: StoredChat[], activeId: string | null): void {
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

/** the last rendered children per container, for keyed patching */
const savedByContainer = new WeakMap<HTMLElement, VElement['children']>();

/** The chat bubble icon (mirrors the fake history items'). */
function chatIcon(): VRaw {
  return {
    type: 'raw',
    html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',
  };
}

// Chat UI: DOM rendering, event handling, and message flows.
// All DOM access for the chat surface lives here; canvas DOM access lives in background.js.
import { getResponse, typingPhrases } from './responses.js';
import { chatHistories } from './histories.js';
import { johnnySVG } from './avatar.js';
import { spawnSparkles } from './background.js';
import {
  getIsResponding, setIsResponding,
  getWelcomeShown, setWelcomeShown,
  getCurrentChatId, setCurrentChatId,
  currentSessionToken, incrementSessionToken,
} from './state.js';

let resizeTimeout = null;

// ============ FUNCTIONS ============
function showWelcome() {
  setWelcomeShown(true);
  setCurrentChatId(null);
  messagesEl.classList.remove('switching');
  messagesEl.innerHTML = `
    <div class="welcome-screen">
      <div class="welcome-avatar">${johnnySVG}</div>
      <h1 class="welcome-title">Hey There, Sugar!</h1>
      <p class="welcome-subtitle">
        I'm <span class="accent">Johnny GPT</span> — your artificially handsome companion. I don't actually know anything, but I look FABULOUS not knowing it. Ask me anything, baby!
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
        <button class="chip" data-text="How do you get your hair like that?">
          <span class="chip-dot"></span>Hair secrets
        </button>
      </div>
    </div>
  `;
}

function setActiveHistoryItem(id) {
  document.querySelectorAll('.history-item').forEach(item => {
    item.classList.toggle('active', item.dataset.id === id);
  });
}

function loadChatHistory(historyId) {
  const conversation = chatHistories[historyId];
  if (!conversation) return;

  if (getCurrentChatId() === historyId && !getWelcomeShown()) return;

  setIsResponding(false);
  hideTyping();
  incrementSessionToken(); // Invalidate any pending live chat responses

  setCurrentChatId(historyId);
  setActiveHistoryItem(historyId);

  messagesEl.classList.add('switching');

  setTimeout(() => {
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

    messagesEl.classList.remove('switching');

    if (window.innerWidth <= 768) {
      sidebar.classList.remove('open');
      overlay.classList.remove('show');
    }
  }, 220);
}

function createMessageElement(text, sender) {
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

function addMessage(text, sender) {
  if (getWelcomeShown()) {
    messagesEl.replaceChildren();
    setWelcomeShown(false);
  }

  const msg = createMessageElement(text, sender);
  messagesEl.appendChild(msg);
  scrollToBottom();
}

function showTyping() {
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

function hideTyping() {
  const typing = document.getElementById('typing-message');
  if (typing) typing.remove();
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    chatArea.scrollTop = chatArea.scrollHeight;
  });
}

function startNewChat() {
  incrementSessionToken(); // Invalidate pending responses
  setIsResponding(false);
  hideTyping();
  showWelcome();
  setActiveHistoryItem(null);
  newChatBtn.classList.add('pulse');
  setTimeout(() => newChatBtn.classList.remove('pulse'), 500);
  inputEl.focus();

  if (window.innerWidth <= 768) {
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
  }
}

function sendMessage() {
  const text = inputEl.value.trim();
  if (!text || getIsResponding()) return;

  if (getCurrentChatId() !== null) {
    setCurrentChatId(null);
    setActiveHistoryItem(null);
  }

  if (getWelcomeShown()) {
    messagesEl.replaceChildren();
    setWelcomeShown(false);
  }

  const rect = sendBtn.getBoundingClientRect();
  spawnSparkles(rect.left + rect.width / 2, rect.top + rect.height / 2);

  addMessage(text, 'user');
  inputEl.value = '';
  inputEl.style.height = 'auto';
  sendBtn.disabled = true;

  setIsResponding(true);
  showTyping();

  const currentSession = currentSessionToken();
  const delay = 1000 + Math.random() * 1500;

  setTimeout(() => {
    // If session changed, drop this response entirely
    if (currentSession !== currentSessionToken()) return;

    hideTyping();
    const response = getResponse(text);
    addMessage(response, 'ai');
    setIsResponding(false);
  }, delay);
}

// Debounced auto-resize
function autoResize() {
  if (resizeTimeout) cancelAnimationFrame(resizeTimeout);
  resizeTimeout = requestAnimationFrame(() => {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 150) + 'px';
  });
}

function toggleSidebar() {
  sidebar.classList.toggle('open');
  overlay.classList.toggle('show');
}

function showInfo() {
  modalBackdrop.classList.add('show');
}

function hideInfo() {
  modalBackdrop.classList.remove('show');
}

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
messagesEl.addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (chip && chip.dataset.text) {
    inputEl.value = chip.dataset.text;
    inputEl.dispatchEvent(new Event('input'));
    sendMessage();
  }
});

// ============ INIT ============
showWelcome();
setTimeout(() => inputEl.focus(), 300);
}

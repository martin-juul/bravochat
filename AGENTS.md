# AGENTS.md

## Project Overview
**Johnny GPT (Oh Mama Edition)** is a single-page, ChatGPT-style web application that parodies the AI chat experience using the persona and aesthetic of Johnny Bravo. Instead of real AI, it uses a rule-based response system to generate in-character jokes, pickup lines, and arrogant musings.

The project is designed to be lightweight, performant, and frameworkless (vanilla ES modules — no React, Vue, or other UI framework).

## Tech Stack & Constraints
- **Language:** HTML5, CSS3, Vanilla JavaScript (ES6+ modules)
- **Build tool:** Vite 8 (`package.json` devDependency) — serves the app and bundles it for production. Source maps are emitted in production builds (`vite.config.js`).
- **Test runner:** Vitest — zero-config; picks up `src/**/*.test.js`.
- **Rendering:** HTML5 Canvas (for background/particle effects), DOM manipulation (for UI).
- **Fonts:** Google Fonts (`Bowlby One SC` for display, `Nunito` for body text).
- **Commands:** `npm run dev` (dev server), `npm run build` (production build), `npm run preview` (serve the built output), `npx vitest run` (tests).
- **No UI frameworks, no additional dependencies** beyond Vite and Vitest.

## File Structure

```
index.html          Slim entry shell: fonts, static markup (sidebar, topbar, modal), links styles.css, loads /src/main.js
src/
  main.js           Entry point — calls initBackground() and initApp()
  ui/               Presentation layer (owns all chat-surface DOM access)
    dom.js            Shared element lookups + DOM helpers (scrollToBottom, autoResize, closeMobileSidebar)
    messages.js       Rendering: welcome screen, message bubbles, typing indicator, conversation rendering
    chat-flow.js      Orchestration: sendMessage, loadChatHistory, startNewChat, session-token race guard, chip clicks
    chrome.js         Sidebar/overlay/modal wiring + all event listeners (exports initApp)
    background.js     Canvas engine: atomic pattern, floating shapes, sparkle particles (exports initBackground, spawnSparkles)
  domain/           Pure, DOM-free logic
    responses.js      Response engine: keyword pools, typing phrases, getResponse routing
    histories.js      Pre-baked chat histories keyed by sidebar data-id
    state.js          App state: session token, currentChatId, isResponding, welcomeShown accessors
    responses.test.js Vitest unit tests for the response engine, histories, avatar, and state
  assets/
    styles.css       All application styles (theme variables, retro borders, responsive rules)
    avatar.js        Canonical Johnny Bravo SVG string
```

**Layering rule (Fowler's presentation/domain separation at folder scale):** dependencies run one way, `ui/ → domain/`, with `assets/` as leaves. **Module boundary rule:** `domain/` and `assets/` must stay DOM-free so tests can import them without a browser environment. All chat-surface DOM access lives in `ui/`; canvas DOM access lives in `ui/background.js`. Within `ui/`, `dom.js` owns element references, `messages.js` owns rendering, `chat-flow.js` owns orchestration and the session-token guard, and `chrome.js` owns event wiring.

## Architecture

### 1. Canvas Background System (`src/ui/background.js`)
All non-interactive visual effects are rendered on a single `<canvas id="bg-canvas">` to minimize DOM node count and avoid layout thrashing.
- **Animation Loop:** Uses a single `requestAnimationFrame` loop with delta-time normalization to ensure smooth, frame-rate-independent animation.
- **Rendered Elements:** The atomic background pattern, floating retro shapes (stars, rings), and the sparkle particle effects triggered on message send.
- **Resize Handling:** The canvas automatically scales with `devicePixelRatio` for high-definition rendering on retina displays.
- **Exports:** `initBackground()` wires resize handling and starts the loop; `spawnSparkles(x, y)` is called by `ui/chat-flow.js` on send.

### 2. Mock AI Response Engine (`src/domain/responses.js`)
There is no backend or API. Responses are pre-written and selected via regex keyword matching.
- **Categories:** `default`, `date`, `mama`, `muscle`, `hair`, `hello`.
- **Logic:** The `getResponse(userText)` function evaluates the user's input against a series of regular expressions. If a match is found, it pulls a random response from that specific category array; otherwise, it falls back to the `default` array.
- **Tests:** `src/domain/responses.test.js` covers category routing (including the greeting length guard), the default fallback, pool non-emptiness, history integrity, and the avatar markup.

### 3. State & Race Conditions (`src/domain/state.js`)
Because the app relies on `setTimeout` for the typing indicator, race conditions can occur if the user spams "New Chat" or clicks history items rapidly.
- **`sessionToken`:** An incrementing integer, exposed via `currentSessionToken()` / `incrementSessionToken()`. Every time a new chat is started or a history item is loaded, the token increments (exactly in `loadChatHistory` and `startNewChat` in `ui/chat-flow.js`). Pending `setTimeout` callbacks check if their captured token matches the current token before firing. If they don't match, the callback is silently dropped.
- **`currentChatId`:** Tracks which chat history is currently being viewed (or `null` if it's a new live chat).

### 4. Pre-baked Chat Histories (`src/domain/histories.js`)
The sidebar contains "Recent Chats." Clicking these loads hardcoded conversations from the `chatHistories` object, simulating a chat application's history feature. The keys match the `data-id` attributes of the sidebar history items in `index.html`.

## Performance Directives
When modifying or adding features, adhere to these performance rules:
1. **No Layout Thrashing:** Batch DOM read/writes. Use `requestAnimationFrame` for visual updates (e.g., scrolling to bottom).
2. **Efficient DOM Clearing:** Use `messagesEl.replaceChildren()` instead of `innerHTML = ''` to clear chat containers. It is significantly faster and triggers less garbage collection.
3. **Document Fragments:** When injecting multiple message nodes (like loading a chat history), build them in a `DocumentFragment` and append the fragment to the DOM in a single operation.
4. **Event Delegation:** Do not attach event listeners to individual chat items or suggestion chips. Use event delegation on the parent container (e.g., listening on `chat-history` and using `e.target.closest('.history-item')`).
5. **Canvas over DOM:** For any new animated, non-interactive background elements, add them to the `animateBg` Canvas loop in `background.js`. Do not create absolutely-positioned DOM nodes for background effects.

## Styling Guidelines (Johnny Bravo Theme)
- All styles live in `src/assets/styles.css`, with colors defined via CSS variables in `:root`.
  - Primary: `--yellow` (#FFD93D)
  - Secondary/Accent: `--pink` (#FF3D7F)
  - Background: `--bg-warm` (#FFE9C4)
  - Sidebar: Dark navy (`--sidebar-bg` #1A1F2E)
- **Borders & Shadows:** The aesthetic relies on chunky, retro borders (`3px` or `4px` solid `--black`) and hard offset drop shadows (e.g., `box-shadow: 0 4px 0 var(--black)`). Do not use soft, blurred box-shadows.
- **Border Radius:** UI elements use rounded corners (`12px` to `30px`), but message bubbles have an asymmetric radius (`border-bottom-left-radius: 4px`) to simulate a chat tail.

## SVG Avatar (`src/assets/avatar.js`)
The Johnny Bravo avatar is an exported SVG string (`johnnySVG`) drawn on a `100x120` viewBox.
- **Key Features:** Pompadour hair (attached to the face path, not hovering), black sunglasses, and a black shirt.
- It is injected into the welcome screen, AI message avatars, and the typing indicator by `ui/messages.js`. Slightly simpler static variants live inline in `index.html` (sidebar footer and topbar).
- If modifying the avatar, ensure the paths scale correctly at the welcome-screen size (120x144px) and message-avatar size (40x48px).

## Tone & Content Rules
- Johnny is arrogant, obsessed with his hair/mama/muscles, and constantly fails at dating.
- Use his characteristic vocabulary: "sugar", "toots", "mama", "baby", "handsome".
- Responses should be funny, slightly pathetic, but never genuinely offensive or inappropriate.

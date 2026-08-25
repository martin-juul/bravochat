# AGENTS.md

## Project Overview
**Chad GPT (Oh Mama Edition)** is a single-page, ChatGPT-style web application that parodies the AI chat experience using the persona and aesthetic of Johnny Bravo. Instead of real AI, it uses a rule-based response system to generate in-character jokes, pickup lines, and arrogant musings.

The project is designed to be lightweight, performant, and frameworkless (vanilla ES modules — no React, Vue, or other UI framework).

## Tech Stack & Constraints
- **Language:** HTML5, CSS3, TypeScript (ES2024+, strict-plus: `strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`) — typechecked by TypeScript 7 (native compiler) via `npm run typecheck`; Vite transpiles without typechecking.
- **Build tool:** Vite 8 (`package.json` devDependency) — serves the app and bundles it for production. Source maps are emitted in production builds (`vite.config.ts`).
- **Test runner:** Vitest (unit, `src/**/*.test.ts`) + Playwright (e2e, `tests/e2e/*.spec.ts`) — the e2e suite runs against `vite preview` in real Chromium/Firefox/WebKit/mobile.
- **Vitest/Playwright, TypeScript, and @types/node are the only allowed test/build dependencies;** nothing else ships to production.
- **Rendering:** HTML5 Canvas (for background/particle effects), DOM manipulation (for UI).
- **Fonts:** Google Fonts (`Bowlby One SC` for display, `Nunito` for body text).
- **Commands:** `npm run dev` (dev server), `npm run build` (production build), `npm run preview` (serve the built output), `npm test` (Vitest unit), `npm run test:e2e` (Playwright e2e, auto-builds and serves preview).
- **No UI frameworks, no additional dependencies** beyond Vite and Vitest.

## File Structure

```
index.html          Slim entry shell: fonts, static markup (sidebar, topbar, modal), links styles.css, loads /src/main.ts
public/            Static files Vite serves verbatim (favicon set, web manifest)
docs/
  solutions/       # documented solutions to past problems (bugs, best practices, workflow patterns), organized by category with YAML frontmatter (module, tags, problem_type)
src/
  main.ts           Entry point — calls initBackground() and initApp()
  vdom/             Mini Bravo DOM — hand-rolled keyed-diff virtual DOM (zero dependencies)
    core.ts           Pure vnode model + diff logic (h, diffChildren, diffProps): DOM-free, Node-testable
    core.test.ts      Vitest unit tests + op-count benchmarks (append = 1 insert, reverse = 0 DOM churn)
    dom.ts            DOM renderer: createEl/patchEl/patchChildren/ownContainer execute the diff plans
  ui/               Presentation layer (owns all chat-surface DOM access)
    dom.ts            Shared element lookups + DOM helpers (scrollToBottom, autoResize, closeMobileSidebar)
    messages.ts       Rendering via the vdom: a message-list data model derives vnodes; keyed patches mutate the DOM (welcome screen, bubbles, typing indicator)
    chat-flow.ts      Orchestration wiring: UI commands into the engine, engine events into rendering, persistence recording (initChatFlow)
    sidebar-chats.ts  vdom-rendered "Your Chats, Sugar" section for persisted chats (keyed, below the fakes)
    chrome.ts         Sidebar/overlay/modal wiring + all event listeners (exports initApp)
    background.ts     Canvas engine: atomic pattern, floating shapes, sparkle particles (exports initBackground, spawnSparkles)
  domain/           Pure, DOM-free logic
    responses.ts      Response engine: keyword pools, typing phrases, getResponse routing
    engine.ts         Conversation engine: session-token race guard, response scheduling, chat switching, event subscriptions (DOM-free)
    engine.test.ts    Vitest unit tests for the conversation engine (race guards, scheduling, events)
    chat-store.ts     Persisted-chat store: 3-message threshold, 10-chat cap with oldest-first eviction, injectable storage seam (DOM-free)
    titles.ts         Deterministic rule-based chat titles: dominant-category label + Johnny garnish (DOM-free)
    histories.ts      Pre-baked chat histories keyed by sidebar data-id
    responses.test.ts Vitest unit tests for the response engine, histories, and avatar
    chat-store.test.ts Vitest unit tests for the persistence store (threshold, titles, eviction, round-trip)
  assets/
    styles.css       All application styles (theme variables, retro borders, responsive rules)
    avatar.ts        Canonical Johnny Bravo SVG string
```

**Layering rule (Fowler's presentation/domain separation at folder scale):** dependencies run one way, `ui/ → vdom/ → domain/`, with `assets/` as leaves. **Module boundary rule:** `domain/`, `vdom/core.ts`, and `assets/` must stay DOM-free — enforced by the DOM-less base `tsconfig.json` (`src/domain`, `src/vdom/core.ts`, `src/assets` compile without the DOM lib) — so tests can import them without a browser environment. Shared types are colocated with their owning module (engine events in `src/domain/engine.ts`, vnodes in `src/vdom/core.ts`); there is no central types folder. `vdom/dom.ts` owns all vdom DOM access; all other chat-surface DOM access lives in `ui/`; canvas DOM access lives in `ui/background.ts`. Within `ui/`, `dom.ts` owns element references, `messages.ts` owns rendering (including UI-only state like `welcomeShown`) through the vdom render entry point, `chat-flow.ts` owns wiring between engine commands/events and rendering, and `chrome.ts` owns event wiring.

## Architecture

### 1. Canvas Background System (`src/ui/background.ts`)
All non-interactive visual effects are rendered on a single `<canvas id="bg-canvas">` to minimize DOM node count and avoid layout thrashing.
- **Animation Loop:** Uses a single `requestAnimationFrame` loop with delta-time normalization to ensure smooth, frame-rate-independent animation.
- **Rendered Elements:** The atomic background pattern, floating retro shapes (stars, rings), and the sparkle particle effects triggered on message send.
- **Resize Handling:** The canvas automatically scales with `devicePixelRatio` for high-definition rendering on retina displays.
- **Exports:** `initBackground()` wires resize handling and starts the loop; `spawnSparkles(x, y)` is called by `ui/chat-flow.ts` on send.

### 2. Mock AI Response Engine (`src/domain/responses.ts`)
There is no backend or API. Responses are pre-written and selected via regex keyword matching.
- **Categories:** `default`, `date`, `mama`, `muscle`, `hair`, `hello`.
- **Logic:** The `getResponse(userText)` function evaluates the user's input against a series of regular expressions. If a match is found, it pulls a random response from that specific category array; otherwise, it falls back to the `default` array.
- **Tests:** `src/domain/responses.test.ts` covers category routing (including the greeting length guard), the default fallback, pool non-emptiness, history integrity, and the avatar markup.

### 3. Conversation Engine (`src/domain/engine.ts`)
Because the app relies on `setTimeout` for the typing indicator, race conditions can occur if the user spams "New Chat" or clicks history items rapidly.
- **DOM-free engine:** `src/domain/engine.ts` owns the session token, responding state, last-user-message memory, and chat switching. It exposes commands (`send`, `regenerate`, `startNewChat`, `loadHistory`) and a callback subscription API emitting `typing-started`, `response-ready`, `session-invalidated`, `chat-reset`, and `history-loaded` events.
- **`sessionToken`:** An incrementing integer internal to the engine. Every `startNewChat` or `loadHistory` invalidates pending scheduled responses; scheduled callbacks check their captured token against the current one before firing. If they don't match, the callback is silently dropped (the `session-invalidated` event still fires so the UI can clean up the typing indicator).
- **UI subscription:** `src/ui/chat-flow.ts` subscribes once (`initChatFlow`) and performs all presentation effects in reaction to engine events. Commands emit synchronously; the UI renders the user bubble before calling `send`.
- **`currentChatId`:** Tracks which chat history is currently being viewed (or `null` for a new live chat); cleared by `startNewChat`, which makes the same-history re-click guard plain id equality. `welcomeShown` is UI-only state in `src/ui/messages.ts`.
- **Tests:** `src/domain/engine.test.ts` covers race guards, scheduling ranges, no-op guards, and event emission with fake timers and no DOM.

### 4. Pre-baked Chat Histories (`src/domain/histories.ts`)
The sidebar contains "Recent Chats." Clicking these loads hardcoded conversations from the `chatHistories` object, simulating a chat application's history feature. The keys match the `data-id` attributes of the sidebar history items in `index.html`.

## Performance Directives
When modifying or adding features, adhere to these performance rules:
1. **No Layout Thrashing:** Batch DOM read/writes. Use `requestAnimationFrame` for visual updates (e.g., scrolling to bottom).
2. **Efficient DOM Clearing:** Use `messagesEl.replaceChildren()` instead of `innerHTML = ''` to clear chat containers. It is significantly faster and triggers less garbage collection.
3. **Document Fragments:** When injecting multiple message nodes outside the vdom path, build them in a `DocumentFragment` and append the fragment to the DOM in a single operation. For message-list rendering, keyed-patch rendering through `src/vdom/dom.ts` supersedes manual fragment batching.
4. **Event Delegation:** Do not attach event listeners to individual chat items or suggestion chips. Use event delegation on the parent container (e.g., listening on `chat-history` and using `e.target.closest('.history-item')`).
5. **Canvas over DOM:** For any new animated, non-interactive background elements, add them to the `animateBg` Canvas loop in `background.ts`. Do not create absolutely-positioned DOM nodes for background effects.

## Styling Guidelines (Johnny Bravo Theme)
- All styles live in `src/assets/styles.css`, with colors defined via CSS variables in `:root`.
  - Primary: `--yellow` (#FFD93D)
  - Secondary/Accent: `--pink` (#FF3D7F)
  - Background: `--bg-warm` (#FFE9C4)
  - Sidebar: Dark navy (`--sidebar-bg` #1A1F2E)
- **Borders & Shadows:** The aesthetic relies on chunky, retro borders (`3px` or `4px` solid `--black`) and hard offset drop shadows (e.g., `box-shadow: 0 4px 0 var(--black)`). Do not use soft, blurred box-shadows.
- **Border Radius:** UI elements use rounded corners (`12px` to `30px`), but message bubbles have an asymmetric radius (`border-bottom-left-radius: 4px`) to simulate a chat tail.

## SVG Avatar (`src/assets/avatar.ts`)
The Johnny Bravo avatar is an exported SVG string (`johnnySVG`) drawn on a `100x120` viewBox.
- **Key Features:** Pompadour hair (attached to the face path, not hovering), black sunglasses, and a black shirt.
- It is injected into the welcome screen, AI message avatars, and the typing indicator by `ui/messages.ts`. Slightly simpler static variants live inline in `index.html` (sidebar footer and topbar).
- If modifying the avatar, ensure the paths scale correctly at the welcome-screen size (120x144px) and message-avatar size (40x48px).

## Tone & Content Rules
- **Voice:** see `docs/johnny-personality.md` — the canonical Johnny Bravo voice profile for writing new jokes, responses, and in-character copy. Key dynamic: Johnny is on top, the developer/user is the straight man ("he makes the code work, but I get all the action").
- Johnny is arrogant, obsessed with his hair/mama/muscles, and constantly fails at dating.
- Use his characteristic vocabulary: "sugar", "toots", "mama", "baby", "handsome".
- Responses should be funny, slightly pathetic, but never genuinely offensive or inappropriate.

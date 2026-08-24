---
title: "Modular src/ Restructure - Plan"
type: refactor
date: 2026-08-24
topic: src-modular-restructure
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-brainstorm
execution: code
---

# Modular src/ Restructure - Plan

## Goal Capsule

- **Objective:** Contributors can navigate and extend the app through concern-separated modules under `src/` instead of a 1,680-line single file, with the repo's docs truthfully describing that structure and the response engine covered by a unit test.
- **Means:** Split `index.html` into ES modules per concern plus separated CSS, served by the existing Vite setup (KTD1).
- **Product authority:** User request (2026-08-24 dialogue); supersedes AGENTS.md's single-file constraint.
- **Stop conditions:** All requirements R1–R9 satisfied; build green; behavior identical; docs rewritten.
- **Open blockers:** None.

---

## Product Contract

### Summary

Purely structural refactor of the single-file app into `src/` ES modules split by concern, with separated CSS, a slim HTML entry, rewritten AGENTS.md, and a response-engine unit test — verified through Vite with zero behavior change.

### Problem Frame

The whole app — theme CSS, canvas engine, response engine, chat UI, mock histories, and state — lives in one 1,680-line `index.html`. Changes require navigating an undifferentiated file, and the repo's guidance locks in that pain. There are no tests and no build verification, so regressions are invisible until manually observed in a browser. The codebase has outgrown its container.

### Requirements

**Structure**

- R1. All application JavaScript lives in ES modules under `src/`, split by concern: canvas background engine, mock AI response engine, chat UI logic, pre-baked chat histories, and app state (session token / current chat tracking).
- R2. All CSS lives in separated stylesheet file(s) under `src/`, preserving the existing theme variables and retro styling rules verbatim.
- R3. The root HTML is a slim entry document that loads the application through the build setup, containing no inline application logic or styles beyond what the entry requires.
- R4. The existing Vite configuration serves the restructured app: `npm run dev` and `npm run build` both succeed with the new structure.

**Behavior preservation**

- R5. The refactor is purely structural: responses, canvas effects, chat flows, styling, and interaction states behave identically to the current single-file version.
- R6. The race-condition guards (`sessionToken` invalidation on chat switch, `currentChatId` tracking) survive the split with the same semantics.
- R7. The performance directives from the current AGENTS.md (fragments over innerHTML, event delegation, `replaceChildren`, single canvas rAF loop) are preserved in the restructured code.

**Tests and docs**

- R8. The response engine has a lightweight unit test covering keyword-category routing and the default fallback.
- R9. AGENTS.md is rewritten to describe the new file structure, module boundaries, build commands, and test setup truthfully, replacing the single-file constraint and zero-dependency claims.

### Key Decisions

- **Vite build step over the zero-dependency single file** (session-settled: user-approved — chosen over keeping the single file: module maintainability outweighs the "open index.html anywhere" property; Vite already exists in `package.json`). Governs R1, R4, R9.
- **Concern-based module split, granularity per the lean layout** — the exact module layout is owned by KTD2. Governs R1.
- **AGENTS.md owns the identity change explicitly** — the docs rewrite states the build-tool dependency rather than quietly contradicting the old constraint. Governs R9.
- **Test the response engine only** — the highest-value, most testable pure logic; UI and canvas code stay untested to avoid ceremony disproportionate to app size. Governs R8.

### Success Criteria

- `npm run build` succeeds with zero errors; the built app functions identically to the current version when exercised manually (chat send, history load, new chat, sidebar toggle, sparkle effect).
- The response engine unit test passes and covers each response category plus the fallback path.
- AGENTS.md contains no reference to the single-file or zero-dependency constraints; a new contributor reading it can locate each concern's module.

### Scope Boundaries

- No behavior, visual, or content changes of any kind — any noticed difference is a defect of this refactor.
- No new features: no persistence, no real AI integration, no router, no new UI.
- No additional test coverage beyond the response engine unit test (R8); no E2E or visual regression tooling.
- No linting/formatting tooling beyond what already exists.

Product Contract unchanged from brainstorm; KTD2 concretizes the layout the brainstorm deferred.

---

## Planning Contract

### Key Technical Decisions

- KTD1. **Vite as the module loader and build entry** (session-settled: user-approved — chosen over keeping the single file: maintainability outweighs zero-dependency portability; Vite ^8.2.2 is already a devDependency). The root `index.html` keeps its Google Fonts links, references `src/main.js` via `<script type="module">`, and links `src/styles.css`. No Vite config file is needed — the defaults consume this layout. Governs R3, R4.
- KTD2. **Lean concern-based layout — one module per concern, no nested feature folders.** The app is ~700 lines of JS across five concerns; `src/background.js`, `src/responses.js`, `src/histories.js`, `src/state.js`, `src/ui.js`, plus `src/avatar.js` for the shared SVG string and `src/main.js` as the wiring entry. Flat `src/` beats folder-per-feature at this size (YAGNI). Governs R1.
- KTD3. **DOM-free data modules.** `responses.js` (pools, categories, `getResponse`), `histories.js` (pre-baked conversations), and `avatar.js` contain no `document` references, making them importable by tests without a DOM. `ui.js` and `background.js` own the DOM access for their concerns (chat UI and canvas respectively); the data modules contain none. Governs R1, R8.
- KTD4. **State stays module-local in `state.js`** — the session token, `currentChatId`, `isResponding`, and `welcomeShown` live in one module exposing getters/mutators; `sessionToken` invalidation semantics are preserved exactly (increment on new chat and on history load; pending `setTimeout` callbacks capture and compare before firing). Governs R6.
- KTD5. **Vitest as the test runner** (session-settled: user-approved — chosen over a dependency-free Node assert script: the Vite-native runner shares config and transforms with the app for one devDependency; an ad-hoc script would not). Zero-config: Vitest picks up `src/*.test.js` with no config file. Governs R8.

### Assumptions

- The inline avatar SVG variants (footer 3px vs topbar 4px stroke) are near-identical; `avatar.js` exports the canonical full-detail string, and the two HTML copies in the static shell stay as-is. Any drift is invisible at 26–32px render size.
- `package.json`'s `"type": "commonjs"` does not affect Vite/Vitest, which process source files independently.

---

## Implementation Units

### U1. Scaffold the module skeleton and move CSS

- **Goal:** `index.html` becomes a slim shell loading `src/styles.css` and `src/main.js`; Vite serves it.
- **Requirements:** R2, R3, R4
- **Dependencies:** none
- **Files:** `index.html`, `src/styles.css`, `src/main.js`
- **Approach:**
  1. Move the entire `<style>` block verbatim to `src/styles.css`; replace with a `<link>` in `<head>`.
  2. Delete the inline `<script>`; add `<script type="module" src="/src/main.js"></script>`.
  3. Create `src/main.js` as an empty entry placeholder.
  4. Confirm `npm run dev` serves the static shell (JS not yet functional is expected at this checkpoint).
- **Patterns to follow:** Vite defaults for index.html-at-root + `/src/main.js`.
- **Test expectation:** none — scaffolding; verified by U6's build gate.
- **Verification:** `npm run dev` loads the page with styling intact and no console errors beyond the missing logic.

### U2. Extract DOM-free data modules

- **Goal:** Response engine, histories, and avatar live as importable DOM-free modules.
- **Requirements:** R1, R8
- **Dependencies:** U1
- **Files:** `src/responses.js`, `src/histories.js`, `src/avatar.js`, `src/responses.test.js`, `package.json`
- **Approach:**
  1. Move the `responses` object, `typingPhrases`, and `getResponse` into `src/responses.js`; export `getResponse`, `responses`, and `typingPhrases`.
  2. Install Vitest as a devDependency (`npm install -D vitest`).
  3. Move `chatHistories` into `src/histories.js`; export it.
  4. Move the `johnnySVG` string into `src/avatar.js`; export it.
  5. Preserve every regex, string, and function body byte-for-byte.
- **Patterns to follow:** plain ES module exports; no classes or factories — the app is procedural.
- **Test scenarios:**
  - `getResponse("hello")` returns a string from the `hello` pool.
  - `getResponse("tell me about your mama")` returns from the `mama` pool.
  - `getResponse("what's your workout routine")` returns from the `muscle` pool.
  - `getResponse("how do I get hair like that")` returns from the `hair` pool.
  - `getResponse("want to go on a date")` returns from the `date` pool.
  - `getResponse("quantum chromodynamics")` returns from the `default` pool.
  - Greeting regex respects the length guard: a long sentence containing "hello" does not match the `hello` pool.
  - All pools non-empty; every category key routes to a non-empty array.
- **Verification:** `npx vitest run` passes; modules import cleanly with no `document` access.

### U3. Extract state module

- **Goal:** Session/race-condition state lives in one module with preserved semantics.
- **Requirements:** R1, R6
- **Dependencies:** U1
- **Files:** `src/state.js`
- **Approach:**
  1. Move `isResponding`, `welcomeShown`, `currentChatId`, `sessionToken` into `src/state.js` with accessor functions (`incrementSessionToken`, `currentSessionToken`, and simple getters/setters).
  2. Keep increment sites exactly where they are today: `loadChatHistory` and `startNewChat`.
- **Execution note:** Characterization before modification is overkill at this size; instead, U6's manual race check (rapid New Chat + history clicks) verifies R6 behaviorally.
- **Test expectation:** none — thin state holder; covered by U6's manual flows.
- **Verification:** state.js imports cleanly under `npx vitest run` (no DOM); the token starts at 0 and increments.

### U4. Extract background canvas engine

- **Goal:** The canvas system (resize, atomic pattern, floating shapes, sparkles) is a self-contained module.
- **Requirements:** R1, R7
- **Dependencies:** U1
- **Files:** `src/background.js`
- **Approach:**
  1. Move `resizeBgCanvas`, `bgShapes`, `sparkles`, `drawStar`, `spawnSparkles`, `animateBg`, and their listeners into `src/background.js`.
  2. Export `initBackground()` (wires resize + starts the rAF loop) and `spawnSparkles`.
  3. Preserve the single `requestAnimationFrame` loop with delta-time normalization and the devicePixelRatio scaling.
- **Patterns to follow:** existing code verbatim; module boundary is the only change.
- **Test expectation:** none — canvas rendering; verified in U6's visual check.
- **Verification:** Module-level check only at this checkpoint (imports cleanly, no UI wiring yet); visual background, pattern, shapes, and sparkle checks run in U5's full-app check and U6's visual parity.

### U5. Extract chat UI and wire the entry

- **Goal:** All remaining UI logic (`showWelcome` through the event listeners) moves to `src/ui.js`, initialized by `src/main.js`.
- **Requirements:** R1, R5, R6, R7
- **Dependencies:** U2, U3, U4
- **Files:** `src/ui.js`, `src/main.js`
- **Approach:**
  1. Move all element lookups, `showWelcome`, `setActiveHistoryItem`, `loadChatHistory`, `createMessageElement`, `addMessage`, `showTyping`/`hideTyping`, `scrollToBottom`, `startNewChat`, `sendMessage`, `autoResize`, `toggleSidebar`, `showInfo`/`hideInfo`, and the event-listener block into `src/ui.js`.
  2. Import `getResponse`/`typingPhrases`, `chatHistories`, `johnnySVG`, the state accessors, and `spawnSparkles` from `background.js`.
  3. Export `initApp()`; `main.js` calls `initBackground()` then `initApp()`.
  4. Preserve the performance directives: `replaceChildren` for clears, `DocumentFragment` for history loads, event delegation on `chat-history` and `messages`, `requestAnimationFrame`-batched scrolling.
- **Test expectation:** none — DOM-heavy; behavior verified in U6.
- **Verification:** Full app works in dev server: welcome screen, chips, send flow with typing indicator and sparkle, history loading with switching animation, modal, mobile sidebar.

### U6. Verify parity and production build

- **Goal:** Green production build plus a behavior-parity pass against the pre-refactor app.
- **Requirements:** R4, R5, R6, R7
- **Dependencies:** U5
- **Files:** none (verification unit)
- **Approach:**
  1. `npm run build` and `npm run preview`; exercise the built output.
  2. Manual parity checklist against the original: welcome/chips, send + typing + sparkles, all seven history items, New Chat / Clear, rapid New Chat + history spam (no stale responses — R6), modal open/close, mobile viewport sidebar + overlay, textarea auto-resize and Enter-to-send.
- **Test expectation:** none — manual verification unit.
- **Verification:** Build exits 0; every checklist item behaves as before the refactor.

### U7. Rewrite AGENTS.md

- **Goal:** Repo guidance describes the new structure truthfully.
- **Requirements:** R9
- **Dependencies:** U6 (describes the final structure)
- **Files:** `AGENTS.md`
- **Approach:**
  1. Replace the single-file and zero-dependency constraint sections with the new structure: `src/` module map (background, responses, histories, state, avatar, ui, main), CSS location, build/test commands (`npm run dev`, `npm run build`, `npx vitest run`).
  2. Keep the architecture, performance-directive, styling, SVG, and tone sections — they still govern, now pointing at modules instead of the single file.
  3. State the build-tool dependency openly per the Key Decision.
- **Test expectation:** none — documentation.
- **Verification:** No stale references to `index.html`-contained code; a new contributor could locate each concern's module from the doc alone.

---

## Verification Contract

| Gate | Command / check | Units covered |
|---|---|---|
| Unit tests | `npx vitest run` | U2 (response engine routing + fallback) |
| Production build | `npm run build` exits 0 | U1–U6 |
| Preview smoke | `npm run preview`, load app | U6 |
| Manual parity checklist | The U6 checklist, all items pass | U5, U6 (R5–R7) |
| Docs accuracy | U7's check — no stale single-file/zero-dependency references; each concern's module locatable from AGENTS.md | U7 |

---

## Definition of Done

- All of R1–R9 hold: modules split per concern, CSS separated, slim entry, green build/dev, identical behavior, preserved race guards and performance directives, response-engine test passing, AGENTS.md rewritten.
- No dead code from the split remains: `index.html` carries no orphaned script/style remnants, and no module exports anything unused.
- The working tree contains no leftover scaffolding or experimental files from the refactor.

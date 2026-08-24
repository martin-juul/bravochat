# AGENTS.md

## Project Overview
**Johnny GPT (Oh Mama Edition)** is a single-page, ChatGPT-style web application that parodies the AI chat experience using the persona and aesthetic of Johnny Bravo. Instead of real AI, it uses a rule-based response system to generate in-character jokes, pickup lines, and arrogant musings. 

The project is designed to be entirely self-contained, performant, and frameworkless.

## Tech Stack & Constraints
- **Language:** HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Rendering:** HTML5 Canvas (for background/particle effects), DOM manipulation (for UI).
- **Fonts:** Google Fonts (`Bowlby One SC` for display, `Nunito` for body text).
- **External Dependencies:** None. No build tools, no npm packages, no frameworks (React, Vue, etc.). 
- **File Structure:** The entire application resides in a single `index.html` file. Do not split into separate CSS/JS files unless specifically requested.

## Architecture & State Management

### 1. Canvas Background System
All non-interactive visual effects are rendered on a single `<canvas id="bg-canvas">` to minimize DOM node count and avoid layout thrashing.
- **Animation Loop:** Uses a single `requestAnimationFrame` loop with delta-time normalization to ensure smooth, frame-rate-independent animation.
- **Rendered Elements:** The atomic background pattern, floating retro shapes (stars, rings), and the sparkle particle effects triggered on message send.
- **Resize Handling:** The canvas automatically scales with `devicePixelRatio` for high-definition rendering on retina displays.

### 2. Mock AI Response Engine
There is no backend or API. Responses are pre-written and selected via regex keyword matching.
- **Categories:** `default`, `date`, `mama`, `muscle`, `hair`, `hello`.
- **Logic:** The `getResponse(userText)` function evaluates the user's input against a series of regular expressions. If a match is found, it pulls a random response from that specific category array; otherwise, it falls back to the `default` array.

### 3. State & Race Conditions
Because the app relies on `setTimeout` for the typing indicator, race conditions can occur if the user spams "New Chat" or clicks history items rapidly.
- **`sessionToken`:** An incrementing integer. Every time a new chat is started or a history item is loaded, the token increments. Pending `setTimeout` callbacks check if their captured token matches the current token before firing. If they don't match, the callback is silently dropped.
- **`currentChatId`:** Tracks which chat history is currently being viewed (or `null` if it's a new live chat).

### 4. Pre-baked Chat Histories
The sidebar contains "Recent Chats." Clicking these loads hardcoded conversations from the `chatHistories` object, simulating a chat application's history feature. 

## Performance Directives
When modifying or adding features, adhere to these performance rules:
1. **No Layout Thrashing:** Batch DOM read/writes. Use `requestAnimationFrame` for visual updates (e.g., scrolling to bottom).
2. **Efficient DOM Clearing:** Use `messagesEl.replaceChildren()` instead of `innerHTML = ''` to clear chat containers. It is significantly faster and triggers less garbage collection.
3. **Document Fragments:** When injecting multiple message nodes (like loading a chat history), build them in a `DocumentFragment` and append the fragment to the DOM in a single operation.
4. **Event Delegation:** Do not attach event listeners to individual chat items or suggestion chips. Use event delegation on the parent container (e.g., listening on `chat-history` and using `e.target.closest('.history-item')`).
5. **Canvas over DOM:** For any new animated, non-interactive background elements, add them to the `animateBg` Canvas loop. Do not create absolutely-positioned DOM nodes for background effects.

## Styling Guidelines (Johnny Bravo Theme)
- **Colors:** Defined via CSS variables in `:root`. 
  - Primary: `--yellow` (#FFD93D)
  - Secondary/Accent: `--pink` (#FF3D7F)
  - Background: `--bg-warm` (#FFE9C4)
  - Sidebar: Dark navy (`--sidebar-bg` #1A1F2E)
- **Borders & Shadows:** The aesthetic relies on chunky, retro borders (`3px` or `4px` solid `--black`) and hard offset drop shadows (e.g., `box-shadow: 0 4px 0 var(--black)`). Do not use soft, blurred box-shadows.
- **Border Radius:** UI elements use rounded corners (`12px` to `30px`), but message bubbles have an asymmetric radius (`border-bottom-left-radius: 4px`) to simulate a chat tail.

## SVG Avatar
The Johnny Bravo avatar is an inline SVG string (`johnnySVG`) injected into the DOM. It is drawn on a `100x120` viewBox. 
- **Key Features:** Pompadour hair (attached to the face path, not hovering), black sunglasses, and a black shirt. 
- If modifying the avatar, ensure the paths scale correctly within the sidebar footer (`32x38px`), the topbar (`26x31px`), and the welcome screen (`120x144px`).

## Tone & Content Rules
- Johnny is arrogant, obsessed with his hair/mama/muscles, and constantly fails at dating.
- Use his characteristic vocabulary: "sugar", "toots", "mama", "baby", "handsome".
- Responses should be funny, slightly pathetic, but never genuinely offensive or inappropriate.

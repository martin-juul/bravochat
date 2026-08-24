/**
 * @file App state: chat session tracking and race-condition guards.
 * `sessionToken` invalidates pending setTimeout responses when the user
 * switches chats; pending callbacks capture the token and compare before firing.
 */

/** @type {boolean} */
let isResponding = false;
/** @type {boolean} */
let welcomeShown = true;
/** @type {string | null} key into `chatHistories`, or null for a live chat */
let currentChatId = null;
/** @type {number} */
let sessionToken = 0;

/** @returns {boolean} whether a mock AI response is currently pending */
export const getIsResponding = () => isResponding;

/** @param {boolean} v */
export const setIsResponding = (v) => {
  isResponding = v;
};

/** @returns {boolean} whether the welcome screen is currently rendered */
export const getWelcomeShown = () => welcomeShown;

/** @param {boolean} v */
export const setWelcomeShown = (v) => {
  welcomeShown = v;
};

/** @returns {string | null} the active chat-history key, or null for a live chat */
export const getCurrentChatId = () => currentChatId;

/** @param {string | null} id */
export const setCurrentChatId = (id) => {
  currentChatId = id;
};

/** @returns {number} the current session token */
export const currentSessionToken = () => sessionToken;

/** Invalidates all in-flight callbacks that captured an older token. */
export const incrementSessionToken = () => {
  sessionToken++;
};

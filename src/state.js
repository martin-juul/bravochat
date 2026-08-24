// App state: chat session tracking and race-condition guards.
// sessionToken invalidates pending setTimeout responses when the user
// switches chats; pending callbacks capture the token and compare before firing.

let isResponding = false;
let welcomeShown = true;
let currentChatId = null;
let sessionToken = 0;

export const getIsResponding = () => isResponding;
export const setIsResponding = (v) => { isResponding = v; };

export const getWelcomeShown = () => welcomeShown;
export const setWelcomeShown = (v) => { welcomeShown = v; };

export const getCurrentChatId = () => currentChatId;
export const setCurrentChatId = (id) => { currentChatId = id; };

export const currentSessionToken = () => sessionToken;
export const incrementSessionToken = () => { sessionToken++; };

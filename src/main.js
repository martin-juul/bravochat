// Application entry: wire the background engine and the chat UI.
import { initBackground } from './ui/background.js';
import { initApp } from './ui/chrome.js';

initBackground();
initApp();

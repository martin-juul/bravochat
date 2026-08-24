// Application entry: wire the background engine and the chat UI.
import { initBackground } from './background.js';
import { initApp } from './ui.js';

initBackground();
initApp();

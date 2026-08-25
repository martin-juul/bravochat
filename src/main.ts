/** Application entry: wire the background engine and the chat UI. */
import { initBackground } from './ui/background';
import { initApp } from './ui/chrome';

initBackground();
initApp();

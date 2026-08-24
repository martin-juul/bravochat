/**
 * @file Title derivation for persisted chats: rule-based, deterministic.
 * Plain factual labels from the conversation's dominant routing category,
 * with a Johnny-flavored garnish for the hover text. No randomization (R5–R7).
 */

import { extractMention } from './responses.js';

/** Routing category regexes, mirroring getResponse()'s order in responses.js. */
const categoryPatterns = [
  ['date', /\b(date|dating|girl|girls|lady|ladies|love|kiss|romance|crush|girlfriend|boyfriend|relationship)\b/i],
  ['mama', /\b(mama|mom|mother|mommy)\b/i],
  ['hair', /\b(hair|pompadour|style|hairstyle|hairspray|gel)\b/i],
  ['muscle', /\b(muscle|muscles|gym|strong|workout|lift|bicep|biceps|flex|fitness|ripped|buff)\b/i],
  ['hello', /\b(hi|hello|hey|yo|sup|howdy|greetings)\b/i],
];

/** Plain visible labels per dominant category (R5). */
const categoryLabels = {
  date: 'Dating advice',
  mama: 'Mama stories',
  hair: 'Hair care tips',
  muscle: 'Workout talk',
  hello: 'Greetings',
};

/** Johnny garnish per category, surfaced as the item's hover text (R6). */
const categoryGarnishes = {
  date: '100% date-tested, sugar',
  mama: "Mama approved. Obviously. She's a saint",
  hair: 'Certified 47 minutes of spray',
  muscle: '100% bicep-related',
  hello: 'A confident entrance, every time',
  default: " Johnny was paying attention. Sort of",
};

/**
 * Derive a plain title from the conversation's user messages (R5).
 * Counts routing-category hits, dominant wins; ties break by first-seen
 * category for determinism. Falls back to a capitalized extracted mention,
 * then "Chat with Johnny". Deterministic for a given message list.
 * @param {{ text: string }[]} messages the conversation's messages
 * @returns {string} the visible title
 */
export function deriveTitle(messages) {
  const counts = new Map();
  let firstSeen = [];

  for (const msg of messages) {
    const text = typeof msg === 'string' ? msg : msg.text;
    if (!text) continue;
    for (const [category, pattern] of categoryPatterns) {
      if (pattern.test(text)) {
        if (!counts.has(category)) firstSeen.push(category);
        counts.set(category, (counts.get(category) || 0) + 1);
        break; // one hit per message keeps dominance proportional to messages
      }
    }
  }

  let best = null;
  let bestCount = 0;
  for (const category of firstSeen) {
    const count = counts.get(category);
    if (count > bestCount) {
      best = category;
      bestCount = count;
    } // ties: earlier first-seen category wins (deterministic)
  }

  if (best) return categoryLabels[best];

  const firstUser = messages.map((m) => (typeof m === 'string' ? m : m.text)).find(Boolean) || '';
  const mention = extractMention(firstUser);
  if (mention) return mention.charAt(0).toUpperCase() + mention.slice(1);

  return 'Chat with Johnny';
}

/**
 * The Johnny garnish for a conversation's hover text (R6).
 * @param {{ text: string }[]} messages
 * @returns {string} garnish appended to the plain title in the title attribute
 */
export function garnishFor(messages) {
  let garnish = categoryGarnishes.default;
  for (const msg of messages) {
    const text = typeof msg === 'string' ? msg : msg.text;
    if (!text) continue;
    for (const [category, pattern] of categoryPatterns) {
      if (pattern.test(text)) { garnish = categoryGarnishes[category]; break; }
    }
  }
  return garnish;
}

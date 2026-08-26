/**
 * @file Title derivation for persisted chats: rule-based, deterministic.
 * Plain labels from the dominant routing category + Johnny garnish.
 */

import { extractMention, routingPatterns, type ResponseCategory } from './responses';

/** Title categories reuse the response-engine routing categories. */
type TitleCategory = Exclude<ResponseCategory, 'default'>;

/** Case-insensitive variants of the canonical routing patterns (titles match raw text). */
const categoryPatterns: [TitleCategory, RegExp][] = routingPatterns.map(
  ([category, pattern]) => [category, new RegExp(pattern.source, 'i')],
);

/** Plain visible labels per dominant category. */
const categoryLabels = {
  date: 'Dating advice',
  mama: 'Mama stories',
  hair: 'Hair care tips',
  muscle: 'Workout talk',
  hello: 'Greetings',
} satisfies Record<TitleCategory, string>;

/** Johnny garnish per category, surfaced as hover text. */
const categoryGarnishes = {
  date: '100% date-tested, sugar',
  mama: "Mama approved. Obviously. She's a saint",
  hair: 'Certified 47 minutes of spray',
  muscle: '100% bicep-related',
  hello: 'A confident entrance, every time',
  default: " Johnny was paying attention. Sort of",
} satisfies Record<TitleCategory | 'default', string>;

/** Derive a plain title from user messages: dominant routing category wins
 * (ties break by first-seen for determinism); falls back to a capitalized
 * extracted mention, then "Chat with Johnny". */
export function deriveTitle(messages: { text: string }[]): string {
  const counts = new Map<TitleCategory, number>();
  let firstSeen: TitleCategory[] = [];

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

  let best: TitleCategory | null = null;
  let bestCount = 0;
  for (const category of firstSeen) {
    const count = counts.get(category) ?? 0;
    if (count > bestCount) {
      best = category;
      bestCount = count;
    } // ties: earlier first-seen category wins (deterministic)
  }

  if (best) return categoryLabels[best];

  const firstUser = messages.map((m) => (typeof m === 'string' ? m : m.text)).find(Boolean) ?? '';
  const mention = extractMention(firstUser);
  if (mention) return mention.charAt(0).toUpperCase() + mention.slice(1);

  return 'Chat with Johnny';
}

/** The Johnny garnish for a conversation's hover text. */
export function garnishFor(messages: { text: string }[]): string {
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

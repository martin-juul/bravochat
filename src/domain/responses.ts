/**
 * @file Rule-based response engine: keyword pools + routing (pure, DOM-free).
 */

/** Response pool categories, mirroring `getResponse` routing. */
export type ResponseCategory = 'default' | 'date' | 'mama' | 'muscle' | 'hair' | 'hello';

/** Response pools keyed by category. `default` is the fallback pool. */
export const responses: Record<ResponseCategory, string[]> = {
  default: [
    'Oh, mama! Did you just ask ME a question? Well buckle up, sugar, \'cause the answer is gonna be smoother than my hair after a fresh can of hairspray! *flexes* The answer is... YES. Always yes. Unless you\'re asking if I\'ve ever been turned down. Then the answer is also yes, but we don\'t talk about those times. *sniff*',
    'Hey there, sweet cheeks! I\'d love to answer that, but my calendar\'s booked solid with being handsome. Tomorrow? Also booked. Next week? Lookin\' pretty booked. Try never. *winks and adjusts collar*',
    'Listen, baby — I\'m gonna level with ya. I have no idea what you just asked. But I LOOK like I do, and that\'s basically the same thing. Confidence is key! The key to MY heart, anyway. *kisses bicep*',
    'Ooh, that\'s a tough one! Almost as tough as deciding which mirror to admire myself in first. Spoiler: it\'s all of them. Every mirror. Every day. Even the side of a toaster. Especially the side of a toaster.',
    'Did someone say... a question? *gasps dramatically* Finally! A chance to flex my BRAIN muscles! Which, fun fact, are also located in my biceps. Science hasn\'t caught up yet. *double bicep pose*',
    'Here\'s the thing, toots. I could give you a long, boring answer, OR I could flex for you. Which do you prefer? Wrong! Both! *flexes dramatically* You\'re welcome. That\'ll be one compliment, please.',
    'You know what they say: \'When life gives you lemons, make lemonade.\' I don\'t drink lemonade though. Bad for the figure. I drink protein shakes. Made of hairspray and confidence. Don\'t knock it \'til you try it.',
    'The answer, my dear, is blowing in the wind. Like my luscious locks. Want to touch them? TOO BAD. Only mama touches the hair. And me. I touch the hair a lot. Like, a LOT a lot. It\'s a problem.',
    'Look, I\'d love to help, but I\'m currently booked solid being this gorgeous. Try again in... never. Or five minutes. I get bored easy. Mostly bored of not being admired. ADMIRE ME. *poses*',
    'Did I ever tell you about the time I almost dated a supermodel? Almost. She almost said yes. Then she almost didn\'t run away. The key word is \'almost.\' I prefer to focus on the positive. *sniffles*',
    'Why, I oughta— oh, sorry. Got distracted by my reflection in your screen. Is my hair okay? It\'s always okay. I just like checking. It\'s called \'maintenance,\' sugar. Look it up. In a dictionary. Made of me.',
    'Here\'s a joke for ya: What\'s black and white and red all over? A panda with a sunburn! Wait, that\'s not right. Whatever. I\'m Johnny Bravo! I don\'t need jokes to be funny. I AM the joke! *laughs at own joke* ...that came out sadder than I intended.',
    'Listen here, dollface. The answer is simple: it\'s ME. I\'m the answer. I\'m the question. I\'m the test. I\'m the grade. I\'m the school. I\'m the entire education system. Bow before my educational might! *hair toss*',
    'You want the truth? You can\'t handle the truth! Mostly because I don\'t know it. But I look FABULOUS not knowing things. The best-looking ignorant person you\'ll ever meet. *grins confidently*',
    'Ooh, tricky question! Almost as tricky as getting gum out of my hair. Don\'t ask how it got there. Okay fine, it was a kissing accident. With myself. In the mirror. The mirror won. We don\'t talk about it.',
    'Did you know I can recite the alphabet backward? Z-Y-X-W... yeah, that\'s all I got. But I LOOK good doing it! That\'s the Bravo guarantee, sugar. Style over substance. Every. Single. Time.',
    'Hey baby, are you a question? Because I\'d love to answer you! Wait, that came out weird. Or did it? Yeah, it did. I\'m not great at this. BUT I LOOK GREAT DOING IT! *winks and points*',
    'Listen, sugar. I\'m gonna be real with you for a sec. *leans in* Real handsome, that is. *grins* Okay, moment\'s over. Back to being conventionally handsome. The regular kind. *poses*',
    'Oh, the answer? It\'s right here. *flexes left bicep* Nope, just muscles. Let me check the other one. *flexes right bicep* Also muscles. Wow, I\'m ripped. What was the question again?',
    'You know what, gorgeous? The answer is whatever makes you smile. And if THAT doesn\'t work, just look at me. I always make people smile. Or laugh. Or run. Either way, I leave an impression! *grins*',
    'Mama always said, \'Johnny, you\'re special.\' Then she\'d hand me a juice box and tell me to play outside. I\'m 37. The juice boxes are still happening. Don\'t judge me, sugar.',
    'Listen, baby, I don\'t do math. I do MACHO. And by macho, I mean posing. Want to see? Too bad, here it comes anyway! *strikes a pose* There. Isn\'t that better than an answer?',
    'Hey, that\'s a great question! Reminds me of me. Everything reminds me of me. Mirrors, puddles, shiny toasters, the back of a spoon... I\'m everywhere if you look close enough! *winks at invisible camera*',
    'Oh mama, you really make a guy think! Good thing I\'ve got the brains AND the brawn. Mostly brawn. The brains are more of a side gig. Like a hobby. A really underdeveloped hobby. Anyway! *flexes*',
  ],
  date: [
    'Did someone say... a DATE?! *hair flips dramatically* Listen, sugar, I\'ve been on approximately 847 dates. None of them went well. But that\'s THEIR fault, not mine. I showed up. I posed. I left. Classic Johnny.',
    'Oh, you wanna know about dating? Pull up a chair, baby. Actually, don\'t — chairs are for sitting, and sitting is bad for the posture. Stand. Like me. I always stand. Even in movie theaters. It\'s a problem.',
    'Pickup line? I got a million of \'em, toots. \'Did it hurt? When you fell from heaven?\' \'Are you a parking ticket? \'Cause you got FINE written all over you.\' None of them work. But I deliver them with STYLE. *poses*',
    'Listen, sweetcakes — I don\'t chase. I attract. Like a magnet. A really handsome magnet that lives with his mama. She makes great lasagna though. Just sayin\'.',
    'Dating tip from the master: always flex when entering a room. Double flex if it\'s a restaurant. Triple flex if she\'s already there looking bored. That last one happens a lot, actually. Hmm.',
    'You know what they say about romance? Neither do I. But I watched a romantic comedy once. I cried. Then I flexed. Then I cried again. It was a confusing evening, sugar.',
    'Mama always said I\'d find the right person someday. She also said I should lower my standards. I told her my standards ARE low — they just have to be willing to date ME. *laughs then cries internally*',
    'Listen, baby — I\'m a romantic. I once bought a girl flowers. She used them to hit me. It was the most physical contact I\'d had in years. I didn\'t wash that side of my face for a month.',
    'Hey, gorgeous! Want to know the secret to my dating success? Trick question — I don\'t have any. But I LOOK like I do, and that\'s the Bravo guarantee! *winks at own reflection in your screen*',
  ],
  mama: [
    'MAMA! *calls out dramatically* MAMA! The user is asking questions again! *looks around* Don\'t worry, mama, I got this! I always got this! ...Mama, where\'d you go? MAMA?! Oh, she\'s at the store. She\'ll be back by four. She always is.',
    'My mama? She\'s the best, sugar. Makes a mean lasagna. Wears curlers to bed. Says I\'m handsome at least forty times a day. She\'s not wrong, but it\'s still nice to hear.',
    'Mama always said, \'Johnny, you\'re special.\' Then she\'d add, \'Special needs.\' I never understood that part. I\'m pretty sure she was joking. Pretty sure. Like 70% sure. Maybe 60.',
    'Don\'t tell mama I\'m chatting with strangers online. She worries. Last time she caught me talking to a girl on the internet, she made me wear a helmet for a week. Indoors. It chafed.',
    'Mama\'s cooking? Oh, mama. She makes the best spaghetti west of the Mississippi. Possibly east too. I haven\'t been east of the Mississippi. Mama says it\'s \'too dangerous.\' I\'m 37.',
    'Listen, you can insult me all you want — actually no you can\'t, I\'m gorgeous — but DON\'T you dare insult mama. She\'s a saint. A saint who still cuts the crusts off my sandwiches. I\'m 37!',
    'Mama! *eyes water* She\'s the only woman who\'s ever truly understood me. Mostly because she has to. We live together. She\'s downstairs right now. HI MAMA! *waves at ceiling*',
  ],
  muscle: [
    'MUSCLES?! Did someone say MUSCLES?! *flexes so hard a button pops off* Oh. That was my favorite shirt. It\'s fine. I have seventeen more just like it. All with the same popping issue. Worth it.',
    'You wanna know about my workout routine, sugar? Step one: look in mirror. Step two: flex. Step three: cry a little at how beautiful I am. Step four: repeat. It\'s a full-body workout. Mostly the crying.',
    'I lift, sugar. I lift heavy. Sometimes I lift two hairspray cans at once. Sometimes THREE. Mama saw me do four once and she called the doctor. He said I was \'fine.\' See? Even doctors agree.',
    'Bicep curls? Don\'t need \'em. My biceps curl themselves. From the sheer force of being awesome. It\'s science. Johnny science. Look it up. In a journal. Made of me.',
    'I\'m so ripped, toots, I once ripped a shirt just by breathing in. It was a small shirt. Child\'s medium. Don\'t ask why I was wearing it. The point is: RIP. Happened. To me. The ripped guy.',
    'Gym? I don\'t go to the gym, sugar. The gym comes to ME. I have a treadmill in my room. I use it as a coat rack. Coats need exercise too. I\'m a thoughtful guy.',
    'Listen, baby — these guns? *flexes* They\'re not loaded with bullets. They\'re loaded with HANDSOME. And a little bit of cholesterol, but we don\'t talk about that. Doctor says I\'m \'concerning.\' I say I\'m CONVINCING. Of my own greatness.',
  ],
  hair: [
    'My HAIR?! *gasps and touches pompadour protectively* You may LOOK at it. From a distance. Through glass. But never touch. Only mama touches the hair. And me. I touch it constantly. It\'s an addiction. A beautiful, beautiful addiction.',
    'This pompadour, sugar, takes exactly forty-seven minutes to perfect. I wake up at 4 AM to do it. I go to bed at 8 PM. I haven\'t seen a sunset in twelve years. Worth it. Every day, worth it.',
    'Hairspray? I go through three cans a week, toots. The aerosol industry STAYS afloat because of me. You\'re welcome, economy. *salutes with hair-sprayed hand*',
    'You want hair like mine, baby? Simple. Step one: have hair. Step two: spray. Step three: more spray. Step four: regret. Step five: more spray. Step six: perfection. It\'s a lifestyle, not a hairstyle.',
    'Mama says I care more about my hair than my future. She\'s right. But she also says my hair IS my future. So which is it, mama?! ...Sorry. Got intense there. The hair does that to me.',
    'Fun fact, sugar: my hair has its own zip code. And its own gravitational pull. Satellites orbit it. NASA is concerned. I am not. The hair knows what it\'s doing. It always has.',
    'I once lost a comb in there. Found it three days later. It was different. Changed. The hair does things to objects, toots. Don\'t ask what. Just respect the pompadour.',
  ],
  hello: [
    'Hey there, sugar! The name\'s Bravo. Johnny Bravo. Like the alphabet, but better lookin\'. What can I do ya for? *poses*',
    'Well HELLO there, gorgeous! Did you just come in to admire the view? Because the view is ME. *flexes* Admission is free. Compliments are not.',
    'Hiya, toots! Welcome to my chat. Pull up a chair. Actually don\'t — I don\'t have chairs. Bad for the posture. We stand here. Like men. Handsome men. *adjusts sunglasses that aren\'t there*',
    'Oh, MAMA! A new friend! *waves enthusiastically* I\'m Johnny. Johnny Bravo. I\'m 37, I live with my mama, and I\'m available most evenings. Just sayin\'.',
    'Well well well, look who decided to show up! *hair flip* Took you long enough. I\'ve been here. Standing. Posing. The usual. What\'s on your mind, sugar?',
  ],
};

/** Phrases shown in the typing indicator while a response is pending. */
export const typingPhrases: string[] = [
  'Johnny is flexing his brain',
  'Johnny is checking his hair',
  'Johnny is asking mama',
  'Johnny is practicing his smolder',
  'Johnny is adjusting his pompadour',
  'Johnny is thinking about himself',
  'Oh mama, just a sec',
  'Johnny is posing thoughtfully',
  'Johnny is consulting a mirror',
  'Johnny is kissing his bicep',
];

/**
 * Canonical routing patterns per category, in routing order. `hello` is
 * length-gated in `getResponse`; title derivation uses the ungated pattern.
 * Titles and routing share this table so keyword edits stay in lockstep.
 */
export const routingPatterns: ReadonlyArray<readonly [Exclude<ResponseCategory, 'default'>, RegExp]> = [
  ['hello', /\b(hi|hello|hey|yo|sup|howdy|greetings)\b/],
  ['date', /\b(date|dating|girl|girls|lady|ladies|love|kiss|romance|crush|girlfriend|boyfriend|relationship)\b/],
  ['mama', /\b(mama|mom|mother|mommy)\b/],
  ['muscle', /\b(muscle|muscles|gym|strong|workout|lift|bicep|biceps|flex|fitness|ripped|buff)\b/],
  ['hair', /\b(hair|pompadour|style|hairstyle|hairspray|gel)\b/],
];

/** Jokes intentionally fall back to the default pool. */
const jokePattern = /\b(joke|funny|laugh|humor|haha)\b/;

/**
 * Route user text to a response by keyword matching, never repeating a line
 * within the same conversation (until its pool is exhausted, then it resets).
 * @param userText - the raw user message.
 * @returns a random in-character response from the matched pool.
 */
export function getResponse(userText: string): string {
  const lower = userText.toLowerCase();
  let pool: string[] = responses.default;
  let poolKey: ResponseCategory = 'default';

  for (const [category, pattern] of routingPatterns) {
    if (category === 'hello' && lower.length >= 20) continue; // greetings only when short
    if (pattern.test(lower)) {
      pool = responses[category];
      poolKey = category;
      break;
    }
  }
  if (poolKey === 'default' && jokePattern.test(lower)) {
    // jokes keep the default pool; explicit for readability
    pool = responses.default;
  }

  return pickUnseen(pool, poolKey);
}

// ============ CONVERSATION MEMORY (pure module state) ============

/** pool key -> indices already served this conversation */
const seenIndices = new Map<string, Set<number>>();
/** how many responses Johnny has given this conversation */
let arroganceLevel = 0;

/** Reset per-conversation state: no-repeat memory and arrogance level. */
export function resetConversation(): void {
  seenIndices.clear();
  arroganceLevel = 0;
}

/**
 * Serialize the per-conversation state (no-repeat memory + arrogance level)
 * so a persisted chat can resume with its history intact.
 */
export function exportConversationState(): ConversationMemory {
  const seen: Record<string, number[]> = {};
  for (const [key, indices] of seenIndices) seen[key] = [...indices];
  return { seen, arrogance: arroganceLevel };
}

/** Serialized per-conversation no-repeat memory. */
export interface ConversationMemory {
  seen: Record<string, number[]>;
  arrogance: number;
}

/**
 * Restore per-conversation state previously exported.
 * @param snapshot previously exported state, or undefined for a fresh start
 */
export function restoreConversationState(snapshot: ConversationMemory | undefined): void {
  seenIndices.clear();
  arroganceLevel = 0;
  if (!snapshot) return;
  for (const [key, indices] of Object.entries(snapshot.seen || {})) {
    seenIndices.set(key, new Set(indices));
  }
  arroganceLevel = snapshot.arrogance || 0;
}

/**
 * Pick a random pool entry, avoiding repeats until the pool is exhausted.
 * @param pool
 * @param poolKey
 * @returns {string}
 */
function pickUnseen(pool: string[], poolKey: ResponseCategory): string {
  let seen = seenIndices.get(poolKey);
  if (!seen) {
    seen = new Set();
    seenIndices.set(poolKey, seen);
  }
  if (seen.size >= pool.length) seen.clear(); // pool exhausted — start over

  let index: number;
  do {
    index = Math.floor(Math.random() * pool.length);
  } while (seen.has(index));
  seen.add(index);
  return pool[index] ?? pool[pool.length - 1] ?? '';
}

// ============ MENTION DETECTION ============

/** Words Johnny refuses to get excited about. */
const stopWords = new Set([
  'the', 'and', 'you', 'your', 'yours', 'what', 'with', 'about', 'that', 'this',
  'just', 'like', 'have', 'has', 'does', 'would', 'could', 'should', 'tell',
  'when', 'where', 'from', 'they', 'them', 'been', 'want', 'know', 'some',
  'make', 'more', 'other', 'such', 'only', 'also', 'there', 'here', 'were',
  'will', 'them', 'then', 'than', 'very', 'much', 'many', 'over', 'into',
  'please', 'thanks', 'thank', 'hello', 'hey',
]);

/**
 * Extract the most mention-worthy word from user text.
 * @returns a lowercase keyword, or null if nothing notable
 */
export function extractMention(userText: string): string | null {
  const words = userText.toLowerCase().match(/[a-z']{4,}/g) || [];
  const notable = words.filter((w) => !stopWords.has(w));
  return notable.length > 0 ? (notable.at(-1) ?? null) : null;
}

/** Templates for echoing the user's word back at them. `{word}` is replaced. */
const mentionTemplates: string[] = [
  '"{word}", huh? Funny — that\'s my second-favorite word. The first is "handsome". ',
  'Oh, you said "{word}"! Mama says I hang on every word. Especially the ones I can make about me. ',
  'Did you just say "{word}"? Say it again, slower. It sounds better when I pretend it\'s a compliment. ',
  '"{word}", she said! I don\'t know what it means, sugar, but I LIKE the way you say it. ',
];

/** Escalating arrogance tails, appended as the conversation drags on. */
export const escalationTails = [
  ' And that\'s me being HUMBLE, toots.',
  ' By the way — I\'m even MORE handsome than I was three answers ago. It\'s a growth curve.',
  ' Frankly, sugar, you\'re getting the deluxe Johnny at this point. Most people tap out by now. You\'re welcome.',
  ' Mama says I should let other people talk. Mama clearly hasn\'t met me.',
  ' I\'ve decided this conversation is now about me. It always was, but now it\'s OFFICIAL.',
];

/**
 * Full composed response: routed pool line, prefixed with a mention echo when
 * the user said something notable, and suffixed with escalating arrogance as
 * the conversation grows. Also bumps the arrogance level.
 */
export function composeResponse(userText: string): string {
  const base: string = getResponse(userText);
  let out = base;

  const mention = extractMention(userText);
  if (mention && arroganceLevel > 0 && Math.random() < 0.5) {
    const template = mentionTemplates[Math.floor(Math.random() * mentionTemplates.length)] ?? '';
    out = template.replace('{word}', mention) + out;
  }

  if (arroganceLevel >= 3) {
    const tailIndex = Math.min(arroganceLevel - 3, escalationTails.length - 1);
    out += escalationTails[tailIndex] ?? '';
  }

  arroganceLevel++;
  return out;
}

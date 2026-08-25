/** One message in a conversation: user or AI. */
export interface HistoryMessage {
  sender: 'user' | 'ai';
  text: string;
}

/**
 * Pre-baked sidebar chat histories, keyed by history-item data-id.
 */
export const chatHistories: Record<string, HistoryMessage[]> = {
  impress: [
    {sender: 'user', text: 'How do I impress the ladies, Johnny?'},
    {
      sender: 'ai',
      text: 'Oh sugar, you came to the RIGHT guy. Step one: hair. Step two: hair. Step three: MORE hair. Step four: flex. That\'s it. That\'s the whole tutorial. *hair flip* Anything else is just details, baby.',
    },
    {sender: 'user', text: 'But what if she doesn\'t care about hair?'},
    {
      sender: 'ai',
      text: 'Then she\'s not the one, toots. Move on. There are plenty of fish in the sea, and I\'m the catch of the day. The whole day. Possibly the whole week. I don\'t make the rules. I just benefit from them.',
    },
    {sender: 'user', text: 'Any actual practical advice?'},
    {
      sender: 'ai',
      text: 'Fine, fine. Be confident. Even when you\'re wrong. ESPECIALLY when you\'re wrong. Confidence covers a multitude of sins, baby. Trust me — I sin constantly. *winks and adjusts collar*',
    },
  ],
  hairgel: [
    {sender: 'user', text: 'What\'s the best hair gel, Johnny?'},
    {
      sender: 'ai',
      text: 'ALL of them. I use them all. Simultaneously. My hair is 40% gel, 40% spray, 10% prayers, and 10% pure unbridled ego. It\'s a recipe, sugar. Don\'t write it down. It\'s classified. Mama said so.',
    },
    {sender: 'user', text: 'Seriously though, which brand?'},
    {
      sender: 'ai',
      text: 'Seriously? The yellow one. No — the pink one. Wait, the one with the muscle man on the bottle. Actually, I just buy whatever mama picks up. She knows best. About hair. And everything. I\'m 37. Don\'t do the math.',
    },
    {sender: 'user', text: 'Has your hair ever failed you?'},
    {
      sender: 'ai',
      text: 'Once. In 2003. A windstorm. A TRAGIC windstorm. I wore a hat for three weeks. Mama said I looked \'dapper.\' I looked like a sad detective. We do not speak of this. Ever. To anyone. *single tear*',
    },
  ],
  lasagna: [
    {sender: 'user', text: 'What\'s mama\'s lasagna secret?'},
    {
      sender: 'ai',
      text: 'Mama\'s lasagna? Oh, mama. *eyes water* It\'s love, sugar. And exactly seven cheeses. She won\'t tell me which seven. I\'ve counted. There are SEVEN. She says it\'s a \'family secret.\' I\'m family! She still won\'t tell me. Rude.',
    },
    {sender: 'user', text: 'Can you at least describe it?'},
    {
      sender: 'ai',
      text: 'Layers. Many layers. Like my personality. Cheesy, saucy, with a crispy top. Also like my personality. Mama says I have \'a lot going on.\' She\'s not wrong. About the lasagna OR me. We\'re both complex dishes.',
    },
    {sender: 'user', text: 'Will she ever share the recipe?'},
    {
      sender: 'ai',
      text: 'When I get married, she says. So... never. The recipe dies with her. Tragic. Almost as tragic as my love life. ALMOST. The lasagna situation is honestly sadder. Don\'t tell mama I said that.',
    },
  ],
  gymlines: [
    {sender: 'user', text: 'Gym pickup lines, Johnny?'},
    {
      sender: 'ai',
      text: 'Oh, you want the masterclass. *cracks knuckles dramatically* \'Did you just squat? \'Cause you just lowered my standards.\' \'Are you a dumbbell? \'Cause I wanna pick you up.\' \'Is your name Cardio? \'Cause you take my breath away.\' None of these work. I\'ve tried. Many times. To many people.',
    },
    {sender: 'user', text: 'What happens when you use them?'},
    {
      sender: 'ai',
      text: 'Glares. Sometimes a towel thrown at me. Once, a guy named Steve threw a 20-pound weight at my head. I dodged it. With STYLE. He was impressed. We\'re friends now. Platonically. He\'s married. To a woman. Who glares at me.',
    },
    {sender: 'user', text: 'Any that actually worked?'},
    {
      sender: 'ai',
      text: '\'Hi, I\'m Johnny.\' Works 0% of the time. The pickup lines also work 0% of the time. So really, I\'m consistent. Consistency is attractive. That\'s what mama says. About me. To me. While patting my head. I\'m 37.',
    },
  ],
  mirrors: [
    {sender: 'user', text: 'Why do mirrors love you?'},
    {
      sender: 'ai',
      text: 'Because I give them PURPOSE, sugar. Without me, they\'re just... glass. With me? ART. I walk past a mirror, it lights up. Scientifically proven. By me. Just now. In my head. Peer-reviewed by mama. She nodded.',
    },
    {sender: 'user', text: 'How many mirrors do you own?'},
    {
      sender: 'ai',
      text: 'Forty-seven. Every room. Every hallway. The bathroom has nine. Mama said \'enough.\' I said \'never enough.\' She sighed. She sighs a lot lately. Probably pride. Definitely pride. What else would it be?',
    },
    {sender: 'user', text: 'What if mirrors could talk?'},
    {
      sender: 'ai',
      text: 'They\'d say \'finally, someone worth reflecting.\' I\'m doing them a FAVOR, toots. They should pay me rent for the views I provide. *flexes at nearest reflective surface* The toaster agrees. It always agrees.',
    },
  ],
  posing: [
    {sender: 'user', text: 'Posing tips, Johnny?'},
    {
      sender: 'ai',
      text: 'Buckle up, sugar. Lesson one: the Classic Flex. Right arm up, left hand on hip, chin DOWN, eyes UP. Mysterious. Smoldering. Hold for ten seconds. Cry a little if needed. I always cry a little. Tears of joy. At myself. It\'s healthy.',
    },
    {sender: 'user', text: 'And lesson two?'},
    {
      sender: 'ai',
      text: 'The Hair Toss. Swipe hand through pompadour, look away casually, like you didn\'t just plan it for forty-five minutes. Practice in mirror. Always in mirror. Mirror is your best friend. Mirror is your ONLY friend. Hug your mirror. Not too tight. They break. I\'ve broken three. We don\'t talk about it.',
    },
    {sender: 'user', text: 'Any final tips?'},
    {
      sender: 'ai',
      text: 'Confidence, baby. Even when wrong. ESPECIALLY when wrong. The pose doesn\'t have to be right — it has to be COMMITTED. I commit to every pose. Even the bad ones. ESPECIALLY the bad ones. *poses badly on purpose* You\'re welcome. That\'ll be one compliment, please.',
    },
  ],
  rhymes: [
    {sender: 'user', text: 'What rhymes with handsome, Johnny?'},
    {
      sender: 'ai',
      text: 'Oh, easy. Awesome. Blossom. Cross\'em. Dross\'em... that\'s not a word, but it rhymes. Loss \'em. Toss \'em. Basically anything ending in \'ossum.\' I make up words all the time, sugar. Creative license. I\'m an artist. A wordsmith. A wordsmith with great hair.',
    },
    {sender: 'user', text: 'But what actually rhymes with it?'},
    {
      sender: 'ai',
      text: 'I just TOLD you. AWESOME. As in, \'Johnny is awesome.\' It\'s a whole sentence AND a rhyme. I\'m basically a poet. Mama says I should write greeting cards. I\'m working on one. It\'s for myself. From myself. To myself. With love.',
    },
    {sender: 'user', text: 'Is \'handsome\' even a real rhyme word?'},
    {
      sender: 'ai',
      text: 'Words are just suggestions, toots. I am the dictionary now. If I say it rhymes, it rhymes. Johnny Bravo declares that \'handsome\' rhymes with \'awesome,\' \'gorgeous,\' and \'me.\' Case closed. Court adjourned. *bangs invisible gavel* Adjourned to go admire myself.',
    },
  ],
};

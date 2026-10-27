// ============================================================================
// GAME CONTENT — the single source of truth for every word shown to the player.
//
// Edit anything here and the running game changes: titles, loading text,
// button labels, hints, captions, every dialogue line, the airplane banner
// message, and the music-screen text. No other file hardcodes player-facing
// copy (code comments and console logs excepted).
//
// Dialogue scenes are plain arrays of { speaker, text } lines:
//   - add an object to add a line, delete one to remove it, reorder freely
//   - set a scene's `enabled` to false to skip its dialogue without deleting it
//   - `speaker` is "girl" or "boy"; display names come from `characters` below
// ============================================================================

export type Speaker = "girl" | "boy";

export interface DialogueLine {
  speaker: Speaker;
  text: string;
}

export interface DialogueScene {
  enabled: boolean;
  lines: DialogueLine[];
}

export type DialogueSceneId =
  | "firstMeeting"
  | "catHandover"
  | "iceCreamShop"
  | "flowerShopArrival"
  | "waterfrontArrival"
  | "finalBench";

export const GAME_CONTENT = {
  game: {
    title: "Mahinoor",
    subtitle: "Chapter One",
  },

  /** Display names shown in dialogue (chat) boxes. */
  characters: {
    girl: "Sarha",
    boy: "Kifayat",
  },

  loading: {
    title: "Mahinoor",
    subtitle: "Sang Hu Tere",
    messages: ["Preparing the waterfront…", "Almost there…"],
  },

  intro: {
    skip: "Skip",
  },

  /** Story captions and prompts (was `text` in chapter.ts). */
  text: {
    title: "Mahinoor",
    subtitle: "Sang Hu Tere",
    intro: "Walk towards the shore",
    greet: "He's been waiting with someone small.",
    handoverDone: "The kitten is with you now",
    invite: "Shall we explore together?",
    inviteTouch: "Tap Follow",
    toParlour: "Come on, let's grab some ice cream! 🍦",
    iceCream: "A little ice cream break 🍦",
    toFlowers: "Let's find a little something cute for your bag 🎀",
    bow: "A little pink touch, just for you 🎀",
    guided: "Let's take a little walk by the water.",
    atBench: "Let's sit here for a while.",
    benchKey: "Press E to sit together",
    benchTouch: "Tap Sit",
    ended: "Mahinoor",
    endedSub: "Sang Hu Tere",
  },

  /** Shop names painted on the storefront signs. */
  shops: {
    parlour: "Sweet Scoops",
    flowerShop: "Petal & Bloom",
  },

  tutorial: {
    walk: "walk",
    hurry: "hurry",
    look: "Click, then move the mouse to look",
    interact: "interact",
    menu: "menu",
    dragLook: "Drag to look around",
  },

  hud: {
    mute: "Mute",
    unmute: "Unmute",
    fullscreen: "Fullscreen",
    restartChapter: "Restart chapter",
    settings: "Settings",
    close: "Close",
    flavoursTitle: "Today's flavours",
  },

  settings: {
    title: "Settings",
    graphics: "Graphics",
    cameraDistance: "Camera distance",
    fieldOfView: "Field of view",
    lookSensitivity: "Look sensitivity",
    volume: "Volume",
    music: "Music",
    sound: "Sound",
    reducedMotion: "Reduced motion",
  },

  pause: {
    title: "Paused",
    resume: "Resume",
    settings: "Settings",
    restart: "Restart chapter",
    hint: "Click the scene to look around again.",
  },

  restart: {
    title: "Restart the chapter?",
    body: "You'll begin again at the waterfront entrance.",
    cancel: "Cancel",
    confirm: "Restart",
  },

  assetNotice: {
    failed: (names: string) =>
      `Realistic model for ${names} couldn't load — showing temporary stylised placeholder.`,
  },

  errors: {
    sceneLoadTitle: "The waterfront couldn't load",
    sceneLoadBody: "Your browser may not support 3D graphics, or the connection was interrupted.",
    tryAgain: "Try again",
  },

  // --------------------------------------------------------------------------
  // DIALOGUE SCENES — edit, add, remove or reorder lines freely.
  // Each scene plays once per playthrough at its story moment.
  // --------------------------------------------------------------------------
  scenes: {
    /** Scene 1 — the girl reaches the boy for the first time. */
    firstMeeting: {
      enabled: true,
      lines: [
        { speaker: "boy", text: "Ji, Kaise hai aap Sarha" },
        { speaker: "girl", text: "Aap kabse mera intezaar kar rahe yahan Kifayat?." },
        { speaker: "boy", text: "Uff, Dw yaar, Mujh aaccha lagta intezaar karna aapke liye, khair chodein wo sab, kisi se milwana tha aapko" },
      ],
    },

    /** Scene 2 — right after the kitten walks over to the girl. */
    catHandover: {
      enabled: true,
      lines: [
        { speaker: "girl", text: "Aww.. yeh toh kitni pyaara hai Kifayat!" },
        { speaker: "boy", text: "Ab ye aapki hui, Hamare saath rahegi ye hamesha ab." },
        { speaker: "girl", text: "Pakka. Ab hum teeno saath saath." },
      ],
    },

    /** Scene 3 — both arrive at the Sweet Scoops counter. */
    iceCreamShop: {
      enabled: true,
      lines: [
        { speaker: "boy", text: "Aapko icecreams bohot pasand na Sarha, yaad hai wo ek wada?   JI... Mere saath khaana pasand karenge ? Hai ijazat?" },
        { speaker: "girl", text: "uff, Ji kifayat, bohot pasand rahega mujhe, par ye 3 kyu?" },
        { speaker: "boy", text: "1 Icecream kaun hi khaata hai? aapke liye toh 2 best, hamara favv choco n butterscotch, aur mera wala chcocolate jo ofc aapka hi jo" },
        { speaker: "girl", text: "uff, aapko yaad tha ye reference?" },
        { speaker: "boy", text: "Apki har ek choti se choti cheez hamesha se yaad rahi hai jo?" },
        { speaker: "girl", text: "uff aapko meri har ek choti se choti cheez itni matter karti?" },
        { speaker: "boy", text: "Ji bohot zyaada, coz yaad hai? Admire and enjoy litle things in life? " },
      ],
    },

    /** Scene 4A — arriving at Petal & Bloom. */
    flowerShopArrival: {
      enabled: true,
      lines: [
        { speaker: "girl", text: "Kitni pyaari shop hai yeh!" },
        { speaker: "boy", text: "kuch hai mere pass aapke liye sarha, Yaad hai ye wada aapko? wo hamesha wala bow hamara." },
      ],
    },

    /** Scene 4B — leaving the flower shop, arriving at the waterfront bench. */
    waterfrontArrival: {
      enabled: true,
      lines: [
        { speaker: "girl", text: "Uff, kitna zyaada maza aya kifayat, sabkuch hi bohot enjoy kia maine, bohot maza aya." },
        { speaker: "boy", text: "Aap khush hai na sarha ?" },
        { speaker: "girl", text: "Uff, bohot zyaada, bohot zyaada maza aya. sabkuch bohot zyaada khubsurat hai kifayat. Aur aap khush hai kifayat?" },
        { speaker: "boy", text: "uff.. Meri khushi toh aapse hi na sarha, Aap khush toh mai bohot zyaada khush phir" },
      ],
    },

    /** Scene 5 — the seated finale. Keep this wording exactly as written. */
    finalBench: {
      enabled: true,
      lines: [
        { speaker: "girl", text: "Kifayat..." },
        { speaker: "boy", text: "Ji Sarha... Hu Mai Yahi aapke pass dw, Kahein ji" },
        { speaker: "girl", text: "Ek kaam karte hai ?" },
        { speaker: "boy", text: "Do Baatein karte hai?" },
        { speaker: "girl", text: "Teen lafzon mein apna haal Bayaan karte hai?" },
      ],
    },
  } satisfies Record<DialogueSceneId, DialogueScene>,

  // --------------------------------------------------------------------------
  // AIRPLANE BANNER — flies over the water during the final bench scene.
  // Set enabled: false and the feature never loads. To remove it entirely,
  // delete src/game/features/airplaneBanner/ and its one line in Game.tsx.
  // --------------------------------------------------------------------------
  airplaneBanner: {
    enabled: true,
    text: "Hamesha khush rehna Mahinoor.",
  },

  // --------------------------------------------------------------------------
  // MUSIC SELECTION — shown after the final bench conversation.
  // Track files and titles live in src/game/config/audioTracks.ts.
  // --------------------------------------------------------------------------
  music: {
    title: "A song for this moment",
    subtitle: "Pick the melody our evening ends with",
    play: "Play",
    pause: "Pause",
    volume: "Volume",
    pending: "Audio not added yet",
    tapToPlay: "Tap to play",
  },

  cinematics: {
    skip: "Skip",
    tapToPlay: "Tap to play",
  },
} as const;

/** Convenience alias matching the old chapter.ts export shape. */
export const text = GAME_CONTENT.text;

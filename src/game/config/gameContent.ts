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
    ended: "Chapter One",
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
        { speaker: "boy", text: "Tum aa gayi.. main kab se yahan wait kar raha tha." },
        { speaker: "girl", text: "Yeh jagah toh sach mein khoobsurat hai, Kifayat." },
        { speaker: "boy", text: "Ruko.. pehle kisi se milwata hoon." },
      ],
    },

    /** Scene 2 — right after the kitten walks over to the girl. */
    catHandover: {
      enabled: true,
      lines: [
        { speaker: "girl", text: "Aww.. yeh toh kitna pyaara hai!" },
        { speaker: "boy", text: "Ab yeh tumhara hai. Iska khayal rakhna." },
        { speaker: "girl", text: "Pakka. Ab hum teeno saath saath." },
      ],
    },

    /** Scene 3 — both arrive at the Sweet Scoops counter. */
    iceCreamShop: {
      enabled: true,
      lines: [
        { speaker: "boy", text: "Yahan ka ice cream famous hai. Kaunsa flavour logi?" },
        { speaker: "girl", text: "Strawberry! Aur tumhare liye pistachio?" },
        { speaker: "boy", text: "Perfect. Aaj ka din aur bhi meetha ho gaya." },
      ],
    },

    /** Scene 4A — arriving at Petal & Bloom. */
    flowerShopArrival: {
      enabled: true,
      lines: [
        { speaker: "girl", text: "Kitni pyaari shop hai yeh!" },
        { speaker: "boy", text: "Ruko.. tumhare bag ke liye kuch special hai." },
      ],
    },

    /** Scene 4B — leaving the flower shop, arriving at the waterfront bench. */
    waterfrontArrival: {
      enabled: true,
      lines: [
        { speaker: "girl", text: "Yeh view.. kitna khoobsurat hai." },
        { speaker: "boy", text: "Chalo, yahan baithte hai. Thodi der bas hum." },
      ],
    },

    /** Scene 5 — the seated finale. Keep this wording exactly as written. */
    finalBench: {
      enabled: true,
      lines: [
        { speaker: "girl", text: "Kifayat.. ek kaam karte hai ?" },
        { speaker: "boy", text: "Do baatein karte hai?" },
        { speaker: "girl", text: "Teen lafzon mein apna haal bayaan karte hai" },
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

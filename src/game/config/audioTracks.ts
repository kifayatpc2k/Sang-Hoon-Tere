// ============================================================================
// AUDIO MANIFEST — replaceable music for the whole game.
//
// BACKGROUND MUSIC: put your file at public/assets/audio/background-music.mp3
// (or change `src` below). While no file is present, the game keeps its
// built-in generative music — nothing breaks.
//
// ENDING SOUNDTRACK: put your file at public/assets/audio/ending-music.mp3.
// It starts automatically the moment both characters are seated on the
// waterfront bench and plays through the final conversation and the music
// mini-player. Missing file → the normal background music simply continues.
//
// ENDING TRACKS: the three selectable choices in the mini-player. Drop mp3
// files into public/assets/audio/ and optional cover images into
// public/assets/audio/covers/, then edit titles/paths here. A track whose
// file is missing shows as "not added yet" and never crashes the game.
// ============================================================================

export interface AudioTrack {
  id: string;
  title: string;
  src: string;
  cover?: string;
}

export const AUDIO_TRACKS: AudioTrack[] = [
  {
    id: "ending-main",
    title: "Main Ending Track",
    src: "/assets/audio/ending-main.mp3",
    cover: "/assets/audio/covers/ending-main.webp",
  },
  {
    id: "ending-alternative-1",
    title: "Alternative Track 1",
    src: "/assets/audio/ending-alternative-1.mp3",
    cover: "/assets/audio/covers/ending-alternative-1.webp",
  },
  {
    id: "ending-alternative-2",
    title: "Alternative Track 2",
    src: "/assets/audio/ending-alternative-2.mp3",
    cover: "/assets/audio/covers/ending-alternative-2.webp",
  },
];

export const GAME_AUDIO = {
  /** Continuous background music for the whole chapter. */
  backgroundMusic: {
    enabled: true,
    src: "/assets/audio/background-music.mp3",
    volume: 0.25,
    loop: true,
  },
  /**
   * The automatic soundtrack for the seated waterfront ending.
   * Starts once both characters are on the bench; fades the background
   * music down to `duckTo` × its volume while it plays.
   */
  endingSoundtrack: {
    enabled: true,
    src: "/assets/audio/ending-music.mp3",
    title: "Ending Theme",
    volume: 0.4,
    /** set to false if the ending should play once instead of looping */
    loop: true,
    fadeIn: 2.5,
    fadeOut: 2.5,
    duckTo: 0.15,
  },
  /** The compact mini-player's three selectable choices. */
  endingMusic: {
    enabled: true,
    /** false: the automatic soundtrack handles playback — no auto-start here. */
    autoPlay: false,
    tracks: AUDIO_TRACKS,
  },
};

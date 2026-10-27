import { describe, expect, it } from "vitest";
import { GAME_CONTENT } from "./gameContent";
import { CINEMATICS } from "./cinematics";
import { AUDIO_TRACKS, GAME_AUDIO } from "./audioTracks";

describe("central game content", () => {
  it("keeps the final bench wording exactly as written", () => {
    expect(GAME_CONTENT.scenes.finalBench.lines).toEqual([
      { speaker: "girl", text: "Kifayat.. ek kaam karte hai ?" },
      { speaker: "boy", text: "Do baatein karte hai?" },
      { speaker: "girl", text: "Teen lafzon mein apna haal bayaan karte hai" },
    ]);
  });

  it("every enabled dialogue scene has at least one line with a valid speaker", () => {
    for (const scene of Object.values(GAME_CONTENT.scenes)) {
      if (!scene.enabled) continue;
      expect(scene.lines.length).toBeGreaterThan(0);
      for (const line of scene.lines) expect(["girl", "boy"]).toContain(line.speaker);
    }
  });

  it("the airplane banner message keeps its exact spelling and punctuation", () => {
    expect(GAME_CONTENT.airplaneBanner.text).toBe("Hamesha khush rehna Mahinoor.");
  });

  it("keeps exactly one video section, the final waterfront bench one", () => {
    expect(Object.keys(CINEMATICS)).toEqual(["waterfrontArrival"]);
    for (const c of Object.values(CINEMATICS))
      // local path under public/ or a hosted managed-asset URL — both fine
      expect(c.src).toMatch(/\/[^/]+\.(mp4|webm)(\?.*)?$/);
  });

  it("displays the game title as Mahinoor wherever the title appears", () => {
    expect(GAME_CONTENT.game.title).toBe("Mahinoor");
    expect(GAME_CONTENT.loading.title).toBe("Mahinoor");
    expect(GAME_CONTENT.text.title).toBe("Mahinoor");
  });

  it("shows Sang Hu Tere as the opening/loading and ending subtitle", () => {
    expect(GAME_CONTENT.loading.subtitle).toBe("Sang Hu Tere");
    expect(GAME_CONTENT.text.subtitle).toBe("Sang Hu Tere");
    expect(GAME_CONTENT.text.endedSub).toBe("Sang Hu Tere");
  });

  it("labels chat dialogue with Sarha while the banner keeps Mahinoor", () => {
    expect(GAME_CONTENT.characters.girl).toBe("Sarha");
    expect(GAME_CONTENT.characters.boy).toBe("Kifayat");
    expect(GAME_CONTENT.airplaneBanner.text).toContain("Mahinoor");
  });

  it("never shows the temporary-character disclaimer", () => {
    expect(GAME_CONTENT.assetNotice).not.toHaveProperty("pending");
  });

  it("offers all three selectable ending music tracks with editable paths", () => {
    expect(AUDIO_TRACKS.length).toBe(3);
    for (const t of AUDIO_TRACKS) expect(t.src).toMatch(/^\/assets\/audio\/.+/);
  });

  it("background and ending soundtracks sit at their replaceable asset paths", () => {
    expect(GAME_AUDIO.backgroundMusic.src).toBe("/assets/audio/background-music.mp3");
    expect(GAME_AUDIO.endingSoundtrack.src).toBe("/assets/audio/ending-music.mp3");
    expect(GAME_AUDIO.endingSoundtrack.enabled).toBe(true);
    expect(GAME_AUDIO.endingSoundtrack.loop).toBe(true);
    expect(GAME_AUDIO.endingSoundtrack.duckTo).toBeLessThan(1);
    // the automatic soundtrack plays on its own; the selector must not auto-start a rival track
    expect(GAME_AUDIO.endingMusic.autoPlay).toBe(false);
  });

  it("keeps the background music path out of the ending selector catalogue", () => {
    for (const t of AUDIO_TRACKS) expect(t.src).not.toBe(GAME_AUDIO.backgroundMusic.src);
  });
});

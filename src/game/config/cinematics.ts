// ============================================================================
// CINEMATICS — the single fullscreen in-game video for the final bench scene.
//
// The video ships in public/assets/videos/waterfront-arrival.mp4 and is
// served as a static asset (Vercel hosts it automatically). If the video is
// missing or fails, the game skips it safely and carries on — no black
// screen, no freeze.
//
// The first-meeting, ice-cream-shop and flower-shop video sections were
// removed on purpose: those story moments now flow straight into their
// conversations. This is the only video section left in the entire game.
// ============================================================================

export type CinematicId = "waterfrontArrival";

export interface CinematicConfig {
  /** false = never play this video (gameplay continues normally). */
  enabled: boolean;
  /** Path under public/, e.g. "/assets/videos/waterfront-arrival.mp4". */
  src: string;
  /** Optional poster image shown while the video loads. */
  poster?: string;
  /** true = play only once per playthrough (restart resets this). */
  playOnce: boolean;
  /** true = character movement pauses while the video plays. */
  pauseGameplay: boolean;
}

export const CINEMATICS: Record<CinematicId, CinematicConfig> = {
  /** Arrival near the waterfront bench, before sitting down. */
  waterfrontArrival: {
    enabled: true,
    src: "/assets/videos/waterfront-arrival.mp4",
    playOnce: true,
    pauseGameplay: true,
  },
};

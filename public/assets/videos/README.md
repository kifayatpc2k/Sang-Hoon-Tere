# Cinematic videos

The game has exactly **one** video section: the waterfront-bench arrival.

The video (`waterfront-arrival.mp4`, 1280×720 H.264, ~2 min) ships in this
package at `public/assets/videos/waterfront-arrival.mp4` and is wired in via
`src/game/config/cinematics.ts` (`src: "/assets/videos/waterfront-arrival.mp4"`).
Vercel serves it as a static asset automatically — nothing to configure.

mp4 or webm. A missing file is skipped safely; the game never freezes.

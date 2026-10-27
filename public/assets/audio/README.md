# Audio — drop your files here

All paths and volumes are configured in `src/game/config/audioTracks.ts`.
You only ever replace the files below — no code changes needed.

## Automatic soundtracks

- `background-music.mp3` — normal gameplay, loops continuously
  (config: `GAME_AUDIO.backgroundMusic`)
- `ending-music.mp3` — starts automatically once both characters are seated
  on the waterfront bench; plays through the final conversation and the
  mini-player, and fades the background music down while it plays
  (config: `GAME_AUDIO.endingSoundtrack` — loop on/off, volumes, fades)

If a file is missing, the built-in generative music keeps playing instead —
the game never breaks or gets stuck.

## Mini-player tracks (the three selectable ending choices)

- `ending-main.mp3`
- `ending-alternative-1.mp3`
- `ending-alternative-2.mp3`
- optional covers in `covers/` (webp/jpg/png)

A missing track shows as "Audio not added yet" in the mini-player and is
disabled until you add its file.

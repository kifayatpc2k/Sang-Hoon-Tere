# Mahinoor — Chapter One ("Sang Hu Tere")

An interactive 3D story game built with TanStack Start, React 19, Three.js (React Three Fiber) and Tailwind CSS v4. You play Sarha: you arrive at the Istanbul waterfront, meet Kifayat, receive a kitten, visit the "Sweet Scoops" ice-cream kiosk and the "Petal & Bloom" flower shop (a little pink bow for your backpack), then sit together on the waterfront bench — where the story ends with a short conversation, a song choice and an airplane banner.

This project is fully self-contained and can be built, run and deployed without the Lovable builder.

## 1. Requirements

| Software | Version |
| --- | --- |
| Node.js | 22 LTS (or 20.19+). Use `nvm install 22`. |
| npm | ships with Node (or use bun — a `bun.lock` is included) |
| A modern browser | WebGL 2 support (Chrome, Edge, Firefox, Safari) |

No database, no backend service, no API keys and no accounts are required — everything runs locally in the browser.

## 2. Install

```sh
npm install
```

(If npm hits a peer-dependency error, `npm install --legacy-peer-deps` works. Bun users: `bun install`.)

## 3. Run in development

```sh
npm run dev
```

Open the printed URL (defaults to http://localhost:8080 in this sandbox, 5173 elsewhere). First load compiles the 3D scene, so give it a few seconds.

## 4. Build for production

```sh
npm run build
```

This produces:

- `.vercel/output/static/` — all static assets (JS, CSS, 3D models, video, fonts, `robots.txt`).
- `.vercel/output/functions/__server.func/` — the server-rendered app as a **Vercel server function** (the Vercel Build Output API format Vercel deploys).

## 5. Preview the production build locally

```sh
npm run preview
```

Starts a small zero-dependency Node server (`scripts/preview.mjs`) that serves `.vercel/output/static` as static assets and runs the built server function — the same split Vercel uses. Open http://localhost:4173.

## 6. Deploy to Vercel (recommended: GitHub import)

The app is server-rendered, so it needs Vercel's server function — not a plain static file host. The build already emits exactly what Vercel expects (Nitro `vercel` preset, set in `vite.config.ts`).

**Via GitHub (recommended — gives you automatic deploys on every push):**

1. Push this project to a GitHub repository (see §13 for the full walkthrough).
2. On [vercel.com](https://vercel.com), choose **Add New… → Project**, pick the repo, and click **Deploy**. Vercel detects the framework, runs `npm run build` and reads `.vercel/output` — no manual settings needed.
3. When it finishes you get a public `*.vercel.app` URL — that's the live game.
4. Every future `git push` to the production branch redeploys automatically.

**Via Vercel CLI (alternative, no GitHub):**

```sh
npm i -g vercel
vercel        # first run links the folder; accept the defaults
vercel --prod # deploys the current directory
```

**Node version:** the project declares Node ≥ 20.19 (`engines` + `.nvmrc` pinned to 22). Vercel picks Node 22 automatically.

No environment variables are required — there are none (see §8).

## 7. Adding your music and the final video

The game loads these files automatically the moment you drop them in — no code changes needed:

| File | Purpose |
| --- | --- |
| `public/assets/audio/background-music.mp3` | Gameplay background music (loops, auto-starts). |
| `public/assets/audio/ending-music.mp3` | Auto-starts when both characters sit on the bench; the background music fades down. |

The **bench video** (1280×720 H.264, ~2 min) is already integrated — it ships in `public/assets/videos/waterfront-arrival.mp4` and is referenced from `src/game/config/cinematics.ts`. It plays once, when the characters reach the waterfront bench, and is the only video in the game. To swap in a different video, replace that file (mp4/webm, same name) — no code changes needed.

Until a file exists the game skips it gracefully — no black screen, no freeze; the ending mini-player shows "Audio not added yet". Use MP3 (mp4/webm for the video). Covers for the three ending tracks go in `public/assets/audio/covers/` (see `public/assets/audio/README.md`).

The **three ending music choices** in the compact mini-player are configured in `src/game/config/audioTracks.ts` (`ending-main.mp3`, `ending-alternative-1.mp3`, `ending-alternative-2.mp3` under `public/assets/audio/`) — the same three tracks are preserved from the original game.

All player-facing words (titles, dialogue, prompts, sign names, the airplane banner text) live in one file: `src/game/config/gameContent.ts`.

## 8. Environment variables

None required. The game has no env-var-dependent code paths; `process.env.*` is not used in the client, and there are no secrets in the repo.

## 9. Backend / external services

None. No database, no auth, no third-party APIs. Google Fonts is loaded via `<link>` in the page head for the display font; the game still runs if that request is blocked (falls back to system fonts).

## 10. Project layout (short version)

```
src/game/            the game, split by concern
  config/            all content & asset manifests (gameContent, chapter, characters, audioTracks, cinematics)
  narrative/         story state machine (pure transitions)
  world/             beach, water, skyline, shops, props, lighting
  characters/        model loading, fitting, animation (realistic GLBs with Kenney fallbacks)
  camera/ input/ ui/ audio/ features/
src/routes/          TanStack Start routes (single game route)
public/models/       character GLBs (realistic/ used first, pets + people fallbacks)
public/assets/       audio + video slots you fill in
scripts/preview.mjs  production preview server (see §5)
```

## 11. Troubleshooting

- **Black screen / "The waterfront couldn't load"** — your browser or GPU may not support WebGL 2. Try Chrome or Edge with hardware acceleration on.
- **Characters look like simple cartoon figures** — the realistic GLB in `public/models/realistic/` failed to load; the game falls back to stylised models and shows a small notice bottom-left. Check the browser console and that the `.glb` files are served with status 200.
- **No music** — the MP3 files haven't been added yet (§7). Browsers also block audio until your first click/tap in the page; the game retries on the next interaction.
- **The video never plays** — the bench video loads from the hosted asset URL; if you're offline or the host is unreachable, the game skips it by design (no black screen). A local copy can be wired in per §7.
- **`npm install` fails** — retry with `--legacy-peer-deps`.
- **Port already in use** — set `PORT=4174 npm run preview` (or any free port).
- **Refresh shows 404 on a host** — you deployed only the static assets to a static host; use one of the deployment paths in §6 so the server function handles routing.

## 12. Getting the original project from Lovable

The ZIP you downloaded was exported directly from this project. You can also fetch the complete live project at any time: open the project in Lovable and use the code export / GitHub sync (Settings → GitHub) to clone the exact repository, then follow §2–§5 above.

## 13. ZIP → GitHub → Vercel walkthrough

1. **Extract the ZIP** anywhere, e.g. `unzip Mahinoor-Vercel.zip -d mahinoor && cd mahinoor`.
2. **Check it runs:** `npm install`, then `npm run dev` (http://localhost:5173) — optional but reassuring.
3. **Upload to GitHub:** create an empty repo on github.com, then:
   ```sh
   git init
   git add .
   git commit -m "Mahinoor game"
   git branch -M main
   git remote add origin https://github.com/YOUR-NAME/YOUR-REPO.git
   git push -u origin main
   ```
4. **Import into Vercel:** vercel.com → Add New… → Project → pick the repo → Deploy. No settings to change; Vercel runs `npm install` + `npm run build` and serves the result.
5. **Verify the public URL:** open the printed `*.vercel.app` URL, play through the story to the bench, and confirm the video and music work.
6. **Automatic deploys:** already on — every push to `main` redeploys; pull requests get preview URLs.

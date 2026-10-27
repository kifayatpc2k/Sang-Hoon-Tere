<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- The 3D game lives in `src/game/` split by concern (world, characters, camera, input, narrative, ui, audio); keep that split so systems stay independent.
- Story progress only changes through the pure transition table in `src/game/narrative/machine.ts`; positions and story text live in `src/game/config/chapter.ts`, so controllers and UI never hardcode them.
- Character models are resolved from the manifest `src/game/config/characters.ts` (realistic primary, Kenney fallback, clip/bone name patterns) via `characters/assets.ts`; `ModelHuman`/`ModelCat` auto-fit scale/ground and map logical clips, while controllers only drive `Animator`/`CatAnimator`, so swapping a GLB never touches story logic. Fallback use is always surfaced in the HUD; spec lives in `public/models/README.md`.
- Per-frame positions/camera data use the mutable `runtime` object, not React state, to avoid re-rendering every frame.
- The game is loaded with `ClientOnly` + `lazy` because Three.js needs the browser.
- Ship character GLBs dequantized (float skin weights): quantized skinned meshes rendered in bind pose on the GPU even though animation ran.
- `ModelHuman` derives each model's forward from foot→toe bones and corrects yaw at the wrapper, fits seated hips to `seatH` from the live pose, and applies gaze as a non-accumulating offset; never hand-rotate individual GLBs or add head rotation per frame.
- During journeys the girl (player) leads and the boy uses the companion controller beside her; stops trigger on the girl's proximity only.
- Deployment target is Vercel: `vite.config.ts` sets `nitro: { preset: "vercel" }`, so builds emit the Vercel Build Output API (`.vercel/output`); `npm run preview` runs `scripts/preview.mjs`, a zero-dependency Node shim serving the static dir and calling the server function's fetch (it also detects a sandbox cloudflare build in `dist/`, which is what the Lovable sandbox pins for its own preview). Do not reintroduce wrangler/Cloudflare as the deployment path.

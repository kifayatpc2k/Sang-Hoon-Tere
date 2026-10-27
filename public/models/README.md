# Character models

The game loads each character from a **realistic primary file**. If that file is
missing, it uses the temporary stylised Kenney fallback and shows a small notice
in the corner. If a primary file exists but fails to load, the error is logged,
the notice names the character, and the fallback is used. The game never
silently swaps a realistic model for a placeholder.

The manifest is `src/game/config/characters.ts` (paths, target sizes, clip-name
patterns). The story and movement code don't reference model files at all.

## Files to add (replace)

| Character | Drop the file here                 | Temporary fallback (keep)     |
|-----------|------------------------------------|-------------------------------|
| Girl      | `public/models/realistic/girl.glb` | `public/models/people/girl.glb` |
| Boy       | `public/models/realistic/boy.glb`  | `public/models/people/boy.glb`  |
| Kitten    | `public/models/realistic/cat.glb`  | `public/models/pets/cat.glb`    |

The Kenney fallbacks are **stylised, not realistic** (CC0, kenney.nl).

## Format requirements (all models)

- Binary glTF 2.0 (`.glb`), textures embedded. No Draco or Meshopt compression.
- Any unit scale. Models are auto-scaled (girl 1.63 m, boy 1.76 m, kitten 0.42 m long)
  and ground-aligned (lowest point placed at y = 0).
- Faces **+Z**, Y-up, in bind or T/A pose at the origin.
- PBR metallic-roughness materials. Aim for 2K textures or smaller and under about 60k triangles per human.
- The license must allow redistribution in a web game (CC0 or a license you own).

## Humans (girl, boy)

- A single humanoid skeleton (Mixamo / Unreal / Rigify naming all work).
  The code finds bones by name: a bone matching `head`, and a chest bone matching `spine2` / `chest` / `spine1` / `spine`.
  The kitten is carried in front of the chest bone.
- The girl's model must **include her hijab** as skinned clothing. The procedural hijab is only added to the fallback.
- Animation clips, embedded in the same file. Names are matched loosely (case-insensitive):

| Needed for         | Required | Matching names (examples)               |
|--------------------|----------|-----------------------------------------|
| Idle / breathing   | yes      | `Idle`, `Breathing Idle`                |
| Walk (in place)    | yes      | `Walk`, `Walking`                       |
| Run                | optional | `Run`, `Running`, `Jog` (falls back to walk) |
| Sit on bench       | yes      | `Sit`, `Sitting Idle`                   |
| Crouch to kitten   | optional | `Crouch`, `Kneel`, `Squat`              |
| Hold kitten (boy)  | optional | `Holding`, `Carry`                      |
| Offer / pet        | optional | `Pick Up`, `Reach`, `Give`, `Offer`     |
| Welcome / nod      | optional | `Nod`, `Wave`, `Beckon`                 |

Walk clips must be **in place** (no root motion). The game moves the character
itself and matches the step speed to ground speed (set `walkSpeed` in the manifest).
With Mixamo, tick "In Place" and export every clip onto the same skeleton.

## Kitten

- A quadruped skeleton with embedded clips: **idle**, **walk** (in place), and **sit**
  are required. `run`/`trot` and `lie`/`sleep`/`rest` are optional. Without a lie clip,
  the kitten uses its sit clip.

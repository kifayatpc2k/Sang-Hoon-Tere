// Character asset manifest. Swap models by dropping files at the `primary` paths — no code changes needed.
// See public/models/README.md for the full asset specification.

export type HumanClip = "idle" | "walk" | "run" | "sit" | "crouch" | "hold" | "interact" | "nod";
export type CatClip = "idle" | "walk" | "run" | "sit" | "lie";

export interface AssetSource {
  url: string;
  /** shown honestly in the UI; fallbacks are temporary stylised placeholders */
  quality: "realistic" | "stylised-fallback";
}

export interface HumanAsset {
  id: "girl" | "boy";
  label: string;
  primary: AssetSource;
  fallback: AssetSource;
  /** target standing height in metres; models are auto-scaled to this */
  height: number;
  /** add the procedural hijab — only for models that don't include one */
  addHijabOnFallback: boolean;
  hijab?: { color: string; trim: string };
  /** ground speed (m/s) of the walk clip at timeScale 1 */
  walkSpeed: number;
  /**
   * Optional conversion for the seated hips drop when a rig's hips tracks aren't in the
   * same units as its bind pose. Omitted = keep the proven b.y/refY proportion (girl).
   * 1.08 = hips tracks already in metres, hips height carried on a root node (scale 0.9252).
   */
  sitUnit?: number;
}

export interface CatAsset {
  id: "cat";
  label: string;
  primary: AssetSource;
  fallback: AssetSource;
  /** nose-to-tail-base length in metres */
  length: number;
}

export const GIRL_ASSET: HumanAsset = {
  id: "girl",
  label: "Girl",
  primary: { url: "/models/realistic/girl.glb", quality: "realistic" },
  fallback: { url: "/models/people/girl.glb", quality: "stylised-fallback" },
  height: 1.63,
  addHijabOnFallback: true,
  hijab: { color: "#b9857f", trim: "#9c6d68" },
  walkSpeed: 1.4,
};

export const BOY_ASSET: HumanAsset = {
  id: "boy",
  label: "Boy",
  primary: { url: "/models/realistic/boy.glb", quality: "realistic" },
  fallback: { url: "/models/people/boy.glb", quality: "stylised-fallback" },
  height: 1.76,
  addHijabOnFallback: false,
  walkSpeed: 1.4,
  sitUnit: 1.08,
};

export const CAT_ASSET: CatAsset = {
  id: "cat",
  label: "Kitten",
  primary: { url: "/models/realistic/cat.glb", quality: "realistic" },
  fallback: { url: "/models/pets/cat.glb", quality: "stylised-fallback" },
  length: 0.42,
};

/** Clip name patterns, tried in order (case-insensitive). Covers Kenney, Mixamo and common exports. */
export const HUMAN_CLIP_ALIASES: Record<HumanClip, RegExp[]> = {
  idle: [/^idle$/i, /idle/i, /breath/i, /stand/i],
  walk: [/^walk$/i, /walking/i, /walk/i],
  run: [/^sprint$/i, /^run$/i, /running|jog/i, /run/i],
  sit: [/^sit$/i, /sitting.?idle/i, /sit/i],
  crouch: [/^crouch$/i, /crouch|kneel|squat/i],
  hold: [/^holding-both$/i, /hold|carry/i],
  interact: [/^interact-right$/i, /interact|pick.?up|reach|give|offer/i],
  nod: [/^emote-yes$/i, /nod|yes|wave|gesture|beckon/i],
};

export const CAT_CLIP_ALIASES: Record<CatClip, RegExp[]> = {
  idle: [/^idle$/i, /idle/i, /stand/i],
  walk: [/^walk$/i, /walk/i],
  run: [/^run$/i, /run|trot|gallop/i],
  sit: [/sit/i],
  lie: [/lie|lay|sleep|rest/i],
};

/** Bone/node names searched for the head and chest anchors. */
export const HEAD_BONE = [/^head$/i, /(^|[:_.\s])head$/i, /head(?!.*(top|end))/i];
export const CHEST_BONE = [/^torso$/i, /spine2$/i, /chest/i, /spine1$/i, /spine$/i];

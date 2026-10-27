// Asset resolution, kept apart from movement and story logic.
// Probes the realistic `primary` file; uses the stylised fallback only when it's absent, and says so.
import * as THREE from "three";
import type { AssetSource } from "../config/characters";
import { useGame } from "../state/store";

export interface Resolved {
  source: AssetSource;
  /** why the fallback is in use, if it is */
  reason: "missing" | "failed" | null;
}

const cache = new Map<string, Promise<boolean>>();

/** True when `url` serves a real binary glTF (dev servers answer missing files with HTML). */
export function probeGlb(url: string): Promise<boolean> {
  let p = cache.get(url);
  if (!p) {
    p = fetch(url, { headers: { Range: "bytes=0-3" } })
      .then(async (r) => {
        if (!r.ok) return false;
        const b = new Uint8Array(await r.arrayBuffer()).slice(0, 4);
        return String.fromCharCode(...b) === "glTF";
      })
      .catch(() => false);
    cache.set(url, p);
  }
  return p;
}

const resolved = new Map<string, Promise<Resolved>>();
export function resolveAsset(
  id: string,
  primary: AssetSource,
  fallback: AssetSource,
): Promise<Resolved> {
  let p = resolved.get(id);
  if (!p) {
    p = probeGlb(primary.url).then((ok) => {
      const r: Resolved = ok
        ? { source: primary, reason: null }
        : { source: fallback, reason: "missing" };
      useGame.getState().setAssetStatus(id, r.source.quality, r.reason);
      return r;
    });
    resolved.set(id, p);
  }
  return p;
}

export function findNode(root: THREE.Object3D, patterns: RegExp[]): THREE.Object3D | null {
  const all: THREE.Object3D[] = [];
  root.traverse((o) => {
    if (!(o as THREE.Mesh).isMesh) all.push(o);
  });
  for (const re of patterns) {
    const hit = all.find((o) => re.test(o.name));
    if (hit) return hit;
  }
  return null;
}

export function findClip<K extends string>(
  names: string[],
  aliases: Record<K, RegExp[]>,
  key: K,
): string | null {
  for (const re of aliases[key]) {
    const n = names.find((x) => re.test(x));
    if (n) return n;
  }
  return null;
}

/** Measures a loaded model and returns scale + ground offset so feet sit on y=0. */
export function fitModel(root: THREE.Object3D, target: number, axis: "height" | "length") {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const native = axis === "height" ? size.y : Math.max(size.x, size.z);
  const scale = native > 1e-5 ? target / native : 1;
  return { scale, groundOffset: -box.min.y * scale, box, size };
}

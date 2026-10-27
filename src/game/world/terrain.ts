import { PROMENADE_Z, SHORE_Z, WALK_BOUNDS } from "../config/chapter";

/** Nearly level beach: sand dips gently into the water, promenade sits on a low step. */
export function groundHeight(x: number, z: number): number {
  if (z > PROMENADE_Z + 0.4) return 0.32;
  let h = 0;
  if (z < SHORE_Z + 4) h = (z - (SHORE_Z + 4)) * 0.075; // gentle slope into the sea
  h += Math.sin(x * 0.21 + z * 0.13) * 0.03 + Math.sin(x * 0.07 - z * 0.19) * 0.04;
  if (z > PROMENADE_Z - 1.5) h += (z - (PROMENADE_Z - 1.5)) * 0.1; // rise to the promenade step
  return h;
}

export interface Obstacle {
  x: number;
  z: number;
  r: number;
  /** true for things the camera should not pass through */
  solid?: boolean;
}

/** Static collision circles registered by world props. */
export const obstacles: Obstacle[] = [];

export function clampToWalkable(p: { x: number; z: number }) {
  p.x = Math.min(WALK_BOUNDS.maxX, Math.max(WALK_BOUNDS.minX, p.x));
  p.z = Math.min(WALK_BOUNDS.maxZ, Math.max(WALK_BOUNDS.minZ, p.z));
}

/** Push a circle out of all static obstacles. */
export function resolveObstacles(
  p: { x: number; z: number },
  radius: number,
  extra: Obstacle[] = [],
) {
  for (const list of [obstacles, extra])
    for (const o of list) {
      const dx = p.x - o.x;
      const dz = p.z - o.z;
      const d = Math.hypot(dx, dz);
      const min = o.r + radius;
      if (d < min && d > 1e-5) {
        p.x = o.x + (dx / d) * min;
        p.z = o.z + (dz / d) * min;
      }
    }
}

export function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Shortest signed angle from a to b. */
export const angleDiff = (a: number, b: number) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
export const dampAngle = (a: number, b: number, k: number, dt: number) =>
  a + angleDiff(a, b) * (1 - Math.exp(-k * dt));

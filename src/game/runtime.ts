import * as THREE from "three";
import { BOY_START, CAT_START_OFFSET, GIRL_SPAWN } from "./config/chapter";
import { groundHeight } from "./world/terrain";

export interface Agent {
  pos: THREE.Vector3;
  facing: number;
  speed: number;
}

const agent = (x: number, z: number, facing: number): Agent => ({
  pos: new THREE.Vector3(x, groundHeight(x, z), z),
  facing,
  speed: 0,
});

/** Per-frame mutable state shared between controllers, camera and input (not React state). */
export const runtime = {
  girl: agent(GIRL_SPAWN.x, GIRL_SPAWN.z, GIRL_SPAWN.facing),
  boy: agent(BOY_START.x, BOY_START.z, BOY_START.facing),
  /** kitten starts on the sand beside the boy (his right, slightly behind) */
  cat: agent(BOY_START.x + CAT_START_OFFSET.x, BOY_START.z + CAT_START_OFFSET.z, BOY_START.facing),
  vel: new THREE.Vector3(),
  yaw: GIRL_SPAWN.facing,
  pitch: 0.12,
  /** World-space anchor in the boy's arms where the kitten rests while held. */
  boyHoldAnchor: new THREE.Object3D(),
  girlHeadWorld: new THREE.Vector3(),
  /** measured from the loaded models so the camera frames any character size */
  frame: { girlEye: 1.42, girlHeight: 1.63 },
  boyHeadWorld: new THREE.Vector3(),
  input: { lookX: 0, lookY: 0, interact: false },
  keys: new Set<string>(),
  joystick: { x: 0, y: 0 },
  gl: null as THREE.WebGLRenderer | null,
  resetToken: 0,
  /** dev/test hook to fast-forward walking; always 1 in normal play */
  timeScale: 1,
};

export function resetWorld() {
  const g = runtime.girl;
  g.pos.set(GIRL_SPAWN.x, groundHeight(GIRL_SPAWN.x, GIRL_SPAWN.z), GIRL_SPAWN.z);
  g.facing = GIRL_SPAWN.facing;
  g.speed = 0;
  const b = runtime.boy;
  b.pos.set(BOY_START.x, groundHeight(BOY_START.x, BOY_START.z), BOY_START.z);
  b.facing = BOY_START.facing;
  b.speed = 0;
  const c = runtime.cat;
  const cx = BOY_START.x + CAT_START_OFFSET.x;
  const cz = BOY_START.z + CAT_START_OFFSET.z;
  c.pos.set(cx, groundHeight(cx, cz), cz);
  c.facing = BOY_START.facing;
  c.speed = 0;
  runtime.vel.set(0, 0, 0);
  runtime.yaw = GIRL_SPAWN.facing;
  runtime.pitch = 0.12;
  runtime.resetToken++;
}

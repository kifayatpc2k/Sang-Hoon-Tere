import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { BENCH, BOY_START, GIRL_SPAWN } from "../config/chapter";
import { isPlayable } from "../narrative/machine";
import { runtime } from "../runtime";
import { stateTime, useGame } from "../state/store";
import { groundHeight, obstacles } from "../world/terrain";

const INTRO = 10;
export const cameraState = {
  skipIntro: false,
  endYaw: 0,
  endPitch: 0,
  focusDistance: 6,
  /** dev-only inspection shot */
  override: null as null | { pos: [number, number, number]; look: [number, number, number] },
};

/** Pull the camera in when a lamp post or tree trunk sits between it and the girl. */
function collide(target: THREE.Vector3, cam: THREE.Vector3) {
  const dx = cam.x - target.x;
  const dz = cam.z - target.z;
  const len = Math.hypot(dx, dz);
  let t = 1;
  for (const o of obstacles) {
    if (!o.solid) continue;
    const fx = target.x - o.x;
    const fz = target.z - o.z;
    const a = dx * dx + dz * dz;
    const b = 2 * (fx * dx + fz * dz);
    const r = o.r + 0.25;
    const c = fx * fx + fz * fz - r * r;
    const disc = b * b - 4 * a * c;
    if (disc < 0 || a < 1e-6) continue;
    const hit = (-b - Math.sqrt(disc)) / (2 * a);
    if (hit > 0.05 && hit < t) t = hit;
  }
  if (t < 1) {
    const keep = Math.max(0.9 / Math.max(len, 0.01), t - 0.08);
    cam.x = target.x + dx * keep;
    cam.z = target.z + dz * keep;
  }
  const minY = groundHeight(cam.x, cam.z) + 0.35;
  if (cam.y < minY) cam.y = minY;
}

export function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const v = useMemo(
    () => ({
      desired: new THREE.Vector3(),
      look: new THREE.Vector3(),
      lookCur: new THREE.Vector3(0, 1.4, 20),
      a: new THREE.Vector3(),
      b: new THREE.Vector3(),
    }),
    [],
  );
  const introCurve = useMemo(() => {
    const pos = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-34, 9, -26),
      new THREE.Vector3(-12, 6.5, -14),
      new THREE.Vector3(8, 4.2, -2),
      new THREE.Vector3(GIRL_SPAWN.x + 6, 3.4, GIRL_SPAWN.z - 10),
      new THREE.Vector3(GIRL_SPAWN.x + 2.4, 2.2, GIRL_SPAWN.z + 3.4),
    ]);
    const look = new THREE.CatmullRomCurve3([
      new THREE.Vector3(BENCH.x, 1, BENCH.z + 4),
      new THREE.Vector3(BOY_START.x, 1.2, BOY_START.z + 2),
      new THREE.Vector3(GIRL_SPAWN.x - 4, 1.4, GIRL_SPAWN.z - 2),
      new THREE.Vector3(GIRL_SPAWN.x, 1.5, GIRL_SPAWN.z),
      new THREE.Vector3(GIRL_SPAWN.x - 3, 1.4, GIRL_SPAWN.z - 12),
    ]);
    return { pos, look };
  }, []);
  const blend = useRef(0);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const st = useGame.getState();
    const s = st.narrative;
    const t = stateTime();
    const set = st.settings;
    if (camera.fov !== set.fov) {
      camera.fov = set.fov;
      camera.updateProjectionMatrix();
    }
    if (cameraState.override) {
      camera.position.set(...cameraState.override.pos);
      camera.lookAt(...cameraState.override.look);
      return;
    }
    const g = runtime.girl.pos;
    const sens = set.sensitivity * 0.0024;

    if (s === "intro" || s === "loading") {
      const dur = set.reducedMotion ? 3.5 : INTRO;
      const u = s === "loading" ? 0 : Math.min(1, t / dur);
      const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      introCurve.pos.getPoint(e, camera.position);
      introCurve.look.getPoint(e, v.lookCur);
      camera.lookAt(v.lookCur);
      if (s === "intro" && (u >= 1 || cameraState.skipIntro)) {
        cameraState.skipIntro = false;
        runtime.yaw = Math.atan2(g.x - camera.position.x, g.z - camera.position.z);
        runtime.pitch = 0.14;
        st.dispatch("INTRO_DONE");
      }
      return;
    }

    let k = 9;
    if (isPlayable(s) && !st.panel) {
      runtime.yaw -= runtime.input.lookX * sens;
      runtime.pitch = THREE.MathUtils.clamp(runtime.pitch + runtime.input.lookY * sens, -0.35, 0.9);
    }
    if (s === "ended") {
      cameraState.endYaw = THREE.MathUtils.clamp(
        cameraState.endYaw - runtime.input.lookX * sens,
        -0.9,
        0.9,
      );
      cameraState.endPitch = THREE.MathUtils.clamp(
        cameraState.endPitch + runtime.input.lookY * sens * 0.6,
        -0.15,
        0.35,
      );
    }
    runtime.input.lookX = 0;
    runtime.input.lookY = 0;

    if (s === "greeting" || s === "handover") {
      // gentle two-shot from the side of the pair
      const b = runtime.boy.pos;
      v.a.set((g.x + b.x) / 2, 0, (g.z + b.z) / 2);
      const ax = b.x - g.x;
      const az = b.z - g.z;
      const len = Math.hypot(ax, az) || 1;
      let px = -az / len;
      let pz = ax / len;
      // pick the side facing the current camera so the move is short; keep the sea in the back
      if (px * (camera.position.x - v.a.x) + pz * (camera.position.z - v.a.z) < 0) {
        px = -px;
        pz = -pz;
      }
      const low = s === "handover" ? 0.25 : 0;
      v.desired.set(v.a.x + px * 2.7, 1.5 - low, v.a.z + pz * 2.7 + 0.4);
      v.look.set(v.a.x, 1.15 - low * 1.6, v.a.z);
      k = 2.6;
    } else if (s === "sitting" || s === "ended") {
      // wide composition from behind the bench: both of them, the kitten, the water and the city
      const yaw = cameraState.endYaw;
      const base = new THREE.Vector3(BENCH.x - 2.2, 1.75 + cameraState.endPitch * 2, BENCH.z + 4.4);
      const pivot = new THREE.Vector3(BENCH.x - 0.2, 0.8, BENCH.z);
      base
        .sub(pivot)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw)
        .add(pivot);
      v.desired.copy(base);
      v.look.set(BENCH.x + 0.4 + Math.sin(yaw) * 2, 1.1 + cameraState.endPitch * 2, BENCH.z - 6);
      cameraState.focusDistance = Math.hypot(base.x - BENCH.x, base.z - BENCH.z);
      k = s === "sitting" ? 1.4 : 3;
    } else {
      const dist = set.cameraDistance * (runtime.frame.girlHeight / 1.63);
      const cp = Math.cos(runtime.pitch);
      const fx = Math.sin(runtime.yaw);
      const fz = Math.cos(runtime.yaw);
      const sh = 0.38;
      v.look.set(g.x - fz * -sh * 0.4, g.y + runtime.frame.girlEye, g.z + fx * -sh * 0.4);
      v.desired.set(
        g.x - fx * dist * cp - fz * sh,
        g.y + runtime.frame.girlEye + 0.13 + Math.sin(runtime.pitch) * dist,
        g.z - fz * dist * cp + fx * sh,
      );
      collide(v.look, v.desired);
      // keep the kitten from blocking the view: lift slightly if it is between us
      const c = runtime.cat.pos;
      const dc = Math.hypot(c.x - v.desired.x, c.z - v.desired.z);
      if (dc < 0.9) v.desired.y += (0.9 - dc) * 0.6;
    }

    blend.current = Math.min(1, blend.current + dt);
    const f = 1 - Math.exp(-k * dt);
    camera.position.lerp(v.desired, f);
    v.lookCur.lerp(v.look, 1 - Math.exp(-(k + 3) * dt));
    camera.lookAt(v.lookCur);
  });
  return null;
}

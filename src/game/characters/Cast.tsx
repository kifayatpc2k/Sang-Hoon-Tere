import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  ARRIVE_RADIUS,
  BENCH,
  BOW_ON_COUNTER,
  BOW_PAUSE,
  BOY_SEAT,
  BOY_START,
  CAT_REST,
  CAT_START_OFFSET,
  COMPANION_SIDE,
  FLOWER_BOY_SPOT,
  FLOWER_GIRL_SPOT,
  FLOWER_SHOP,
  GIRL_SEAT,
  PARLOUR,
  PARLOUR_BOY_SPOT,
  PARLOUR_GIRL_SPOT,
  PARLOUR_PAUSE,
  SEAT_HEIGHT,
} from "../config/chapter";
import { BOY_ASSET, CAT_ASSET, GIRL_ASSET } from "../config/characters";
import { text } from "../config/gameContent";
import { audio } from "../audio/audio";
import { sceneBlocked, triggerMoment } from "../features/scenes";
import {
  DIALOGUE_START,
  LINE_GAP,
  LINE_TIME,
  dialogueAt,
  lineFor,
  type DialogueStep,
} from "../narrative/dialogue";
import { catFollowsGirl, isPlayable } from "../narrative/machine";
import { runtime, type Agent } from "../runtime";
import { stateTime, useGame } from "../state/store";
import { PinkBow } from "../world/Bow";
import {
  angleDiff,
  clampToWalkable,
  dampAngle,
  groundHeight,
  resolveObstacles,
  type Obstacle,
} from "../world/terrain";
import { CatAnimator } from "./Cat";
import type { HumanHandle } from "./Human";
import { ModelCat } from "./ModelCat";
import { ModelHuman } from "./ModelHuman";
import { Animator } from "./rig";

const WALK = 1.9;
const RUN = 3.8;
const REACH_BOY = 2.6;
const NEAR_BENCH = 2.6;

const tmpV = new THREE.Vector3();
const headingTo = (from: { x: number; z: number }, to: { x: number; z: number }) =>
  Math.atan2(to.x - from.x, to.z - from.z);
const dist2d = (a: { x: number; z: number }, b: { x: number; z: number }) =>
  Math.hypot(a.x - b.x, a.z - b.z);

/** Move an agent toward a point at a natural pace; returns remaining distance. */
function walkTo(a: Agent, target: { x: number; z: number }, speed: number, dt: number, turnK = 7) {
  const d = dist2d(a.pos, target);
  const want = headingTo(a.pos, target);
  a.facing = dampAngle(a.facing, want, turnK, dt);
  // only move forward when roughly facing the target: no sideways sliding
  const align = Math.max(0, Math.cos(angleDiff(a.facing, want)));
  const v = Math.min(speed, d * 2.2) * align;
  a.speed += (v - a.speed) * (1 - Math.exp(-6 * dt));
  a.pos.x += Math.sin(a.facing) * a.speed * dt;
  a.pos.z += Math.cos(a.facing) * a.speed * dt;
  return d;
}
function stop(a: Agent, dt: number) {
  a.speed *= Math.exp(-8 * dt);
  if (a.speed > 0.01) {
    a.pos.x += Math.sin(a.facing) * a.speed * dt;
    a.pos.z += Math.cos(a.facing) * a.speed * dt;
  }
}
/** Relative head yaw so a character looks at a world point (clamped by the animator). */
function lookAt(
  anim: { targetLookYaw: number; targetLookPitch: number },
  a: Agent,
  p: { x: number; z: number } | null,
  pitch = 0,
) {
  if (!p) {
    anim.targetLookYaw = 0;
    anim.targetLookPitch = 0;
    return;
  }
  anim.targetLookYaw = angleDiff(a.facing, headingTo(a.pos, p));
  anim.targetLookPitch = pitch;
}

/**
 * The boy walks beside the player-led girl: he tracks a spot at her right that turns with her,
 * matches her pace, and settles to idle when she stops. He never leads.
 */
function walkBeside(boy: Agent, girl: Agent, dt: number) {
  const fx = Math.sin(girl.facing);
  const fz = Math.cos(girl.facing);
  // her right (model faces +Z, left is +X) = (-fz, fx)
  const spot = {
    x: girl.pos.x - fz * COMPANION_SIDE - fx * 0.12,
    z: girl.pos.z + fx * COMPANION_SIDE - fz * 0.12,
  };
  const d = dist2d(boy.pos, spot);
  const moving = girl.speed > 0.2;
  if (!moving && d < 0.45) {
    stop(boy, dt);
    boy.facing = dampAngle(boy.facing, girl.facing, 3, dt);
  } else if (moving && d < 0.7) {
    // in step with her: keep her heading, nudge toward the spot
    const want = Math.atan2(spot.x - boy.pos.x + fx * 1.5, spot.z - boy.pos.z + fz * 1.5);
    boy.facing = dampAngle(boy.facing, want, 6, dt);
    const v = girl.speed + (d - 0.1) * 0.8;
    boy.speed += (v - boy.speed) * (1 - Math.exp(-5 * dt));
    boy.pos.x += Math.sin(boy.facing) * boy.speed * dt;
    boy.pos.z += Math.cos(boy.facing) * boy.speed * dt;
  } else {
    walkTo(boy, spot, THREE.MathUtils.clamp(girl.speed + d * 0.9, 0.7, RUN * 1.05), dt, 6);
  }
  return d;
}

type BowState = "counter" | "boy" | "bag";

export function Cast({ shadows }: { shadows: boolean }) {
  const girlAnim = useMemo(() => new Animator(GIRL_ASSET.height), []);
  const boyAnim = useMemo(() => new Animator(BOY_ASSET.height), []);
  const catAnim = useMemo(() => new CatAnimator(), []);
  girlAnim.seatH = SEAT_HEIGHT;
  boyAnim.seatH = SEAT_HEIGHT;

  const girlG = useRef<THREE.Group>(null);
  const boyG = useRef<THREE.Group>(null);
  const catG = useRef<THREE.Group>(null);
  const boyBody = useRef<HumanHandle>(null);
  const girlBody = useRef<HumanHandle>(null);
  const bowG = useRef<THREE.Group>(null); // loose bow (counter / his hand)
  const bagBow = useRef<THREE.Group>(null); // the one tied onto her bag
  const markerG = useRef<THREE.Group>(null);
  const girlBubble = useRef<THREE.Group>(null);
  const boyBubble = useRef<THREE.Group>(null);
  const [line, setLine] = useState<{ step: DialogueStep | null; leaving: boolean }>({
    step: null,
    leaving: false,
  });

  const mem = useRef({
    catStill: 0,
    girlSitStage: 0,
    boySitStage: 0,
    girlRoute: [] as { x: number; z: number }[],
    boyRoute: [] as { x: number; z: number }[],
    inviteFrom: new THREE.Vector3(),
    lastState: "",
    toastShown: false,
    /** bow scene: 0 settle at counter, 1 picks the bow up, 2 steps behind her, 3 ties it on, 4 pause */
    bowStage: 0,
    stageT: 0,
    bow: "counter" as BowState,
    bowFrom: new THREE.Vector3(),
    line: null as DialogueStep | null,
    leaving: false,
  });

  const boyObstacle = useMemo<Obstacle>(() => ({ x: 0, z: 0, r: 0.38 }), []);

  useEffect(() => {
    return useGame.subscribe((s, prev) => {
      if (s.narrative !== prev.narrative && s.narrative === "intro") {
        boyAnim.body = "locomotion";
        boyAnim.gesture = "none";
        girlAnim.body = "locomotion";
        girlAnim.gesture = "none";
        catAnim.mode = "sit";
        const m = mem.current;
        m.girlSitStage = 0;
        m.boySitStage = 0;
        m.toastShown = false;
        m.bowStage = 0;
        m.stageT = 0;
        m.bow = "counter";
        m.line = null;
        setLine({ step: null, leaving: false });
      }
    });
  }, [boyAnim, girlAnim, catAnim]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1) * runtime.timeScale;
    const st = useGame.getState();
    const s = st.narrative;
    const t = stateTime();
    const reduced = st.settings.reducedMotion;
    const m = mem.current;
    const girl = runtime.girl;
    const boy = runtime.boy;
    const cat = runtime.cat;
    if (s !== m.lastState) {
      m.lastState = s;
      triggerMoment(s); // start the cinematic/dialogue configured for this story moment
      if (s === "invite") m.inviteFrom.copy(girl.pos);
      if (s === "iceCream") {
        runtime.vel.set(0, 0, 0);
        st.showToast(text.iceCream);
      }
      if (s === "flowers") {
        runtime.vel.set(0, 0, 0);
        m.bowStage = 0;
        m.stageT = 0;
      }
      if (st.boyWaiting) st.setBoyWaiting(false);
      if (s === "sitting") {
        // route around the bench ends so nobody walks through it (seats are reached from the water side)
        const gFront = { x: GIRL_SEAT.x, z: GIRL_SEAT.z - 0.42 };
        const bFront = { x: BOY_SEAT.x, z: BOY_SEAT.z - 0.44 };
        const behind = (p: { z: number }) => p.z > BENCH.z - 0.3;
        m.girlRoute = behind(girl.pos)
          ? [
              { x: Math.min(girl.pos.x, BENCH.x - 1.25), z: Math.max(girl.pos.z, BENCH.z + 0.95) },
              { x: BENCH.x - 1.25, z: BENCH.z + 0.95 },
              { x: BENCH.x - 1.2, z: BENCH.z - 0.5 },
              gFront,
            ]
          : [gFront];
        m.boyRoute = behind(boy.pos)
          ? [
              { x: Math.max(boy.pos.x, BENCH.x + 1.25), z: Math.max(boy.pos.z, BENCH.z + 0.95) },
              { x: BENCH.x + 1.25, z: BENCH.z + 0.95 },
              { x: BENCH.x + 1.2, z: BENCH.z - 0.5 },
              bFront,
            ]
          : [{ x: BENCH.x + 1.2, z: BENCH.z - 0.5 }, bFront];
      }
    }

    // ------------------------------------------------------------- GIRL
    const blocked = sceneBlocked(); // a cinematic or dialogue overlay owns the screen
    const playable = isPlayable(s) && !st.panel && !blocked;
    if ((s === "iceCream" || s === "flowers") && !blocked) {
      // step up to the counter, then turn toward the display
      const spot = s === "iceCream" ? PARLOUR_GIRL_SPOT : FLOWER_GIRL_SPOT;
      const shop = s === "iceCream" ? PARLOUR : FLOWER_SHOP;
      // once there she stays put (he steps around her), so she never jitters or turns away
      if (dist2d(girl.pos, spot) > 0.25 && girl.speed >= 0) {
        if (walkTo(girl, spot, 1.1, dt, 6) < 0.25) girl.speed = Math.min(girl.speed, 0.3);
      } else {
        stop(girl, dt);
        girl.facing = dampAngle(girl.facing, headingTo(girl.pos, shop), 3, dt);
      }
      girl.pos.y = groundHeight(girl.pos.x, girl.pos.z);
    } else if (s === "sitting" || s === "ended") {
      // scripted, smooth sit-down: step in front of the seat, turn to the view, lower onto the bench
      if (m.girlSitStage === 0) {
        const wp = m.girlRoute[0];
        if (!wp) m.girlSitStage = 1;
        else if (walkTo(girl, wp, 1.2, dt) < (m.girlRoute.length > 1 ? 0.25 : 0.06))
          m.girlRoute.shift();
      } else if (m.girlSitStage === 1) {
        stop(girl, dt);
        girl.facing = dampAngle(girl.facing, BENCH.facing, 5, dt);
        if (Math.abs(angleDiff(girl.facing, BENCH.facing)) < 0.05) {
          m.girlSitStage = 2;
          girlAnim.body = "sit";
        }
      } else {
        girl.speed = 0;
        girl.facing = dampAngle(girl.facing, BENCH.facing, 5, dt);
        const k = 1 - Math.exp(-4 * dt);
        girl.pos.x += (GIRL_SEAT.x - girl.pos.x) * k;
        girl.pos.z += (GIRL_SEAT.z - girl.pos.z) * k;
      }
      girl.pos.y = groundHeight(girl.pos.x, girl.pos.z);
    } else {
      let f = 0;
      let r = 0;
      if (playable) {
        const k = runtime.keys;
        f =
          (k.has("w") || k.has("arrowup") ? 1 : 0) -
          (k.has("s") || k.has("arrowdown") ? 1 : 0) -
          runtime.joystick.y;
        r =
          (k.has("d") || k.has("arrowright") ? 1 : 0) -
          (k.has("a") || k.has("arrowleft") ? 1 : 0) +
          runtime.joystick.x;
      }
      const len = Math.hypot(f, r);
      if (len > 1) {
        f /= len;
        r /= len;
      }
      const sy = Math.sin(runtime.yaw);
      const cy = Math.cos(runtime.yaw);
      const dx = sy * f - cy * r;
      const dz = cy * f + sy * r;
      const running =
        runtime.keys.has("shift") || Math.hypot(runtime.joystick.x, runtime.joystick.y) > 0.95;
      const target = (running ? RUN : WALK) * Math.min(1, Math.hypot(f, r));
      const k = 1 - Math.exp(-7 * dt);
      runtime.vel.x += (dx * target - runtime.vel.x) * k;
      runtime.vel.z += (dz * target - runtime.vel.z) * k;
      if (!playable) runtime.vel.multiplyScalar(Math.exp(-10 * dt));
      girl.pos.x += runtime.vel.x * dt;
      girl.pos.z += runtime.vel.z * dt;
      girl.speed = Math.hypot(runtime.vel.x, runtime.vel.z);
      if (girl.speed > 0.15)
        girl.facing = dampAngle(girl.facing, Math.atan2(runtime.vel.x, runtime.vel.z), 9, dt);
      boyObstacle.x = boy.pos.x;
      boyObstacle.z = boy.pos.z;
      resolveObstacles(girl.pos, 0.28, [boyObstacle]);
      clampToWalkable(girl.pos);
      girl.pos.y = groundHeight(girl.pos.x, girl.pos.z);
      if ((s === "greeting" || s === "handover") && girl.speed < 0.3) {
        const focus = s === "handover" && t > 1 ? cat.pos : boy.pos;
        girl.facing = dampAngle(girl.facing, headingTo(girl.pos, focus), 4, dt);
      }
    }
    // girl gestures
    if (s === "handover") {
      const catClose = dist2d(cat.pos, girl.pos) < 0.95 && cat.speed < 0.2;
      girlAnim.body = catClose && t < 6.1 ? "crouch" : "locomotion";
      girlAnim.gesture = girlAnim.body === "crouch" ? "pet" : "none";
    } else if (s !== "sitting" && s !== "ended") {
      girlAnim.body = "locomotion";
      girlAnim.gesture = "none";
    }
    // girl gaze
    if (s === "handover" && t > 1)
      lookAt(girlAnim, girl, cat.pos, girlAnim.body === "crouch" ? 0.35 : 0.2);
    else if (s === "iceCream")
      lookAt(girlAnim, girl, t > 3.4 && t < 4.6 ? boy.pos : PARLOUR, t > 3.4 && t < 4.6 ? 0 : 0.22);
    else if (s === "flowers") lookAt(girlAnim, girl, m.bowStage >= 4 ? boy.pos : FLOWER_SHOP, 0.15);
    else if (s === "ended") lookAt(girlAnim, girl, lineFor(line.step) ? boy.pos : null, -0.03);
    else if (dist2d(girl.pos, boy.pos) < 7 && s !== "sitting")
      lookAt(girlAnim, girl, girl.speed > 0.3 ? null : boy.pos);
    else lookAt(girlAnim, girl, null);
    girlAnim.update(dt, girl.speed, reduced);

    // ------------------------------------------------------------- BOY
    const dGirlBoy = dist2d(girl.pos, boy.pos);
    if (s === "intro" || s === "explore" || s === "loading") {
      stop(boy, dt);
      boyAnim.gesture = "none";
      boyAnim.body = "locomotion";
      // waits by the water, then turns to face her as she comes close
      const wantFace = dGirlBoy < 12 ? headingTo(boy.pos, girl.pos) : BOY_START.facing;
      boy.facing = dampAngle(boy.facing, wantFace, 1.8, dt);
      if (dGirlBoy < 30) lookAt(boyAnim, boy, girl.pos, 0);
      else lookAt(boyAnim, boy, cat.pos, 0.35);
      if (s === "explore" && dGirlBoy < REACH_BOY) st.dispatch("REACH_BOY");
    } else if (s === "greeting") {
      stop(boy, dt);
      boy.facing = dampAngle(boy.facing, headingTo(boy.pos, girl.pos), 4, dt);
      lookAt(boyAnim, boy, girl.pos, t > 0.8 && t < 1.5 ? 0.18 : 0); // a small nod
      boyAnim.gesture = "none";
      if (!blocked && t > (reduced ? 1.2 : 2.6)) st.dispatch("GREET_DONE");
    } else if (s === "handover") {
      stop(boy, dt);
      boy.facing = dampAngle(boy.facing, headingTo(boy.pos, girl.pos), 4, dt);
      boyAnim.body = "locomotion";
      boyAnim.gesture = t > 0.5 && t < 2.4 ? "invite" : "none";
      lookAt(boyAnim, boy, t < 1.2 || t > 4 ? girl.pos : cat.pos, t > 1.2 && t < 4 ? 0.35 : 0.05);
      if (t > 6.8 && !m.toastShown) {
        m.toastShown = true;
        st.showToast(text.handoverDone);
        st.dispatch("HANDOVER_DONE");
      }
    } else if (s === "invite") {
      stop(boy, dt);
      boy.facing = dampAngle(boy.facing, headingTo(boy.pos, girl.pos), 3, dt);
      boyAnim.body = "locomotion";
      boyAnim.gesture = t > 0.6 && t < 3.5 ? "invite" : "none";
      lookAt(boyAnim, boy, girl.pos);
      // she accepts by pressing E, or simply by heading off toward the kiosk
      const toward =
        m.inviteFrom.distanceTo(girl.pos) > 2.2 ||
        (t > 1 && dist2d(girl.pos, PARLOUR_GIRL_SPOT) < 3);
      if (!blocked && (toward || (runtime.input.interact && t > 0.5))) st.dispatch("ACCEPT_INVITE");
    } else if (blocked && s !== "sitting" && s !== "ended") {
      // a cinematic/dialogue owns the screen: he holds still and faces her
      stop(boy, dt);
      boyAnim.body = "locomotion";
      boyAnim.gesture = "none";
      boy.facing = dampAngle(boy.facing, headingTo(boy.pos, girl.pos), 4, dt);
      lookAt(boyAnim, boy, girl.pos);
    } else if (s === "toParlour" || s === "toFlowers" || s === "guided" || s === "atBench") {
      // shared walk: she leads, he stays beside her
      boyAnim.body = "locomotion";
      boyAnim.gesture =
        s === "atBench" && girl.speed < 0.2 && dist2d(girl.pos, BENCH) < NEAR_BENCH
          ? "invite"
          : "none";
      walkBeside(boy, girl, dt);
      lookAt(boyAnim, boy, girl.speed < 0.2 || Math.sin(t * 0.7) > 0.6 ? girl.pos : null);
      boyObstacle.x = girl.pos.x;
      boyObstacle.z = girl.pos.z;
      resolveObstacles(boy.pos, 0.3, [boyObstacle]);
      clampToWalkable(boy.pos);
      // a stop begins only when the girl herself has reached it
      if (s === "toParlour" && dist2d(girl.pos, PARLOUR_GIRL_SPOT) < ARRIVE_RADIUS)
        st.dispatch("AT_PARLOUR");
      if (s === "toFlowers" && dist2d(girl.pos, FLOWER_GIRL_SPOT) < ARRIVE_RADIUS)
        st.dispatch("AT_FLOWERS");
      if (s === "guided" && dist2d(girl.pos, BENCH) < NEAR_BENCH + 2) st.dispatch("BOY_AT_BENCH");
      if (s === "atBench") {
        const near = dist2d(girl.pos, BENCH) < NEAR_BENCH;
        if (near !== st.nearBench) st.setNearBench(near);
        if (!blocked && near && runtime.input.interact) st.dispatch("SIT");
      }
    } else if (s === "iceCream") {
      const d = walkTo(boy, PARLOUR_BOY_SPOT, 1.0, dt, 5);
      if (d < 0.1) stop(boy, dt);
      const towardGirl = t > 1.0 && t < 4.2;
      if (d < 0.1)
        boy.facing = dampAngle(
          boy.facing,
          headingTo(boy.pos, towardGirl ? girl.pos : PARLOUR),
          3,
          dt,
        );
      boyAnim.body = "locomotion";
      boyAnim.gesture = t > 1.4 && t < 3.6 ? "invite" : "none";
      lookAt(boyAnim, boy, towardGirl ? girl.pos : PARLOUR, towardGirl ? 0 : 0.2);
      resolveObstacles(boy.pos, 0.3);
      if (!blocked && t > (reduced ? PARLOUR_PAUSE * 0.6 : PARLOUR_PAUSE))
        st.dispatch("ICECREAM_DONE");
    } else if (s === "flowers" && blocked) {
      // waiting for the arrival cinematic/dialogue to finish
      stop(boy, dt);
      boyAnim.body = "locomotion";
      boyAnim.gesture = "none";
      lookAt(boyAnim, boy, girl.pos);
    } else if (s === "flowers") {
      m.stageT += dt;
      // spot just behind her right shoulder, where her bag is
      const bx = girl.pos.x - Math.sin(girl.facing) * 0.6 - Math.cos(girl.facing) * 0.25;
      const bz = girl.pos.z - Math.cos(girl.facing) * 0.6 + Math.sin(girl.facing) * 0.25;
      boyAnim.body = "locomotion";
      if (m.bowStage === 0) {
        // settles at the counter beside her and looks over the display
        const d = walkTo(boy, FLOWER_BOY_SPOT, 0.9, dt, 5);
        if (d < 0.1) {
          stop(boy, dt);
          boy.facing = dampAngle(boy.facing, headingTo(boy.pos, FLOWER_SHOP), 3, dt);
        }
        boyAnim.gesture = "none";
        lookAt(boyAnim, boy, m.stageT < 1.2 ? FLOWER_SHOP : BOW_ON_COUNTER, 0.3);
        if (m.stageT > 1.8 && d < 0.15) {
          m.bowStage = 1;
          m.stageT = 0;
        }
      } else if (m.bowStage === 1) {
        // spots a little ribbon bow and picks it up
        stop(boy, dt);
        boy.facing = dampAngle(boy.facing, headingTo(boy.pos, BOW_ON_COUNTER), 3, dt);
        boyAnim.gesture = m.stageT < 1.4 ? "offer" : "hold";
        lookAt(boyAnim, boy, BOW_ON_COUNTER, 0.35);
        if (m.stageT > 1.0) m.bow = "boy";
        if (m.stageT > 1.9) {
          m.bowStage = 2;
          m.stageT = 0;
        }
      } else if (m.bowStage === 2) {
        // steps round to her bag
        boyAnim.gesture = "hold";
        const d = walkTo(boy, { x: bx, z: bz }, 0.8, dt, 5);
        lookAt(boyAnim, boy, girl.pos, 0.2);
        if (d < 0.1 || (d < 0.3 && boy.speed < 0.08) || m.stageT > 5) {
          m.bowStage = 3;
          m.stageT = 0;
        }
      } else if (m.bowStage === 3) {
        // ties it on
        stop(boy, dt);
        boy.facing = dampAngle(boy.facing, headingTo(boy.pos, girl.pos), 4, dt);
        boyAnim.gesture = "offer";
        lookAt(boyAnim, boy, girl.pos, 0.35);
        if (m.stageT > 1.2 && m.bow !== "bag") {
          m.bow = "bag";
          st.showToast(text.bow);
        }
        if (m.stageT > 1.8) {
          m.bowStage = 4;
          m.stageT = 0;
        }
      } else {
        // a brief pause to enjoy it, then off again
        const d = walkTo(boy, FLOWER_BOY_SPOT, 0.8, dt, 5);
        if (d < 0.1) {
          stop(boy, dt);
          boy.facing = dampAngle(boy.facing, headingTo(boy.pos, girl.pos), 3, dt);
        }
        boyAnim.gesture = "none";
        lookAt(boyAnim, boy, girl.pos, 0);
        if (m.stageT > (reduced ? BOW_PAUSE * 0.5 : BOW_PAUSE)) st.dispatch("FLOWERS_DONE");
      }
      boyObstacle.x = girl.pos.x;
      boyObstacle.z = girl.pos.z;
      resolveObstacles(boy.pos, 0.3, [{ ...boyObstacle, r: 0.32 }]);
    } else if (s === "sitting" || s === "ended") {
      if (m.boySitStage === 0) {
        boyAnim.gesture = "none";
        const wp = m.boyRoute[0];
        if (!wp) m.boySitStage = 1;
        else if (walkTo(boy, wp, 1.15, dt) < (m.boyRoute.length > 1 ? 0.25 : 0.06))
          m.boyRoute.shift();
      } else if (m.boySitStage === 1) {
        stop(boy, dt);
        boy.facing = dampAngle(boy.facing, BENCH.facing, 5, dt);
        // he only sits once she has
        if (Math.abs(angleDiff(boy.facing, BENCH.facing)) < 0.05 && m.girlSitStage === 2) {
          m.boySitStage = 2;
          boyAnim.body = "sit";
          // both characters are seated — the ending soundtrack begins (fires once)
          void audio.startEndingMusic();
        }
      } else {
        boy.speed = 0;
        boy.facing = dampAngle(boy.facing, BENCH.facing, 5, dt);
        const k = 1 - Math.exp(-4 * dt);
        boy.pos.x += (BOY_SEAT.x - boy.pos.x) * k;
        boy.pos.z += (BOY_SEAT.z - boy.pos.z) * k;
      }
      lookAt(
        boyAnim,
        boy,
        s === "ended" && lineFor(line.step)?.speaker === "girl" ? girl.pos : null,
        -0.03,
      );
      if (s === "sitting" && m.boySitStage === 2 && t > 4.2) st.dispatch("SIT_DONE");
    }
    boy.pos.y = groundHeight(boy.pos.x, boy.pos.z);
    boyAnim.update(dt, boy.speed, reduced);

    // ------------------------------------------------------------- CAT
    const ground = groundHeight(cat.pos.x, cat.pos.z);
    cat.pos.y = ground;
    if (s === "loading" || s === "intro" || s === "explore" || s === "greeting") {
      // waits on the sand beside the boy
      const spot = { x: boy.pos.x + CAT_START_OFFSET.x, z: boy.pos.z + CAT_START_OFFSET.z };
      const d = dist2d(cat.pos, spot);
      if (d > 0.3) {
        walkTo(cat, spot, 0.6, dt, 5);
        catAnim.mode = "stand";
      } else {
        stop(cat, dt);
        catAnim.mode = s === "greeting" ? "stand" : "sit";
      }
      const noticing = dGirlBoy < 10;
      if (noticing) cat.facing = dampAngle(cat.facing, headingTo(cat.pos, girl.pos), 2, dt);
      lookAt(catAnim, cat, noticing ? girl.pos : boy.pos, noticing ? -0.2 : -0.45);
    } else if (s === "handover") {
      // notices her, pads over and sits at her feet looking up
      const toCat = Math.atan2(cat.pos.x - girl.pos.x, cat.pos.z - girl.pos.z);
      const spot = { x: girl.pos.x + Math.sin(toCat) * 0.5, z: girl.pos.z + Math.cos(toCat) * 0.5 };
      if (t < 1.2) {
        stop(cat, dt);
        catAnim.mode = "stand";
        cat.facing = dampAngle(cat.facing, headingTo(cat.pos, girl.pos), 3, dt);
      } else {
        const d = walkTo(cat, spot, 0.55, dt, 6);
        catAnim.mode = d < 0.08 && cat.speed < 0.08 ? "sit" : "stand";
        if (catAnim.mode === "sit")
          cat.facing = dampAngle(cat.facing, headingTo(cat.pos, girl.pos), 4, dt);
      }
      boyObstacle.x = boy.pos.x;
      boyObstacle.z = boy.pos.z;
      resolveObstacles(cat.pos, 0.12, [boyObstacle]);
      lookAt(catAnim, cat, girl.pos, girlAnim.body === "crouch" ? -0.2 : -0.45);
    } else if (catFollowsGirl(s)) {
      // follows the girl: trails behind her left side, catches up when far
      const behind = girl.facing + Math.PI - 0.55;
      const spot = {
        x: girl.pos.x + Math.sin(behind) * 0.95,
        z: girl.pos.z + Math.cos(behind) * 0.95,
      };
      const dSpot = dist2d(cat.pos, spot);
      const dGirl = dist2d(cat.pos, girl.pos);
      const moving = girl.speed > 0.2;
      if (dSpot > (moving ? 0.25 : 0.9) && (moving || dGirl > 1.5)) {
        const speed = THREE.MathUtils.clamp(dSpot * 1.3, 0.35, dGirl > 4 ? 3.4 : 2.2);
        walkTo(cat, spot, speed, dt, 5);
        catAnim.mode = "stand";
        m.catStill = 0;
      } else {
        stop(cat, dt);
        m.catStill += dt;
        cat.facing = dampAngle(cat.facing, headingTo(cat.pos, girl.pos), 2, dt);
        catAnim.mode = m.catStill > 2.2 ? "sit" : "stand";
      }
      // never under her feet
      if (dGirl < 0.55) {
        const a = Math.atan2(cat.pos.x - girl.pos.x, cat.pos.z - girl.pos.z);
        cat.pos.x = girl.pos.x + Math.sin(a) * 0.55;
        cat.pos.z = girl.pos.z + Math.cos(a) * 0.55;
      }
      boyObstacle.x = boy.pos.x;
      boyObstacle.z = boy.pos.z;
      resolveObstacles(cat.pos, 0.12, [boyObstacle]);
      clampToWalkable(cat.pos);
      lookAt(
        catAnim,
        cat,
        catAnim.mode === "sit" ? girl.pos : null,
        catAnim.mode === "sit" ? -0.4 : 0,
      );
    } else if (s === "sitting" || s === "ended") {
      const d = walkTo(cat, CAT_REST, 0.9, dt, 5);
      if (d < 0.08) {
        cat.facing = dampAngle(cat.facing, BENCH.facing + 0.5, 2, dt);
        catAnim.mode = s === "ended" && t > 4 ? "lie" : "sit";
      } else catAnim.mode = "stand";
      lookAt(catAnim, cat, d < 0.08 && Math.sin(t * 0.3) > 0.5 ? girl.pos : null, -0.3);
    }
    cat.pos.y = groundHeight(cat.pos.x, cat.pos.z);
    catAnim.speed = cat.speed;
    catAnim.update(dt);

    // ------------------------------------------------------------- apply transforms
    girlG.current?.position.copy(girl.pos);
    girlG.current?.rotation.set(0, girl.facing, 0);
    boyG.current?.position.copy(boy.pos);
    boyG.current?.rotation.set(0, boy.facing, 0);
    catG.current?.position.copy(cat.pos);
    catG.current?.rotation.set(0, cat.facing, 0);

    // bow: on the counter, in his hand, then tied onto her bag (a single bow, so no duplicates)
    const bow = bowG.current;
    if (bagBow.current) bagBow.current.visible = m.bow === "bag";
    if (bow) {
      if (m.bow === "counter") {
        bow.visible = s === "toFlowers" || s === "flowers";
        bow.position.set(
          BOW_ON_COUNTER.x,
          groundHeight(FLOWER_SHOP.x, FLOWER_SHOP.z) + 1.08,
          BOW_ON_COUNTER.z,
        );
        bow.rotation.set(-Math.PI / 2 + 0.3, 0, 0.4);
        bow.userData["held"] = false;
      } else if (m.bow === "boy" && boyBody.current) {
        bow.visible = true;
        boyBody.current.rHand.getWorldPosition(tmpV);
        tmpV.y -= 0.04;
        bow.position.lerp(tmpV, bow.userData["held"] ? 1 : 1 - Math.exp(-6 * dt));
        if (bow.position.distanceTo(tmpV) < 0.01) bow.userData["held"] = true;
        bow.rotation.set(0, boy.facing, 0);
      } else bow.visible = false;
    }

    // destination marker for the current journey
    const mk = markerG.current;
    if (mk) {
      const dest =
        s === "toParlour"
          ? PARLOUR_GIRL_SPOT
          : s === "toFlowers"
            ? FLOWER_GIRL_SPOT
            : s === "guided" || s === "atBench"
              ? { x: BENCH.x, z: BENCH.z - 1.1 }
              : null;
      mk.visible = !!dest;
      if (dest) {
        mk.position.set(dest.x, groundHeight(dest.x, dest.z) + 0.02, dest.z);
        const pulse = 0.85 + Math.sin(performance.now() / 600) * 0.15;
        mk.scale.setScalar(pulse);
      }
    }

    // finale dialogue: speech bubbles anchored above each head, once per ending
    let step: DialogueStep | null = null;
    let leaving = false;
    if (s === "ended") {
      step = dialogueAt(t);
      const k = t - DIALOGUE_START;
      const within = k - Math.floor(k / (LINE_TIME + LINE_GAP)) * (LINE_TIME + LINE_GAP);
      leaving = within > LINE_TIME - 0.5;
    }
    if (step !== m.line || leaving !== m.leaving) {
      m.line = step;
      m.leaving = leaving;
      setLine({ step, leaving });
    }
    if (girlBody.current) girlBody.current.head.getWorldPosition(runtime.girlHeadWorld);
    if (boyBody.current) boyBody.current.head.getWorldPosition(runtime.boyHeadWorld);
    girlBubble.current?.position.copy(runtime.girlHeadWorld).add(tmpV.set(0, 0.32, 0));
    boyBubble.current?.position.copy(runtime.boyHeadWorld).add(tmpV.set(0, 0.32, 0));
    runtime.input.interact = false;
  });

  const current = lineFor(line.step);

  return (
    <>
      <group ref={girlG}>
        <ModelHuman
          ref={girlBody}
          asset={GIRL_ASSET}
          anim={girlAnim}
          agent={runtime.girl}
          shadows={shadows}
          bagChild={
            <group ref={bagBow} visible={false}>
              <PinkBow scale={1.6} />
            </group>
          }
        />
      </group>
      <group ref={boyG}>
        <ModelHuman
          ref={boyBody}
          asset={BOY_ASSET}
          anim={boyAnim}
          agent={runtime.boy}
          shadows={shadows}
        />
      </group>
      <group ref={bowG} visible={false}>
        <PinkBow scale={1.6} />
      </group>
      <group ref={catG}>
        <ModelCat asset={CAT_ASSET} anim={catAnim} shadows={shadows} />
      </group>
      <group ref={markerG} visible={false}>
        <mesh rotation-x={-Math.PI / 2}>
          <ringGeometry args={[0.55, 0.62, 48]} />
          <meshBasicMaterial color="#f3e4d0" transparent opacity={0.55} depthWrite={false} />
        </mesh>
        <mesh rotation-x={-Math.PI / 2}>
          <circleGeometry args={[0.55, 48]} />
          <meshBasicMaterial color="#f3e4d0" transparent opacity={0.12} depthWrite={false} />
        </mesh>
      </group>
      <group ref={girlBubble}>
        {current?.speaker === "girl" && (
          <Html zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
            <div key={line.step} className={`speech-bubble${line.leaving ? " is-leaving" : ""}`}>
              {current.text}
            </div>
          </Html>
        )}
      </group>
      <group ref={boyBubble}>
        {current?.speaker === "boy" && (
          <Html zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
            <div key={line.step} className={`speech-bubble${line.leaving ? " is-leaving" : ""}`}>
              {current.text}
            </div>
          </Html>
        )}
      </group>
    </>
  );
}

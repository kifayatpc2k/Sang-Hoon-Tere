// Procedural human rig: named joint angles, pose generators, masked blending and leg IK.
// Model faces +Z. Left side is +X. Positive thigh/shoulder X rotation swings a limb backward,
// negative swings it forward. Positive knee X bends the shin back; negative elbow X bends forward.

export const POSE_KEYS = [
  "hipDrop",
  "pelvisPitch",
  "spinePitch",
  "spineYaw",
  "headYaw",
  "headPitch",
  "lThigh",
  "lKnee",
  "lAnkle",
  "rThigh",
  "rKnee",
  "rAnkle",
  "lThighZ",
  "rThighZ",
  "lShX",
  "lShZ",
  "lElbow",
  "rShX",
  "rShZ",
  "rElbow",
  "lElZ",
  "rElZ",
  "lHand",
  "rHand",
  "breath",
] as const;
export type PoseKey = (typeof POSE_KEYS)[number];
export type Pose = Record<PoseKey, number>;

export const ARM_KEYS: PoseKey[] = [
  "lShX",
  "lShZ",
  "lElbow",
  "rShX",
  "rShZ",
  "rElbow",
  "lElZ",
  "rElZ",
  "lHand",
  "rHand",
];

export const emptyPose = (): Pose => Object.fromEntries(POSE_KEYS.map((k) => [k, 0])) as Pose;

export interface Dims {
  thigh: number;
  shin: number;
  ankle: number;
  legLen: number;
}

export function makeDims(height: number): Dims {
  const s = height / 1.68;
  const thigh = 0.41 * s;
  const shin = 0.39 * s;
  const ankle = 0.07 * s;
  return { thigh, shin, ankle, legLen: thigh + shin + ankle };
}

/** Two-bone sagittal IK: hip pivot `hipH` above the ankle, ankle `fwd` metres ahead. */
export function legIK(d: Dims, hipH: number, fwd: number) {
  const L1 = d.thigh;
  const L2 = d.shin;
  const D = Math.min(L1 + L2 - 1e-4, Math.max(0.05, Math.hypot(hipH, fwd)));
  const k = Math.acos(Math.min(1, Math.max(-1, (L1 * L1 + L2 * L2 - D * D) / (2 * L1 * L2))));
  const b = Math.acos(Math.min(1, Math.max(-1, (L1 * L1 + D * D - L2 * L2) / (2 * L1 * D))));
  const thigh = -(Math.atan2(fwd, hipH) + b);
  const knee = Math.PI - k;
  return { thigh, knee, ankle: -(thigh + knee) };
}

export function idlePose(d: Dims, t: number, out = emptyPose()): Pose {
  const sway = Math.sin(t * 0.7);
  out.breath = Math.sin(t * 1.6) * 0.5 + 0.5;
  out.spinePitch = 0.02 + Math.sin(t * 1.6) * 0.008;
  out.hipDrop = 0.006;
  out.lThigh = -0.02;
  out.rThigh = 0.02;
  out.lKnee = 0.05 + sway * 0.02;
  out.rKnee = 0.05 - sway * 0.02;
  out.lAnkle = -(out.lThigh + out.lKnee);
  out.rAnkle = -(out.rThigh + out.rKnee);
  out.lThighZ = 0.03;
  out.rThighZ = -0.03;
  out.lShZ = 0.09;
  out.rShZ = -0.09;
  out.lShX = 0.03 + Math.sin(t * 0.9) * 0.01;
  out.rShX = 0.03 - Math.sin(t * 0.9) * 0.01;
  out.lElbow = -0.18;
  out.rElbow = -0.18;
  out.headPitch = 0.02 + Math.sin(t * 0.5) * 0.02;
  out.headYaw = Math.sin(t * 0.31) * 0.06;
  void d;
  return out;
}

/** amt 0..1 walk, up to ~1.6 jog. phase advances with distance travelled. */
export function walkPose(d: Dims, phase: number, amt: number, out = emptyPose()): Pose {
  const s = Math.sin(phase);
  const c = Math.cos(phase);
  const a = Math.min(amt, 1.6);
  const stride = 0.4 * Math.min(a, 1.25);
  out.lThigh = -s * stride;
  out.rThigh = s * stride;
  // knee lifts during swing (thigh moving forward)
  out.lKnee = 0.08 + Math.max(0, c) * (0.75 * a) + 0.05 * a;
  out.rKnee = 0.08 + Math.max(0, -c) * (0.75 * a) + 0.05 * a;
  out.lAnkle = -(out.lThigh + out.lKnee) * 0.85 + Math.max(0, -s) * 0.25 * a;
  out.rAnkle = -(out.rThigh + out.rKnee) * 0.85 + Math.max(0, s) * 0.25 * a;
  out.lThighZ = 0.02;
  out.rThighZ = -0.02;
  // hips are lowest when legs are spread
  out.hipDrop = 0.012 + d.legLen * (1 - Math.cos(stride * s)) * 0.9 + 0.01 * a;
  out.pelvisPitch = 0.04 * a;
  out.spinePitch = 0.03 * a;
  out.spineYaw = s * 0.07 * a;
  out.lShX = s * 0.32 * a;
  out.rShX = -s * 0.32 * a;
  out.lShZ = 0.08;
  out.rShZ = -0.08;
  out.lElbow = -0.25 - 0.2 * a - Math.max(0, -s) * 0.25 * a;
  out.rElbow = -0.25 - 0.2 * a - Math.max(0, s) * 0.25 * a;
  out.headYaw = -s * 0.04 * a;
  out.headPitch = 0.04;
  out.breath = 0.5;
  return out;
}

export function crouchPose(d: Dims, out = emptyPose()): Pose {
  const hipH = d.legLen * 0.52;
  const l = legIK(d, hipH - d.ankle, 0.18);
  const r = legIK(d, hipH - d.ankle, -0.02);
  out.hipDrop = d.legLen - hipH;
  out.lThigh = l.thigh;
  out.lKnee = l.knee;
  out.lAnkle = l.ankle;
  out.rThigh = r.thigh;
  out.rKnee = r.knee;
  out.rAnkle = r.ankle;
  out.lThighZ = 0.12;
  out.rThighZ = -0.12;
  out.pelvisPitch = 0.38;
  out.spinePitch = 0.18;
  out.headPitch = 0.25;
  out.lShX = -0.55;
  out.rShX = -0.55;
  out.lShZ = 0.15;
  out.rShZ = -0.15;
  out.lElbow = -0.6;
  out.rElbow = -0.6;
  return out;
}

export function sitPose(d: Dims, seatH: number, out = emptyPose()): Pose {
  const hipH = seatH + 0.05;
  const l = legIK(d, hipH - d.ankle, d.thigh * 0.95);
  out.hipDrop = d.legLen - hipH;
  out.lThigh = l.thigh;
  out.rThigh = l.thigh;
  out.lKnee = l.knee;
  out.rKnee = l.knee;
  out.lAnkle = l.ankle;
  out.rAnkle = l.ankle;
  out.lThighZ = 0.06;
  out.rThighZ = -0.06;
  out.pelvisPitch = -0.08;
  out.spinePitch = 0.02;
  out.lShX = -0.5;
  out.rShX = -0.5;
  out.lShZ = 0.05;
  out.rShZ = -0.05;
  out.lElbow = -0.75;
  out.rElbow = -0.75;
  out.headPitch = -0.03;
  out.breath = 0.5;
  return out;
}

// --- arm-only gestures (blended with ARM_KEYS mask) ---
export function wavePose(t: number, out = emptyPose()): Pose {
  out.lShZ = 0.1;
  out.lElbow = -0.2;
  out.rShZ = -2.35;
  out.rShX = -0.25;
  out.rElbow = -0.55 + Math.sin(t * 9) * 0.32;
  out.rHand = 0.2;
  return out;
}
export function holdPose(out = emptyPose()): Pose {
  out.lShX = -0.3;
  out.rShX = -0.3;
  out.lShZ = 0.12;
  out.rShZ = -0.12;
  out.lElbow = -1.3;
  out.rElbow = -1.3;
  out.lElZ = -0.75;
  out.rElZ = 0.75;
  out.lHand = 0.3;
  out.rHand = 0.3;
  return out;
}
export function offerPose(out = emptyPose()): Pose {
  out.lShX = -0.95;
  out.rShX = -0.95;
  out.lShZ = 0.05;
  out.rShZ = -0.05;
  out.lElbow = -0.65;
  out.rElbow = -0.65;
  out.lElZ = -0.45;
  out.rElZ = 0.45;
  return out;
}
export function invitePose(t: number, out = emptyPose()): Pose {
  out.lShZ = 0.1;
  out.lElbow = -0.2;
  out.rShX = -0.95;
  out.rShZ = -0.6;
  out.rElbow = -0.25 - Math.sin(t * 2.2) * 0.08;
  out.rHand = -0.3;
  return out;
}
export function petPose(t: number, out = emptyPose()): Pose {
  out.lShX = -0.4;
  out.lShZ = 0.2;
  out.lElbow = -0.9;
  out.rShX = -0.95 + Math.sin(t * 3) * 0.12;
  out.rShZ = -0.1;
  out.rElbow = -0.35;
  out.rHand = 0.4;
  return out;
}

export function mixInto(out: Pose, p: Pose, w: number, keys: readonly PoseKey[] = POSE_KEYS) {
  for (const k of keys) out[k] = out[k] + (p[k] - out[k]) * w;
}

export type BodyState = "locomotion" | "crouch" | "sit";
export type ArmGesture = "none" | "wave" | "hold" | "offer" | "invite" | "pet";

/** Blends locomotion, full-body states and arm gestures with frame-rate independent damping. */
export class Animator {
  d: Dims;
  pose = emptyPose();
  phase = 0;
  body: BodyState = "locomotion";
  gesture: ArmGesture = "none";
  wCrouch = 0;
  wSit = 0;
  wGesture = 0;
  lastGesture: ArmGesture = "none";
  lookYaw = 0;
  lookPitch = 0;
  targetLookYaw = 0;
  targetLookPitch = 0;
  blink = 0;
  private nextBlink = 2;
  private t = 0;
  private tmpA = emptyPose();
  private tmpB = emptyPose();
  seatH = 0.46;

  constructor(height: number) {
    this.d = makeDims(height);
  }

  update(dt: number, speed: number, reduced = false) {
    this.t += dt;
    const d = this.d;
    const stepLen = 0.68 * (d.legLen / 0.92);
    // phase advances with distance so feet stay planted (π per step)
    this.phase += (speed / stepLen) * Math.PI * dt;
    const walkAmt = Math.min(1.6, speed / 1.6);
    const wWalk = Math.min(1, speed / 0.35);
    const base = idlePose(d, this.t, this.tmpA);
    mixInto(base, walkPose(d, this.phase, Math.max(0.2, walkAmt), this.tmpB), wWalk);

    const k = reduced ? 8 : 5;
    const damp = (v: number, target: number) => v + (target - v) * (1 - Math.exp(-k * dt));
    this.wCrouch = damp(this.wCrouch, this.body === "crouch" ? 1 : 0);
    this.wSit = damp(this.wSit, this.body === "sit" ? 1 : 0);
    if (this.gesture !== "none") this.lastGesture = this.gesture;
    this.wGesture = damp(this.wGesture, this.gesture !== "none" ? 1 : 0);

    const smooth = (w: number) => w * w * (3 - 2 * w);
    if (this.wCrouch > 0.001) mixInto(base, crouchPose(d, this.tmpB), smooth(this.wCrouch));
    if (this.wSit > 0.001) mixInto(base, sitPose(d, this.seatH, this.tmpB), smooth(this.wSit));
    if (this.wGesture > 0.001) {
      const g = this.lastGesture;
      const gp =
        g === "wave"
          ? wavePose(this.t, this.tmpB)
          : g === "hold"
            ? holdPose(this.tmpB)
            : g === "offer"
              ? offerPose(this.tmpB)
              : g === "invite"
                ? invitePose(this.t, this.tmpB)
                : petPose(this.t, this.tmpB);
      mixInto(base, gp, smooth(this.wGesture), ARM_KEYS);
    }
    // look-at layered on the head, damped
    this.lookYaw = damp(this.lookYaw, Math.max(-1.1, Math.min(1.1, this.targetLookYaw)));
    this.lookPitch = damp(this.lookPitch, Math.max(-0.4, Math.min(0.5, this.targetLookPitch)));
    base.headYaw += this.lookYaw * 0.7;
    base.spineYaw += this.lookYaw * 0.3;
    base.headPitch += this.lookPitch;

    // blinking
    this.nextBlink -= dt;
    if (this.nextBlink < 0) {
      this.blink = 1;
      this.nextBlink = 2 + Math.random() * 3.5;
    }
    this.blink = Math.max(0, this.blink - dt * 7);
    for (const key of POSE_KEYS) this.pose[key] = base[key];
  }
}

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

export type CatMode = "stand" | "sit" | "lie" | "held";

/** Procedural kitten animation state. Controllers write speed/mode/look; the model reads it. */
export class CatAnimator {
  mode: CatMode = "sit";
  speed = 0;
  lookYaw = 0;
  lookPitch = 0;
  targetLookYaw = 0;
  targetLookPitch = 0;
  wSit = 0;
  wLie = 0;
  wHeld = 1;
  phase = 0;
  t = 0;
  blink = 0;
  private nextBlink = 1.5;
  update(dt: number) {
    this.t += dt;
    // stride ~0.11m per half cycle for a kitten
    this.phase += (this.speed / 0.11) * Math.PI * dt * 0.5;
    const k = 1 - Math.exp(-5 * dt);
    this.wSit += ((this.mode === "sit" ? 1 : 0) - this.wSit) * k;
    this.wLie += ((this.mode === "lie" ? 1 : 0) - this.wLie) * k;
    this.wHeld += ((this.mode === "held" ? 1 : 0) - this.wHeld) * (1 - Math.exp(-8 * dt));
    this.lookYaw +=
      (THREE.MathUtils.clamp(this.targetLookYaw, -1.2, 1.2) - this.lookYaw) *
      (1 - Math.exp(-6 * dt));
    this.lookPitch +=
      (THREE.MathUtils.clamp(this.targetLookPitch, -0.6, 0.6) - this.lookPitch) *
      (1 - Math.exp(-6 * dt));
    this.nextBlink -= dt;
    if (this.nextBlink < 0) {
      this.blink = 1;
      this.nextBlink = 1.5 + Math.random() * 4;
    }
    this.blink = Math.max(0, this.blink - dt * 6);
  }
}

function furTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#c98b4e";
  ctx.fillRect(0, 0, 256, 256);
  // tabby stripes around the body (u wraps around, v runs along)
  for (let i = 0; i < 18; i++) {
    const y = i * 14 + Math.sin(i * 1.7) * 4;
    ctx.strokeStyle = `rgba(122,70,32,${0.45 + (i % 3) * 0.12})`;
    ctx.lineWidth = 4 + (i % 2) * 2;
    ctx.beginPath();
    for (let x = 0; x <= 256; x += 8) ctx.lineTo(x, y + Math.sin(x * 0.05 + i) * 5);
    ctx.stroke();
  }
  // fine fur strands
  for (let i = 0; i < 5000; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    ctx.fillStyle = Math.random() < 0.5 ? "rgba(255,230,190,0.18)" : "rgba(90,50,20,0.16)";
    ctx.fillRect(x, y, 1, 3);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

const LEG_UP = 0.058;
const LEG_LO = 0.055;
const STAND_H = 0.118;

export function Cat({ anim, shadows }: { anim: CatAnimator; shadows: boolean }) {
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const legs = [
    useRef<THREE.Group>(null),
    useRef<THREE.Group>(null),
    useRef<THREE.Group>(null),
    useRef<THREE.Group>(null),
  ];
  const lows = [
    useRef<THREE.Group>(null),
    useRef<THREE.Group>(null),
    useRef<THREE.Group>(null),
    useRef<THREE.Group>(null),
  ];
  const tail = useRef<(THREE.Group | null)[]>([]);
  const lids = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const ears = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)];

  const m = useMemo(() => {
    const fur = new THREE.MeshPhysicalMaterial({
      map: furTexture(),
      roughness: 0.95,
      sheen: 1,
      sheenColor: new THREE.Color("#ffd9a6"),
      sheenRoughness: 0.5,
    });
    return {
      fur,
      light: new THREE.MeshPhysicalMaterial({
        color: "#f0dcc0",
        roughness: 0.95,
        sheen: 1,
        sheenColor: new THREE.Color("#fff3df"),
      }),
      pink: new THREE.MeshStandardMaterial({ color: "#d78e8a", roughness: 0.6 }),
      eye: new THREE.MeshPhysicalMaterial({
        color: "#8fae4a",
        roughness: 0.05,
        clearcoat: 1,
        emissive: "#2a3a10",
        emissiveIntensity: 0.3,
      }),
      pupil: new THREE.MeshBasicMaterial({ color: "#050403" }),
      whisker: new THREE.LineBasicMaterial({ color: "#f5efe6", transparent: true, opacity: 0.7 }),
    };
  }, []);
  const whiskers = useMemo(() => {
    const pts: number[] = [];
    for (const side of [1, -1])
      for (let i = 0; i < 3; i++) {
        pts.push(
          side * 0.012,
          -0.012,
          0.05,
          side * 0.07,
          -0.012 + (i - 1) * 0.012,
          0.035 - i * 0.004,
        );
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);

  useFrame(() => {
    const a = anim;
    const t = a.t;
    const walk = Math.min(1, a.speed / 0.25);
    const trot = Math.min(1, Math.max(0, (a.speed - 0.8) / 1.2));
    const amp = 0.45 + trot * 0.25;
    const breath = Math.sin(t * 3.2) * 0.012;
    const sit = a.wSit;
    const lie = a.wLie;
    const held = a.wHeld;
    const bodyY = THREE.MathUtils.lerp(STAND_H, 0.075, sit) * (1 - lie) + 0.045 * lie;
    const bob = Math.abs(Math.sin(a.phase)) * 0.008 * walk;
    if (body.current) {
      body.current.position.y = bodyY + bob;
      body.current.rotation.x = -0.55 * sit * (1 - lie) + held * 0.05;
      body.current.scale.set(1 + breath, 1 + breath, 1);
    }
    // legs: 0 FL, 1 FR, 2 BL, 3 BR — diagonal pairs share phase
    const phases = [0, Math.PI, Math.PI, 0];
    legs.forEach((r, i) => {
      const front = i < 2;
      const ph = a.phase + phases[i]!;
      let up = Math.sin(ph) * amp * walk;
      let lo = (front ? -1 : 1) * (0.25 + Math.max(0, Math.cos(ph)) * 0.6) * walk;
      if (!front) lo += 0.35 * (1 - walk);
      else lo -= 0.12 * (1 - walk);
      if (!front) up += -0.25 * (1 - walk);
      else up += 0.08 * (1 - walk);
      // sitting: hind legs folded, front legs vertical against body pitch
      if (front) {
        up = THREE.MathUtils.lerp(up, 0.55, sit);
        lo = THREE.MathUtils.lerp(lo, -0.05, sit);
      } else {
        up = THREE.MathUtils.lerp(up, -1.25, sit);
        lo = THREE.MathUtils.lerp(lo, 2.3, sit);
      }
      // lying: legs tucked under
      up = THREE.MathUtils.lerp(up, front ? -1.35 : 1.3, lie);
      lo = THREE.MathUtils.lerp(lo, front ? 2.4 : -2.4, lie);
      // held: legs hang relaxed
      up = THREE.MathUtils.lerp(up, front ? -1.0 : 1.0, held);
      lo = THREE.MathUtils.lerp(lo, front ? 1.7 : -1.7, held);
      r.current?.rotation.set(up, 0, 0);
      lows[i]!.current?.rotation.set(lo, 0, 0);
    });
    if (head.current) {
      const idleLook = Math.sin(t * 0.7) * 0.15 * (1 - walk);
      head.current.rotation.set(
        a.lookPitch + 0.55 * sit * (1 - lie) + 0.15 * lie + Math.sin(t * 1.3) * 0.03,
        a.lookYaw + idleLook,
        Math.sin(t * 0.9) * 0.05 * (1 - walk),
      );
    }
    tail.current.forEach((g, i) => {
      if (!g) return;
      const sway = Math.sin(t * 2.2 - i * 0.5) * (0.12 + walk * 0.05);
      const up = THREE.MathUtils.lerp(-0.35 + walk * 0.55, 0.25, sit);
      g.rotation.set(
        i === 0 ? -0.6 - up : -0.12 - up * 0.2 + lie * 0.05,
        sway + lie * 0.28 + sit * 0.25,
        0,
      );
    });
    const lid = 0.1 + a.blink * 0.9;
    lids.forEach((l) => l.current?.scale.set(1, lid, 1));
    ears.forEach((e, i) =>
      e.current?.rotation.set(0, 0, (i ? -1 : 1) * (0.15 + Math.sin(t * 0.5 + i) * 0.04)),
    );
  });

  const cs = shadows;
  const legPos: [number, number, number][] = [
    [0.034, -0.01, 0.085],
    [-0.034, -0.01, 0.085],
    [0.036, -0.005, -0.09],
    [-0.036, -0.005, -0.09],
  ];
  return (
    <group>
      <group ref={body} position={[0, STAND_H, 0]}>
        {/* torso: ribcage, belly, haunch */}
        <mesh material={m.fur} castShadow={cs} scale={[0.05, 0.055, 0.12]}>
          <sphereGeometry args={[1, 28, 18]} />
        </mesh>
        <mesh
          material={m.fur}
          position={[0, 0.006, 0.06]}
          castShadow={cs}
          scale={[0.048, 0.054, 0.06]}
        >
          <sphereGeometry args={[1, 20, 14]} />
        </mesh>
        <mesh
          material={m.fur}
          position={[0, 0.004, -0.075]}
          castShadow={cs}
          scale={[0.052, 0.052, 0.058]}
        >
          <sphereGeometry args={[1, 20, 14]} />
        </mesh>
        <mesh material={m.light} position={[0, -0.02, 0.07]} scale={[0.034, 0.04, 0.045]}>
          <sphereGeometry args={[1, 16, 12]} />
        </mesh>
        {legPos.map((p, i) => (
          <group key={i} ref={legs[i]!} position={p}>
            <mesh
              material={m.fur}
              position={[0, -LEG_UP / 2, 0]}
              castShadow={cs}
              scale={[0.017, LEG_UP / 2 + 0.008, 0.02]}
            >
              <sphereGeometry args={[1, 12, 10]} />
            </mesh>
            <group ref={lows[i]!} position={[0, -LEG_UP, 0]}>
              <mesh
                material={m.fur}
                position={[0, -LEG_LO / 2, 0]}
                castShadow={cs}
                scale={[0.012, LEG_LO / 2 + 0.006, 0.013]}
              >
                <sphereGeometry args={[1, 10, 8]} />
              </mesh>
              <mesh material={m.light} position={[0, -LEG_LO, 0.007]} scale={[0.014, 0.009, 0.019]}>
                <sphereGeometry args={[1, 10, 8]} />
              </mesh>
            </group>
          </group>
        ))}
        {/* tail chain */}
        <group position={[0, 0.03, -0.125]}>
          {(() => {
            let node: React.ReactNode = null;
            for (let i = 9; i >= 0; i--) {
              const r = 0.011 - i * 0.0004;
              const idx = i;
              node = (
                <group
                  ref={(g) => {
                    tail.current[idx] = g;
                  }}
                  position={[0, 0, i === 0 ? 0 : -0.022]}
                >
                  <mesh
                    material={m.fur}
                    position={[0, 0, -0.011]}
                    scale={[r, r, 0.014]}
                    castShadow={cs}
                  >
                    <sphereGeometry args={[1, 8, 6]} />
                  </mesh>
                  {node}
                </group>
              );
            }
            return node;
          })()}
        </group>
        {/* head */}
        <group ref={head} position={[0, 0.045, 0.125]}>
          <mesh material={m.fur} castShadow={cs} scale={[0.046, 0.042, 0.044]}>
            <sphereGeometry args={[1, 24, 18]} />
          </mesh>
          <mesh material={m.light} position={[0, -0.014, 0.034]} scale={[0.024, 0.018, 0.018]}>
            <sphereGeometry args={[1, 16, 12]} />
          </mesh>
          <mesh material={m.pink} position={[0, -0.005, 0.05]} scale={[0.006, 0.004, 0.004]}>
            <sphereGeometry args={[1, 8, 6]} />
          </mesh>
          {[1, -1].map((side, i) => (
            <group key={side}>
              <group position={[side * 0.018, 0.009, 0.036]}>
                <mesh material={m.eye} scale={[0.0105, 0.0095, 0.006]}>
                  <sphereGeometry args={[1, 14, 10]} />
                </mesh>
                <mesh material={m.pupil} position={[0, 0, 0.0055]} scale={[0.0028, 0.0078, 0.0012]}>
                  <sphereGeometry args={[1, 8, 8]} />
                </mesh>
                <group ref={lids[i]!} position={[0, 0.0098, 0.0008]}>
                  <mesh
                    material={m.fur}
                    position={[0, -0.0098, 0]}
                    scale={[0.0112, 0.0102, 0.0066]}
                  >
                    <sphereGeometry args={[1, 12, 8]} />
                  </mesh>
                </group>
              </group>
              <group ref={ears[i]!} position={[side * 0.026, 0.034, -0.002]}>
                <mesh
                  material={m.fur}
                  position={[0, 0.014, 0]}
                  scale={[1, 1, 0.45]}
                  castShadow={cs}
                >
                  <coneGeometry args={[0.016, 0.034, 12]} />
                </mesh>
                <mesh material={m.pink} position={[0, 0.012, 0.004]} scale={[0.7, 0.75, 0.2]}>
                  <coneGeometry args={[0.016, 0.034, 10]} />
                </mesh>
              </group>
            </group>
          ))}
          <lineSegments geometry={whiskers} material={m.whisker} />
        </group>
      </group>
    </group>
  );
}

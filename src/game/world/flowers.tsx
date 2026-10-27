import { useMemo } from "react";
import * as THREE from "three";

// Shared, small-geometry flower pieces used by the flower shop and the bouquet.
const petalGeo = new THREE.SphereGeometry(1, 8, 6);
const centreGeo = new THREE.SphereGeometry(1, 8, 6);
const stemGeo = new THREE.CylinderGeometry(1, 1, 1, 5);
const leafGeo = new THREE.SphereGeometry(1, 6, 4);

const matCache = new Map<string, THREE.MeshStandardMaterial>();
export function flowerMat(color: string, rough = 0.7) {
  const key = color + rough;
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: rough });
    matCache.set(key, m);
  }
  return m;
}

export type BloomKind = "rose" | "tulip" | "daisy";

/** A single detailed flower head made of layered petals. Size ~ radius in metres. */
export function Bloom({
  kind,
  color,
  size = 0.03,
  position,
  rotation,
}: {
  kind: BloomKind;
  color: string;
  size?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
}) {
  const petals = useMemo(() => {
    if (kind === "daisy")
      return Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        return {
          p: [Math.cos(a) * size * 0.9, 0, Math.sin(a) * size * 0.9] as const,
          r: [0, -a, 0] as const,
          s: [size * 0.75, size * 0.12, size * 0.25] as const,
        };
      });
    if (kind === "tulip")
      return Array.from({ length: 5 }, (_, i) => {
        const a = (i / 5) * Math.PI * 2;
        return {
          p: [Math.cos(a) * size * 0.35, size * 0.6, Math.sin(a) * size * 0.35] as const,
          r: [Math.sin(a) * 0.25, -a, Math.cos(a) * 0.25] as const,
          s: [size * 0.45, size * 0.95, size * 0.32] as const,
        };
      });
    // rose: two rings of cupped petals around a tight bud
    const out: {
      p: readonly [number, number, number];
      r: readonly [number, number, number];
      s: readonly [number, number, number];
    }[] = [];
    for (const [n, rad, h, tilt] of [
      [5, 0.62, 0.15, 0.7],
      [4, 0.32, 0.4, 0.35],
    ] as const)
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rad;
        out.push({
          p: [Math.cos(a) * size * rad, size * h, Math.sin(a) * size * rad],
          r: [0, -a, tilt],
          s: [size * 0.5, size * 0.55, size * 0.3],
        });
      }
    return out;
  }, [kind, size]);
  const petalMat = flowerMat(color, 0.6);
  return (
    <group position={position ?? [0, 0, 0]} rotation={rotation ?? [0, 0, 0]}>
      {petals.map((p, i) => (
        <mesh
          key={i}
          geometry={petalGeo}
          material={petalMat}
          position={p.p as [number, number, number]}
          rotation={p.r as [number, number, number]}
          scale={p.s as [number, number, number]}
        />
      ))}
      {kind === "daisy" && (
        <mesh
          geometry={centreGeo}
          material={flowerMat("#d9b04f")}
          position={[0, size * 0.08, 0]}
          scale={[size * 0.38, size * 0.2, size * 0.38]}
        />
      )}
      {kind === "rose" && (
        <mesh
          geometry={centreGeo}
          material={petalMat}
          position={[0, size * 0.55, 0]}
          scale={[size * 0.3, size * 0.4, size * 0.3]}
        />
      )}
    </group>
  );
}

export function Stem({
  length,
  radius = 0.003,
  position,
  rotation,
}: {
  length: number;
  radius?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
}) {
  return (
    <group position={position ?? [0, 0, 0]} rotation={rotation ?? [0, 0, 0]}>
      <mesh
        geometry={stemGeo}
        material={flowerMat("#5f7a4a", 0.8)}
        position={[0, length / 2, 0]}
        scale={[radius, length, radius]}
      />
    </group>
  );
}

export function Leaf({
  position,
  rotation,
  size = 0.04,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  size?: number;
}) {
  return (
    <mesh
      geometry={leafGeo}
      material={flowerMat("#6c8a55", 0.8)}
      position={position}
      rotation={rotation ?? [0, 0, 0]}
      scale={[size * 0.35, size, size * 0.08]}
    />
  );
}

const BUNCH: { kind: BloomKind; color: string }[] = [
  { kind: "rose", color: "#e7a9b4" },
  { kind: "daisy", color: "#f6f1e8" },
  { kind: "tulip", color: "#f0b8a0" },
  { kind: "rose", color: "#f5ece4" },
  { kind: "rose", color: "#d98a98" },
  { kind: "daisy", color: "#f6f1e8" },
  { kind: "tulip", color: "#efc3c9" },
];

/** Small hand-tied bouquet of pink and white flowers in cream wrapping. Origin = where a hand grips it. */
export function Bouquet() {
  const heads = useMemo(
    () =>
      BUNCH.map((b, i) => {
        const a = i === 0 ? 0 : ((i - 1) / (BUNCH.length - 1)) * Math.PI * 2;
        const r = i === 0 ? 0 : 0.045;
        return {
          ...b,
          x: Math.cos(a) * r,
          z: Math.sin(a) * r,
          h: i === 0 ? 0.24 : 0.2 + (i % 2) * 0.025,
          tx: Math.sin(a) * r * 3,
          tz: -Math.cos(a) * r * 3,
        };
      }),
    [],
  );
  const wrap = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.075, 0.016, 0.17, 14, 1, true);
    return g;
  }, []);
  return (
    <group>
      <mesh
        geometry={wrap}
        material={
          new THREE.MeshStandardMaterial({
            color: "#efe3d0",
            roughness: 0.9,
            side: THREE.DoubleSide,
          })
        }
        position={[0, 0.06, 0]}
        castShadow
      />
      <mesh position={[0, 0.0, 0]} material={flowerMat("#d9a3aa", 0.5)}>
        <torusGeometry args={[0.02, 0.006, 6, 14]} />
      </mesh>
      {heads.map((h, i) => (
        <group key={i} position={[0, -0.04, 0]} rotation={[h.tz, 0, h.tx]}>
          <Stem length={h.h} />
          <Bloom kind={h.kind} color={h.color} size={0.026} position={[0, h.h, 0]} />
        </group>
      ))}
      <Leaf position={[0.05, 0.15, 0.02]} rotation={[0, 0.4, -0.6]} />
      <Leaf position={[-0.05, 0.15, -0.02]} rotation={[0, -0.4, 0.6]} />
    </group>
  );
}

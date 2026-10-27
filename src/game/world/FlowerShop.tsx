import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { FLOWER_SHOP } from "../config/chapter";
import { GAME_CONTENT } from "../config/gameContent";
import { groundHeight, obstacles, type Obstacle } from "./terrain";
import { Bloom, Leaf, Stem, type BloomKind } from "./flowers";

const CREAM = "#f3ebdc";
const BLUSH = "#e2b9b4";
const WOOD = "#8b6a4c";

function signTexture() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = "#f6efe3";
  g.fillRect(0, 0, 512, 128);
  g.strokeStyle = "#b98b80";
  g.lineWidth = 6;
  g.strokeRect(10, 10, 492, 108);
  g.fillStyle = "#6f4f45";
  g.font = "italic 600 58px Georgia, 'Times New Roman', serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(GAME_CONTENT.shops.flowerShop, 256, 68);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const PALETTE: { kind: BloomKind; color: string }[] = [
  { kind: "rose", color: "#e7a9b4" },
  { kind: "tulip", color: "#f0b8a0" },
  { kind: "daisy", color: "#f6f1e8" },
  { kind: "rose", color: "#b8545d" },
  { kind: "tulip", color: "#f5ece4" },
  { kind: "rose", color: "#f2c6b4" },
];

/** A cluster of flowers on stems, as in a bucket or pot. */
function Bunch({
  seed,
  count,
  height,
  spread,
  size = 0.04,
}: {
  seed: number;
  count: number;
  height: number;
  spread: number;
  size?: number;
}) {
  const items = useMemo(() => {
    let s = seed;
    const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const pick = PALETTE[Math.floor(r() * PALETTE.length)]!;
    return Array.from({ length: count }, () => {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * spread;
      const p = r() < 0.7 ? pick : PALETTE[Math.floor(r() * PALETTE.length)]!;
      return { a, d, h: height * (0.8 + r() * 0.3), ...p, tilt: d * 2.2 };
    });
  }, [seed, count, height, spread]);
  return (
    <group>
      {items.map((it, i) => (
        <group key={i} rotation={[Math.sin(it.a) * it.tilt, 0, -Math.cos(it.a) * it.tilt]}>
          <Stem length={it.h} radius={0.004} />
          <Bloom kind={it.kind} color={it.color} size={size} position={[0, it.h, 0]} />
          {i % 3 === 0 && (
            <Leaf position={[0.01, it.h * 0.55, 0]} rotation={[0, it.a, 0.7]} size={0.06} />
          )}
        </group>
      ))}
    </group>
  );
}

/** Small storybook flower boutique. Counter faces -Z toward the water. */
export function FlowerShop() {
  const { x, z, w, d } = FLOWER_SHOP;
  const y = groundHeight(x, z);
  const sign = useMemo(signTexture, []);
  const m = useMemo(
    () => ({
      cream: new THREE.MeshStandardMaterial({ color: CREAM, roughness: 0.85 }),
      blush: new THREE.MeshStandardMaterial({ color: BLUSH, roughness: 0.8 }),
      wood: new THREE.MeshStandardMaterial({ color: WOOD, roughness: 0.75 }),
      zinc: new THREE.MeshStandardMaterial({ color: "#a9a7a0", roughness: 0.45, metalness: 0.5 }),
      terracotta: new THREE.MeshStandardMaterial({ color: "#b9765a", roughness: 0.9 }),
      glow: new THREE.MeshStandardMaterial({
        color: "#f8efdd",
        emissive: "#f3d9b0",
        emissiveIntensity: 0.25,
        roughness: 0.5,
      }),
      chain: new THREE.MeshStandardMaterial({ color: "#6b625a", roughness: 0.6, metalness: 0.4 }),
      moss: new THREE.MeshStandardMaterial({ color: "#6e8a56", roughness: 0.95 }),
      sign: new THREE.MeshStandardMaterial({ map: sign, roughness: 0.8 }),
    }),
    [sign],
  );
  const hw = w / 2;
  const hd = d / 2;

  useEffect(() => {
    const mine: Obstacle[] = [];
    for (const dx of [-1.1, 0, 1.1])
      for (const dz of [-0.45, 0.45]) mine.push({ x: x + dx, z: z + dz, r: 0.62, solid: true });
    // flower buckets and pots out front
    mine.push(
      { x: x - hw + 0.25, z: z - hd - 0.45, r: 0.3 },
      { x: x + hw - 0.25, z: z - hd - 0.45, r: 0.3 },
    );
    obstacles.push(...mine);
    return () => {
      for (const o of mine) {
        const i = obstacles.indexOf(o);
        if (i >= 0) obstacles.splice(i, 1);
      }
    };
  }, [x, z, hw, hd]);

  const stripes = 12;
  return (
    <group position={[x, y, z]}>
      {/* walls */}
      <mesh material={m.cream} position={[0, 1.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, 2.4, d]} />
      </mesh>
      <mesh material={m.blush} position={[0, 0.18, -hd - 0.005]} receiveShadow>
        <boxGeometry args={[w + 0.02, 0.36, 0.04]} />
      </mesh>
      <mesh material={m.wood} position={[0, 2.46, 0]} castShadow>
        <boxGeometry args={[w + 0.14, 0.1, d + 0.14]} />
      </mesh>
      {/* wooden-framed display window */}
      <mesh material={m.glow} position={[0.45, 1.45, -hd - 0.01]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[1.7, 0.95]} />
      </mesh>
      {[
        [0.45, 1.95, 1.84, 0.06],
        [0.45, 0.95, 1.84, 0.06],
        [-0.42, 1.45, 0.06, 1.06],
        [1.32, 1.45, 0.06, 1.06],
        [0.45, 1.45, 0.04, 0.95],
      ].map(([px, py, sx, sy], i) => (
        <mesh key={i} material={m.wood} position={[px!, py!, -hd - 0.03]}>
          <boxGeometry args={[sx!, sy!, 0.05]} />
        </mesh>
      ))}
      {/* door */}
      <mesh material={m.wood} position={[-1.0, 0.95, -hd - 0.02]}>
        <boxGeometry args={[0.72, 1.9, 0.05]} />
      </mesh>
      <mesh material={m.glow} position={[-1.0, 1.35, -hd - 0.05]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[0.5, 0.7]} />
      </mesh>
      {/* counter ledge with a few loose stems */}
      <mesh material={m.wood} position={[0.45, 0.98, -hd - 0.17]} castShadow receiveShadow>
        <boxGeometry args={[1.9, 0.06, 0.34]} />
      </mesh>
      <group position={[0.95, 1.01, -hd - 0.17]} rotation={[0, 0, Math.PI / 2 - 0.1]}>
        <Stem length={0.28} />
        <Bloom kind="tulip" color="#efc3c9" size={0.03} position={[0, 0.28, 0]} />
      </group>
      {/* striped awning */}
      {Array.from({ length: stripes }, (_, i) => (
        <mesh
          key={i}
          material={i % 2 ? m.cream : m.blush}
          position={[-hw + (w / stripes) * (i + 0.5), 2.25, -hd - 0.36]}
          rotation={[-0.45, 0, 0]}
          castShadow
        >
          <boxGeometry args={[w / stripes + 0.002, 0.03, 0.8]} />
        </mesh>
      ))}
      {/* sign */}
      <mesh material={m.wood} position={[0, 2.85, -hd + 0.22]}>
        <boxGeometry args={[2.1, 0.58, 0.06]} />
      </mesh>
      <mesh material={m.sign} position={[0, 2.85, -hd + 0.18]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[2.0, 0.5]} />
      </mesh>
      {/* hanging baskets under the awning */}
      {[-hw + 0.3, hw - 0.3].map((bx, i) => (
        <group key={bx} position={[bx, 1.78, -hd - 0.62]}>
          <mesh material={m.chain} position={[0, 0.22, 0]}>
            <cylinderGeometry args={[0.005, 0.005, 0.44, 4]} />
          </mesh>
          <mesh material={m.wood}>
            <sphereGeometry args={[0.16, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
          </mesh>
          <mesh material={m.moss} position={[0, -0.005, 0]} scale={[1, 0.25, 1]}>
            <sphereGeometry args={[0.16, 12, 8]} />
          </mesh>
          <Bunch seed={11 + i * 7} count={9} height={0.06} spread={0.12} size={0.035} />
        </group>
      ))}
      {/* zinc buckets of cut flowers */}
      {[-hw + 0.25, hw - 0.25].map((bx, i) => (
        <group key={bx} position={[bx, 0, -hd - 0.45]}>
          <mesh material={m.zinc} position={[0, 0.17, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.17, 0.13, 0.34, 18, 1, true]} />
          </mesh>
          <group position={[0, 0.3, 0]}>
            <Bunch seed={3 + i * 5} count={11} height={0.36} spread={0.11} size={0.042} />
          </group>
        </group>
      ))}
      {/* terracotta pots by the door */}
      {[-1.55, -0.45].map((px, i) => (
        <group key={px} position={[px, 0, -hd - 0.22]}>
          <mesh material={m.terracotta} position={[0, 0.12, 0]} castShadow>
            <cylinderGeometry args={[0.13, 0.1, 0.24, 14]} />
          </mesh>
          <group position={[0, 0.22, 0]}>
            <Bunch seed={21 + i * 4} count={7} height={0.22} spread={0.08} size={0.034} />
          </group>
        </group>
      ))}
      <pointLight
        position={[0.4, 1.7, -hd - 0.7]}
        color="#ffdcb0"
        intensity={1.3}
        distance={4.5}
        decay={2}
      />
    </group>
  );
}

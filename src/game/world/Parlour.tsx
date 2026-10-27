import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { FLAVOURS, PARLOUR } from "../config/chapter";
import { GAME_CONTENT } from "../config/gameContent";
import { groundHeight, obstacles, type Obstacle } from "./terrain";

const PINK = "#e3b7b2";
const CREAM = "#f2e9d8";
const TRIM = "#c99a8f";

function signTexture() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = CREAM;
  g.fillRect(0, 0, 512, 128);
  g.strokeStyle = TRIM;
  g.lineWidth = 8;
  g.strokeRect(8, 8, 496, 112);
  g.fillStyle = "#8a5a52";
  g.font = "italic 600 64px Georgia, 'Times New Roman', serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(GAME_CONTENT.shops.parlour, 256, 68);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Compact pastel ice-cream kiosk. Front (counter) faces -Z, toward the water. */
export function Parlour() {
  const y = groundHeight(PARLOUR.x, PARLOUR.z);
  const sign = useMemo(signTexture, []);
  const mats = useMemo(
    () => ({
      pink: new THREE.MeshStandardMaterial({ color: PINK, roughness: 0.8 }),
      cream: new THREE.MeshStandardMaterial({ color: CREAM, roughness: 0.85 }),
      trim: new THREE.MeshStandardMaterial({ color: TRIM, roughness: 0.7 }),
      glow: new THREE.MeshStandardMaterial({
        color: "#fbf1dc",
        emissive: "#f6dcb4",
        emissiveIntensity: 0.28,
        roughness: 0.4,
      }),
      cone: new THREE.MeshStandardMaterial({ color: "#c8955c", roughness: 0.9 }),
      sign: new THREE.MeshStandardMaterial({ map: sign, roughness: 0.8 }),
    }),
    [sign],
  );
  const scoops = useMemo(
    () => FLAVOURS.map((f) => new THREE.MeshStandardMaterial({ color: f.color, roughness: 0.6 })),
    [],
  );

  useEffect(() => {
    const mine: Obstacle[] = [];
    for (const dx of [-1.05, 0, 1.05])
      for (const dz of [-0.45, 0.45])
        mine.push({ x: PARLOUR.x + dx, z: PARLOUR.z + dz, r: 0.62, solid: true });
    obstacles.push(...mine);
    return () => {
      // remove only our own entries so other props' registrations stay intact
      for (const o of mine) {
        const i = obstacles.indexOf(o);
        if (i >= 0) obstacles.splice(i, 1);
      }
    };
  }, []);

  const hw = PARLOUR.w / 2;
  const hd = PARLOUR.d / 2;
  const stripes = 10;
  return (
    <group position={[PARLOUR.x, y, PARLOUR.z]}>
      {/* body */}
      <mesh material={mats.cream} position={[0, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[PARLOUR.w, 1, PARLOUR.d]} />
      </mesh>
      <mesh material={mats.pink} position={[0, 1.65, 0.1]} castShadow receiveShadow>
        <boxGeometry args={[PARLOUR.w, 1.3, PARLOUR.d - 0.2]} />
      </mesh>
      {[-hw + 0.08, hw - 0.08].map((x) => (
        <mesh key={x} material={mats.pink} position={[x, 1.65, -hd + 0.08]} castShadow>
          <boxGeometry args={[0.16, 1.3, 0.16]} />
        </mesh>
      ))}
      <mesh material={mats.trim} position={[0, 2.36, 0]} castShadow>
        <boxGeometry args={[PARLOUR.w + 0.1, 0.12, PARLOUR.d + 0.1]} />
      </mesh>
      {/* glowing display window + counter */}
      <mesh material={mats.glow} position={[0, 1.55, -hd + 0.11]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[PARLOUR.w - 0.4, 1.0]} />
      </mesh>
      <mesh material={mats.trim} position={[0, 1.03, -hd - 0.06]} castShadow receiveShadow>
        <boxGeometry args={[PARLOUR.w - 0.1, 0.07, 0.36]} />
      </mesh>
      {/* ice creams on the counter */}
      {FLAVOURS.map((f, i) => (
        <group key={f.name} position={[(i - 1) * 0.42, 1.07, -hd - 0.08]}>
          <mesh material={mats.cone} position={[0, 0.08, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.045, 0.16, 12]} />
          </mesh>
          <mesh material={scoops[i]!} position={[0, 0.19, 0]}>
            <sphereGeometry args={[0.055, 14, 10]} />
          </mesh>
        </group>
      ))}
      {/* striped awning */}
      {Array.from({ length: stripes }, (_, i) => (
        <mesh
          key={i}
          material={i % 2 ? mats.cream : mats.pink}
          position={[-hw + (PARLOUR.w / stripes) * (i + 0.5), 2.18, -hd - 0.32]}
          rotation={[-0.42, 0, 0]}
          castShadow
        >
          <boxGeometry args={[PARLOUR.w / stripes + 0.002, 0.03, 0.75]} />
        </mesh>
      ))}
      {/* sign */}
      <mesh material={mats.sign} position={[0, 2.72, -hd + 0.2]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[1.9, 0.48]} />
      </mesh>
      <mesh material={mats.trim} position={[0, 2.72, -hd + 0.25]}>
        <boxGeometry args={[1.98, 0.56, 0.06]} />
      </mesh>
      {/* cone sign on the roof */}
      <group position={[hw - 0.35, 2.42, 0]}>
        <mesh material={mats.cone} position={[0, 0.3, 0]} rotation={[Math.PI, 0, 0]} castShadow>
          <coneGeometry args={[0.18, 0.6, 16]} />
        </mesh>
        <mesh material={scoops[1]!} position={[0, 0.7, 0]} castShadow>
          <sphereGeometry args={[0.22, 18, 14]} />
        </mesh>
      </group>
      <pointLight
        position={[0, 1.7, -hd - 0.6]}
        color="#ffd9a8"
        intensity={1.6}
        distance={4.5}
        decay={2}
      />
    </group>
  );
}

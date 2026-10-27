// Airplane banner: a small plane tows a gently waving banner across the sky
// during the final bench scene. The whole feature is controlled by
// GAME_CONTENT.airplaneBanner — set `enabled: false` and nothing here loads.
// To remove it entirely: delete this folder and its one usage in Game.tsx.
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { GAME_CONTENT } from "../../config/gameContent";

const BANNER_W = 16;
const BANNER_H = 1.7;

function bannerTexture(message: string) {
  const c = document.createElement("canvas");
  c.width = 2048;
  c.height = 256;
  const x = c.getContext("2d")!;
  // cream canvas with a subtle fabric weave
  x.fillStyle = "#f4ead6";
  x.fillRect(0, 0, 2048, 256);
  for (let i = 0; i < 2048; i += 6) {
    x.fillStyle = `rgba(120,100,70,${0.03 + (i % 12 === 0 ? 0.03 : 0)})`;
    x.fillRect(i, 0, 1, 256);
  }
  x.strokeStyle = "#b3552e";
  x.lineWidth = 10;
  x.strokeRect(8, 8, 2032, 240);
  x.fillStyle = "#2c3a4a";
  x.font = "600 118px Georgia, 'Times New Roman', serif";
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillText(message, 1024, 136);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Small stylised propeller plane, built from primitives (distant silhouette). */
function Plane() {
  const prop = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (prop.current) prop.current.rotation.x += dt * 30;
  });
  const body = "#e8e2d4";
  const accent = "#b3552e";
  return (
    <group>
      <mesh castShadow>
        <capsuleGeometry args={[0.32, 2.2, 6, 12]} />
        <meshStandardMaterial color={body} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.28, 0.25]}>
        <sphereGeometry args={[0.24, 12, 10]} />
        <meshStandardMaterial color="#7fa3b8" roughness={0.2} metalness={0.3} />
      </mesh>
      {/* main wing */}
      <mesh position={[0, 0.05, 0.35]}>
        <boxGeometry args={[4.6, 0.07, 0.75]} />
        <meshStandardMaterial color={accent} roughness={0.55} />
      </mesh>
      {/* tail */}
      <mesh position={[0, 0.35, -1.35]}>
        <boxGeometry args={[0.07, 0.7, 0.5]} />
        <meshStandardMaterial color={accent} roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.05, -1.35]}>
        <boxGeometry args={[1.6, 0.06, 0.45]} />
        <meshStandardMaterial color={accent} roughness={0.55} />
      </mesh>
      {/* propeller */}
      <mesh ref={prop} position={[0, 0, 1.45]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.09, 1.5, 0.04]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.4} />
      </mesh>
    </group>
  );
}

export function AirplaneBanner() {
  const cfg = GAME_CONTENT.airplaneBanner;
  const group = useRef<THREE.Group>(null);
  const banner = useRef<THREE.Mesh>(null);

  const texture = useMemo(
    () => (cfg.enabled ? bannerTexture(cfg.text) : null),
    [cfg.enabled, cfg.text],
  );
  const bannerGeo = useMemo(() => new THREE.PlaneGeometry(BANNER_W, BANNER_H, 48, 6), []);
  const basePositions = useMemo(
    () => Float32Array.from(bannerGeo.attributes["position"]!.array),
    [bannerGeo],
  );

  useFrame(({ clock }) => {
    if (!cfg.enabled) return;
    const t = clock.elapsedTime;
    const g = group.current;
    if (g) {
      // slow pass over the water, in view of the bench, well above the skyline
      const span = 340;
      const x = ((t * 4.2 + 120) % span) - span / 2;
      g.position.set(x, 26 + Math.sin(t * 0.4) * 0.8, -70);
      g.rotation.set(0, 0, Math.sin(t * 0.5) * 0.03);
    }
    const m = banner.current;
    if (m) {
      // wind-driven wave: grows toward the loose end of the banner
      const pos = m.geometry.attributes["position"] as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const bx = basePositions[i * 3]!;
        const trail = (BANNER_W / 2 - bx) / BANNER_W; // 0 at the rope, 1 at the tail
        pos.setY(i, basePositions[i * 3 + 1]! + Math.sin(bx * 0.9 + t * 2.4) * 0.22 * trail);
        pos.setZ(i, Math.cos(bx * 0.7 + t * 1.9) * 0.3 * trail);
      }
      pos.needsUpdate = true;
      m.geometry.computeVertexNormals();
    }
  });

  if (!cfg.enabled || !texture) return null;

  return (
    <group ref={group} rotation={[0, Math.PI / 2, 0]}>
      {/* plane faces +Z locally; the group is turned so it flies along +X */}
      <Plane />
      {/* tow rope */}
      <mesh position={[0, -0.1, -2.4]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 1.8, 4]} />
        <meshBasicMaterial color="#5a5348" />
      </mesh>
      <mesh
        ref={banner}
        geometry={bannerGeo}
        position={[0, -0.15, -3.3 - BANNER_W / 2]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <meshStandardMaterial map={texture} side={THREE.DoubleSide} roughness={0.9} />
      </mesh>
    </group>
  );
}

import { useMemo } from "react";
import * as THREE from "three";
import { PROMENADE_Z, SHORE_Z } from "../config/chapter";
import { groundHeight, mulberry32 } from "./terrain";

function sandTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const x = c.getContext("2d")!;
  x.fillStyle = "#d8c3a0";
  x.fillRect(0, 0, 512, 512);
  const r = mulberry32(3);
  for (let i = 0; i < 26000; i++) {
    const v = r();
    x.fillStyle =
      v < 0.5 ? `rgba(120,95,60,${0.08 + r() * 0.12})` : `rgba(255,248,230,${0.08 + r() * 0.14})`;
    x.fillRect(r() * 512, r() * 512, 1 + r() * 1.5, 1 + r() * 1.5);
  }
  // soft wind ripples
  for (let i = 0; i < 40; i++) {
    x.strokeStyle = "rgba(140,110,70,0.05)";
    x.lineWidth = 3;
    x.beginPath();
    const y0 = r() * 512;
    for (let px = 0; px <= 512; px += 16) x.lineTo(px, y0 + Math.sin(px * 0.03 + i) * 6);
    x.stroke();
  }
  // a few faint old footprints
  for (let i = 0; i < 14; i++) {
    const fx = r() * 480 + 16;
    const fy = r() * 480 + 16;
    const a = r() * Math.PI * 2;
    for (let k = 0; k < 2; k++) {
      x.save();
      x.translate(fx + Math.cos(a + 1.57) * (k ? 7 : -7), fy + Math.sin(a + 1.57) * (k ? 7 : -7));
      x.rotate(a);
      x.fillStyle = "rgba(110,85,55,0.12)";
      x.beginPath();
      x.ellipse(0, 0, 9, 4, 0, 0, Math.PI * 2);
      x.fill();
      x.restore();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(36, 10);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function paverTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const x = c.getContext("2d")!;
  x.fillStyle = "#9b958c";
  x.fillRect(0, 0, 512, 512);
  const r = mulberry32(9);
  const h = 64;
  for (let row = 0; row < 8; row++) {
    const off = (row % 2) * 48;
    for (let col = -1; col < 6; col++) {
      const w = 96;
      const l = 120 + r() * 30;
      x.fillStyle = `rgb(${l + 30},${l + 24},${l + 14})`;
      x.fillRect(col * w + off + 2, row * h + 2, w - 4, h - 4);
      for (let k = 0; k < 120; k++) {
        x.fillStyle = `rgba(0,0,0,${r() * 0.06})`;
        x.fillRect(col * w + off + r() * w, row * h + r() * h, 2, 2);
      }
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(60, 3);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function Beach({ segments }: { segments: number }) {
  const { geo, sand, pavers } = useMemo(() => {
    const W = 260;
    const z0 = SHORE_Z - 12;
    const z1 = PROMENADE_Z + 0.6;
    const g = new THREE.PlaneGeometry(W, z1 - z0, segments * 2, Math.round(segments / 2));
    g.rotateX(-Math.PI / 2);
    g.translate(0, 0, (z0 + z1) / 2);
    const p = g.attributes["position"] as THREE.BufferAttribute;
    const col = new Float32Array(p.count * 3);
    const dry = new THREE.Color("#ffffff");
    const wet = new THREE.Color("#a99577");
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const z = p.getZ(i);
      p.setY(i, groundHeight(x, z));
      const wetness = THREE.MathUtils.smoothstep(SHORE_Z + 3.2, SHORE_Z + 0.3, z);
      c.copy(dry).lerp(wet, wetness * 0.75);
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    return { geo: g, sand: sandTexture(), pavers: paverTexture() };
  }, [segments]);

  return (
    <group>
      <mesh geometry={geo} receiveShadow>
        <meshStandardMaterial map={sand} vertexColors roughness={0.97} />
      </mesh>
      {/* promenade */}
      <mesh position={[0, 0.16, PROMENADE_Z + 5.4]} receiveShadow castShadow>
        <boxGeometry args={[260, 0.32, 10]} />
        <meshStandardMaterial map={pavers} roughness={0.85} />
      </mesh>
      {/* granite curb at the beach edge */}
      <mesh position={[0, 0.2, PROMENADE_Z + 0.45]} receiveShadow castShadow>
        <boxGeometry args={[260, 0.42, 0.35]} />
        <meshStandardMaterial color="#b5afa6" roughness={0.7} />
      </mesh>
      {/* planted strip and low wall behind the promenade */}
      <mesh position={[0, 0.45, PROMENADE_Z + 11]} receiveShadow>
        <boxGeometry args={[260, 0.3, 1.6]} />
        <meshStandardMaterial color="#5c6b3e" roughness={1} />
      </mesh>
      <mesh position={[0, 0.55, PROMENADE_Z + 11.9]} castShadow receiveShadow>
        <boxGeometry args={[260, 0.8, 0.3]} />
        <meshStandardMaterial color="#cdbfa9" roughness={0.9} />
      </mesh>
      {/* road */}
      <mesh position={[0, 0.3, PROMENADE_Z + 17]} receiveShadow>
        <boxGeometry args={[260, 0.02, 9]} />
        <meshStandardMaterial color="#4b4a48" roughness={0.95} />
      </mesh>
    </group>
  );
}

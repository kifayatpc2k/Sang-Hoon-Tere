import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { PROMENADE_Z } from "../config/chapter";
import { mulberry32 } from "./terrain";

const FAR_Z = -720;
const stone = "#d6cfc4";
const lead = "#8f969b";

/** Shoreline hill height across the strait (gentle, not mountains). */
function farHill(x: number) {
  return (
    22 +
    Math.sin(x * 0.004) * 16 +
    Math.sin(x * 0.011 + 1) * 8 +
    Math.max(0, Math.sin(x * 0.0023 - 0.6)) * 25
  );
}

function Mosque({
  x,
  z,
  s = 1,
  minarets = 4,
}: {
  x: number;
  z: number;
  s?: number;
  minarets?: 2 | 4 | 6;
}) {
  const y = farHill(x) * 0.55;
  const mStone = <meshStandardMaterial color={stone} roughness={0.9} />;
  const mLead = <meshStandardMaterial color={lead} roughness={0.5} metalness={0.3} />;
  const mins: [number, number][] =
    minarets === 2
      ? [
          [-26, 22],
          [26, 22],
        ]
      : minarets === 4
        ? [
            [-24, -24],
            [24, -24],
            [-24, 24],
            [24, 24],
          ]
        : [
            [-24, -24],
            [24, -24],
            [-24, 24],
            [24, 24],
            [-40, 30],
            [40, 30],
          ];
  return (
    <group position={[x, y, z]} scale={s}>
      <mesh position={[0, 8, 0]}>
        <boxGeometry args={[42, 16, 42]} />
        {mStone}
      </mesh>
      <mesh position={[0, 18, 0]}>
        <cylinderGeometry args={[14, 15, 5, 24]} />
        {mStone}
      </mesh>
      <mesh position={[0, 20.5, 0]}>
        <sphereGeometry args={[14.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        {mLead}
      </mesh>
      <mesh position={[0, 35.5, 0]}>
        <cylinderGeometry args={[0.15, 0.4, 4, 6]} />
        <meshStandardMaterial color="#c8a95a" metalness={0.8} roughness={0.3} />
      </mesh>
      {[0, Math.PI].map((r) => (
        <mesh key={r} position={[0, 16, 0]} rotation={[0, r, 0]}>
          <sphereGeometry args={[10.5, 24, 12, 0, Math.PI, 0, Math.PI / 2]} />
          {mLead}
        </mesh>
      ))}
      {[
        [-15, -15],
        [15, -15],
        [-15, 15],
        [15, 15],
      ].map(([a, b], i) => (
        <mesh key={i} position={[a!, 16, b!]}>
          <sphereGeometry args={[5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          {mLead}
        </mesh>
      ))}
      {/* forecourt arcade */}
      <mesh position={[0, 5, 36]}>
        <boxGeometry args={[40, 10, 28]} />
        {mStone}
      </mesh>
      {mins.map(([a, b], i) => (
        <group key={i} position={[a!, 0, b!]}>
          <mesh position={[0, 31, 0]}>
            <cylinderGeometry args={[1.3, 1.7, 62, 12]} />
            {mStone}
          </mesh>
          {[40, 52].map((h) => (
            <mesh key={h} position={[0, h, 0]}>
              <cylinderGeometry args={[2.3, 1.8, 1.4, 12]} />
              {mStone}
            </mesh>
          ))}
          <mesh position={[0, 68, 0]}>
            <coneGeometry args={[1.6, 12, 12]} />
            {mLead}
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Tower({ x, z }: { x: number; z: number }) {
  const y = farHill(x) * 0.9;
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 24, 0]}>
        <cylinderGeometry args={[8, 9, 48, 20]} />
        <meshStandardMaterial color="#bfb2a0" roughness={0.9} />
      </mesh>
      <mesh position={[0, 50, 0]}>
        <cylinderGeometry args={[9.2, 8.5, 4, 20]} />
        <meshStandardMaterial color="#cfc4b4" roughness={0.9} />
      </mesh>
      <mesh position={[0, 61, 0]}>
        <coneGeometry args={[9, 18, 20]} />
        <meshStandardMaterial color="#5f6a73" roughness={0.6} />
      </mesh>
    </group>
  );
}

function Bridge() {
  const x = 1250;
  const zA = -120;
  const zB = -660;
  const deckY = 64;
  const H = 165;
  const { cable, hangers } = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const hang: number[] = [];
    const ext = 160;
    for (let i = 0; i <= 60; i++) {
      const t = i / 60;
      const z = THREE.MathUtils.lerp(zA + ext, zB - ext, t);
      const u = (z - zA) / (zB - zA); // 0..1 between towers
      let y: number;
      if (z > zA) y = H - ((z - zA) / ext) * (H - deckY);
      else if (z < zB) y = H - ((zB - z) / ext) * (H - deckY);
      else y = deckY + 6 + (H - deckY - 6) * Math.pow(2 * u - 1, 2);
      pts.push(new THREE.Vector3(0, y, z));
      if (u > 0.02 && u < 0.98) hang.push(0, y, z, 0, deckY, z);
    }
    const hg = new THREE.BufferGeometry();
    hg.setAttribute("position", new THREE.Float32BufferAttribute(hang, 3));
    return { cable: new THREE.CatmullRomCurve3(pts), hangers: hg };
  }, []);
  const mat = <meshStandardMaterial color="#9aa1a6" roughness={0.6} metalness={0.3} />;
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, deckY, (zA + zB) / 2]}>
        <boxGeometry args={[30, 4, Math.abs(zB - zA) + 380]} />
        {mat}
      </mesh>
      {[zA, zB].map((z) => (
        <group key={z} position={[0, 0, z]}>
          {[-13, 13].map((dx) => (
            <mesh key={dx} position={[dx, H / 2, 0]}>
              <boxGeometry args={[4, H, 6]} />
              {mat}
            </mesh>
          ))}
          {[deckY + 30, H - 6].map((y) => (
            <mesh key={y} position={[0, y, 0]}>
              <boxGeometry args={[30, 4, 5]} />
              {mat}
            </mesh>
          ))}
        </group>
      ))}
      {[-13, 13].map((dx) => (
        <group key={dx} position={[dx, 0, 0]}>
          <mesh>
            <tubeGeometry args={[cable, 120, 0.9, 6, false]} />
            {mat}
          </mesh>
          <lineSegments geometry={hangers}>
            <lineBasicMaterial color="#9aa1a6" transparent opacity={0.6} />
          </lineSegments>
        </group>
      ))}
    </group>
  );
}

/** Dense layered city across the water: hills, apartment blocks, red roofs. */
function FarCity() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const roofs = useRef<THREE.InstancedMesh>(null);
  const items = useMemo(() => {
    const r = mulberry32(21);
    const out: { x: number; z: number; w: number; d: number; h: number; c: THREE.Color }[] = [];
    const palette = [
      "#e7ddd0",
      "#efe6d8",
      "#d9c9b3",
      "#c9b8a2",
      "#e3d2bf",
      "#bfb4a6",
      "#f1ebe2",
      "#d4b89a",
    ];
    for (let i = 0; i < 1300; i++) {
      const x = -1700 + r() * 3400;
      const row = r();
      const z = FAR_Z - 10 - row * 160;
      const ground = farHill(x) * (0.35 + row * 0.9);
      if (Math.abs(x - 1250) < 30) continue;
      const w = 10 + r() * 16;
      const h = 8 + r() * 18 + (r() < 0.04 ? 30 : 0);
      out.push({
        x,
        z,
        w,
        d: 10 + r() * 12,
        h: h + ground,
        c: new THREE.Color(palette[Math.floor(r() * palette.length)]!).offsetHSL(
          0,
          0,
          (r() - 0.5) * 0.06,
        ),
      });
    }
    return out;
  }, []);
  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    items.forEach((b, i) => {
      o.position.set(b.x, b.h / 2, b.z);
      o.scale.set(b.w, b.h, b.d);
      o.updateMatrix();
      ref.current!.setMatrixAt(i, o.matrix);
      ref.current!.setColorAt(i, b.c);
      o.position.set(b.x, b.h + 1.6, b.z);
      o.scale.set(b.w * 0.75, 3.2, b.d * 0.75);
      o.updateMatrix();
      roofs.current!.setMatrixAt(i, o.matrix);
    });
    ref.current!.instanceMatrix.needsUpdate = true;
    ref.current!.instanceColor!.needsUpdate = true;
    roofs.current!.instanceMatrix.needsUpdate = true;
  }, [items]);
  const hill = useMemo(() => {
    const g = new THREE.PlaneGeometry(3600, 260, 180, 4);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes["position"] as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const z = p.getZ(i);
      const t = (z + 130) / 260; // 0 near water .. 1 far
      p.setY(i, farHill(x) * (0.15 + (1 - t) * 1.1) - 2);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <group>
      <mesh geometry={hill} position={[0, 0, FAR_Z - 110]}>
        <meshStandardMaterial color="#6f7a5c" roughness={1} />
      </mesh>
      <instancedMesh ref={ref} args={[undefined, undefined, items.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.95} />
      </instancedMesh>
      <instancedMesh ref={roofs} args={[undefined, undefined, items.length]}>
        <coneGeometry args={[0.75, 1, 4]} />
        <meshStandardMaterial color="#a65f45" roughness={0.9} />
      </instancedMesh>
      {/* waterfront embankment */}
      <mesh position={[0, 1.5, FAR_Z + 4]}>
        <boxGeometry args={[3600, 4, 8]} />
        <meshStandardMaterial color="#b8ad9c" roughness={1} />
      </mesh>
    </group>
  );
}

/** Historic waterfront houses behind the promenade on the player's side. */
function NearHouses() {
  const houses = useMemo(() => {
    const r = mulberry32(5);
    const cols = ["#d9b99a", "#c9d1c8", "#e6d3b8", "#b9a48f", "#dcc7c0", "#c7bfae"];
    const out = [];
    for (let x = -120; x < 120; x += 14 + r() * 4) {
      out.push({
        x,
        w: 11 + r() * 3,
        h: 11 + Math.floor(r() * 2) * 3.5,
        c: cols[Math.floor(r() * cols.length)]!,
        bay: r() < 0.5,
      });
    }
    return out;
  }, []);
  const facade = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 256;
    const x = c.getContext("2d")!;
    x.fillStyle = "#ffffff";
    x.fillRect(0, 0, 256, 256);
    // plaster variation
    for (let i = 0; i < 3000; i++) {
      x.fillStyle = `rgba(0,0,0,${Math.random() * 0.035})`;
      x.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
    // cornices between floors
    for (const y of [62, 124, 186]) {
      x.fillStyle = "rgba(255,255,255,0.9)";
      x.fillRect(0, y, 256, 5);
      x.fillStyle = "rgba(0,0,0,0.12)";
      x.fillRect(0, y + 5, 256, 2);
    }
    // tall Ottoman-style windows with frames and shutters
    for (let row = 0; row < 3; row++)
      for (let col = 0; col < 5; col++) {
        const wx = 14 + col * 49;
        const wy = 12 + row * 62;
        x.fillStyle = "rgba(255,255,255,0.95)";
        x.fillRect(wx - 3, wy - 3, 25, 42);
        x.fillStyle = "#2f3437";
        x.fillRect(wx, wy, 19, 36);
        x.fillStyle = "rgba(180,200,210,0.35)";
        x.fillRect(wx + 2, wy + 2, 7, 15);
        x.fillStyle = "rgba(255,255,255,0.8)";
        x.fillRect(wx + 9, wy, 1, 36);
        x.fillRect(wx, wy + 17, 19, 1);
        x.fillStyle = "rgba(70,90,70,0.55)";
        x.fillRect(wx - 9, wy, 6, 36);
        x.fillRect(wx + 22, wy, 6, 36);
      }
    // ground floor: shopfronts and a doorway
    x.fillStyle = "rgba(60,55,50,0.85)";
    x.fillRect(0, 196, 256, 60);
    x.fillStyle = "rgba(255,210,150,0.35)";
    for (let i = 0; i < 4; i++) x.fillRect(12 + i * 62, 206, 44, 40);
    x.fillStyle = "rgba(150,40,30,0.7)";
    x.fillRect(0, 192, 256, 6);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, []);
  const z = PROMENADE_Z + 30;
  return (
    <group>
      {houses.map((h, i) => (
        <group key={i} position={[h.x, 0, z]}>
          <mesh position={[0, h.h / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[h.w, h.h, 10]} />
            <meshStandardMaterial color={h.c} map={facade} roughness={0.9} />
          </mesh>
          {h.bay && (
            <mesh position={[0, h.h * 0.62, -5.4]} castShadow>
              <boxGeometry args={[h.w * 0.4, h.h * 0.45, 1]} />
              <meshStandardMaterial color={h.c} map={facade} roughness={0.9} />
            </mesh>
          )}
          <mesh position={[0, h.h + 0.25, 0]}>
            <boxGeometry args={[h.w + 0.6, 0.5, 10.8]} />
            <meshStandardMaterial color="#efe8dc" roughness={0.9} />
          </mesh>
          <mesh
            position={[0, h.h + 1.4, 0]}
            rotation={[0, Math.PI / 4, 0]}
            scale={[h.w * 0.78, 2.4, 7.4]}
          >
            <coneGeometry args={[1, 1, 4]} />
            <meshStandardMaterial color="#8e5340" roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function Skyline() {
  return (
    <group>
      <FarCity />
      <Mosque x={-380} z={FAR_Z - 70} s={1.15} minarets={6} />
      <Mosque x={160} z={FAR_Z - 40} s={0.95} minarets={4} />
      <Mosque x={-820} z={FAR_Z - 30} s={0.8} minarets={2} />
      <Tower x={-60} z={FAR_Z - 110} />
      <Bridge />
      <NearHouses />
    </group>
  );
}

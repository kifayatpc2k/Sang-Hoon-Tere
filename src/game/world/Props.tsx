import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { BENCH, PROMENADE_Z, SEAT_HEIGHT } from "../config/chapter";
import { groundHeight, mulberry32, obstacles } from "./terrain";

const woodTex = (() => {
  let t: THREE.CanvasTexture | null = null;
  return () => {
    if (t) return t;
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 64;
    const x = c.getContext("2d")!;
    x.fillStyle = "#8a6242";
    x.fillRect(0, 0, 256, 64);
    for (let i = 0; i < 60; i++) {
      x.strokeStyle = `rgba(${50 + Math.random() * 40},${30 + Math.random() * 20},15,${0.15 + Math.random() * 0.2})`;
      x.lineWidth = 1;
      x.beginPath();
      const y = Math.random() * 64;
      for (let px = 0; px <= 256; px += 8) x.lineTo(px, y + Math.sin(px * 0.04 + i) * 2);
      x.stroke();
    }
    t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
})();

/** Classic slatted waterfront bench with cast-iron sides. Origin at ground, faces +Z locally. */
export function Bench({ x, z, rotY }: { x: number; z: number; rotY: number; scenic?: boolean }) {
  const y = groundHeight(x, z);
  const wood = useMemo(
    () => new THREE.MeshStandardMaterial({ map: woodTex(), roughness: 0.75 }),
    [],
  );
  const iron = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#26282a", roughness: 0.45, metalness: 0.6 }),
    [],
  );
  const L = 1.7;
  return (
    <group position={[x, y, z]} rotation={[0, rotY, 0]}>
      {[0, 1, 2, 3].map((i) => (
        <mesh
          key={i}
          material={wood}
          position={[0, SEAT_HEIGHT - 0.02, 0.17 - i * 0.115]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[L, 0.035, 0.095]} />
        </mesh>
      ))}
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          material={wood}
          position={[0, SEAT_HEIGHT + 0.2 + i * 0.12, -0.27 - i * 0.02]}
          rotation={[-0.18, 0, 0]}
          castShadow
        >
          <boxGeometry args={[L, 0.09, 0.03]} />
        </mesh>
      ))}
      {[-L / 2 + 0.1, L / 2 - 0.1].map((sx) => (
        <group key={sx} position={[sx, 0, 0]}>
          <mesh material={iron} position={[0, SEAT_HEIGHT / 2, 0.15]} castShadow>
            <boxGeometry args={[0.05, SEAT_HEIGHT, 0.05]} />
          </mesh>
          <mesh
            material={iron}
            position={[0, (SEAT_HEIGHT + 0.5) / 2, -0.25]}
            rotation={[-0.12, 0, 0]}
            castShadow
          >
            <boxGeometry args={[0.05, SEAT_HEIGHT + 0.55, 0.05]} />
          </mesh>
          <mesh material={iron} position={[0, SEAT_HEIGHT - 0.05, -0.05]}>
            <boxGeometry args={[0.04, 0.04, 0.48]} />
          </mesh>
          <mesh material={iron} position={[0, SEAT_HEIGHT + 0.2, 0.05]}>
            <boxGeometry args={[0.04, 0.035, 0.3]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function Lamp({ x, z }: { x: number; z: number }) {
  const y = groundHeight(x, z);
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.17, 0.3, 12]} />
        <meshStandardMaterial color="#202224" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.9, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.07, 3.6, 10]} />
        <meshStandardMaterial color="#202224" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 3.9, 0]}>
        <cylinderGeometry args={[0.16, 0.12, 0.4, 6]} />
        <meshStandardMaterial
          color="#f5e2b8"
          emissive="#ffc77a"
          emissiveIntensity={1.4}
          roughness={0.3}
        />
      </mesh>
      <mesh position={[0, 4.17, 0]}>
        <coneGeometry args={[0.22, 0.2, 6]} />
        <meshStandardMaterial color="#202224" metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  );
}

/** Plane trees along the promenade: instanced trunks and leafy clumps. */
export function Trees({ items }: { items: { x: number; z: number; s: number }[] }) {
  const trunk = useRef<THREE.InstancedMesh>(null);
  const leaves = useRef<THREE.InstancedMesh>(null);
  const clumps = 12;
  const leafGeo = useMemo(() => {
    const g = mergeVertices(new THREE.IcosahedronGeometry(1, 3));
    const p = g.attributes["position"] as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(p, i);
      const n =
        1 +
        Math.sin(v.x * 9.1) * Math.cos(v.y * 8.3) * Math.sin(v.z * 7.7) * 0.12 +
        Math.sin(v.x * 23 + v.z * 19) * 0.04;
      v.multiplyScalar(n);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    const r = mulberry32(11);
    const col = new THREE.Color();
    items.forEach((t, i) => {
      const y = groundHeight(t.x, t.z);
      o.position.set(t.x, y + 2.4 * t.s, t.z);
      o.scale.set(t.s, t.s, t.s);
      o.rotation.set(0, 0, 0);
      o.updateMatrix();
      trunk.current!.setMatrixAt(i, o.matrix);
      for (let k = 0; k < clumps; k++) {
        const a = (k / clumps) * Math.PI * 2 + r();
        const rad = k === 0 ? 0 : 1.1 + r() * 1.3;
        o.position.set(
          t.x + Math.cos(a) * rad * t.s,
          y + (5.4 + r() * 1.6 - (k === 0 ? -0.6 : 0)) * t.s,
          t.z + Math.sin(a) * rad * t.s,
        );
        const sc = (1.05 + r() * 0.6) * t.s;
        o.scale.set(sc, sc * 0.8, sc);
        o.rotation.set(r() * 3, r() * 3, 0);
        o.updateMatrix();
        leaves.current!.setMatrixAt(i * clumps + k, o.matrix);
        leaves.current!.setColorAt(
          i * clumps + k,
          col.set("#5b7243").offsetHSL((r() - 0.5) * 0.03, 0, (r() - 0.5) * 0.08),
        );
      }
    });
    trunk.current!.instanceMatrix.needsUpdate = true;
    leaves.current!.instanceMatrix.needsUpdate = true;
    leaves.current!.instanceColor!.needsUpdate = true;
  }, [items]);
  return (
    <group>
      <instancedMesh ref={trunk} args={[undefined, undefined, items.length]} castShadow>
        <cylinderGeometry args={[0.16, 0.26, 4.8, 10]} />
        <meshStandardMaterial color="#8a8270" roughness={0.95} />
      </instancedMesh>
      <instancedMesh
        ref={leaves}
        args={[leafGeo, undefined, items.length * clumps]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial roughness={0.9} />
      </instancedMesh>
    </group>
  );
}

/** Coastal grass tufts and pebbles on the upper beach. */
export function BeachDetails() {
  const grass = useRef<THREE.InstancedMesh>(null);
  const pebbles = useRef<THREE.InstancedMesh>(null);
  const shells = useRef<THREE.InstancedMesh>(null);
  const counts = { grass: 900, pebbles: 260, shells: 80 };
  useLayoutEffect(() => {
    const r = mulberry32(17);
    const o = new THREE.Object3D();
    const col = new THREE.Color();
    // grass grows in patches against the promenade
    const patches = Array.from({ length: 16 }, () => ({
      x: -70 + r() * 140,
      z: PROMENADE_Z - 1.5 - r() * 3.5,
    }));
    for (let i = 0; i < counts.grass; i++) {
      const p = patches[i % patches.length]!;
      const x = p.x + (r() - 0.5) * 5;
      const z = Math.min(PROMENADE_Z - 0.3, p.z + (r() - 0.5) * 2.4);
      o.position.set(x, groundHeight(x, z), z);
      o.rotation.set((r() - 0.5) * 0.5, r() * 6, (r() - 0.5) * 0.5);
      const s = 0.5 + r() * 0.6;
      o.scale.set(s * 0.6, s, s * 0.6);
      o.updateMatrix();
      grass.current!.setMatrixAt(i, o.matrix);
      grass.current!.setColorAt(i, col.set(r() < 0.3 ? "#b4a874" : "#7e8a52"));
    }
    for (let i = 0; i < counts.pebbles; i++) {
      const x = -90 + r() * 180;
      const z = 3.5 + Math.pow(r(), 2) * 6;
      o.position.set(x, groundHeight(x, z) + 0.01, z);
      o.rotation.set(r(), r(), r());
      const s = 0.02 + r() * 0.05;
      o.scale.set(s, s * 0.6, s * 1.2);
      o.updateMatrix();
      pebbles.current!.setMatrixAt(i, o.matrix);
      pebbles.current!.setColorAt(i, col.set("#8f877c").offsetHSL(0, 0, (r() - 0.5) * 0.2));
    }
    for (let i = 0; i < counts.shells; i++) {
      const x = -90 + r() * 180;
      const z = 4 + r() * 20;
      o.position.set(x, groundHeight(x, z) + 0.004, z);
      o.rotation.set(-Math.PI / 2, 0, r() * 6);
      const s = 0.015 + r() * 0.02;
      o.scale.set(s, s, s);
      o.updateMatrix();
      shells.current!.setMatrixAt(i, o.matrix);
    }
    grass.current!.instanceMatrix.needsUpdate = true;
    grass.current!.instanceColor!.needsUpdate = true;
    pebbles.current!.instanceMatrix.needsUpdate = true;
    pebbles.current!.instanceColor!.needsUpdate = true;
    shells.current!.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <group>
      <instancedMesh ref={grass} args={[undefined, undefined, counts.grass]}>
        <coneGeometry args={[0.025, 0.5, 3]} />
        <meshStandardMaterial roughness={1} />
      </instancedMesh>
      <instancedMesh
        ref={pebbles}
        args={[undefined, undefined, counts.pebbles]}
        receiveShadow
        castShadow
      >
        <dodecahedronGeometry args={[1, 1]} />
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={shells} args={[undefined, undefined, counts.shells]}>
        <circleGeometry args={[1, 10]} />
        <meshStandardMaterial color="#efe5d6" roughness={0.6} />
      </instancedMesh>
    </group>
  );
}

/** A few gulls gliding high over the water. */
export function Gulls() {
  const refs = useRef<(THREE.Group | null)[]>([]);
  const birds = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => ({
        r: 20 + i * 9,
        h: 14 + (i % 3) * 5,
        sp: 0.08 + (i % 4) * 0.02,
        cx: -20 + i * 12,
        cz: -30 - i * 8,
        ph: i * 1.7,
      })),
    [],
  );
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    birds.forEach((b, i) => {
      const g = refs.current[i];
      if (!g) return;
      const a = t * b.sp + b.ph;
      g.position.set(
        b.cx + Math.cos(a) * b.r,
        b.h + Math.sin(t * 0.6 + i) * 1.5,
        b.cz + Math.sin(a) * b.r * 0.5,
      );
      g.rotation.y = -a;
      const flap = Math.sin(t * 6 + i) * 0.35 * (Math.sin(t * 0.4 + i) > 0.3 ? 1 : 0.15);
      (g.children[0] as THREE.Object3D).rotation.z = 0.15 + flap;
      (g.children[1] as THREE.Object3D).rotation.z = -0.15 - flap;
    });
  });
  return (
    <group>
      {birds.map((_, i) => (
        <group
          key={i}
          ref={(g) => {
            refs.current[i] = g;
          }}
        >
          {[1, -1].map((s) => (
            <mesh key={s} position={[0, 0, 0]}>
              <boxGeometry args={[0.02, 0.01, 0.01]} />
              <mesh position={[s * 0.38, 0, 0]} scale={[0.75, 0.02, 0.16]}>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color="#f3f1ec" />
              </mesh>
            </mesh>
          ))}
          <mesh scale={[0.08, 0.08, 0.35]}>
            <sphereGeometry args={[1, 8, 6]} />
            <meshStandardMaterial color="#f3f1ec" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function Props() {
  const layout = useMemo(() => {
    const lamps: { x: number; z: number }[] = [];
    const benches: { x: number; z: number }[] = [];
    const trees: { x: number; z: number; s: number }[] = [];
    for (let x = -66; x <= 66; x += 16) {
      lamps.push({ x, z: PROMENADE_Z + 1.2 });
      benches.push({ x: x + 8, z: PROMENADE_Z + 1.6 });
      trees.push({ x: x + 4, z: PROMENADE_Z + 9, s: 0.9 + ((x * 7) % 5) * 0.06 });
    }
    // two pines framing the scenic bench, set back so the view stays open
    trees.push({ x: BENCH.x - 4.5, z: BENCH.z + 4.5, s: 0.85 });
    return { lamps, benches, trees };
  }, []);
  useLayoutEffect(() => {
    const mine: typeof obstacles = [];
    for (const l of layout.lamps) mine.push({ x: l.x, z: l.z, r: 0.2, solid: true });
    for (const b of layout.benches)
      for (const dx of [-0.6, 0, 0.6]) mine.push({ x: b.x + dx, z: b.z, r: 0.32 });
    for (const t of layout.trees) mine.push({ x: t.x, z: t.z, r: 0.35, solid: true });
    for (const dx of [-0.6, 0, 0.6]) mine.push({ x: BENCH.x + dx, z: BENCH.z + 0.12, r: 0.3 });
    mine.push({ x: BENCH.x + 2.8, z: BENCH.z + 1.0, r: 0.2, solid: true });
    obstacles.push(...mine);
    return () => {
      // remove only our own entries; other props register their own
      for (const o of mine) {
        const i = obstacles.indexOf(o);
        if (i >= 0) obstacles.splice(i, 1);
      }
    };
  }, [layout]);
  return (
    <group>
      {layout.lamps.map((l, i) => (
        <Lamp key={i} {...l} />
      ))}
      {layout.benches.map((b, i) => (
        <Bench key={i} x={b.x} z={b.z} rotY={Math.PI} />
      ))}
      <Trees items={layout.trees} />
      <Bench x={BENCH.x} z={BENCH.z} rotY={BENCH.facing} scenic />
      <Lamp x={BENCH.x + 2.8} z={BENCH.z + 1.0} />
      <BeachDetails />
      <Gulls />
    </group>
  );
}

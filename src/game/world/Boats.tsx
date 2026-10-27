import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { WATER_LEVEL } from "../config/chapter";

/** Istanbul-style passenger ferry (vapur), ~55 m long, bow toward +X. */
function Ferry() {
  const white = <meshStandardMaterial color="#f2f0ea" roughness={0.6} />;
  return (
    <group>
      <mesh position={[0, 1.2, 0]}>
        <boxGeometry args={[52, 2.6, 11]} />
        <meshStandardMaterial color="#202326" roughness={0.6} />
      </mesh>
      <mesh position={[26.5, 1.4, 0]} rotation={[0, Math.PI / 4, 0]} scale={[1, 1, 1]}>
        <boxGeometry args={[7.8, 2.8, 7.8]} />
        <meshStandardMaterial color="#202326" roughness={0.6} />
      </mesh>
      <mesh position={[0, 4, 0]}>
        <boxGeometry args={[50, 3, 11.4]} />
        {white}
      </mesh>
      <mesh position={[0, 4.2, 0]}>
        <boxGeometry args={[46, 1.2, 11.6]} />
        <meshStandardMaterial color="#3a4148" roughness={0.3} metalness={0.2} />
      </mesh>
      <mesh position={[-2, 6.8, 0]}>
        <boxGeometry args={[36, 2.6, 10]} />
        {white}
      </mesh>
      <mesh position={[-2, 7, 0]}>
        <boxGeometry args={[33, 1, 10.2]} />
        <meshStandardMaterial color="#3a4148" roughness={0.3} />
      </mesh>
      <mesh position={[10, 9, 0]}>
        <boxGeometry args={[6, 2, 7]} />
        {white}
      </mesh>
      <mesh position={[-4, 10.5, 0]}>
        <cylinderGeometry args={[1.5, 1.7, 5, 14]} />
        <meshStandardMaterial color="#2a2c2e" roughness={0.6} />
      </mesh>
      <mesh position={[-4, 11.8, 0]}>
        <cylinderGeometry args={[1.55, 1.55, 0.8, 14]} />
        <meshStandardMaterial color="#c8a64c" roughness={0.6} />
      </mesh>
    </group>
  );
}

function SmallBoat({ color }: { color: string }) {
  return (
    <group>
      <mesh position={[0, 0.25, 0]} scale={[2.4, 0.5, 0.9]}>
        <sphereGeometry args={[1, 18, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <meshStandardMaterial color={color} roughness={0.7} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.27, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[2.35, 0.86, 1]}>
        <circleGeometry args={[1, 20]} />
        <meshStandardMaterial color="#8a6a4d" roughness={0.9} />
      </mesh>
      <mesh position={[-0.6, 0.8, 0]}>
        <boxGeometry args={[0.9, 0.9, 1]} />
        <meshStandardMaterial color="#f0ede6" roughness={0.8} />
      </mesh>
    </group>
  );
}

export function Boats() {
  const ferries = useMemo(
    () => [
      { z: -170, speed: 5.5, x0: -500, dir: 1 },
      { z: -310, speed: 4.2, x0: 300, dir: -1 },
      { z: -460, speed: 6, x0: -100, dir: 1 },
    ],
    [],
  );
  const refs = useRef<(THREE.Group | null)[]>([]);
  const small = useRef<(THREE.Group | null)[]>([]);
  const smallBoats = useMemo(
    () => [
      { x: -48, z: -26, c: "#2f6c8f" },
      { x: 30, z: -38, c: "#a8463b" },
      { x: -8, z: -60, c: "#e9e4d8" },
    ],
    [],
  );
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    ferries.forEach((f, i) => {
      const g = refs.current[i];
      if (!g) return;
      const span = 1800;
      let x = f.x0 + f.dir * f.speed * t;
      x = ((((x + span / 2) % span) + span) % span) - span / 2;
      g.position.set(x, WATER_LEVEL + Math.sin(t * 0.6 + i) * 0.08, f.z);
      g.rotation.set(
        Math.sin(t * 0.5 + i) * 0.006,
        f.dir > 0 ? 0 : Math.PI,
        Math.sin(t * 0.7 + i) * 0.008,
      );
    });
    smallBoats.forEach((b, i) => {
      const g = small.current[i];
      if (!g) return;
      g.position.set(
        b.x + Math.sin(t * 0.05 + i) * 2,
        WATER_LEVEL - 0.05 + Math.sin(t * 1.1 + i) * 0.06,
        b.z,
      );
      g.rotation.set(Math.sin(t * 0.9 + i) * 0.04, 0.4 + i, Math.sin(t * 1.2 + i) * 0.05);
    });
  });
  return (
    <group>
      {ferries.map((_, i) => (
        <group
          key={i}
          ref={(g) => {
            refs.current[i] = g;
          }}
        >
          <Ferry />
        </group>
      ))}
      {smallBoats.map((b, i) => (
        <group
          key={i}
          ref={(g) => {
            small.current[i] = g;
          }}
        >
          <SmallBoat color={b.c} />
        </group>
      ))}
    </group>
  );
}

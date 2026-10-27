import { Environment, Lightformer, Sky } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { runtime } from "../runtime";
import { waterUniforms } from "./Water";

/** Late-afternoon Bosphorus light: low warm sun over the water, cool sky fill, soft haze. */
export const SUN_DIR = new THREE.Vector3(-0.62, 0.24, -0.75).normalize();
const HAZE = "#d7d5cf";

export function Lighting({ shadows, shadowSize }: { shadows: boolean; shadowSize: number }) {
  const sun = useRef<THREE.DirectionalLight>(null);
  const scene = useThree((s) => s.scene);
  const fog = useMemo(() => new THREE.Fog(HAZE, 90, 1700), []);
  useEffect(() => {
    scene.fog = fog;
    waterUniforms.uFog.value.set(HAZE);
    waterUniforms.uSunDir.value.copy(SUN_DIR);
    return () => {
      scene.fog = null;
    };
  }, [scene, fog]);
  useFrame(() => {
    const l = sun.current;
    if (!l) return;
    const g = runtime.girl.pos;
    l.position.set(g.x + SUN_DIR.x * 60, g.y + SUN_DIR.y * 60 + 6, g.z + SUN_DIR.z * 60);
    l.target.position.copy(g);
    l.target.updateMatrixWorld();
  });
  return (
    <>
      <Sky
        distance={4500}
        sunPosition={[SUN_DIR.x, SUN_DIR.y, SUN_DIR.z]}
        turbidity={5.5}
        rayleigh={1.3}
        mieCoefficient={0.004}
        mieDirectionalG={0.86}
      />
      <Environment resolution={64} frames={1}>
        <Lightformer
          intensity={1.4}
          color="#cfe0ef"
          position={[0, 12, 0]}
          rotation-x={Math.PI / 2}
          scale={[40, 40, 1]}
        />
        <Lightformer intensity={2.2} color="#ffd9b0" position={[-30, 6, -36]} scale={[20, 6, 1]} />
        <Lightformer
          intensity={0.6}
          color="#e8dcc8"
          position={[0, 2, 30]}
          rotation-y={Math.PI}
          scale={[40, 4, 1]}
        />
      </Environment>
      <hemisphereLight args={["#c9d8e6", "#b59d7d", 0.55]} />
      <directionalLight
        ref={sun}
        color="#ffe0bd"
        intensity={2.6}
        castShadow={shadows}
        shadow-mapSize={[shadowSize, shadowSize]}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
        shadow-camera-near={1}
        shadow-camera-far={140}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
    </>
  );
}

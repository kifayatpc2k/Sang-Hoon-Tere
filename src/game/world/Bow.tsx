import { useMemo } from "react";
import * as THREE from "three";

/** Small satin ribbon bow (~9 cm wide). Origin at the knot; loops spread along X, faces +Z. */
export function PinkBow({ scale = 1 }: { scale?: number }) {
  const { mat, knotMat, loop, tail } = useMemo(() => {
    const mat = new THREE.MeshPhysicalMaterial({
      color: "#e9a3b8",
      roughness: 0.38,
      sheen: 1,
      sheenColor: new THREE.Color("#ffe4ec"),
      sheenRoughness: 0.35,
      side: THREE.DoubleSide,
    });
    const knotMat = new THREE.MeshPhysicalMaterial({
      color: "#dc8ea6",
      roughness: 0.42,
      sheen: 0.8,
      sheenColor: new THREE.Color("#ffd9e4"),
    });
    // a loop: flattened torus sector pinched at the knot
    const loop = new THREE.TorusGeometry(0.022, 0.0075, 10, 28);
    loop.scale(1.25, 0.8, 0.45);
    const tail = new THREE.BoxGeometry(0.012, 0.042, 0.003);
    tail.translate(0, -0.021, 0);
    return { mat, knotMat, loop, tail };
  }, []);
  return (
    <group scale={scale}>
      <mesh
        geometry={loop}
        material={mat}
        position={[-0.026, 0, 0]}
        rotation={[0, 0, 0.12]}
        castShadow
      />
      <mesh
        geometry={loop}
        material={mat}
        position={[0.026, 0, 0]}
        rotation={[0, 0, -0.12]}
        castShadow
      />
      <mesh material={knotMat} scale={[0.011, 0.012, 0.008]} position={[0, 0, 0.004]}>
        <sphereGeometry args={[1, 12, 10]} />
      </mesh>
      <mesh
        geometry={tail}
        material={mat}
        position={[-0.006, -0.006, 0]}
        rotation={[0, 0.2, -0.35]}
      />
      <mesh
        geometry={tail}
        material={mat}
        position={[0.006, -0.006, 0]}
        rotation={[0, -0.2, 0.35]}
      />
    </group>
  );
}

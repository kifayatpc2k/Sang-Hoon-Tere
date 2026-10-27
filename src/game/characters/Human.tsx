import { useFrame } from "@react-three/fiber";
import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Animator } from "./rig";
import { addFolds, fabricTexture, lathe, limb } from "./shapes";

export interface Look {
  height: number;
  skin: string;
  lips: string;
  iris: string;
  brows: string;
  top: string;
  topLong: boolean; // long tunic (girl) vs overshirt (boy)
  inner: string;
  trousers: string;
  shoes: string;
  hijab?: string;
  hair?: string;
  shoulder: number; // half shoulder width
}

export interface HumanHandle {
  lHand: THREE.Object3D;
  rHand: THREE.Object3D;
  head: THREE.Object3D;
  /** back/bag attachment point (model-based characters) */
  bag?: THREE.Object3D;
}

/**
 * Procedurally built human with a joint hierarchy driven by an Animator.
 * Built from smooth lathe surfaces at real-world scale (metres).
 */
export const Human = forwardRef<HumanHandle, { look: Look; anim: Animator; shadows: boolean }>(
  function Human({ look, anim, shadows }, ref) {
    const s = look.height / 1.68;
    const d = anim.d;
    const J = {
      hips: useRef<THREE.Group>(null),
      pelvis: useRef<THREE.Group>(null),
      chest: useRef<THREE.Group>(null),
      neck: useRef<THREE.Group>(null),
      head: useRef<THREE.Group>(null),
      lThigh: useRef<THREE.Group>(null),
      rThigh: useRef<THREE.Group>(null),
      lKnee: useRef<THREE.Group>(null),
      rKnee: useRef<THREE.Group>(null),
      lAnkle: useRef<THREE.Group>(null),
      rAnkle: useRef<THREE.Group>(null),
      lSh: useRef<THREE.Group>(null),
      rSh: useRef<THREE.Group>(null),
      lEl: useRef<THREE.Group>(null),
      rEl: useRef<THREE.Group>(null),
      lHand: useRef<THREE.Group>(null),
      rHand: useRef<THREE.Group>(null),
      lLid: useRef<THREE.Group>(null),
      rLid: useRef<THREE.Group>(null),
      breath: useRef<THREE.Group>(null),
    };
    useImperativeHandle(ref, () => ({
      lHand: J.lHand.current!,
      rHand: J.rHand.current!,
      head: J.head.current!,
    }));

    const geo = useMemo(() => {
      const sh = look.shoulder;
      const torso = lathe(
        [
          [0, 0.135],
          [0.1, 0.128],
          [0.2, 0.122],
          [0.3, 0.138],
          [0.4, sh * 0.82],
          [0.47, sh * 0.72],
          [0.52, 0.07],
          [0.535, 0.001],
        ].map(([y, r]) => [y! * s, r! * s] as [number, number]),
        24,
        26,
        0.62,
      );
      const tunic = look.topLong
        ? addFolds(
            lathe(
              [
                [0.04, 0.15],
                [-0.03, 0.19],
                [-0.12, 0.205],
                [-0.28, 0.235],
                [-0.44, 0.265],
              ].map(([y, r]) => [y! * s, r! * s] as [number, number]),
              32,
              20,
              0.78,
            ),
            9,
            0.05,
            0,
            -0.42 * s,
          )
        : lathe(
            [
              [0.02, 0.145],
              [-0.05, 0.15],
              [-0.11, 0.152],
            ].map(([y, r]) => [y! * s, r! * s] as [number, number]),
            28,
            8,
            0.7,
          );
      const thigh = limb(0.085 * s, 0.058 * s, d.thigh, 1);
      const shin = limb(0.056 * s, 0.04 * s, d.shin, 1);
      const upperArm = limb(0.041 * s, 0.034 * s, 0.27 * s);
      const foreArm = limb(0.036 * s, 0.027 * s, 0.24 * s);
      const neck = limb(0.048 * s, 0.052 * s, 0.09 * s);
      const head = new THREE.SphereGeometry(1, 32, 24);
      // shape the skull: narrower jaw, fuller cranium
      {
        const p = head.attributes["position"] as THREE.BufferAttribute;
        for (let i = 0; i < p.count; i++) {
          let x = p.getX(i);
          const y = p.getY(i);
          let z = p.getZ(i);
          const jaw = y < -0.1 ? 1 - (-0.1 - y) * 0.45 : 1;
          x *= jaw;
          z *= y < 0 ? 1 - -y * 0.08 : 1;
          if (z > 0.3 && y < 0.2 && y > -0.55) z *= 1.04; // face plane
          p.setXYZ(i, x * 0.082 * s, y * 0.112 * s, z * 0.098 * s);
        }
        head.computeVertexNormals();
      }
      const hijabCap = new THREE.SphereGeometry(
        1,
        36,
        24,
        Math.PI / 2 + 0.92,
        Math.PI * 2 - 1.84,
        0,
        Math.PI * 0.86,
      );
      hijabCap.scale(0.094 * s, 0.128 * s, 0.112 * s);
      const hijabTop = new THREE.SphereGeometry(1, 32, 12, 0, Math.PI * 2, 0, 0.95);
      hijabTop.scale(0.095 * s, 0.13 * s, 0.113 * s);
      const drape = addFolds(
        lathe(
          [
            [0.035, 0.06],
            [-0.01, 0.07],
            [-0.06, 0.115],
            [-0.12, 0.165],
            [-0.17, 0.182],
          ].map(([y, r]) => [y! * s, r! * s] as [number, number]),
          40,
          24,
          0.82,
        ),
        11,
        0.07,
        0,
        -0.17 * s,
      );
      const hair = new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.52);
      hair.scale(0.088 * s, 0.122 * s, 0.104 * s);
      const shoe = new THREE.SphereGeometry(1, 20, 12);
      shoe.scale(0.048 * s, 0.038 * s, 0.13 * s);
      const hand = new THREE.SphereGeometry(1, 16, 12);
      hand.scale(0.03 * s, 0.043 * s, 0.014 * s);
      const finger = limb(0.0075 * s, 0.006 * s, 0.038 * s);
      return {
        torso,
        tunic,
        thigh,
        shin,
        upperArm,
        foreArm,
        neck,
        head,
        hijabCap,
        hijabTop,
        drape,
        hair,
        shoe,
        hand,
        finger,
      };
    }, [look, s, d]);

    const mats = useMemo(() => {
      const skin = new THREE.MeshPhysicalMaterial({
        color: look.skin,
        roughness: 0.62,
        sheen: 0.25,
        sheenColor: new THREE.Color("#ffd9c4"),
        sheenRoughness: 0.6,
      });
      const cloth = (c: string, seed: number, sheen = 0.6) =>
        new THREE.MeshPhysicalMaterial({
          color: "#ffffff",
          map: fabricTexture(c, seed),
          roughness: 0.88,
          sheen,
          sheenColor: new THREE.Color(c).offsetHSL(0, 0, 0.2),
          side: THREE.DoubleSide,
        });
      return {
        skin,
        top: cloth(look.top, 3),
        inner: cloth(look.inner, 5),
        trousers: cloth(look.trousers, 7, 0.3),
        shoes: new THREE.MeshStandardMaterial({ color: look.shoes, roughness: 0.6 }),
        hijab: look.hijab ? cloth(look.hijab, 11, 1) : null,
        hair: look.hair
          ? new THREE.MeshPhysicalMaterial({
              color: look.hair,
              roughness: 0.5,
              sheen: 1,
              sheenColor: new THREE.Color(look.hair).offsetHSL(0, 0, 0.25),
            })
          : null,
        eyeWhite: new THREE.MeshPhysicalMaterial({
          color: "#f4efe9",
          roughness: 0.15,
          clearcoat: 1,
        }),
        iris: new THREE.MeshPhysicalMaterial({ color: look.iris, roughness: 0.2, clearcoat: 1 }),
        pupil: new THREE.MeshBasicMaterial({ color: "#0b0706" }),
        brows: new THREE.MeshStandardMaterial({ color: look.brows, roughness: 0.9 }),
        lips: new THREE.MeshPhysicalMaterial({ color: look.lips, roughness: 0.45, sheen: 0.5 }),
      };
    }, [look]);

    useFrame(() => {
      const p = anim.pose;
      const set = (r: React.RefObject<THREE.Group | null>, x: number, y = 0, z = 0) =>
        r.current?.rotation.set(x, y, z);
      if (J.hips.current) J.hips.current.position.y = d.legLen - p.hipDrop;
      set(J.pelvis, p.pelvisPitch, p.spineYaw * 0.4);
      set(J.chest, p.spinePitch, p.spineYaw * 0.6);
      set(J.neck, p.headPitch * 0.35, p.headYaw * 0.3);
      set(J.head, p.headPitch * 0.65, p.headYaw * 0.7);
      set(J.lThigh, p.lThigh, 0, p.lThighZ);
      set(J.rThigh, p.rThigh, 0, p.rThighZ);
      set(J.lKnee, p.lKnee);
      set(J.rKnee, p.rKnee);
      set(J.lAnkle, p.lAnkle);
      set(J.rAnkle, p.rAnkle);
      set(J.lSh, p.lShX, 0, p.lShZ);
      set(J.rSh, p.rShX, 0, p.rShZ);
      set(J.lEl, p.lElbow, 0, p.lElZ);
      set(J.rEl, p.rElbow, 0, p.rElZ);
      set(J.lHand, p.lHand * 0.5, 0, 0);
      set(J.rHand, p.rHand * 0.5, 0, 0);
      if (J.breath.current)
        J.breath.current.scale.set(1 + p.breath * 0.012, 1, 1 + p.breath * 0.02);
      const lid = 0.15 + anim.blink * 0.85;
      J.lLid.current?.scale.set(1, lid, 1);
      J.rLid.current?.scale.set(1, lid, 1);
    });

    const cs = shadows;
    const hipW = 0.088 * s;
    const shY = 0.39 * s;
    const shX = look.shoulder * s * 0.9;
    const eye = (side: 1 | -1, lid: React.RefObject<THREE.Group | null>) => (
      <group position={[side * 0.031 * s, 0.012 * s, 0.083 * s]}>
        <mesh material={mats.eyeWhite} scale={[0.0135 * s, 0.0108 * s, 0.008 * s]}>
          <sphereGeometry args={[1, 16, 12]} />
        </mesh>
        <mesh
          material={mats.iris}
          position={[0, 0, 0.0068 * s]}
          scale={[0.0075 * s, 0.0075 * s, 0.002 * s]}
        >
          <sphereGeometry args={[1, 16, 10]} />
        </mesh>
        <mesh
          material={mats.pupil}
          position={[0, 0, 0.0086 * s]}
          scale={[0.0031 * s, 0.0031 * s, 0.0008 * s]}
        >
          <sphereGeometry args={[1, 10, 8]} />
        </mesh>
        {/* upper eyelid (scales down to blink) */}
        <group ref={lid} position={[0, 0.0115 * s, 0.0012 * s]}>
          <mesh
            material={mats.skin}
            position={[0, -0.0115 * s, 0]}
            scale={[0.0143 * s, 0.0117 * s, 0.0092 * s]}
          >
            <sphereGeometry args={[1, 14, 10]} />
          </mesh>
        </group>
        <mesh
          material={mats.brows}
          position={[side * 0.002 * s, 0.022 * s, 0.004 * s]}
          rotation={[0, 0, side * -0.12]}
          scale={[0.016 * s, 0.0028 * s, 0.004 * s]}
        >
          <sphereGeometry args={[1, 10, 6]} />
        </mesh>
      </group>
    );
    const handMesh = (side: 1 | -1) => (
      <group rotation={[0, (side * Math.PI) / 2, 0]}>
        <mesh
          geometry={geo.hand}
          material={mats.skin}
          position={[0, -0.045 * s, 0]}
          castShadow={cs}
        />
        {[-1.5, -0.5, 0.5, 1.5].map((i) => (
          <group
            key={i}
            position={[i * 0.0135 * s * side, -0.078 * s, 0.003 * s]}
            rotation={[-0.55, 0, 0]}
          >
            <mesh geometry={geo.finger} material={mats.skin} scale={[1, i === 1.5 ? 0.8 : 1, 1]} />
          </group>
        ))}
        <group position={[side * 0.03 * s, -0.035 * s, 0.01 * s]} rotation={[-0.5, 0, side * 0.7]}>
          <mesh geometry={geo.finger} material={mats.skin} scale={[1.15, 0.85, 1.15]} />
        </group>
      </group>
    );
    const leg = (side: 1 | -1) => {
      const thigh = side === 1 ? J.lThigh : J.rThigh;
      const knee = side === 1 ? J.lKnee : J.rKnee;
      const ankle = side === 1 ? J.lAnkle : J.rAnkle;
      return (
        <group ref={thigh} position={[side * hipW, 0, 0]}>
          <mesh
            geometry={geo.thigh}
            material={mats.trousers}
            castShadow={cs}
            scale={look.topLong ? [0.98, 1, 0.98] : [1.05, 1, 1.05]}
          />
          <group ref={knee} position={[0, -d.thigh, 0]}>
            <mesh
              geometry={geo.shin}
              material={mats.trousers}
              castShadow={cs}
              scale={look.topLong ? [1.35, 1, 1.35] : [1.12, 1, 1.12]}
            />
            <group ref={ankle} position={[0, -d.shin, 0]}>
              <mesh
                geometry={geo.shoe}
                material={mats.shoes}
                position={[0, -d.ankle * 0.55, 0.045 * s]}
                castShadow={cs}
              />
              <mesh
                material={mats.shoes}
                position={[0, -d.ankle * 0.92, 0.045 * s]}
                scale={[0.05 * s, 0.008 * s, 0.135 * s]}
              >
                <sphereGeometry args={[1, 16, 8]} />
              </mesh>
            </group>
          </group>
        </group>
      );
    };
    const arm = (side: 1 | -1) => {
      const shR = side === 1 ? J.lSh : J.rSh;
      const el = side === 1 ? J.lEl : J.rEl;
      const hand = side === 1 ? J.lHand : J.rHand;
      return (
        <group ref={shR} position={[side * shX, shY, 0]}>
          <mesh
            geometry={geo.upperArm}
            material={mats.top}
            castShadow={cs}
            scale={[1.08, 1, 1.08]}
          />
          <group ref={el} position={[0, -0.27 * s, 0]}>
            <mesh
              geometry={geo.foreArm}
              material={look.topLong ? mats.top : mats.top}
              castShadow={cs}
              scale={[1.12, 0.94, 1.12]}
            />
            <group ref={hand} position={[0, -0.245 * s, 0]}>
              {handMesh(side)}
            </group>
          </group>
        </group>
      );
    };

    return (
      <group>
        <group ref={J.hips}>
          {leg(1)}
          {leg(-1)}
          <group ref={J.pelvis}>
            <mesh
              geometry={geo.tunic}
              material={look.topLong ? mats.top : mats.trousers}
              castShadow={cs}
            />
            <group ref={J.breath}>
              <mesh geometry={geo.torso} material={mats.top} castShadow={cs} />
              {!look.topLong && (
                <mesh
                  material={mats.inner}
                  position={[0, 0.455 * s, 0.062 * s]}
                  scale={[0.045 * s, 0.04 * s, 0.018 * s]}
                >
                  <sphereGeometry args={[1, 12, 8]} />
                </mesh>
              )}
            </group>
            <group ref={J.chest} position={[0, 0.06 * s, 0]}>
              {arm(1)}
              {arm(-1)}
              {look.hijab && (
                <mesh
                  geometry={geo.drape}
                  material={mats.hijab!}
                  position={[0, 0.48 * s, 0.005]}
                  castShadow={cs}
                />
              )}
              <group ref={J.neck} position={[0, 0.455 * s, 0]}>
                <mesh geometry={geo.neck} material={mats.skin} rotation={[Math.PI, 0, 0]} />
                <group ref={J.head} position={[0, 0.13 * s, 0.008 * s]}>
                  <mesh geometry={geo.head} material={mats.skin} castShadow={cs} />
                  {eye(1, J.lLid)}
                  {eye(-1, J.rLid)}
                  {/* nose */}
                  <mesh
                    material={mats.skin}
                    position={[0, -0.014 * s, 0.093 * s]}
                    rotation={[0.3, 0, 0]}
                    scale={[0.0085 * s, 0.02 * s, 0.01 * s]}
                  >
                    <sphereGeometry args={[1, 12, 10]} />
                  </mesh>
                  <mesh
                    material={mats.skin}
                    position={[0, -0.031 * s, 0.096 * s]}
                    scale={[0.0115 * s, 0.0068 * s, 0.0072 * s]}
                  >
                    <sphereGeometry args={[1, 12, 8]} />
                  </mesh>
                  {/* lips */}
                  <mesh
                    material={mats.lips}
                    position={[0, -0.053 * s, 0.087 * s]}
                    scale={[0.0165 * s, 0.0042 * s, 0.006 * s]}
                  >
                    <sphereGeometry args={[1, 14, 8]} />
                  </mesh>
                  <mesh
                    material={mats.lips}
                    position={[0, -0.0595 * s, 0.0855 * s]}
                    scale={[0.0145 * s, 0.0045 * s, 0.006 * s]}
                  >
                    <sphereGeometry args={[1, 14, 8]} />
                  </mesh>
                  {!look.hijab && (
                    <>
                      {[1, -1].map((e) => (
                        <mesh
                          key={e}
                          material={mats.skin}
                          position={[e * 0.081 * s, 0, -0.005 * s]}
                          scale={[0.012 * s, 0.026 * s, 0.018 * s]}
                        >
                          <sphereGeometry args={[1, 10, 8]} />
                        </mesh>
                      ))}
                    </>
                  )}
                  {look.hijab && (
                    <>
                      <mesh
                        geometry={geo.hijabCap}
                        material={mats.hijab!}
                        position={[0, 0.006 * s, -0.006 * s]}
                        castShadow={cs}
                      />
                      <mesh
                        geometry={geo.hijabTop}
                        material={mats.hijab!}
                        position={[0, 0.006 * s, -0.004 * s]}
                      />
                    </>
                  )}
                  {look.hair && (
                    <>
                      <mesh
                        geometry={geo.hair}
                        material={mats.hair!}
                        position={[0, 0.018 * s, -0.008 * s]}
                        rotation={[-0.25, 0, 0]}
                        castShadow={cs}
                      />
                      <mesh
                        material={mats.hair!}
                        position={[0, 0.07 * s, 0.05 * s]}
                        rotation={[0.5, 0, 0]}
                        scale={[0.07 * s, 0.025 * s, 0.05 * s]}
                      >
                        <sphereGeometry args={[1, 16, 10]} />
                      </mesh>
                    </>
                  )}
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
    );
  },
);

export const girlLook: Look = {
  height: 1.63,
  skin: "#e2b89c",
  lips: "#b86f68",
  iris: "#4a2f1d",
  brows: "#2c1d15",
  top: "#e9dfcf",
  topLong: true,
  inner: "#e9dfcf",
  trousers: "#3a4256",
  shoes: "#f1eee8",
  hijab: "#b9857f",
  shoulder: 0.168,
};

export const boyLook: Look = {
  height: 1.76,
  skin: "#cf9f80",
  lips: "#a5675c",
  iris: "#3b2a1c",
  brows: "#2a1c14",
  top: "#7d8f9c",
  topLong: false,
  inner: "#f2efe8",
  trousers: "#2f3a4d",
  shoes: "#ecebe6",
  hair: "#2b1d15",
  shoulder: 0.19,
};

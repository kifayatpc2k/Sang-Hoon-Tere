import { useAnimations, useGLTF } from "@react-three/drei";
import { createPortal, useFrame } from "@react-three/fiber";
import {
  Component,
  forwardRef,
  use,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from "react";
import * as THREE from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import {
  CHEST_BONE,
  HEAD_BONE,
  HUMAN_CLIP_ALIASES,
  type HumanAsset,
  type HumanClip,
} from "../config/characters";
import { runtime, type Agent } from "../runtime";
import { useGame } from "../state/store";
import { findClip, findNode, fitModel, resolveAsset } from "./assets";
import type { HumanHandle } from "./Human";
import type { Animator } from "./rig";

const FADE = 0.35;

/** Story/controller state -> logical clip. Knows nothing about any specific model file. */
function pickClip(anim: Animator, speed: number): HumanClip {
  if (anim.body === "sit") return "sit";
  if (anim.body === "crouch")
    return anim.gesture === "pet" || anim.gesture === "offer" ? "interact" : "crouch";
  if (speed > 2.7) return "run";
  if (speed > 0.18) return anim.gesture === "hold" ? "hold" : "walk";
  switch (anim.gesture) {
    case "hold":
      return "hold";
    case "offer":
    case "pet":
      return "interact";
    case "invite":
    case "wave":
      return "nod";
    default:
      return "idle";
  }
}
/** When a model lacks a clip, use the nearest one it has. */
const CLIP_FALLBACK: Record<HumanClip, HumanClip[]> = {
  idle: ["walk"],
  walk: ["idle"],
  run: ["walk", "idle"],
  sit: ["crouch", "idle", "walk"],
  crouch: ["sit", "idle", "walk"],
  hold: ["idle", "walk"],
  interact: ["nod", "idle", "walk"],
  nod: ["idle", "walk"],
};

/** Soft fabric hijab built around the head bone (only for models without their own). */
function Hijab({
  size,
  color,
  trim,
  shadows,
}: {
  size: THREE.Vector3;
  color: string;
  trim: string;
  shadows: boolean;
}) {
  const mats = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.92, side: THREE.DoubleSide });
    const t = new THREE.MeshStandardMaterial({
      color: trim,
      roughness: 0.9,
      side: THREE.DoubleSide,
    });
    return { m, t };
  }, [color, trim]);
  const r = Math.max(size.x, size.z) * 0.56;
  const hood = useMemo(() => {
    const g = new THREE.SphereGeometry(
      1,
      40,
      28,
      Math.PI * 0.5 + 0.95,
      Math.PI * 2 - 1.9,
      0,
      Math.PI * 0.82,
    );
    return g;
  }, []);
  const drape = useMemo(() => {
    const pts = [
      new THREE.Vector2(0.7, 0.2),
      new THREE.Vector2(0.74, 0.0),
      new THREE.Vector2(0.8, -0.3),
      new THREE.Vector2(0.84, -0.55),
    ];
    const g = new THREE.LatheGeometry(pts, 40);
    const p = g.attributes["position"] as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const a = Math.atan2(p.getZ(i), p.getX(i));
      const k = 1 + Math.sin(a * 9) * 0.035 * Math.max(0, -p.getY(i));
      p.setX(i, p.getX(i) * k);
      p.setZ(i, p.getZ(i) * k);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <group>
      <mesh
        geometry={hood}
        material={mats.m}
        position={[0, size.y * 0.06, -r * 0.1]}
        scale={[r * 1.12, size.y * 0.7, r * 1.26]}
        castShadow={shadows}
      />
      <mesh
        material={mats.t}
        position={[0, size.y * 0.02, r * 0.62]}
        rotation-x={0.12}
        scale={[r * 0.98, size.y * 0.62, 1]}
      >
        <torusGeometry args={[0.78, 0.035, 8, 40, Math.PI * 1.25]} />
      </mesh>
      <mesh
        geometry={drape}
        material={mats.m}
        position={[0, -size.y * 0.36, -r * 0.08]}
        scale={[r * 0.8, size.y * 0.36, r * 0.78]}
        castShadow={shadows}
      />
    </group>
  );
}

interface BodyProps {
  url: string;
  asset: HumanAsset;
  hijab: boolean;
  anim: Animator;
  agent: Agent;
  shadows: boolean;
  handle: Ref<HumanHandle>;
  bagChild?: ReactNode;
}

function Body({ url, asset, hijab, anim, agent, shadows, handle, bagChild }: BodyProps) {
  const gltf = useGLTF(url);
  // In-place clips: drop horizontal root motion on the hips (Mixamo exports often keep it).
  const clips = useMemo(() => {
    // Hips translation is often in different units than the skeleton and carries root motion; the
    // game moves the character itself. Standing clips drop it; sit clips keep only the vertical drop,
    // rescaled to skeleton units using a standing clip's hip height as the reference.
    let bindHips: THREE.Object3D | undefined;
    gltf.scene.traverse((o) => {
      if (!bindHips && /hips$/i.test(o.name)) bindHips = o;
    });
    const hipsTrack = (c: THREE.AnimationClip) =>
      c.tracks.find((t) => /hips\.position$/i.test(t.name));
    const ref = gltf.animations.find((c) => /idle|walk/i.test(c.name) && hipsTrack(c));
    const refY = ref ? hipsTrack(ref)!.values[1] : 0;
    return gltf.animations.map((c) => {
      const k = c.clone();
      const ht = hipsTrack(k);
      const isSit = /sit/i.test(k.name);
      k.tracks = k.tracks.filter((t) => t !== ht);
      if (isSit && ht && bindHips && refY) {
        const b = bindHips.position;
        // rigs differ in what units the hips tracks use; the manifest can override
        // (boy: tracks already in metres with hips height on a root node)
        const unit = asset.sitUnit ?? b.y / refY;
        const v = ht.values.slice();
        for (let i = 0; i < v.length; i += 3) {
          v[i] = b.x;
          v[i + 1] = b.y + ((v[i + 1] ?? refY) - refY) * unit;
          v[i + 2] = b.z;
        }
        k.tracks.push(new THREE.VectorKeyframeTrack(ht.name, Array.from(ht.times), Array.from(v)));
      }
      // a lone unnamed clip (e.g. "mixamo_com") is treated as the walk
      if (gltf.animations.length === 1 && !/idle|walk|run|sit/i.test(k.name)) k.name = "Walk";
      return k;
    });
  }, [gltf]);
  const rig = useMemo(() => {
    const scene = cloneSkinned(gltf.scene) as THREE.Group;
    const extras: THREE.Object3D[] = [];
    scene.traverse((o) => {
      if ((o as THREE.Light).isLight || (o as THREE.Camera).isCamera) extras.push(o);
    });
    extras.forEach((o) => o.removeFromParent());
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = shadows;
        m.receiveShadow = true;
        m.frustumCulled = false; // skinned bounds don't follow animation
      }
    });
    const fit = fitModel(scene, asset.height, "height");
    const head = findNode(scene, HEAD_BONE) ?? scene;
    const chest = findNode(scene, CHEST_BONE) ?? scene;
    const hips = findNode(scene, [/hips$/i, /pelvis$/i]);
    // Which way the model actually faces: foot -> toe in bind pose. The game expects +Z.
    // Mixamo/FBX exports sometimes carry a 180° root rotation, which made the boy walk/sit backwards.
    const foot = findNode(scene, [/leftfoot$/i, /foot[._]?l$/i]);
    const toe = findNode(scene, [/lefttoebase$/i, /toe(base)?[._]?l$/i]);
    let yawFix = 0;
    const fwd = new THREE.Vector3(0, 0, 1);
    if (foot && toe) {
      const d = toe
        .getWorldPosition(new THREE.Vector3())
        .sub(foot.getWorldPosition(new THREE.Vector3()));
      const a = Math.atan2(d.x, d.z);
      const snapped = Math.round(a / (Math.PI / 2)) * (Math.PI / 2);
      yawFix = -snapped;
      fwd.set(Math.sin(snapped), 0, Math.cos(snapped));
    }
    // head size: use a mesh named like "head" if present, else a proportion of height
    const headWorld = head.getWorldPosition(new THREE.Vector3());
    let headSize = new THREE.Vector3().setScalar(fit.size.y / 7.5);
    let headCenter = headWorld.clone().add(new THREE.Vector3(0, headSize.y * 0.3, 0));
    scene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh && /head/i.test(o.name)) {
        const hb = new THREE.Box3().setFromObject(o);
        headSize = hb.getSize(new THREE.Vector3());
        headCenter = hb.getCenter(new THREE.Vector3());
      }
    });
    // offsets into bone space (bind pose), using the model's real forward
    const hijabOffset = head.worldToLocal(headCenter.clone());
    const holdAnchor = new THREE.Object3D();
    const chestWorld = chest.getWorldPosition(new THREE.Vector3());
    holdAnchor.position.copy(
      chest.worldToLocal(
        chestWorld
          .clone()
          .addScaledVector(fwd, fit.size.y * 0.13)
          .add(new THREE.Vector3(0, fit.size.y * 0.08, 0)),
      ),
    );
    chest.add(holdAnchor);
    // bag / back attachment: on the outer face of a backpack (measured ~0.14 of height behind the chest bone)
    const bagAnchor = new THREE.Object3D();
    const bagWorld = chestWorld
      .clone()
      .addScaledVector(fwd, -fit.size.y * 0.15)
      .add(new THREE.Vector3(0, -fit.size.y * 0.135, 0));
    bagAnchor.position.copy(chest.worldToLocal(bagWorld.clone()));
    // orient so the anchor's +Z points out of the back (bow faces away from her)
    const chestQ = chest.getWorldQuaternion(new THREE.Quaternion());
    bagAnchor.quaternion
      .copy(chestQ.invert())
      .multiply(
        new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          Math.atan2(-fwd.x, -fwd.z),
        ),
      );
    bagAnchor.scale.setScalar(1 / fit.scale / chest.getWorldScale(new THREE.Vector3()).x);
    chest.add(bagAnchor);
    const eye = (headWorld.y - fit.box.min.y + headSize.y * 0.35) * fit.scale;
    const names = clips.map((a) => a.name);
    const clipMap = {} as Record<HumanClip, string | null>;
    (Object.keys(HUMAN_CLIP_ALIASES) as HumanClip[]).forEach(
      (k) => (clipMap[k] = findClip(names, HUMAN_CLIP_ALIASES, k)),
    );
    return {
      scene,
      fit,
      head,
      hips,
      headSize,
      hijabOffset,
      holdAnchor,
      bagAnchor,
      eye,
      clipMap,
      yawFix,
    };
  }, [gltf, clips, asset.height, shadows]);

  const root = useRef<THREE.Group>(null);
  const seatG = useRef<THREE.Group>(null);
  const { actions } = useAnimations(clips, root);
  const current = useRef<string>("");
  const gaze = useRef({
    base: new THREE.Quaternion(),
    after: new THREE.Quaternion(),
    valid: false,
  });

  useImperativeHandle(
    handle,
    () => ({ lHand: rig.holdAnchor, rHand: rig.holdAnchor, head: rig.head, bag: rig.bagAnchor }),
    [rig],
  );

  useEffect(() => {
    if (asset.id === "girl") {
      runtime.frame.girlEye = rig.eye;
      runtime.frame.girlHeight = asset.height;
    }
    return () => Object.values(actions).forEach((a) => a?.stop());
  }, [actions, rig, asset]);

  useFrame(() => {
    const speed = agent.speed;
    const want = pickClip(anim, speed);
    let name = rig.clipMap[want];
    for (const alt of CLIP_FALLBACK[want]) if (!name) name = rig.clipMap[alt];
    // an action stopped by a re-render (e.g. a model with a single looping clip) must be restarted
    const stale =
      name &&
      name === current.current &&
      !actions[name]?.isRunning() &&
      !actions[name]?.clampWhenFinished;
    if (name && (name !== current.current || stale)) {
      const next = actions[name];
      if (next) {
        next.reset().setEffectiveWeight(1).fadeIn(FADE).play();
        if (want === "sit" || want === "crouch") {
          next.setLoop(THREE.LoopOnce, 1);
          next.clampWhenFinished = true;
        }
        if (current.current !== name) actions[current.current]?.fadeOut(FADE);
        current.current = name;
      }
    }
    const a = actions[current.current];
    if (!a) return;
    if (want === "walk" || want === "hold")
      a.timeScale = speed > 0.18 ? THREE.MathUtils.clamp(speed / asset.walkSpeed, 0.5, 1.8) : 1;
    else if (want === "run")
      a.timeScale = THREE.MathUtils.clamp(speed / (asset.walkSpeed * 2.4), 0.6, 1.6);
    else if (current.current === rig.clipMap.walk && !rig.clipMap.idle) {
      // walk-only model standing still: hold a calm mid-stance frame
      a.timeScale = 0;
      a.time = 0;
    } else a.timeScale = 1;
  });

  const tmp = useMemo(() => ({ v: new THREE.Vector3(), target: new THREE.Vector3() }), []);
  // after the mixer writes the pose: gaze offset + seat fitting
  useFrame((_, dt) => {
    // Gaze is an offset on top of the animated head. If the mixer didn't rewrite the head this frame
    // (e.g. a clamped one-shot sit), restore the un-offset pose first so rotation never accumulates.
    const g = gaze.current;
    const q = rig.head.quaternion;
    if (g.valid && q.equals(g.after)) q.copy(g.base);
    g.base.copy(q);
    const yaw = THREE.MathUtils.clamp(anim.lookYaw * 0.8, -0.75, 0.75);
    const pitch = THREE.MathUtils.clamp(anim.lookPitch * 0.8, -0.4, 0.45);
    rig.head.rotation.y += yaw;
    rig.head.rotation.x += pitch;
    g.after.copy(q);
    g.valid = true;

    // Seat fitting: when sitting, place the hips just above the seat surface using the actual
    // seated pose (the root origin is at the feet, not the hips), instead of a fixed drop.
    const sg = seatG.current;
    if (!sg || !sg.parent) return;
    tmp.target.set(0, 0, 0);
    if (anim.body === "sit" && rig.hips) {
      rig.hips.getWorldPosition(tmp.v);
      sg.parent.worldToLocal(tmp.v);
      tmp.v.sub(sg.position); // hips without our own correction, in the character frame
      const hipAboveSeat = 0.1 * (asset.height / 1.7);
      tmp.target.set(
        0,
        anim.seatH + hipAboveSeat - rig.fit.groundOffset - tmp.v.y,
        THREE.MathUtils.clamp(-tmp.v.z - 0.02, -0.3, 0.3),
      );
    }
    sg.position.lerp(tmp.target, 1 - Math.exp(-8 * Math.min(dt, 0.1)));
  }, 1);

  return (
    <group position-y={rig.fit.groundOffset}>
      <group ref={seatG}>
        <group rotation-y={rig.yawFix}>
          <group ref={root} scale={rig.fit.scale}>
            <primitive object={rig.scene} />
            {hijab &&
              asset.hijab &&
              createPortal(
                <group position={rig.hijabOffset}>
                  <Hijab
                    size={rig.headSize}
                    color={asset.hijab.color}
                    trim={asset.hijab.trim}
                    shadows={shadows}
                  />
                </group>,
                rig.head,
              )}
            {bagChild && createPortal(<>{bagChild}</>, rig.bagAnchor)}
          </group>
        </group>
      </group>
    </group>
  );
}

/** Catches a realistic model that exists but fails to parse, and reports it before using the fallback. */
class LoadBoundary extends Component<
  { onFail: (e: Error) => void; children: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch(e: Error) {
    this.props.onFail(e);
  }
  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

export const ModelHuman = forwardRef<
  HumanHandle,
  { asset: HumanAsset; anim: Animator; agent: Agent; shadows: boolean; bagChild?: ReactNode }
>(function ModelHuman({ asset, anim, agent, shadows, bagChild }, ref) {
  const resolved = use(resolveAsset(asset.id, asset.primary, asset.fallback));
  const [failed, setFailed] = useState(false);
  const usingFallback = failed || resolved.source.quality !== "realistic";
  const url = usingFallback ? asset.fallback.url : resolved.source.url;
  const body = (
    <Body
      key={url}
      url={url}
      asset={asset}
      hijab={usingFallback && asset.addHijabOnFallback}
      anim={anim}
      agent={agent}
      shadows={shadows}
      handle={ref}
      bagChild={bagChild}
    />
  );
  if (usingFallback) return body;
  return (
    <LoadBoundary
      onFail={(e) => {
        console.error(`[characters] ${asset.primary.url} failed to load:`, e);
        useGame.getState().setAssetStatus(asset.id, "stylised-fallback", "failed");
        setFailed(true);
      }}
    >
      {body}
    </LoadBoundary>
  );
});

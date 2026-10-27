import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Component, use, useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { CAT_CLIP_ALIASES, type CatAsset, type CatClip } from "../config/characters";
import { useGame } from "../state/store";
import { findClip, fitModel, resolveAsset } from "./assets";
import type { CatAnimator } from "./Cat";

const FADE = 0.3;

function CatBody({
  url,
  asset,
  anim,
  shadows,
}: {
  url: string;
  asset: CatAsset;
  anim: CatAnimator;
  shadows: boolean;
}) {
  const gltf = useGLTF(url);
  const rig = useMemo(() => {
    const scene = gltf.scene.clone(true);
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = shadows;
        m.receiveShadow = true;
        m.frustumCulled = false;
      }
    });
    const fit = fitModel(scene, asset.length, "length");
    const names = gltf.animations.map((a) => a.name);
    const clips = {} as Record<CatClip, string | null>;
    (Object.keys(CAT_CLIP_ALIASES) as CatClip[]).forEach(
      (k) => (clips[k] = findClip(names, CAT_CLIP_ALIASES, k)),
    );
    return { scene, fit, clips };
  }, [gltf, asset.length, shadows]);
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const { actions } = useAnimations(gltf.animations, root);
  const current = useRef("");

  useFrame((_, dt) => {
    const c = rig.clips;
    const want: CatClip =
      anim.mode === "stand"
        ? anim.speed > 1.6
          ? "run"
          : anim.speed > 0.08
            ? "walk"
            : "idle"
        : anim.mode === "lie"
          ? "lie"
          : anim.mode === "sit"
            ? "sit"
            : "idle";
    const name =
      c[want] ?? (want === "lie" ? c.sit : null) ?? (want === "run" ? c.walk : null) ?? c.idle;
    if (name && name !== current.current && actions[name]) {
      actions[name]!.reset().fadeIn(FADE).play();
      actions[current.current]?.fadeOut(FADE);
      current.current = name;
    }
    const a = actions[current.current];
    if (a)
      a.timeScale =
        want === "walk"
          ? THREE.MathUtils.clamp(anim.speed / 0.5, 0.5, 2)
          : want === "run"
            ? anim.speed / 2.4
            : 0.8;
    // models without sit/lie clips settle lower instead
    const b = body.current;
    if (b) {
      const k = 1 - Math.exp(-6 * Math.min(dt, 0.1));
      const sy = (c.sit ? 1 : 1 - anim.wSit * 0.12) - (c.lie ? 0 : anim.wLie * 0.3);
      b.scale.y += (sy - b.scale.y) * k;
      b.rotation.y += (anim.lookYaw * 0.5 - b.rotation.y) * k;
    }
  });

  return (
    <group ref={body}>
      <group position-y={rig.fit.groundOffset}>
        <group ref={root} scale={rig.fit.scale}>
          <primitive object={rig.scene} />
        </group>
      </group>
    </group>
  );
}

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

/** Kitten model resolved from the asset manifest, driven by CatAnimator state. */
export function ModelCat({
  asset,
  anim,
  shadows,
}: {
  asset: CatAsset;
  anim: CatAnimator;
  shadows: boolean;
}) {
  const resolved = use(resolveAsset(asset.id, asset.primary, asset.fallback));
  const [failed, setFailed] = useState(false);
  const fallback = failed || resolved.source.quality !== "realistic";
  const url = fallback ? asset.fallback.url : resolved.source.url;
  const b = <CatBody key={url} url={url} asset={asset} anim={anim} shadows={shadows} />;
  if (fallback) return b;
  return (
    <LoadBoundary
      onFail={(e) => {
        console.error(`[characters] ${asset.primary.url} failed to load:`, e);
        useGame.getState().setAssetStatus(asset.id, "stylised-fallback", "failed");
        setFailed(true);
      }}
    >
      {b}
    </LoadBoundary>
  );
}

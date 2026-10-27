import { DepthOfField, EffectComposer, Vignette } from "@react-three/postprocessing";
import { Canvas, useFrame } from "@react-three/fiber";
import { Component, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { audio } from "./audio/audio";
import { CameraRig, cameraState } from "./camera/CameraRig";
import { Cast } from "./characters/Cast";
import { GAME_CONTENT } from "./config/gameContent";
import { AirplaneBanner } from "./features/airplaneBanner/AirplaneBanner";
import { useInput } from "./input/useInput";
import { runtime } from "./runtime";
import { useGame } from "./state/store";
import { Hud } from "./ui/Hud";
import { Beach } from "./world/Beach";
import { Boats } from "./world/Boats";
import { Lighting } from "./world/Lighting";
import { Props } from "./world/Props";
import { Parlour } from "./world/Parlour";
import { FlowerShop } from "./world/FlowerShop";
import { Skyline } from "./world/Skyline";
import { Water } from "./world/Water";

const presets = {
  low: { dpr: 0.8, shadows: false, shadowSize: 512, beach: 80, water: 60, post: false },
  medium: { dpr: 1.25, shadows: true, shadowSize: 1024, beach: 140, water: 110, post: true },
  high: { dpr: 2, shadows: true, shadowSize: 2048, beach: 200, water: 160, post: true },
};

function ReadySignal() {
  const frames = useRef(0);
  useFrame(() => {
    if (++frames.current === 10) useGame.getState().dispatch("ASSETS_READY");
  });
  return null;
}

function Post() {
  const narrative = useGame((s) => s.narrative);
  const ending = narrative === "sitting" || narrative === "ended";
  return (
    <EffectComposer multisampling={0}>
      {ending ? (
        <DepthOfField
          focusDistance={0}
          worldFocusDistance={cameraState.focusDistance}
          worldFocusRange={6}
          bokehScale={2.2}
        />
      ) : (
        <></>
      )}
      <Vignette eskil={false} offset={0.25} darkness={0.35} />
    </EffectComposer>
  );
}

/** The airplane banner only exists during the final bench scene, and only when enabled. */
function FinaleSky() {
  const narrative = useGame((s) => s.narrative);
  if (!GAME_CONTENT.airplaneBanner.enabled) return null;
  if (narrative !== "sitting" && narrative !== "ended") return null;
  return <AirplaneBanner />;
}

function World() {
  const quality = useGame((s) => s.settings.quality);
  const q = presets[quality];
  return (
    <>
      <Lighting shadows={q.shadows} shadowSize={q.shadowSize} />
      <Water segments={q.water} />
      <Beach segments={q.beach} />
      <Skyline />
      <Boats />
      <Props />
      <Parlour />
      <FlowerShop />
      <Cast shadows={q.shadows} />
      <FinaleSky />
      <CameraRig />
      <ReadySignal />
      {q.post && <Post />}
    </>
  );
}

class SceneBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  override state = { error: null as string | null };
  static getDerivedStateFromError(e: Error) {
    return { error: e.message };
  }
  override render() {
    if (this.state.error)
      return (
        <div className="screen-cover">
          <div className="panel max-w-md text-center">
            <h2 className="font-display text-3xl">{GAME_CONTENT.errors.sceneLoadTitle}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {GAME_CONTENT.errors.sceneLoadBody}
            </p>
            <button className="btn-primary mt-5" onClick={() => location.reload()}>
              {GAME_CONTENT.errors.tryAgain}
            </button>
          </div>
        </div>
      );
    return this.props.children;
  }
}

export default function Game() {
  const quality = useGame((s) => s.settings.quality);
  const settings = useGame((s) => s.settings);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  useInput(canvas);

  useEffect(() => {
    useGame.getState().setTouch(window.matchMedia("(pointer: coarse)").matches);
    if (import.meta.env.DEV)
      (window as unknown as Record<string, unknown>)["__game"] = {
        runtime,
        useGame,
        cameraState,
        audio,
      };
    // browsers only allow audio after a gesture
    const start = () => {
      audio.start();
      const st = useGame.getState().settings;
      audio.setVolumes(st.masterVolume, st.musicVolume, st.soundOn);
    };
    window.addEventListener("pointerdown", start, { once: true });
    window.addEventListener("keydown", start, { once: true });
    return () => {
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
      audio.stop();
    };
  }, []);

  useEffect(() => {
    audio.setVolumes(settings.masterVolume, settings.musicVolume, settings.soundOn);
  }, [settings.masterVolume, settings.musicVolume, settings.soundOn]);

  return (
    <div className="game-root">
      <SceneBoundary>
        <Canvas
          className="game-canvas"
          shadows={{ type: THREE.PCFSoftShadowMap }}
          dpr={[0.6, presets[quality].dpr]}
          camera={{ fov: settings.fov, near: 0.05, far: 5000, position: [-34, 9, -26] }}
          gl={{ antialias: quality !== "low", powerPreference: "high-performance" }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 0.78;
            runtime.gl = gl;
            setCanvas(gl.domElement);
          }}
        >
          <Suspense fallback={null}>
            <World />
          </Suspense>
        </Canvas>
      </SceneBoundary>
      <Hud />
    </div>
  );
}

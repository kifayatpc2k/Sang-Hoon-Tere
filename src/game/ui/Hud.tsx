import { Maximize, Minimize, RotateCcw, Settings, Volume2, VolumeX, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { audio } from "../audio/audio";
import { cameraState } from "../camera/CameraRig";
import { GAME_AUDIO } from "../config/audioTracks";
import { FLAVOURS } from "../config/chapter";
import { GAME_CONTENT, text } from "../config/gameContent";
import { CinematicPlayer } from "../features/cinematics/CinematicPlayer";
import { DialoguePlayer } from "../features/dialogue/DialoguePlayer";
import { MusicSelect } from "../features/audio/MusicSelect";
import { DIALOGUE_END } from "../narrative/dialogue";
import { isPlayable } from "../narrative/machine";
import { resetWorld } from "../runtime";
import { stateTime, useGame, type Quality } from "../state/store";
import { TouchControls } from "./TouchControls";

const C = GAME_CONTENT;

export function Hud() {
  const narrative = useGame((s) => s.narrative);
  const panel = useGame((s) => s.panel);
  const isTouch = useGame((s) => s.isTouch);
  return (
    <div className="overlay-layer">
      {narrative === "loading" && <Loading />}
      {narrative === "intro" && <IntroTitle />}
      {narrative !== "loading" && <TopControls />}
      {narrative !== "loading" && <AssetNotice />}
      {narrative !== "loading" && narrative !== "intro" && <Prompt />}
      {narrative !== "loading" && narrative !== "intro" && <Toast />}
      {(isPlayable(narrative) || narrative === "ended") && !isTouch && <Tutorial />}
      {isTouch && (isPlayable(narrative) || narrative === "ended") && <TouchControls />}
      {narrative === "ended" && <EndCard />}
      {narrative === "ended" && <EndingMusic />}
      {narrative === "iceCream" && <Flavours />}
      {(narrative === "greeting" || narrative === "handover" || narrative === "sitting") && (
        <div className="cine-bars" aria-hidden />
      )}
      <DialoguePlayer />
      <CinematicPlayer />
      {panel === "settings" && <SettingsPanel />}
      {panel === "pause" && <PauseMenu />}
      {panel === "confirmRestart" && <ConfirmRestart />}
    </div>
  );
}

function Loading() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setP((v) => Math.min(94, v + 4 + Math.random() * 8)), 140);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="screen-cover">
      <div className="text-center">
        <p className="eyebrow">{C.loading.subtitle}</p>
        <h1 className="font-display mt-3 text-5xl md:text-6xl">{C.loading.title}</h1>
        <div className="loading-bar mt-8">
          <div style={{ width: `${p}%` }} />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{C.loading.messages[0]}</p>
      </div>
    </div>
  );
}

function IntroTitle() {
  return (
    <div className="intro-title">
      <p className="eyebrow">{text.subtitle}</p>
      <h1 className="font-display text-5xl md:text-6xl">{text.title}</h1>
      <button className="skip-btn" onClick={() => (cameraState.skipIntro = true)}>
        {C.intro.skip}
      </button>
    </div>
  );
}

function Prompt() {
  const s = useGame();
  let msg = "";
  let key = false;
  if (s.narrative === "explore") msg = text.intro;
  if (s.narrative === "greeting") msg = text.greet;
  if (s.narrative === "invite") {
    msg = text.invite;
    key = !s.isTouch;
  }
  if (s.narrative === "toParlour") msg = text.toParlour;
  if (s.narrative === "toFlowers") msg = text.toFlowers;
  if (s.narrative === "guided") msg = text.guided;
  if (s.narrative === "atBench") {
    msg = s.nearBench ? (s.isTouch ? text.benchTouch : text.benchKey) : text.atBench;
    key = s.nearBench && !s.isTouch;
  }
  if (!msg) return null;
  return (
    <div className="prompt" key={msg}>
      {key && <kbd>E</kbd>}
      <span>{key ? msg.replace("Press E to ", "") : msg}</span>
    </div>
  );
}

function Toast() {
  const toast = useGame((s) => s.toast);
  const [, force] = useState(0);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => force((n) => n + 1), 3600);
    return () => clearTimeout(id);
  }, [toast]);
  if (!toast || Date.now() - toast.at > 3500) return null;
  return <div className="toast">{toast.text}</div>;
}

function Tutorial() {
  const seen = useGame((s) => s.tutorialSeen);
  const narrative = useGame((s) => s.narrative);
  if (narrative === "ended") return <div className="tutorial is-quiet">{C.tutorial.dragLook}</div>;
  if (seen) return null;
  return (
    <div className="tutorial">
      <span>
        <kbd>W</kbd>
        <kbd>A</kbd>
        <kbd>S</kbd>
        <kbd>D</kbd> {C.tutorial.walk}
      </span>
      <span>
        <kbd>Shift</kbd> {C.tutorial.hurry}
      </span>
      <span>{C.tutorial.look}</span>
      <span>
        <kbd>E</kbd> {C.tutorial.interact}
      </span>
      <span>
        <kbd>Esc</kbd> {C.tutorial.menu}
      </span>
    </div>
  );
}

function EndCard() {
  return (
    <div className="end-card">
      <p className="eyebrow">{text.ended}</p>
      <p className="font-display text-2xl md:text-3xl">{text.endedSub}</p>
    </div>
  );
}

/** The music-selection screen appears once the final conversation has played out. */
function EndingMusic() {
  const stateAt = useGame((s) => s.stateAt);
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 500);
    return () => clearInterval(id);
  }, []);
  if (!GAME_AUDIO.endingMusic.enabled) return null;
  if (stateTime() < DIALOGUE_END + 1.2) return null;
  void stateAt;
  return <MusicSelect />;
}

function TopControls() {
  const settings = useGame((s) => s.settings);
  const setSettings = useGame((s) => s.setSettings);
  const setPanel = useGame((s) => s.setPanel);
  const [fs, setFs] = useState(false);
  useEffect(() => {
    const h = () => setFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);
  const open = (p: "settings" | "confirmRestart") => {
    document.exitPointerLock?.();
    setPanel(p);
  };
  return (
    <div className="hud-top-right">
      <button
        className="icon-btn"
        aria-label={settings.soundOn ? C.hud.mute : C.hud.unmute}
        onClick={() => setSettings({ soundOn: !settings.soundOn })}
      >
        {settings.soundOn ? <Volume2 /> : <VolumeX />}
      </button>
      <button
        className="icon-btn"
        aria-label={C.hud.fullscreen}
        onClick={() =>
          document.fullscreenElement
            ? void document.exitFullscreen()
            : void document.documentElement.requestFullscreen?.().catch(() => {})
        }
      >
        {fs ? <Minimize /> : <Maximize />}
      </button>
      <button
        className="icon-btn"
        aria-label={C.hud.restartChapter}
        onClick={() => open("confirmRestart")}
      >
        <RotateCcw />
      </button>
      <button className="icon-btn" aria-label={C.hud.settings} onClick={() => open("settings")}>
        <Settings />
      </button>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  const setPanel = useGame((s) => s.setPanel);
  return (
    <div
      className="modal-scrim"
      onPointerDown={(e) => e.target === e.currentTarget && setPanel(null)}
    >
      <div className="panel" role="dialog" aria-label={title}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl">{title}</h2>
          <button className="icon-btn" aria-label={C.hud.close} onClick={() => setPanel(null)}>
            <X />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Range({
  label,
  value,
  min,
  max,
  step,
  onChange,
  fmt,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  fmt: (v: number) => string;
}) {
  return (
    <label className="field">
      <span className="flex justify-between">
        {label}
        <em>{fmt(value)}</em>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function SettingsPanel() {
  const s = useGame((x) => x.settings);
  const set = useGame((x) => x.setSettings);
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  return (
    <Panel title={C.settings.title}>
      <div className="space-y-4">
        <div className="field">
          <span>{C.settings.graphics}</span>
          <div className="seg">
            {(["low", "medium", "high"] as Quality[]).map((q) => (
              <button
                key={q}
                className={s.quality === q ? "is-on" : ""}
                onClick={() => set({ quality: q })}
              >
                {q[0]!.toUpperCase() + q.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <Range
          label={C.settings.cameraDistance}
          value={s.cameraDistance}
          min={2.4}
          max={6}
          step={0.1}
          onChange={(v) => set({ cameraDistance: v })}
          fmt={(v) => `${v.toFixed(1)} m`}
        />
        <Range
          label={C.settings.fieldOfView}
          value={s.fov}
          min={40}
          max={80}
          step={1}
          onChange={(v) => set({ fov: v })}
          fmt={(v) => `${v}°`}
        />
        <Range
          label={C.settings.lookSensitivity}
          value={s.sensitivity}
          min={0.3}
          max={2.5}
          step={0.1}
          onChange={(v) => set({ sensitivity: v })}
          fmt={(v) => `${v.toFixed(1)}×`}
        />
        <Range
          label={C.settings.volume}
          value={s.masterVolume}
          min={0}
          max={1}
          step={0.05}
          onChange={(v) => set({ masterVolume: v })}
          fmt={pct}
        />
        <Range
          label={C.settings.music}
          value={s.musicVolume}
          min={0}
          max={1}
          step={0.05}
          onChange={(v) => set({ musicVolume: v })}
          fmt={pct}
        />
        <label className="toggle">
          <input
            type="checkbox"
            checked={s.soundOn}
            onChange={(e) => set({ soundOn: e.target.checked })}
          />{" "}
          {C.settings.sound}
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={s.reducedMotion}
            onChange={(e) => set({ reducedMotion: e.target.checked })}
          />{" "}
          {C.settings.reducedMotion}
        </label>
      </div>
    </Panel>
  );
}

function PauseMenu() {
  const setPanel = useGame((s) => s.setPanel);
  return (
    <Panel title={C.pause.title}>
      <div className="grid gap-2">
        <button className="btn-primary" onClick={() => setPanel(null)}>
          {C.pause.resume}
        </button>
        <button className="btn-ghost" onClick={() => setPanel("settings")}>
          {C.pause.settings}
        </button>
        <button className="btn-ghost" onClick={() => setPanel("confirmRestart")}>
          {C.pause.restart}
        </button>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">{C.pause.hint}</p>
    </Panel>
  );
}

function ConfirmRestart() {
  const setPanel = useGame((s) => s.setPanel);
  const dispatch = useGame((s) => s.dispatch);
  return (
    <Panel title={C.restart.title}>
      <p className="text-sm text-muted-foreground">{C.restart.body}</p>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <button className="btn-ghost" onClick={() => setPanel(null)}>
          {C.restart.cancel}
        </button>
        <button
          className="btn-primary"
          onClick={() => {
            resetWorld();
            cameraState.endYaw = 0;
            cameraState.endPitch = 0;
            useGame.setState({ nearBench: false, boyWaiting: false, toast: null });
            audio.resetEnding(); // stop the ending track, restore the gameplay music
            dispatch("RESTART");
            setPanel(null);
          }}
        >
          {C.restart.confirm}
        </button>
      </div>
    </Panel>
  );
}

/** Shown only when a realistic model actually failed to load. */
function AssetNotice() {
  const assets = useGame((s) => s.assets);
  const failed = Object.entries(assets)
    .filter(([, a]) => a.quality === "stylised-fallback" && a.reason === "failed")
    .map(([id]) => id);
  if (!failed.length) return null;
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-10 max-w-xs rounded-md bg-background/70 px-3 py-1.5 text-[11px] leading-snug text-muted-foreground backdrop-blur">
      {C.assetNotice.failed(failed.join(", "))}
    </div>
  );
}

function Flavours() {
  return (
    <div className="flavours" aria-label={C.hud.flavoursTitle}>
      {FLAVOURS.map((f) => (
        <div key={f.name} className="flavour">
          <span className="flavour-dot" style={{ background: f.color }} aria-hidden />
          {f.name}
        </div>
      ))}
    </div>
  );
}

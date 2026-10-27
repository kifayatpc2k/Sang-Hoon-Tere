import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CinematicId } from "../config/cinematics";
import type { DialogueSceneId } from "../config/gameContent";
import { transition, type NarrativeEvent, type NarrativeState } from "../narrative/machine";

export type Quality = "low" | "medium" | "high";

export interface Settings {
  quality: Quality;
  masterVolume: number;
  musicVolume: number;
  sensitivity: number;
  fov: number;
  cameraDistance: number;
  soundOn: boolean;
  reducedMotion: boolean;
}

interface GameStore {
  narrative: NarrativeState;
  /** performance.now() when the current state began */
  stateAt: number;
  dispatch: (e: NarrativeEvent) => void;
  settings: Settings;
  panel: null | "settings" | "pause" | "confirmRestart";
  nearBench: boolean;
  boyWaiting: boolean;
  toast: { text: string; at: number } | null;
  isTouch: boolean;
  tutorialSeen: boolean;
  setSettings: (s: Partial<Settings>) => void;
  setPanel: (p: GameStore["panel"]) => void;
  setNearBench: (b: boolean) => void;
  setBoyWaiting: (b: boolean) => void;
  showToast: (text: string) => void;
  setTouch: (t: boolean) => void;
  setTutorialSeen: () => void;
  /** which character models are in use, so the UI can be honest about placeholders */
  assets: Record<
    string,
    { quality: "realistic" | "stylised-fallback"; reason: "missing" | "failed" | null }
  >;
  setAssetStatus: (
    id: string,
    quality: "realistic" | "stylised-fallback",
    reason: "missing" | "failed" | null,
  ) => void;
  /** cinematic video currently playing (blocks gameplay), if any */
  cinematic: CinematicId | null;
  /** dialogue scene currently playing (blocks story advance), if any */
  dialogue: DialogueSceneId | null;
  /** cinematics already shown this playthrough */
  playedCinematics: CinematicId[];
  /** dialogue scenes already finished this playthrough */
  finishedDialogues: DialogueSceneId[];
  startCinematic: (id: CinematicId) => void;
  endCinematic: (id: CinematicId) => void;
  startDialogue: (id: DialogueSceneId) => void;
  endDialogue: (id: DialogueSceneId) => void;
}

const prefersReduced =
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export const useGame = create<GameStore>()(
  persist(
    (set) => ({
      narrative: "loading",
      stateAt: 0,
      dispatch: (e) =>
        set((s) => {
          const next = transition(s.narrative, e);
          if (next === s.narrative) return {};
          // a restart also resets the one-shot cinematics and conversations
          const reset =
            e === "RESTART"
              ? {
                  playedCinematics: [] as CinematicId[],
                  finishedDialogues: [] as DialogueSceneId[],
                  cinematic: null,
                  dialogue: null,
                }
              : {};
          return { narrative: next, stateAt: performance.now(), ...reset };
        }),
      settings: {
        quality: "medium",
        masterVolume: 0.7,
        musicVolume: 0.45,
        sensitivity: 1,
        fov: 55,
        cameraDistance: 3.6,
        soundOn: true,
        reducedMotion: !!prefersReduced,
      },
      panel: null,
      nearBench: false,
      boyWaiting: false,
      toast: null,
      isTouch: false,
      tutorialSeen: false,
      setSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),
      setPanel: (panel) => set({ panel }),
      setNearBench: (nearBench) => set({ nearBench }),
      setBoyWaiting: (boyWaiting) => set({ boyWaiting }),
      showToast: (text) => set({ toast: { text, at: Date.now() } }),
      setTouch: (isTouch) => set({ isTouch }),
      setTutorialSeen: () => set({ tutorialSeen: true }),
      assets: {},
      setAssetStatus: (id, quality, reason) =>
        set((s) => ({ assets: { ...s.assets, [id]: { quality, reason } } })),
      cinematic: null,
      dialogue: null,
      playedCinematics: [],
      finishedDialogues: [],
      startCinematic: (id) => set({ cinematic: id }),
      // closing an overlay restarts the current story state's clock, so timed
      // moments (the greeting nod, the ice-cream pause) begin after it ends
      endCinematic: (id) =>
        set((s) => ({
          cinematic: s.cinematic === id ? null : s.cinematic,
          playedCinematics: s.playedCinematics.includes(id)
            ? s.playedCinematics
            : [...s.playedCinematics, id],
          stateAt: performance.now(),
        })),
      startDialogue: (id) => set({ dialogue: id }),
      endDialogue: (id) =>
        set((s) => ({
          dialogue: s.dialogue === id ? null : s.dialogue,
          finishedDialogues: s.finishedDialogues.includes(id)
            ? s.finishedDialogues
            : [...s.finishedDialogues, id],
          stateAt: performance.now(),
        })),
    }),
    { name: "bosphorus-prefs-v1", partialize: (s) => ({ settings: s.settings }) },
  ),
);

export const stateTime = () => (performance.now() - useGame.getState().stateAt) / 1000;

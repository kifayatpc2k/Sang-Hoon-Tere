// Scene orchestration: which cinematic + dialogue gate each story moment, and
// helpers to trigger them. The narrative state machine stays pure; these
// overlays pause gameplay and gate the events that would advance the story.
import { CINEMATICS, type CinematicId } from "../config/cinematics";
import { GAME_CONTENT, type DialogueSceneId } from "../config/gameContent";
import type { NarrativeState } from "../narrative/machine";
import { useGame } from "../state/store";

interface Moment {
  cinematic?: CinematicId;
  dialogue?: DialogueSceneId;
}

/** Story state → the cinematic and/or conversation that must play there. */
export const MOMENTS: Partial<Record<NarrativeState, Moment>> = {
  // the first meeting and flower shop have no video sections — the
  // conversations carry those moments
  greeting: { dialogue: "firstMeeting" },
  invite: { dialogue: "catHandover" },
  // the ice-cream shop has no video section either — gameplay flows straight on
  iceCream: { dialogue: "iceCreamShop" },
  flowers: { dialogue: "flowerShopArrival" },
  atBench: { cinematic: "waterfrontArrival", dialogue: "waterfrontArrival" },
};

/** Start a scene's dialogue if it is enabled, has lines, and hasn't played yet. */
export function maybeStartDialogue(id: DialogueSceneId | undefined) {
  if (!id) return;
  const st = useGame.getState();
  const scene = GAME_CONTENT.scenes[id];
  if (!scene.enabled || !scene.lines.length) return;
  if (st.finishedDialogues.includes(id) || st.dialogue === id) return;
  st.startDialogue(id);
}

/**
 * Called when the narrative enters a state with a configured moment.
 * The cinematic plays first; when it ends, the dialogue begins.
 */
export function triggerMoment(state: NarrativeState) {
  const m = MOMENTS[state];
  if (!m) return;
  const st = useGame.getState();
  if (m.cinematic) {
    const c = CINEMATICS[m.cinematic];
    if (c.enabled && !(c.playOnce && st.playedCinematics.includes(m.cinematic))) {
      st.startCinematic(m.cinematic);
      return;
    }
  }
  maybeStartDialogue(m.dialogue);
}

/** True while a cinematic or dialogue overlay owns the screen. */
export function sceneBlocked() {
  const st = useGame.getState();
  return !!(st.cinematic || st.dialogue);
}

// Seated finale conversation: a pure, time-driven sequence so it plays exactly once per ending.
// The lines themselves live in GAME_CONTENT.scenes.finalBench (gameContent.ts).
import { GAME_CONTENT } from "../config/gameContent";

export type DialogueStep = "waiting" | `line_${number}` | "conversation_complete";

export const DIALOGUE_START = 1.4; // seconds after both are seated
export const LINE_TIME = 4.2;
export const LINE_GAP = 0.5;

const lineCount = () => GAME_CONTENT.scenes.finalBench.lines.length;

/** Which line is showing `t` seconds into the ending (null between lines). */
export function dialogueAt(t: number): DialogueStep | null {
  if (t < DIALOGUE_START) return "waiting";
  const k = t - DIALOGUE_START;
  const slot = Math.floor(k / (LINE_TIME + LINE_GAP));
  if (slot >= lineCount()) return "conversation_complete";
  return k - slot * (LINE_TIME + LINE_GAP) < LINE_TIME ? (`line_${slot}` as DialogueStep) : null;
}

export const DIALOGUE_END = DIALOGUE_START + lineCount() * (LINE_TIME + LINE_GAP);

export function lineFor(step: DialogueStep | null) {
  if (!step || step === "waiting" || step === "conversation_complete") return null;
  const i = Number(step.slice(5));
  return GAME_CONTENT.scenes.finalBench.lines[i] ?? null;
}

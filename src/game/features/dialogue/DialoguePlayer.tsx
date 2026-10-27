// Dialogue overlay: reads the active scene from the store, plays its lines
// sequentially with fade in/out, then hands control back to the story.
// All wording lives in src/game/config/gameContent.ts.
import { useEffect, useRef, useState } from "react";
import { GAME_CONTENT, type DialogueSceneId } from "../../config/gameContent";
import { useGame } from "../../state/store";

/** Seconds a line stays up: scales with length so long lines stay readable. */
const lineDuration = (text: string) => Math.min(7, Math.max(2.6, 1.6 + text.length * 0.055));
const FADE = 0.45;

export function DialoguePlayer() {
  const id = useGame((s) => s.dialogue);
  if (!id) return null;
  return <DialogueOverlay key={id} sceneId={id} />;
}

function DialogueOverlay({ sceneId }: { sceneId: DialogueSceneId }) {
  const scene = GAME_CONTENT.scenes[sceneId];
  const endDialogue = useGame((s) => s.endDialogue);
  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<number | null>(null);

  const lines = scene.lines;
  const line = lines[index];

  useEffect(() => {
    if (!line) {
      endDialogue(sceneId);
      return;
    }
    const dur = lineDuration(line.text);
    const fadeOut = window.setTimeout(() => setLeaving(true), (dur - FADE) * 1000);
    timer.current = window.setTimeout(() => {
      setLeaving(false);
      setIndex((i) => i + 1);
    }, dur * 1000);
    return () => {
      window.clearTimeout(fadeOut);
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [index, line, sceneId, endDialogue]);

  if (!line) return null;
  const name = GAME_CONTENT.characters[line.speaker];

  return (
    <div className="dialogue-layer" onPointerDown={() => setIndex((i) => i + 1)}>
      <div
        key={index}
        className={`dialogue-box${leaving ? " is-leaving" : ""}`}
        role="status"
        aria-live="polite"
      >
        <span className={`dialogue-speaker is-${line.speaker}`}>{name}</span>
        <p className="dialogue-text">{line.text}</p>
        <span className="dialogue-progress">
          {index + 1} / {lines.length}
        </span>
      </div>
    </div>
  );
}

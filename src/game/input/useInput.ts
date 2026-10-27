import { useEffect } from "react";
import { cameraState } from "../camera/CameraRig";
import { isPlayable } from "../narrative/machine";
import { runtime } from "../runtime";
import { useGame } from "../state/store";

const canLook = (s: string) => isPlayable(s as never) || s === "ended";

/** Keyboard + mouse (pointer lock or drag) input. Writes into the shared runtime. */
export function useInput(canvas: HTMLCanvasElement | null) {
  useEffect(() => {
    if (!canvas) return;
    const typing = (e: Event) => {
      const t = e.target as HTMLElement | null;
      return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA");
    };
    const down = (e: KeyboardEvent) => {
      if (typing(e)) return;
      const k = e.key.toLowerCase();
      const s = useGame.getState();
      if (s.narrative === "intro" && (k === " " || k === "enter" || k === "escape")) {
        cameraState.skipIntro = true;
        return;
      }
      if (k === "escape") {
        if (!document.pointerLockElement) s.setPanel(s.panel ? null : "pause");
        return;
      }
      if (s.panel) return;
      if (k === "e") runtime.input.interact = true;
      if (!isPlayable(s.narrative)) return;
      runtime.keys.add(k);
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k))
        s.setTutorialSeen();
      if (k === " ") e.preventDefault();
    };
    const up = (e: KeyboardEvent) => runtime.keys.delete(e.key.toLowerCase());
    const blur = () => runtime.keys.clear();

    let dragging = false;
    const md = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const s = useGame.getState();
      if (s.narrative === "intro") {
        cameraState.skipIntro = true;
        return;
      }
      if (!canLook(s.narrative) || s.panel) return;
      dragging = true;
      if (isPlayable(s.narrative)) canvas.requestPointerLock?.()?.catch?.(() => {});
    };
    const mu = () => (dragging = false);
    const mm = (e: MouseEvent) => {
      if (document.pointerLockElement === canvas || dragging) {
        runtime.input.lookX += e.movementX;
        runtime.input.lookY += e.movementY;
      }
    };
    const plc = () => {
      const s = useGame.getState();
      if (!document.pointerLockElement && isPlayable(s.narrative) && !s.panel) {
        runtime.keys.clear();
        s.setPanel("pause");
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    canvas.addEventListener("pointerdown", md);
    window.addEventListener("pointerup", mu);
    window.addEventListener("mousemove", mm);
    document.addEventListener("pointerlockchange", plc);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      canvas.removeEventListener("pointerdown", md);
      window.removeEventListener("pointerup", mu);
      window.removeEventListener("mousemove", mm);
      document.removeEventListener("pointerlockchange", plc);
    };
  }, [canvas]);
}

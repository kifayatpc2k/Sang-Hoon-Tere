import { useRef, useState } from "react";
import { text } from "../config/gameContent";
import { runtime } from "../runtime";
import { useGame } from "../state/store";

export function TouchControls() {
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const stickId = useRef<number | null>(null);
  const lookId = useRef<number | null>(null);
  const lookLast = useRef({ x: 0, y: 0 });
  const narrative = useGame((s) => s.narrative);
  const nearBench = useGame((s) => s.nearBench);
  const action =
    narrative === "invite"
      ? text.inviteTouch.replace("Tap ", "")
      : narrative === "atBench" && nearBench
        ? text.benchTouch.replace("Tap ", "")
        : null;
  const showStick = narrative !== "ended";

  const moveStick = (cx: number, cy: number) => {
    const r = base.current!.getBoundingClientRect();
    let x = (cx - (r.left + r.width / 2)) / (r.width / 2);
    let y = (cy - (r.top + r.height / 2)) / (r.height / 2);
    const l = Math.hypot(x, y);
    if (l > 1) {
      x /= l;
      y /= l;
    }
    runtime.joystick.x = x;
    runtime.joystick.y = y;
    setKnob({ x, y });
    useGame.getState().setTutorialSeen();
  };
  const endStick = () => {
    stickId.current = null;
    runtime.joystick.x = runtime.joystick.y = 0;
    setKnob({ x: 0, y: 0 });
  };

  return (
    <>
      <div
        className="touch-look"
        onPointerDown={(e) => {
          lookId.current = e.pointerId;
          lookLast.current = { x: e.clientX, y: e.clientY };
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (e.pointerId !== lookId.current) return;
          runtime.input.lookX += (e.clientX - lookLast.current.x) * 1.6;
          runtime.input.lookY += (e.clientY - lookLast.current.y) * 1.6;
          lookLast.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={() => (lookId.current = null)}
        onPointerCancel={() => (lookId.current = null)}
      />
      {showStick && (
        <div
          ref={base}
          className="joystick"
          onPointerDown={(e) => {
            stickId.current = e.pointerId;
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
            moveStick(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => e.pointerId === stickId.current && moveStick(e.clientX, e.clientY)}
          onPointerUp={endStick}
          onPointerCancel={endStick}
        >
          <div
            className="joystick-knob"
            style={{ transform: `translate(${knob.x * 34}px, ${knob.y * 34}px)` }}
          />
        </div>
      )}
      {action && (
        <div className="touch-buttons">
          <button className="touch-btn is-action" onClick={() => (runtime.input.interact = true)}>
            {action}
          </button>
        </div>
      )}
    </>
  );
}

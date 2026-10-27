// Cinematic overlay: plays a configured video fullscreen inside the game
// window, then removes itself and resumes gameplay automatically.
// Missing or broken files skip safely — the game never freezes on black.
// Video paths live in src/game/config/cinematics.ts.
import { useEffect, useRef, useState } from "react";
import { CINEMATICS, type CinematicId } from "../../config/cinematics";
import { GAME_CONTENT } from "../../config/gameContent";
import { useGame } from "../../state/store";
import { MOMENTS, maybeStartDialogue } from "../scenes";

export function CinematicPlayer() {
  const id = useGame((s) => s.cinematic);
  if (!id) return null;
  return <CinematicOverlay key={id} id={id} />;
}

function CinematicOverlay({ id }: { id: CinematicId }) {
  const cfg = CINEMATICS[id];
  const video = useRef<HTMLVideoElement>(null);
  const [closing, setClosing] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const done = useRef(false);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const finish = () => {
      if (done.current) return;
      done.current = true;
      setClosing(true);
      // let the fade-out play, then hand back to the story
      window.setTimeout(() => {
        const st = useGame.getState();
        st.endCinematic(id);
        // the moment's conversation follows the video
        const moment = Object.values(MOMENTS).find((m) => m.cinematic === id);
        maybeStartDialogue(moment?.dialogue);
      }, 450);
    };
    v.addEventListener("ended", finish);
    v.addEventListener("error", finish); // missing/unsupported file: skip safely
    // once playback is genuinely running, a stale tap-to-play chip must go away
    const onPlaying = () => setNeedsTap(false);
    v.addEventListener("playing", onPlaying);
    const tryPlay = () => {
      const p = v.play();
      if (p) p.catch(() => setNeedsTap(true)); // autoplay blocked: show a tap-to-play control
    };
    tryPlay();
    return () => {
      v.removeEventListener("ended", finish);
      v.removeEventListener("error", finish);
      v.removeEventListener("playing", onPlaying);
      v.pause();
    };
  }, [id]);

  return (
    <div className={`cinematic-layer${closing ? " is-closing" : ""}`}>
      <video
        ref={video}
        className="cinematic-video"
        src={cfg.src}
        poster={cfg.poster}
        playsInline
        preload="auto"
        onClick={() => {
          if (needsTap) {
            setNeedsTap(false);
            void video.current?.play().catch(() => setNeedsTap(true));
          }
        }}
      />
      {needsTap && (
        <button
          className="cinematic-tap btn-primary"
          onClick={() => void video.current?.play().catch(() => {})}
        >
          {GAME_CONTENT.cinematics.tapToPlay}
        </button>
      )}
      <button
        className="cinematic-skip"
        onClick={() => video.current?.dispatchEvent(new Event("ended"))}
        aria-label={GAME_CONTENT.cinematics.skip}
      >
        {GAME_CONTENT.cinematics.skip} ›
      </button>
    </div>
  );
}

// Compact ending-music mini-player: a small, quiet card in the corner. The
// automatic ending soundtrack (audioTracks.ts → endingSoundtrack) keeps
// playing underneath; this player only switches between it and the three
// selectable tracks, always through the central audio manager — never a
// second audio instance. A track whose file is missing shows as
// "not added yet" and is safely disabled.
import { ChevronDown, ChevronUp, Music2, Pause, Play, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";
import { audio } from "../../audio/audio";
import { GAME_AUDIO, type AudioTrack } from "../../config/audioTracks";
import { GAME_CONTENT } from "../../config/gameContent";
import { useGame } from "../../state/store";

interface Entry {
  id: string;
  title: string;
  src: string;
  note?: string;
}

async function fileExists(src: string) {
  try {
    const r = await fetch(src, { method: "HEAD" });
    return r.ok;
  } catch {
    return false;
  }
}

const THEME_ID = "ending-theme";

export function MusicSelect() {
  const theme = GAME_AUDIO.endingSoundtrack;
  const tracks = GAME_AUDIO.endingMusic.tracks;
  const musicVolume = useGame((s) => s.settings.musicVolume);
  const soundOn = useGame((s) => s.settings.soundOn);
  const setSettings = useGame((s) => s.setSettings);
  const content = GAME_CONTENT.music;

  const entries: Entry[] = [
    { id: THEME_ID, title: theme.title, src: theme.src, note: "Automatic" },
    ...tracks.map((t: AudioTrack) => ({ id: t.id, title: t.title, src: t.src })),
  ];

  const [available, setAvailable] = useState<Record<string, boolean>>({});
  const [current, setCurrent] = useState<string | null>(audio.endingNow().src ?? theme.src);
  const [playing, setPlaying] = useState(audio.endingNow().playing);
  const [blocked, setBlocked] = useState(audio.endingNow().blocked);
  const [open, setOpen] = useState(false);

  // probe which files actually exist (a missing track is disabled, not broken)
  useEffect(() => {
    let alive = true;
    void Promise.all(entries.map(async (e) => [e.id, await fileExists(e.src)] as const)).then(
      (rows) => {
        if (alive) setAvailable(Object.fromEntries(rows));
      },
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // stay in sync with the audio manager (autoplay resumes, pauses, restarts)
  useEffect(() => {
    const id = setInterval(() => {
      const now = audio.endingNow();
      setCurrent(now.src ?? theme.src);
      setPlaying(now.playing);
      setBlocked(now.blocked);
    }, 500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const readBack = () => {
    const now = audio.endingNow();
    setCurrent(now.src ?? theme.src);
    setPlaying(now.playing);
    setBlocked(now.blocked);
  };

  const choose = (e: Entry) => {
    if (available[e.id] === false) return;
    setOpen(false);
    void audio.playEnding(e.id === THEME_ID ? null : e.src).then(readBack);
  };

  const toggle = () => {
    if (playing) {
      audio.pauseEnding();
      setPlaying(false);
    } else {
      void audio.playEnding(current === theme.src ? null : current).then(readBack);
    }
  };

  const active = entries.find((e) => e.src === current) ?? entries[0]!;
  const missing = available[active.id] === false;

  return (
    <div className="music-mini" role="region" aria-label={content.title}>
      <div className="music-mini-row">
        <span className="music-mini-icon" aria-hidden>
          <Music2 size={14} />
        </span>
        <span className="music-mini-title">
          {active.title}
          <small>{missing ? content.pending : blocked ? content.tapToPlay : ""}</small>
        </span>
        <button
          className="icon-btn"
          onClick={toggle}
          disabled={missing && !playing}
          aria-label={playing ? content.pause : content.play}
        >
          {playing ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <button
          className="icon-btn"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={content.title}
        >
          {open ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
      </div>
      {open && (
        <div className="music-mini-list">
          {entries.map((e) => {
            const ok = available[e.id];
            const isActive = e.src === current;
            return (
              <button
                key={e.id}
                className={`music-mini-item${isActive ? " is-active" : ""}`}
                disabled={ok === false}
                onClick={() => choose(e)}
              >
                <span>
                  {e.title}
                  {e.note ? ` · ${e.note}` : ""}
                </span>
                {ok === false && <span className="music-mini-pending">{content.pending}</span>}
                {isActive && playing && ok !== false && (
                  <span className="music-mini-pending">♪</span>
                )}
              </button>
            );
          })}
          <label className="music-mini-volume">
            <Volume2 size={12} aria-hidden />
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={musicVolume}
              aria-label={content.volume}
              onChange={(ev) => setSettings({ musicVolume: Number(ev.target.value) })}
            />
          </label>
        </div>
      )}
    </div>
  );
}

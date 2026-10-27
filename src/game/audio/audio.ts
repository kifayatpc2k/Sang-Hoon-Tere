// Procedural Web Audio: ocean, wind, generative music, chimes.
// Real MP3 tracks (see src/game/config/audioTracks.ts) replace the generative
// pad and drive the story's music: background-music.mp3 for normal gameplay,
// ending-music.mp3 for the seated waterfront finale. Missing files fall back
// to the built-in music — nothing breaks, no stuck loading states.
import { GAME_AUDIO } from "../config/audioTracks";

class AudioManager {
  private bgFile: HTMLAudioElement | null = null;
  private bgEl: HTMLAudioElement | null = null;
  private bgFileChecked = false;
  private ducked = false;
  ctx: AudioContext | null = null;
  master!: GainNode;
  music!: GainNode;
  ambience!: GainNode;
  private musicTimer: number | null = null;
  private step = 0;

  // ending soundtrack — ONE shared element, never a duplicate instance
  private endingEl: HTMLAudioElement | null = null;
  private endingSrc: string | null = null;
  private endingStarted = false;
  private endingFrac = 0;
  private endingTimer: number | null = null;
  private pauseToken = 0;

  // mirrored settings, so track volumes follow the global sliders and mute
  private musicVolume = 0.45;
  private soundOn = true;
  private lastMusicVolume = 0.45;

  // one deferred action retried on the next user gesture (autoplay policies)
  private pendingAuto: (() => void) | null = null;
  private pendingKind: "background" | "ending" | null = null;
  private retryAttached = false;

  private ambientTimer: number | null = null;

  start() {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.connect(ctx.destination);
    this.music = ctx.createGain();
    this.music.connect(this.master);
    this.ambience = ctx.createGain();
    this.ambience.gain.value = 0.9;
    this.ambience.connect(this.master);

    const noise = (brown: boolean) => {
      const len = ctx.sampleRate * 4;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        if (brown) {
          last = (last + 0.02 * w) / 1.02;
          d[i] = last * 3.5;
        } else d[i] = w;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      return src;
    };
    // ocean: brown noise swelling with an LFO
    const ocean = noise(true);
    const oLP = ctx.createBiquadFilter();
    oLP.type = "lowpass";
    oLP.frequency.value = 700;
    const oGain = ctx.createGain();
    oGain.gain.value = 0.22;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.12;
    const lfoG = ctx.createGain();
    lfoG.gain.value = 0.25;
    lfo.connect(lfoG).connect(oGain.gain);
    ocean.connect(oLP).connect(oGain).connect(this.ambience);
    ocean.start();
    lfo.start();
    // wind: band-passed white noise sweeping
    const wind = noise(false);
    const wBP = ctx.createBiquadFilter();
    wBP.type = "bandpass";
    wBP.Q.value = 0.8;
    wBP.frequency.value = 500;
    const wLfo = ctx.createOscillator();
    wLfo.frequency.value = 0.05;
    const wLfoG = ctx.createGain();
    wLfoG.gain.value = 300;
    wLfo.connect(wLfoG).connect(wBP.frequency);
    const wGain = ctx.createGain();
    wGain.gain.value = 0.025;
    wind.connect(wBP).connect(wGain).connect(this.ambience);
    wind.start();
    wLfo.start();
    this.startMusic();
    this.ambientTimer = window.setInterval(() => this.ambientEvent(), 9000);
    void this.tryBackgroundFile();
  }

  private userFactor() {
    return this.musicVolume * (this.soundOn ? 1 : 0);
  }

  /** HEAD-check that a browser asset really exists (never fetch the body). */
  private async headOk(src: string) {
    try {
      const r = await fetch(src, { method: "HEAD" });
      return r.ok;
    } catch {
      return false;
    }
  }

  /** Retry a blocked play() once at the next valid user interaction — never in a loop. */
  private queueOnInteraction(kind: "background" | "ending", fn: () => void) {
    this.pendingAuto = fn;
    this.pendingKind = kind;
    if (this.retryAttached) return;
    this.retryAttached = true;
    const go = () => {
      window.removeEventListener("pointerdown", go);
      window.removeEventListener("keydown", go);
      this.retryAttached = false;
      const f = this.pendingAuto;
      this.pendingAuto = null;
      this.pendingKind = null;
      f?.();
    };
    window.addEventListener("pointerdown", go);
    window.addEventListener("keydown", go);
  }

  /**
   * If a real background-music file has been dropped at the configured path,
   * fade the generative pad out and loop the file instead. Missing file →
   * the built-in music simply carries on.
   */
  private async tryBackgroundFile() {
    const cfg = GAME_AUDIO.backgroundMusic;
    if (!cfg.enabled || this.bgFileChecked) return;
    this.bgFileChecked = true;
    if (!(await this.headOk(cfg.src))) return;
    const attempt = async () => {
      if (this.bgFile) return;
      const el = this.bgEl ?? (this.bgEl = new Audio(cfg.src));
      el.loop = cfg.loop;
      el.volume = cfg.volume * this.userFactor();
      try {
        await el.play();
      } catch {
        // autoplay blocked: resume at the next valid user interaction
        this.queueOnInteraction("background", () => void attempt());
        return;
      }
      this.bgFile = el;
      if (this.ctx) this.music.gain.setTargetAtTime(0, this.ctx.currentTime, 0.8);
    };
    await attempt();
  }

  /** Lower the background music while the ending plays, restore after. */
  duckMusic(on: boolean) {
    this.ducked = on;
    const bg = GAME_AUDIO.backgroundMusic;
    if (this.bgFile)
      this.bgFile.volume =
        bg.volume * this.userFactor() * (on ? GAME_AUDIO.endingSoundtrack.duckTo : 1);
    if (this.ctx)
      this.music.gain.setTargetAtTime(on ? 0 : this.lastMusicVolume, this.ctx.currentTime, 0.6);
  }

  // ------------------------------------------------------------------
  // ENDING SOUNDTRACK
  // ------------------------------------------------------------------

  /**
   * Start the automatic ending soundtrack. Fires once per playthrough and
   * only from the seated-at-the-bench trigger. If the file is missing, the
   * background music keeps playing untouched (safe fallback).
   */
  async startEndingMusic(): Promise<boolean> {
    const cfg = GAME_AUDIO.endingSoundtrack;
    if (!cfg.enabled || this.endingStarted) return this.endingSrc === cfg.src;
    this.endingStarted = true;
    if (!(await this.headOk(cfg.src))) return false;
    return this.swapEnding(cfg.src);
  }

  /** Play a track through the single ending element (null = automatic theme). */
  async playEnding(src: string | null): Promise<boolean> {
    const cfg = GAME_AUDIO.endingSoundtrack;
    if (!cfg.enabled) return false;
    const target = src ?? cfg.src;
    if (target === GAME_AUDIO.backgroundMusic.src) {
      // back to the gameplay track: reuse the existing background instance
      await this.stopEnding(cfg.fadeOut);
      this.duckMusic(false);
      return true;
    }
    return this.swapEnding(target);
  }

  private async swapEnding(src: string): Promise<boolean> {
    const cfg = GAME_AUDIO.endingSoundtrack;
    if (!this.endingEl) this.endingEl = new Audio();
    const el = this.endingEl;
    const isNew = this.endingSrc !== src;
    this.duckMusic(true); // the background steps aside while the ending plays
    if (isNew) {
      if (!(await this.headOk(src))) return false;
      if (this.endingSrc) await this.fadeOutEnding(Math.min(1.2, cfg.fadeOut));
      if (this.endingEl !== el) return false;
      el.src = src;
      el.loop = cfg.loop;
      this.endingSrc = src;
      el.volume = 0;
      this.endingFrac = 0;
    }
    try {
      await el.play();
    } catch {
      // autoplay blocked: resume at the next valid interaction, not in a loop
      this.queueOnInteraction("ending", () => void this.swapEnding(src));
      return false;
    }
    this.pauseToken++; // cancel any pending pause from before
    const fresh = isNew || el.currentTime < 0.2;
    this.fadeEnding(1, fresh ? cfg.fadeIn : 0.8);
    return true;
  }

  /** Gentle pause with a short fade so nothing cuts abruptly. */
  pauseEnding() {
    const el = this.endingEl;
    if (!el || el.paused) return;
    const token = ++this.pauseToken; // a later play() cancels this pending pause
    this.fadeEnding(0, 0.4);
    window.setTimeout(() => {
      if (token === this.pauseToken && this.endingEl === el) el.pause();
    }, 440);
  }

  /** What the background music is doing right now (debug/verification). */
  backgroundNow(): { src: string | null; playing: boolean; volume: number } {
    return {
      src: this.bgFile ? GAME_AUDIO.backgroundMusic.src : null,
      playing: !!this.bgFile && !this.bgFile.paused,
      volume: this.bgFile ? Number(this.bgFile.volume.toFixed(3)) : 0,
    };
  }

  /** What the ending element is doing right now (the mini-player mirrors this). */
  endingNow(): { src: string | null; playing: boolean; blocked: boolean; volume: number } {
    return {
      src: this.endingSrc,
      playing: !!this.endingEl && this.endingSrc !== null && !this.endingEl.paused,
      blocked: this.pendingKind === "ending",
      volume: this.endingEl ? Number(this.endingEl.volume.toFixed(3)) : 0,
    };
  }

  /** Story restart: stop the ending, un-duck the background, re-arm the trigger. */
  resetEnding() {
    this.endingStarted = false;
    this.duckMusic(false);
    this.pendingAuto = null;
    this.pendingKind = null;
    void this.stopEnding(0.5);
  }

  private async stopEnding(seconds: number) {
    await this.fadeOutEnding(seconds);
    if (this.endingEl) {
      this.endingEl.removeAttribute("src");
      this.endingEl.load();
    }
    this.endingSrc = null;
    this.endingFrac = 0;
  }

  private fadeOutEnding(seconds: number) {
    const el = this.endingEl;
    if (!el || el.paused) {
      this.endingFrac = 0;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      this.fadeEnding(0, seconds);
      window.setTimeout(
        () => {
          if (this.endingEl === el) el.pause();
          resolve();
        },
        seconds * 1000 + 60,
      );
    });
  }

  /** Fade the ending element to `target` (0..1 of its configured volume). */
  private fadeEnding(target: number, seconds: number) {
    const el = this.endingEl;
    this.endingFrac = target;
    if (!el) return;
    const from = el.volume / (GAME_AUDIO.endingSoundtrack.volume * (this.userFactor() || 1));
    const t0 = performance.now();
    if (this.endingTimer) clearInterval(this.endingTimer);
    this.endingTimer = window.setInterval(() => {
      if (!this.endingEl) {
        if (this.endingTimer) clearInterval(this.endingTimer);
        this.endingTimer = null;
        return;
      }
      const k = Math.min(1, (performance.now() - t0) / (seconds * 1000));
      const frac = from + (target - from) * k;
      this.endingFrac = frac;
      this.endingEl.volume = GAME_AUDIO.endingSoundtrack.volume * this.userFactor() * frac;
      if (k >= 1 && this.endingTimer) {
        clearInterval(this.endingTimer);
        this.endingTimer = null;
      }
    }, 90);
  }

  private ambientEvent() {
    if (!this.ctx) return;
    const r = Math.random();
    if (r < 0.18) this.horn();
    else if (r < 0.7) this.gull();
  }

  /** Distant ferry horn across the water. */
  horn() {
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 380;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.05, now + 0.4);
    g.gain.setValueAtTime(0.05, now + 2.2);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 3.4);
    lp.connect(g).connect(this.ambience);
    [110, 138.6].forEach((f) => {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = f;
      o.connect(lp);
      o.start(now);
      o.stop(now + 3.6);
    });
  }

  /** A gull call: quick falling chirps. */
  gull() {
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const n = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const t0 = now + i * 0.22;
      const o = ctx.createOscillator();
      o.type = "triangle";
      o.frequency.setValueAtTime(1500 + Math.random() * 300, t0);
      o.frequency.exponentialRampToValueAtTime(900, t0 + 0.18);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.012, t0 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);
      o.connect(g).connect(this.ambience);
      o.start(t0);
      o.stop(t0 + 0.25);
    }
  }

  private tone(
    freq: number,
    when: number,
    dur: number,
    vol: number,
    dest: AudioNode,
    type: OscillatorType = "sine",
  ) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vol, when + Math.min(0.8, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g).connect(dest);
    o.start(when);
    o.stop(when + dur + 0.1);
  }

  private startMusic() {
    // Dmaj7 - Bm7 - Gmaj7 - A soft pad, one chord every 4s with a sparse melody
    const chords = [
      [146.83, 220, 277.18, 369.99],
      [123.47, 185, 220, 293.66],
      [98, 146.83, 196, 246.94],
      [110, 164.81, 220, 277.18],
    ];
    const scale = [587.33, 659.25, 739.99, 880, 987.77, 1108.73];
    const tick = () => {
      if (!this.ctx) return;
      const now = this.ctx.currentTime + 0.05;
      const c = chords[this.step % chords.length]!;
      c.forEach((f) => this.tone(f, now, 4.6, 0.045, this.music, "triangle"));
      for (let i = 0; i < 3; i++)
        if (Math.random() < 0.6)
          this.tone(
            scale[Math.floor(Math.random() * scale.length)]!,
            now + i * 1.3 + Math.random() * 0.3,
            1.8,
            0.03,
            this.music,
          );
      this.step++;
    };
    tick();
    this.musicTimer = window.setInterval(tick, 4000);
  }

  setVolumes(master: number, music: number, on: boolean) {
    this.lastMusicVolume = music;
    this.musicVolume = music;
    this.soundOn = on;
    const bg = GAME_AUDIO.backgroundMusic;
    if (this.bgFile)
      this.bgFile.volume =
        bg.volume * this.userFactor() * (this.ducked ? GAME_AUDIO.endingSoundtrack.duckTo : 1);
    // during an ending fade the fade loop applies the new factor itself
    if (this.endingEl && this.endingTimer === null)
      this.endingEl.volume =
        GAME_AUDIO.endingSoundtrack.volume * this.userFactor() * this.endingFrac;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(on ? master : 0, t, 0.1);
    if (!this.ducked) this.music.gain.setTargetAtTime(music, t, 0.1);
  }

  chime(delay = 0) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime + delay;
    [880, 1174.66, 1318.51].forEach((f, i) => this.tone(f, now + i * 0.09, 1.6, 0.06, this.master));
  }

  reveal() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = [293.66, 369.99, 440, 554.37, 587.33, 739.99, 880, 1108.73];
    notes.forEach((f, i) => this.tone(f, now + 0.5 + i * 0.35, 3.5, 0.05, this.master, "triangle"));
    [146.83, 220, 293.66].forEach((f) => this.tone(f, now + 0.3, 9, 0.05, this.master, "sine"));
  }

  stop() {
    if (this.musicTimer) clearInterval(this.musicTimer);
    if (this.ambientTimer) clearInterval(this.ambientTimer);
    if (this.endingTimer) {
      clearInterval(this.endingTimer);
      this.endingTimer = null;
    }
    this.bgFile?.pause();
    this.bgFile = null;
    if (this.bgEl) {
      this.bgEl.pause();
      this.bgEl.removeAttribute("src");
      this.bgEl = null;
    }
    this.bgFileChecked = false;
    if (this.endingEl) {
      this.endingEl.pause();
      this.endingEl.removeAttribute("src");
      this.endingEl = null;
    }
    this.endingSrc = null;
    this.endingStarted = false;
    this.endingFrac = 0;
    this.pendingAuto = null;
    this.pendingKind = null;
    this.ducked = false;
    void this.ctx?.close();
    this.ctx = null;
  }
}

export const audio = new AudioManager();

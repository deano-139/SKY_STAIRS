/** Tiny procedural WebAudio blips — no assets, created lazily on first user gesture. */
export class SFX {
  muted = false;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;

  private ensure(): AudioContext | null {
    try {
      if (!this.ctx) {
        const AC =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AC) return null;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.32;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return this.ctx;
    } catch {
      return null;
    }
  }

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType,
    vol: number,
    slideTo?: number,
    delay = 0
  ) {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    try {
      const t0 = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g).connect(this.master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    } catch {
      /* audio is flavor — never crash the game */
    }
  }

  click() { this.tone(660, 0.06, "square", 0.25); }

  /** Each character turns with its own little sound. */
  turn(kind: "pop" | "woosh" | "chirp" | "zap" | "bling" | "whistle" | "buzz" | "chime") {
    switch (kind) {
      case "pop":     this.tone(520, 0.06, "square", 0.22, 260); break;
      case "woosh":   this.tone(720, 0.13, "sawtooth", 0.12, 170); break;
      case "chirp":   this.tone(880, 0.05, "square", 0.2, 1320); break;
      case "zap":     this.tone(1500, 0.06, "sawtooth", 0.15, 300); this.tone(2100, 0.05, "square", 0.1, 600, 0.03); break;
      case "bling":   this.tone(1568, 0.09, "triangle", 0.24); this.tone(2093, 0.08, "triangle", 0.18, undefined, 0.05); break;
      case "whistle": this.tone(900, 0.13, "sine", 0.2, 1650); break;
      case "buzz":    this.tone(220, 0.07, "square", 0.2, 180); this.tone(220, 0.07, "square", 0.16, 160, 0.07); break;
      case "chime":   this.tone(1046, 0.13, "triangle", 0.22, 1568); break;
    }
  }
  jump(combo: number) {
    const f = 300 * Math.pow(1.045, Math.min(combo, 24));
    this.tone(f, 0.09, "square", 0.22, f * 1.5);
  }
  coin() {
    this.tone(920, 0.07, "square", 0.22);
    this.tone(1380, 0.11, "square", 0.2, undefined, 0.06);
  }
  bonus() {
    this.tone(700, 0.08, "square", 0.2);
    this.tone(1050, 0.09, "square", 0.2, undefined, 0.07);
    this.tone(1400, 0.12, "square", 0.18, undefined, 0.14);
  }
  fail() {
    this.tone(320, 0.5, "sawtooth", 0.28, 70);
    this.tone(160, 0.6, "square", 0.18, 50, 0.05);
  }
  milestone() {
    [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.12, "square", 0.2, undefined, i * 0.07));
  }
  unlock() {
    [392, 494, 587, 784, 988, 1175].forEach((f, i) =>
      this.tone(f, 0.16, i < 3 ? "square" : "triangle", 0.22, undefined, i * 0.075)
    );
    this.tone(1568, 0.3, "triangle", 0.16, undefined, 0.5);
  }
  start() {
    this.tone(392, 0.1, "square", 0.22);
    this.tone(587, 0.14, "square", 0.22, undefined, 0.09);
  }
  buy() {
    [600, 800, 1000, 1300].forEach((f, i) => this.tone(f, 0.09, "triangle", 0.26, undefined, i * 0.06));
  }
  denied() {
    this.tone(170, 0.1, "square", 0.24);
    this.tone(130, 0.16, "square", 0.24, undefined, 0.1);
  }
}

/**
 * Chiptune background loop. A tiny 16-step sequencer driven by the WebAudio
 * clock (not setInterval timing), so it stays in time. Bass + square lead +
 * a sparkle arpeggio, in a bright major key that matches the endless climb.
 */
export class BGM {
  muted = false;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private timer: number | null = null;
  private step = 0;
  private nextTime = 0;
  private readonly spb = 60 / 132 / 2; // 132 bpm, eighth-note steps

  /* note helpers: scale degree -> frequency (C major pentatonic-ish) */
  private n(midi: number) { return 440 * Math.pow(2, (midi - 69) / 12); }

  /* 16-step patterns (midi). -1 = rest. */
  private bass = [36, -1, 43, -1, 36, -1, 43, -1, 41, -1, 48, -1, 43, -1, 47, -1];
  private lead = [60, 64, 67, 72, 67, 64, 69, -1, 64, 67, 72, 76, 72, 67, 64, -1];
  private arp = [72, 76, 79, 84, 79, 76, 72, 76, 79, 84, 88, 84, 79, 76, 74, 71];

  private ensure(): AudioContext | null {
    try {
      if (!this.ctx) {
        const AC =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AC) return null;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.16;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return this.ctx;
    } catch {
      return null;
    }
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.16, this.ctx.currentTime, 0.05);
    }
  }

  private voice(freq: number, t: number, dur: number, type: OscillatorType, vol: number) {
    if (!this.ctx || !this.master) return;
    try {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g).connect(this.master);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    } catch {
      /* never let music crash the game */
    }
  }

  private scheduleStep(s: number, t: number) {
    const i = s % 16;
    const b = this.bass[i];
    const l = this.lead[i];
    const a = this.arp[i];
    if (b >= 0) this.voice(this.n(b), t, this.spb * 1.8, "triangle", 0.5);
    if (l >= 0) this.voice(this.n(l), t, this.spb * 0.9, "square", 0.22);
    if (a >= 0) this.voice(this.n(a), t, this.spb * 0.45, "square", 0.09);
    /* soft hi-hat tick on every beat for forward motion */
    if (i % 2 === 0) this.voice(this.n(89), t, 0.03, "square", 0.05);
  }

  start() {
    const ctx = this.ensure();
    if (!ctx || this.timer !== null) return;
    this.step = 0;
    this.nextTime = ctx.currentTime + 0.08;
    this.timer = window.setInterval(() => this.tick(), 30);
  }

  stop() {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private tick() {
    const ctx = this.ctx;
    if (!ctx) return;
    /* schedule ahead ~0.12s so playback stays gap-free */
    while (this.nextTime < ctx.currentTime + 0.12) {
      this.scheduleStep(this.step, this.nextTime);
      this.nextTime += this.spb;
      this.step++;
    }
  }
}

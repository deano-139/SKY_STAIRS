import { SKINS, type SkinDef } from "./skins";
import { SFX, BGM } from "./audio";
import {
  SPR_STAND, SPR_JUMP, SPR_FALL, SPR_W, SPR_H,
  ACCESSORIES, COIN_SPR, COIN_PAL, ARROW_UP, ARROW_SIDE,
  CLOUD_SPR, CLOUD_PAL, MOON_SPR, MOON_PAL, PLANET_SPR, PLANET_PAL,
  WALKER_A, WALKER_B, WALKER_PAL, BIRD_A, BIRD_B, BIRD_PAL,
  PLANE_SPR, PLANE_PAL, BALLOON_SPR, BALLOON_PAL, SATELLITE_SPR, SATELLITE_PAL,
  blit, blitSquash, blitAccessory, charPalette, shadeHex,
} from "./sprites";

/* ============================================================= */
/*  SkySteps engine — pixel-art endless staircase climber.       */
/*  L-SHIFT = turn around + climb the step behind you.           */
/*  R-SHIFT = climb the step ahead of you, no turning.           */
/* ============================================================= */

export interface RunResult {
  stairs: number;
  runCoins: number;
  best: number;
  newBest: boolean;
}

export interface EngineCallbacks {
  onStarted: () => void;
  onGameOver: (r: RunResult) => void;
  onCoin: () => void;
  onPauseChange: (paused: boolean) => void;
  /** A milestone climber (earned by stair count) was unlocked for the first time. */
  onMilestoneUnlocked?: (id: string) => void;
}

type Side = -1 | 1;

interface Step {
  idx: number;
  x: number; // world x of the step's LEFT edge
  y: number; // world y of the step top (smaller = higher)
  coin: boolean;
  coinTaken: boolean;
  coinPhase: number;
}

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; max: number; size: number;
  color: string; kind: "puff" | "spark" | "flame" | "star" | "ring" | "bubble";
  plus: boolean;
}

interface FloatText {
  x: number; y: number; life: number; max: number;
  text: string; color: string; size: number; display: boolean;
  world: boolean;
}

interface Star { x: number; y: number; s: number; tw: number; }
interface Cloud { x: number; y: number; s: number; }

const JUMP_T = 0.135;
const TURN_T = 0.11;
const SAVE_ALT = 700; // stairs at which sky/stairs fully shift palette
const MAX_RUN = 7;    // max consecutive steps in the same direction (long straight runs, fewer turns)

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

function hexToRgb(color: string): [number, number, number] {
  const m = /^rgba?\((\d+),(\d+),(\d+)/.exec(color);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  const h = color.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}
function mixHex(a: string, b: string, t: number): string {
  const ca = hexToRgb(a), cb = hexToRgb(b);
  return `rgb(${Math.round(lerp(ca[0], cb[0], t))},${Math.round(lerp(ca[1], cb[1], t))},${Math.round(lerp(ca[2], cb[2], t))})`;
}

/* sky stages: vibrant sunrise over the city -> crisp morning -> high blue -> edge of space */
const SKIES = [
  { top: "#4fb3f2", mid: "#9fdcf9", low: "#ffedb8" },
  { top: "#3f9ef0", mid: "#8fd2fa", low: "#d9f2ff" },
  { top: "#2f6fd8", mid: "#6ba4ec", low: "#bcd9f7" },
  { top: "#1c3f8f", mid: "#3a63b8", low: "#7fa0e0" },
  { top: "#0b1030", mid: "#1a2150", low: "#32407a" },
];
const STAIR_FRONT: [string, string, string] = ["#0ea88e", "#2f9fd0", "#4f6fd8"];
const STAIR_TOP: [string, string, string] = ["#b8ffe9", "#d9f4ff", "#e8ecff"];
const INK = "#12081f";

export class SkyStepsEngine {
  readonly sfx = new SFX();
  private bgm = new BGM();
  private audioUnlocked = false;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cb: EngineCallbacks;
  private raf = 0;
  private lastT = 0;
  private time = 0;

  /* internal (chunky) resolution + upscale factor */
  private SCALE = 3;
  private W = 320;
  private H = 240;

  private mode: "menu" | "play" | "dying" = "menu";
  paused = false;
  best = 0;
  skin: SkinDef;

  /* milestone climbers already owned (seeded from localStorage by App) */
  private milestoneOwned = new Set<string>();

  /* staircase geometry (recomputed on resize) */
  private stepW = 60;
  private stepH = 32;
  private sprPx = 3;

  /* run state */
  private steps: Step[] = [];
  private baseIdx = 0;
  private upRunDir: Side = 1;
  private upRunLen = 0;
  private idx = 0;
  private groundIdx = -1; // the wide rooftop/ground the run starts from
  stairs = 0;
  runCoins = 0;
  private bar = 100;
  private combo = 0;
  private comboPop = 0;
  private lastLand = -10;
  private reported = false;
  private deathT = 0;
  private menuTimer = 0;

  /* player */
  private px = 0; private py = 0;
  private pstate: "stand" | "jump" | "fall" = "stand";
  private jt = 0;
  private fx = 0; private fy = 0; private tx = 0; private ty = 0;
  private pvx = 0; private pvy = 0;
  private face: Side = 1;
  private turnT = 0;
  private turnFrom: Side = 1;
  private squash = 0;
  private bounceT = 0;
  private stairPop = 0;
  private runPhase = 0;
  private blinkT = 2;
  /* buffered presses made mid-jump — a queue of up to 2 so fast mashers
     never lose a "turn" or a "climb", applied in order on landing */
  private pending: { type: "back" | "fwd"; at: number }[] = [];

  /* fx */
  private cam = 0;
  private camX = 0;
  private shake = 0;
  private flashRed = 0;
  private particles: Particle[] = [];
  private texts: FloatText[] = [];
  private stars: Star[] = [];
  private clouds: Cloud[] = [];

  private onKeyDown: (e: KeyboardEvent) => void;
  private onKeyUp: (e: KeyboardEvent) => void;
  private onResize: () => void;
  private onPointer: (e: PointerEvent) => void;
  private onBlur: () => void;
  private destroyed = false;

  constructor(canvas: HTMLCanvasElement, cb: EngineCallbacks, skin: SkinDef) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    this.ctx = ctx;
    this.cb = cb;
    this.skin = skin;

    for (let i = 0; i < 110; i++) {
      this.stars.push({ x: Math.random(), y: Math.random(), s: Math.random() < 0.25 ? 2 : 1, tw: Math.random() * 6.28 });
    }
    for (let i = 0; i < 6; i++) {
      this.clouds.push({ x: Math.random(), y: Math.random() * 0.7, s: 0.7 + Math.random() * 0.8 });
    }

    this.onResize = () => this.resize();
    this.onKeyDown = (e) => this.keyDown(e);
    this.onKeyUp = (e) => { e.preventDefault(); };
    this.onPointer = (e) => this.pointer(e);
    this.onBlur = () => { if (this.mode === "play" && !this.paused) this.setPaused(true); };

    window.addEventListener("resize", this.onResize);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    canvas.addEventListener("pointerdown", this.onPointer);

    try {
      if (document.fonts) {
        void document.fonts.load('8px "Press Start 2P"');
        void document.fonts.load('16px "Press Start 2P"');
      }
    } catch { /* fine */ }

    this.resize();
    this.buildScene(0);
    this.lastT = performance.now();
    const loop = (t: number) => {
      if (this.destroyed) return;
      const dt = clamp((t - this.lastT) / 1000, 0, 0.04);
      this.lastT = t;
      this.update(dt);
      this.draw();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  destroy() {
    this.destroyed = true;
    this.bgm.stop();
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    this.canvas.removeEventListener("pointerdown", this.onPointer);
  }

  /* ------------------------------ public API ------------------------------ */

  start() {
    this.mode = "play";
    this.paused = false;
    this.stairs = 0;
    this.runCoins = 0;
    this.bar = 100;
    this.combo = 0;
    this.reported = false;
    this.pending.length = 0;
    this.shake = 0;
    this.flashRed = 0;
    this.turnT = 0;
    this.texts.length = 0;
    this.particles.length = 0;
    this.buildScene(0);
    this.addText(this.W / 2, this.H * 0.4, "GO!", "#ffd23f", 16, true, false);
    this.sfx.start();
    this.bgm.start();
    this.cb.onStarted();
  }

  toMenu() {
    this.buildScene(0);
    this.mode = "menu";
    this.paused = false;
    this.menuTimer = 0.5;
    /* the tune keeps playing on the menu once it's been unlocked */
  }

  setPaused(p: boolean) {
    if (this.mode !== "play") return;
    if (this.paused === p) return;
    this.paused = p;
    if (p) this.bgm.stop();
    else this.bgm.start();
    this.sfx.click();
    this.cb.onPauseChange(p);
  }

  togglePause() { this.setPaused(!this.paused); }

  setSkin(s: SkinDef) { this.skin = s; }
  setBest(b: number) { this.best = b; }
  /** Seed which milestone climbers are already owned so we never re-unlock them. */
  setOwnedMilestones(ids: string[]) { this.milestoneOwned = new Set(ids); }
  setMuted(m: boolean) {
    this.sfx.muted = m;
    this.bgm.setMuted(m);
  }

  /* ------------------------------ staircase ------------------------------ */

  private yOf(idx: number) { return -idx * this.stepH; }

  private makeStep(idx: number, x: number, coin: boolean): Step {
    return { idx, x, y: this.yOf(idx), coin, coinTaken: false, coinPhase: Math.random() * 6.28 };
  }

  /** Random direction with a run cap and a gentle pull back toward center.
      Wide drift + long runs = gentle sweeping zigzags, not twitchy turns. */
  private pickDir(fromCenter: number, runDir: Side, runLen: number): Side {
    if (runLen >= MAX_RUN) return -runDir as Side;
    const maxDrift = Math.max(this.stepW * 7, this.W * 0.44);
    if (fromCenter + this.stepW > maxDrift) return -1;
    if (fromCenter - this.stepW < -maxDrift) return 1;
    /* prefer to keep the current run going (fewer turn points), nudged by drift */
    const driftBias = (fromCenter / maxDrift) * 0.18; // positive = leaning right, so pull left
    const pContinue = 0.66 - runDir * driftBias;
    return Math.random() < pContinue ? runDir : (-runDir as Side);
  }

  private pushStepUp(force?: Side) {
    const last = this.steps[this.steps.length - 1];
    const center = last.x + this.stepW / 2;
    const dir = force ?? this.pickDir(center, this.upRunDir, this.upRunLen);
    if (dir === this.upRunDir) this.upRunLen++;
    else { this.upRunDir = dir; this.upRunLen = 1; }
    const x = last.x + dir * this.stepW;
    const idx = last.idx + 1;
    const coin = idx > 2 && Math.random() < 0.3;
    this.steps.push(this.makeStep(idx, x, coin));
  }

  private buildScene(centerIdx: number) {
    this.stepW = clamp(Math.round(this.W * 0.13), 24, 36);
    this.stepH = clamp(Math.round(this.W * 0.07), 14, 20);
    this.sprPx = this.SCALE >= 3 ? 3 : 2;

    const steps: Step[] = [];
    const x0 = -this.stepW / 2;
    steps.push(this.makeStep(centerIdx, x0, false));
    /* a fresh run (idx 0) begins on a wide rooftop; resizes mid-run keep it */
    if (centerIdx === 0) this.groundIdx = 0;

    this.steps = steps;
    this.upRunDir = Math.random() < 0.5 ? -1 : 1;
    this.upRunLen = 0;
    const topCount = Math.ceil((this.H * 0.62 + 220) / this.stepH) + 4;
    /* first step is always ahead of the climber so the run opens with a simple R-SHIFT hop */
    for (let i = 0; i < topCount; i++) this.pushStepUp(i === 0 ? 1 : undefined);

    /* downward random walk (below the player — the tower continues off-screen) */
    let cx = x0 + this.stepW / 2;
    let dRunDir: Side = Math.random() < 0.5 ? -1 : 1;
    let dRunLen = 0;
    const botCount = Math.ceil((this.H * 0.38 + 240) / this.stepH) + 3;
    const below: Step[] = [];
    for (let i = 1; i <= botCount; i++) {
      const dir = this.pickDir(cx, dRunDir, dRunLen);
      if (dir === dRunDir) dRunLen++;
      else { dRunDir = dir; dRunLen = 1; }
      cx -= dir * this.stepW;
      below.push(this.makeStep(centerIdx - i, cx - this.stepW / 2, false));
    }
    below.reverse();
    this.steps = below.concat(steps);
    this.baseIdx = centerIdx - botCount;

    this.idx = centerIdx;
    const cur = this.stepAt(this.idx);
    this.px = cur.x + this.stepW / 2;
    this.py = cur.y;
    this.pstate = "stand";
    this.cam = this.py - this.stepH * 0.85;
    this.camX = 0;
    this.face = 1;
    this.turnT = 0;
    this.squash = 0;
    this.particles.length = 0;
  }

  private ensureSteps() {
    const neededTop = this.cam - this.H * 0.62 - 160;
    while (this.steps[this.steps.length - 1].y > neededTop) this.pushStepUp();
    while (
      this.steps.length > 4 &&
      this.steps[0].y - this.cam + this.H * 0.62 > this.H + 220
    ) {
      this.steps.shift();
      this.baseIdx++;
    }
  }

  private stepAt(i: number): Step {
    const s = this.steps[i - this.baseIdx];
    if (s) return s;
    return this.makeStep(i, 0, false);
  }

  /** Which side the next step is on relative to the current one. */
  private dirTo(i: number): Side {
    return this.stepAt(i).x >= this.stepAt(i - 1).x ? 1 : -1;
  }

  private stepCenter(s: Step) { return s.x + this.stepW / 2; }

  /* ------------------------------ input ------------------------------ */

  /** Music needs a user gesture to start (autoplay policy) — unlock once. */
  private unlockAudio() {
    if (this.audioUnlocked) return;
    this.audioUnlocked = true;
    this.bgm.start();
  }

  private keyDown(e: KeyboardEvent) {
    this.unlockAudio();
    const c = e.code;
    if (c === "Escape" || c === "KeyP") {
      if (this.mode === "play") { e.preventDefault(); this.togglePause(); }
      return;
    }
    /* the only two buttons:
       L-SHIFT ("back")  = turn around AND climb the step now in front of you
       R-SHIFT ("fwd")   = climb the step in front of you, no turning

       e.location (1 = left, 2 = right) is the most reliable way to tell the
       two shifts apart: some OS/browser/keyboard combos (iPad keyboards,
       remote desktop, exotic layouts) misreport or omit e.code entirely.
       A shift we cannot identify as the LEFT one is treated as the RIGHT
       one — pure climb, never a turn — so R-SHIFT can never spin you. */
    const isShiftKey = c === "ShiftLeft" || c === "ShiftRight" || e.key === "Shift";
    if (!isShiftKey) return;
    e.preventDefault();
    if (e.repeat) return;
    if (e.location === 1 || (e.location === 0 && c === "ShiftLeft")) this.act("back");
    else this.act("fwd"); // right shift — or any shift we can't prove is left
  }

  private pointer(e: PointerEvent) {
    this.unlockAudio();
    if (this.mode !== "play") return;
    const r = this.canvas.getBoundingClientRect();
    /* left half = turn & climb, right half = climb (tap fallback) */
    this.act(e.clientX - r.left < r.width / 2 ? "back" : "fwd");
  }

  /* touch-button entry points (also used by tap halves) */
  pressBack() { this.unlockAudio(); this.act("back"); }
  pressFwd() { this.unlockAudio(); this.act("fwd"); }

  /**
   * "back" ALWAYS turns you around first, then climbs the step now in front —
   * it only lands when the next step was behind you. Pressing it while the
   * step is ahead spins you into the void and you tumble.
   * "fwd" climbs the step in front of you without turning — ever.
   */
  private act(type: "back" | "fwd") {
    if (this.mode === "menu") { this.start(); return; }
    if (this.mode === "dying") {
      if (this.reported && this.deathT > 1.1) this.start();
      return;
    }
    if (this.paused) { this.setPaused(false); return; }
    if (this.pstate === "jump") {
      this.pending.push({ type, at: this.time });
      if (this.pending.length > 2) this.pending.shift(); // keep only the newest two
      return;
    }
    if (type === "back") this.doTurn(); // unconditional 180° spin
    this.doClimb(); // succeeds only if facing the next step after any spin
  }

  /** Hop up one step — only works when facing the way the staircase goes. */
  private doClimb() {
    if (this.pstate === "fall") return;
    const want = this.dirTo(this.idx + 1);
    if (this.face !== want) { this.fail(); return; }
    const next = this.stepAt(this.idx + 1);
    this.fx = this.px;
    this.fy = this.py;
    this.tx = this.stepCenter(next);
    this.ty = next.y;
    this.px = this.fx;
    this.py = this.fy;
    this.pstate = "jump";
    this.jt = 0;
    this.turnT = 0;
    this.bounceT = 0;
    this.sfx.jump(this.combo);
  }

  /** Spin to face the other way — always safe, never fails. */
  private doTurn() {
    if (this.pstate === "fall") return;
    this.turnFrom = this.face;
    this.face = (this.face === 1 ? -1 : 1) as Side;
    this.turnT = TURN_T;
    this.squash = 1;
    this.turnBurst();
    this.sfx.turn(this.skin.turnSnd);
  }

  private land() {
    this.idx++;
    this.stairs = this.idx;
    this.pstate = "stand";
    this.px = this.tx;
    this.py = this.ty;
    this.squash = 1;
    this.bounceT = 1;
    this.stairPop = 1;
    this.runPhase = 0;

    const now = this.time;
    this.combo = now - this.lastLand < 0.62 ? this.combo + 1 : 1;
    this.lastLand = now;
    if (this.combo >= 2) this.comboPop = 1;

    this.dust(this.px, this.py, 6);

    if (this.mode === "play") {
      this.bar = clamp(this.bar + 9, 0, 100);
      if (this.combo > 0 && this.combo % 10 === 0) {
        for (let i = 0; i < 5; i++) this.cb.onCoin();
        this.runCoins += 5;
        this.addText(this.px, this.py - 40, "COMBO +5", "#ffd23f", 8, false, true);
        this.sfx.bonus();
      }
      if (this.stairs > 0 && this.stairs % 100 === 0) {
        this.bar = clamp(this.bar + 30, 0, 100);
        this.addText(this.W / 2, this.H * 0.36, `${this.stairs}!`, "#3ff2c8", 14, true, false);
        this.sfx.milestone();
      }
      this.checkMilestoneUnlock();
    } else {
      this.menuTimer = 0.2 + Math.random() * 0.16;
    }

    /* drain buffered presses in order — stops when we're airborne again or
       a press is stale, so rapid mashers never lose a turn or a climb */
    while (this.pending.length) {
      if (this.pstate !== "stand") break;
      if (now - this.pending[0].at >= 0.5) { this.pending.shift(); continue; }
      const p = this.pending.shift()!;
      if (p.type === "back") this.doTurn(); // L-move: always spins first
      this.doClimb(); // then climb; buffered R-move climbs with no turn
    }
  }

  private fail() {
    if (this.mode !== "play") return;
    this.mode = "dying";
    this.deathT = 0;
    this.pstate = "fall";
    this.pvx = this.face * 220;
    this.pvy = -320;
    this.shake = 1;
    this.flashRed = 1;
    this.sfx.fail();
    this.pending.length = 0;
  }

  /** Fire when the player lands on a stair that awards a milestone climber. */
  private checkMilestoneUnlock() {
    const hit = SKINS.find((s) => s.unlockAt === this.stairs);
    if (!hit || this.milestoneOwned.has(hit.id)) return;
    this.milestoneOwned.add(hit.id);
    this.sfx.unlock();
    this.confettiBurst(this.px, this.py - this.sprPx * 7);
    this.addText(this.W / 2, this.H * 0.28, "NEW CLIMBER!", "#ffd23f", 14, true, false);
    this.addText(this.W / 2, this.H * 0.28 + 18, hit.name.toUpperCase(), "#3ff2c8", 8, true, false);
    this.cb.onMilestoneUnlocked?.(hit.id);
  }

  /* celebratory multicolour burst */
  private confettiBurst(x: number, y: number) {
    const cols = ["#ffd23f", "#3ff2c8", "#ff5d7e", "#8fa0ff", "#ff8c42", "#b6f04a"];
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * 6.28;
      const sp = 60 + Math.random() * 150;
      this.particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 60,
        life: 0, max: 0.5 + Math.random() * 0.3,
        size: Math.random() < 0.5 ? 2 : 1,
        color: cols[i % cols.length],
        kind: "spark", plus: false,
      });
    }
  }

  /* ------------------------------ update ------------------------------ */

  private update(dt: number) {
    this.time += dt;
    this.shake = Math.max(0, this.shake - dt * 2.4);
    this.flashRed = Math.max(0, this.flashRed - dt * 1.6);
    this.comboPop = Math.max(0, this.comboPop - dt * 3);
    this.squash = Math.max(0, this.squash - dt * 7);
    this.bounceT = Math.max(0, this.bounceT - dt * 5.5);
    this.stairPop = Math.max(0, this.stairPop - dt * 3.4);
    this.turnT = Math.max(0, this.turnT - dt);
    this.blinkT -= dt;
    if (this.blinkT < -0.12) this.blinkT = 1.6 + Math.random() * 2.4;

    if (this.paused) return;

    /* menu autopilot demo — turns then climbs, like a player would */
    if (this.mode === "menu") {
      if (this.pstate === "stand") {
        this.menuTimer -= dt;
        if (this.menuTimer <= 0) {
          /* autopilot plays by the real rules: the L-move (turn + climb) when the step is behind, R-move when ahead */
          if (this.face !== this.dirTo(this.idx + 1)) this.doTurn();
          this.doClimb();
        }
      }
    }

    /* idle shuffle toward the edge being faced */
    if (this.pstate === "stand") {
      const cur = this.stepAt(this.idx);
      const inset = clamp(this.stepW * 0.26, 10, 18);
      const target = this.stepCenter(cur) + this.face * (this.stepW / 2 - inset);
      const k = 1 - Math.exp(-dt * 14);
      this.px += (target - this.px) * k;
      this.py = cur.y;
      this.runPhase += Math.abs(target - this.px) > 2 ? dt * 20 : 0;
    }

    /* player jump — easeOut horizontal (quick lunge, soft arrival) over a
       symmetric hop arc; stretch/squash is handled in drawPlayer */
    if (this.pstate === "jump") {
      this.jt += dt / JUMP_T;
      this.runPhase += dt * 26;
      const t = clamp(this.jt, 0, 1);
      const te = 1 - Math.pow(1 - t, 3);
      this.px = lerp(this.fx, this.tx, te);
      this.py = lerp(this.fy, this.ty, t) - Math.sin(Math.PI * t) * (this.stepH * 0.72);
      this.trail();
      if (this.jt >= 1) this.land();
    } else if (this.pstate === "fall") {
      this.pvy += 1100 * dt;
      this.py += this.pvy * dt;
      this.px += this.pvx * dt;
      this.runPhase += dt * 14;
    }

    /* energy bar — drains fast and keeps ramping: 12/s at the bottom up to
       38/s around stair 305. Each step pays back +9, so you need ~1.4
       steps/s early and a sustained ~4.2 steps/s near the top. */
    if (this.mode === "play" && this.pstate !== "fall") {
      const drain = 12 + Math.min(26, this.stairs * 0.085);
      this.bar -= drain * dt;
      if (this.bar <= 0) { this.bar = 0; this.fail(); }
    }

    /* coins */
    if (this.mode === "play") {
      for (const s of this.steps) {
        if (!s.coin || s.coinTaken) continue;
        if (Math.abs(s.idx - this.idx) > 2) continue;
        const cx = this.stepCenter(s);
        const cy = s.y - this.stepH * 0.62;
        const dx = cx - this.px, dy = cy - (this.py - 14);
        if (dx * dx + dy * dy < 26 * 26) {
          s.coinTaken = true;
          this.runCoins++;
          this.cb.onCoin();
          this.sfx.coin();
          this.sparkle(cx, cy);
          this.addText(cx, cy - 10, "+1", "#ffd23f", 8, false, true);
        }
      }
    }

    /* camera follows the climber on both axes */
    if (this.pstate !== "fall") {
      /* smoothed follow with a small look-ahead toward the way we face */
      const k = 1 - Math.exp(-dt * 10);
      this.cam += (this.py - this.stepH * 0.85 - this.cam) * k;
      const kx = 1 - Math.exp(-dt * 8);
      this.camX += (this.px + this.face * this.stepW * 0.45 - this.camX) * kx;
    }

    /* dying report */
    if (this.mode === "dying") {
      this.deathT += dt;
      if (!this.reported && this.deathT > 0.95) {
        this.reported = true;
        const newBest = this.stairs > this.best;
        if (newBest) this.best = this.stairs;
        this.cb.onGameOver({ stairs: this.stairs, runCoins: this.runCoins, best: this.best, newBest });
      }
    }

    this.ensureSteps();

    /* particles */
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.max) { this.particles.splice(i, 1); continue; }
      const grav =
        p.kind === "ring" ? 0 :
        p.kind === "bubble" ? -90 :
        p.kind === "flame" ? -40 :
        p.kind === "puff" ? 40 : 210;
      p.vy += grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life += dt;
      t.y -= 22 * dt;
      if (t.life >= t.max) this.texts.splice(i, 1);
    }
  }

  /* ------------------------------ fx spawners ------------------------------ */

  private dust(x: number, y: number, n: number) {
    for (let i = 0; i < n; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 12, y: y - 1,
        vx: (Math.random() - 0.5) * 80, vy: -Math.random() * 45 - 12,
        life: 0, max: 0.3 + Math.random() * 0.18, size: Math.random() < 0.5 ? 1 : 2,
        color: "#e6ecff", kind: "puff", plus: false,
      });
    }
  }

  /* Character-specific burst when spinning around. */
  private turnBurst() {
    const fx = this.skin.turnFx;
    const col = this.skin.turnColor;
    const cx = this.px, cy = this.py - this.sprPx * 7;
    if (fx === "ring") {
      this.particles.push({ x: cx, y: cy, vx: 0, vy: 0, life: 0, max: 0.34, size: 2, color: col, kind: "ring", plus: false });
      return;
    }
    const n = fx === "stardust" ? 7 : fx === "bubble" ? 6 : 9;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.28;
      const sp = 30 + Math.random() * 90;
      let kind: Particle["kind"] = "spark";
      let color = col;
      let plus = false;
      let vy = Math.sin(a) * sp - 20;
      let vx = Math.cos(a) * sp;
      let size = Math.random() < 0.4 ? 2 : 1;
      let max = 0.34 + Math.random() * 0.2;
      if (fx === "poof") { kind = "puff"; color = "#dfe6f5"; size = Math.random() < 0.5 ? 2 : 1; }
      if (fx === "sparkle") { kind = "star"; plus = true; }
      if (fx === "flame") { kind = "flame"; color = Math.random() < 0.5 ? "#ffb347" : "#ff6a3d"; vy = -40 - Math.random() * 50; vx *= 0.5; }
      if (fx === "zap") { kind = "spark"; color = Math.random() < 0.5 ? col : "#ffffff"; plus = Math.random() < 0.6; }
      if (fx === "confetti") {
        kind = "spark";
        color = ["#ffd23f", "#3ff2c8", "#ff5d7e", "#8fa0ff", "#ff8c42"][i % 5];
        plus = false;
      }
      if (fx === "bubble") { kind = "bubble"; color = col; vy = -30 - Math.random() * 30; vx *= 0.4; size = 1 + (i % 2); max = 0.5; }
      if (fx === "stardust") { kind = "star"; plus = true; color = Math.random() < 0.5 ? "#fff3b0" : "#c3bcff"; size = 2; max = 0.5; }
      this.particles.push({
        x: cx + (Math.random() - 0.5) * 10, y: cy + (Math.random() - 0.5) * 8,
        vx, vy, life: 0, max, size, color, kind, plus,
      });
    }
  }

  private sparkle(x: number, y: number) {
    for (let i = 0; i < 9; i++) {
      const a = Math.random() * 6.28, sp = 40 + Math.random() * 100;
      this.particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 26,
        life: 0, max: 0.36 + Math.random() * 0.2, size: Math.random() < 0.4 ? 2 : 1,
        color: Math.random() < 0.5 ? "#ffd23f" : "#fff3c9", kind: "spark",
        plus: Math.random() < 0.35,
      });
    }
  }

  private trail() {
    const s = this.skin;
    this.particles.push({
      x: this.px - this.face * 6 + (Math.random() - 0.5) * 4,
      y: this.py - 4 + (Math.random() - 0.5) * 4,
      vx: -this.face * (14 + Math.random() * 26),
      vy: s.trailKind === "flame" ? -26 - Math.random() * 26 : 12 + Math.random() * 18,
      life: 0,
      max: s.trailKind === "star" ? 0.45 : 0.3,
      size: s.trailKind === "puff" ? 2 : 1 + (Math.random() < 0.4 ? 1 : 0),
      color: s.trailKind === "flame" ? (Math.random() < 0.5 ? "#ffb347" : "#ff6a3d") : s.trail,
      kind: s.trailKind,
      plus: s.trailKind === "star",
    });
  }

  private addText(x: number, y: number, text: string, color: string, size: number, display: boolean, world: boolean) {
    this.texts.push({ x, y, life: 0, max: 0.9, text, color, size, display, world });
  }

  /* ------------------------------ resize ------------------------------ */

  private resize() {
    const cw = Math.max(300, this.canvas.clientWidth || window.innerWidth);
    const ch = Math.max(400, this.canvas.clientHeight || window.innerHeight);
    /* render at a low internal resolution, upscale chunky via CSS */
    this.SCALE = Math.min(cw, ch) >= 640 ? 3 : 2;
    this.W = Math.max(160, Math.round(cw / this.SCALE));
    this.H = Math.max(200, Math.round(ch / this.SCALE));
    this.canvas.width = this.W;
    this.canvas.height = this.H;
    this.ctx.imageSmoothingEnabled = false;
    if (this.steps.length) this.buildScene(this.idx);
  }

  /* ------------------------------ draw ------------------------------ */

  private altTint() {
    return clamp(-this.cam / (this.stepH * SAVE_ALT), 0, 1);
  }

  private skyStops() {
    const a = this.altTint();
    const seg = clamp(a * (SKIES.length - 1), 0, SKIES.length - 1 - 1e-6);
    const i = Math.floor(seg), t = seg - i;
    const A = SKIES[i], B = SKIES[i + 1];
    return {
      top: mixHex(A.top, B.top, t), mid: mixHex(A.mid, B.mid, t), low: mixHex(A.low, B.low, t),
      a,
    };
  }

  private stairColor(idx: number, top: boolean): string {
    const t = clamp(idx / SAVE_ALT, 0, 1);
    const seg = clamp(t * 2, 0, 2 - 1e-6);
    const i = Math.min(1, Math.floor(seg)), f = seg - i;
    const pal = top ? STAIR_TOP : STAIR_FRONT;
    return mixHex(pal[i], pal[i + 1], f);
  }

  private worldToScreenX(wx: number) { return Math.round(wx - this.camX + this.W / 2); }
  private worldToScreenY(wy: number) { return Math.round(wy - this.cam + this.H * 0.62); }

  private draw() {
    const { ctx, W, H } = this;
    const sky = this.skyStops();
    ctx.save();
    if (this.shake > 0) {
      ctx.translate(
        Math.round((Math.random() - 0.5) * this.shake * 6),
        Math.round((Math.random() - 0.5) * this.shake * 6)
      );
    }

    this.drawSky(sky);
    this.drawStars(sky.a);
    this.drawCelestial(sky.a);
    this.drawAmbient(sky.a);
    this.drawCity(sky.a);
    this.drawClouds(sky.a);
    this.drawRidges(sky.a);
    this.drawWalkers(sky.a);
    this.drawSteps();
    if (this.pstate !== "fall" || this.worldToScreenY(this.py) < H + 60) this.drawPlayer();
    this.drawParticles();
    this.drawFog();
    this.drawTexts();
    if (this.mode === "play" || this.mode === "dying") this.drawHUD();
    this.drawFrame();
    ctx.restore();
  }

  /* posterized banded sky — no smooth gradients in pixel land */
  private drawSky(sky: { top: string; mid: string; low: string }) {
    const { ctx, H } = this;
    const BANDS = 14;
    const bh = Math.ceil(H / BANDS) + 1;
    for (let i = 0; i < BANDS; i++) {
      const t = i / (BANDS - 1);
      const col = t < 0.55
        ? mixHex(sky.top, sky.mid, t / 0.55)
        : mixHex(sky.mid, sky.low, (t - 0.55) / 0.45);
      ctx.fillStyle = col;
      ctx.fillRect(0, i * bh, this.W, bh);
    }
  }

  private drawStars(alt: number) {
    const { ctx, W, H } = this;
    const vis = smooth(0.22, 0.55, alt);
    if (vis <= 0.01) return;
    for (const st of this.stars) {
      const span = H * 1.6;
      let sy = (st.y * span - this.cam * 0.12) % span;
      if (sy < 0) sy += span;
      sy = Math.round(sy - H * 0.3);
      if (sy < -4 || sy > H + 4) continue;
      const tw = Math.sin(this.time * 2.2 + st.tw);
      ctx.globalAlpha = vis * (tw > 0.25 ? 1 : 0.45);
      ctx.fillStyle = "#dfe9ff";
      ctx.fillRect(Math.round(st.x * W), sy, st.s, st.s);
    }
    ctx.globalAlpha = 1;
  }

  private drawCelestial(alt: number) {
    const { ctx, W, H } = this;
    const moonA = smooth(0.18, 0.45, alt) * (1 - smooth(0.75, 0.95, alt));
    if (moonA > 0.02) {
      ctx.globalAlpha = Math.round(moonA * 4) / 4;
      blit(ctx, MOON_SPR, MOON_PAL, Math.round(W * 0.76), Math.round(H * 0.14), this.SCALE >= 3 ? 3 : 2);
      ctx.globalAlpha = 1;
    }
    const plA = smooth(0.72, 0.95, alt);
    if (plA > 0.02) {
      ctx.globalAlpha = Math.round(plA * 4) / 4;
      blit(ctx, PLANET_SPR, PLANET_PAL, Math.round(W * 0.16), Math.round(H * 0.2), this.SCALE >= 3 ? 3 : 2);
      ctx.globalAlpha = 1;
    }
  }

  private drawClouds(alt: number) {
    const { ctx, W, H } = this;
    const vis = 1 - smooth(0.12, 0.42, alt);
    if (vis <= 0.02) return;
    ctx.globalAlpha = vis;
    const px = this.SCALE >= 3 ? 3 : 2;
    for (const c of this.clouds) {
      const span = H * 1.8;
      let sy = (c.y * span - this.cam * 0.22) % span;
      if (sy < 0) sy += span;
      sy = Math.round(sy - H * 0.4);
      if (sy < -60 || sy > H + 60) continue;
      const s = c.s;
      blit(ctx, CLOUD_SPR, CLOUD_PAL, Math.round(c.x * W - 21 * s), sy, Math.max(1, Math.round(px * s)));
    }
    ctx.globalAlpha = 1;
  }

  /* City skyline at the start of the climb — you begin on a rooftop and
     rise up through the town, past the clouds, and into space. The city
     fades out below you as altitude grows. */
  private drawCity(alt: number) {
    const { ctx, W, H } = this;
    const vis = 1 - smooth(0.02, 0.3, alt);
    if (vis <= 0.02) return;
    ctx.globalAlpha = vis;
    const colW = 8;
    const par = 0.35;
    /* deterministic pseudo-random per column so it's stable across frames */
    const rnd = (i: number, salt: number) => {
      const v = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
      return v - Math.floor(v);
    };
    for (let x = -colW; x <= W + colW; x += colW) {
      const i = Math.floor((x + this.camX * par) / colW);
      const h1 = rnd(i, 1);
      const h2 = rnd(i, 2);
      const tall = Math.round(H * (0.16 + h1 * 0.22));
      const top = H - tall;
      /* far block */
      ctx.fillStyle = mixHex("#5f7fae", "#26375f", alt);
      ctx.fillRect(x, top, colW - 1, tall);
      /* rooftop cap */
      ctx.fillStyle = mixHex("#7f9cc8", "#33477a", alt);
      ctx.fillRect(x, top, colW - 1, 2);
      /* occasional spire/antenna */
      if (h2 > 0.82) {
        ctx.fillStyle = mixHex("#463067", "#241a40", alt);
        ctx.fillRect(x + 3, top - 6, 2, 6);
        ctx.fillStyle = "#ff5d7e";
        ctx.fillRect(x + 3, top - 7, 2, 1);
      }
      /* lit windows */
      for (let wy = top + 5; wy < H - 6; wy += 6) {
        for (let wx = 1; wx < colW - 3; wx += 4) {
          if (rnd(i * 13 + wy * 7 + wx, 3) > 0.62) {
            ctx.fillStyle = rnd(i + wy + wx, 4) > 0.5 ? "#ffd27a" : "#ffe9b0";
            ctx.fillRect(x + wx, wy, 2, 3);
          }
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  /* Living sky: hot-air balloons, a passing jet with a contrail, flapping
     birds near the city — and a drifting satellite once you reach space.
     All positions derive from this.time, so they're stateless and smooth. */
  private drawAmbient(alt: number) {
    const { ctx, W, H } = this;
    const rnd = (i: number, salt: number) => {
      const v = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
      return v - Math.floor(v);
    };

    /* balloons — low altitude morning drift */
    const balVis = smooth(0.03, 0.16, alt) * (1 - smooth(0.4, 0.58, alt));
    if (balVis > 0.02) {
      ctx.globalAlpha = Math.round(balVis * 4) / 4;
      for (let i = 0; i < 2; i++) {
        const span = H * 1.5;
        let y = (H * 1.25 - ((this.time * 7 + rnd(i, 11) * 900) % span)) % span;
        if (y < -40) y += span;
        const x = Math.round(rnd(i, 12) * (W - 40) + Math.sin(this.time * 0.7 + i * 2.5) * 5);
        blit(ctx, BALLOON_SPR, BALLOON_PAL, x, Math.round(y - H * 0.25), 2);
      }
      ctx.globalAlpha = 1;
    }

    /* jets crossing with a fading contrail */
    const planeVis = smooth(0.1, 0.28, alt) * (1 - smooth(0.5, 0.66, alt));
    if (planeVis > 0.02) {
      ctx.globalAlpha = Math.round(planeVis * 4) / 4;
      for (let i = 0; i < 2; i++) {
        const speed = 46 + i * 22;
        const period = (W + 220) / speed;
        const prog = ((this.time + rnd(i, 21) * period) % period) / period;
        const x = Math.round(-70 + prog * (W + 220));
        const y = Math.round(H * (0.14 + i * 0.16) + Math.sin(this.time * 0.6 + i) * 3);
        for (let k = 1; k <= 8; k++) {
          ctx.globalAlpha = Math.round(planeVis * (1 - k / 9) * 4) / 4;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(x - 16 - k * 7, y + 4, 4, 1);
        }
        ctx.globalAlpha = Math.round(planeVis * 4) / 4;
        blit(ctx, PLANE_SPR, PLANE_PAL, x, y, 2);
        if (Math.floor(this.time * 3) % 2 === 0) {
          ctx.fillStyle = "#ff5d7e";
          ctx.fillRect(x + 26, y + 4, 2, 2);
        }
      }
      ctx.globalAlpha = 1;
    }

    /* birds flapping around the rooftops and clouds */
    const birdVis = smooth(0.04, 0.18, alt) * (1 - smooth(0.55, 0.75, alt));
    if (birdVis > 0.02) {
      ctx.globalAlpha = Math.round(birdVis * 4) / 4;
      for (let i = 0; i < 6; i++) {
        const speed = 26 + rnd(i, 31) * 30;
        const period = (W + 90) / speed;
        const prog = ((this.time * (i % 2 === 0 ? 1 : -1) + rnd(i, 32) * period + period) % period) / period;
        const x = Math.round(-45 + prog * (W + 90));
        const y = Math.round(H * (0.1 + rnd(i, 33) * 0.34) + Math.sin(this.time * 2.2 + i * 1.7) * 5);
        const frame = Math.floor(this.time * 5 + i) % 2 === 0 ? BIRD_A : BIRD_B;
        blit(ctx, frame, BIRD_PAL, x, y, 2, i % 2 === 1);
      }
      ctx.globalAlpha = 1;
    }

    /* a lonely satellite once the sky goes dark */
    const satVis = smooth(0.6, 0.78, alt);
    if (satVis > 0.02) {
      ctx.globalAlpha = Math.round(satVis * 4) / 4;
      const period = (W + 160) / 12;
      const prog = ((this.time + 3) % period) / period;
      const x = Math.round(-80 + prog * (W + 160));
      const y = Math.round(H * 0.13 + Math.sin(this.time * 0.4) * 4);
      blit(ctx, SATELLITE_SPR, SATELLITE_PAL, x, y, 2);
      if (Math.floor(this.time * 2.5) % 2 === 0) {
        ctx.fillStyle = "#ff5d7e";
        ctx.fillRect(x + 10, y - 2, 2, 2);
      }
      ctx.globalAlpha = 1;
    }
  }

  /* Morning commuters strolling across the starting rooftop — the little
     crowd you're climbing away from. Fades out as you leave the city. */
  private drawWalkers(alt: number) {
    const { ctx } = this;
    const vis = 1 - smooth(0.02, 0.2, alt);
    if (vis <= 0.02) return;
    const rnd = (i: number, salt: number) => {
      const v = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
      return v - Math.floor(v);
    };
    const TREAD = Math.max(4, Math.round(this.stepH * 0.24));
    const feetY = this.worldToScreenY(0) - TREAD;
    if (feetY < -30 || feetY > this.H + 60) return;
    ctx.globalAlpha = Math.round(vis * 4) / 4;
    for (let i = 0; i < 5; i++) {
      const speed = (10 + rnd(i, 41) * 14) * (i % 2 === 0 ? 1 : -1);
      const span = 520;
      let wx = ((rnd(i, 42) * span + this.time * speed) % span + span) % span - span / 2;
      if (Math.abs(wx) < this.stepW * 2.2) wx += wx >= 0 ? this.stepW * 2.2 : -this.stepW * 2.2; // keep clear of the tower
      const x = this.worldToScreenX(wx);
      if (x < -20 || x > this.W + 20) continue;
      const frame = Math.floor(this.time * 3.4 + i) % 2 === 0 ? WALKER_A : WALKER_B;
      blit(ctx, frame, WALKER_PAL, x - 6, feetY - 18, 2, speed < 0);
    }
    ctx.globalAlpha = 1;
  }

  /* stepped silhouette hills */
  private drawRidges(alt: number) {
    const { ctx, W, H } = this;
    const ridge = (par: number, base: number, amp: number, freq: number, color: string) => {
      ctx.fillStyle = color;
      const colW = 5;
      for (let x = 0; x <= W + colW; x += colW) {
        const wv =
          Math.sin((x + this.camX * par + this.cam * par * 0.4) * freq) * amp +
          Math.sin((x + this.camX * par) * freq * 2.7 + 2) * amp * 0.4;
        const yy = Math.round((base + wv) / 4) * 4;
        ctx.fillRect(x, yy, colW, H - yy + 4);
      }
    };
    const c1 = mixHex("#7fb5a0", "#1c2f5e", alt);
    const c2 = mixHex("#5f9a86", "#14224a", alt);
    ridge(0.3, H * 0.78, 22, 0.02, c1);
    ridge(0.5, H * 0.88, 16, 0.028, c2);
  }

  /* The connected pixel staircase: each step is a solid block (tread + riser)
     offset from its neighbour by exactly one step width. */
  private drawSteps() {
    const { ctx, W, H, stepW, stepH } = this;
    const TREAD = Math.max(4, Math.round(stepH * 0.24));
    for (const s of this.steps) {
      const sx = this.worldToScreenX(s.x);
      const sy = this.worldToScreenY(s.y);

      /* the starting step renders as a wide rooftop/ground slab */
      if (s.idx === this.groundIdx) {
        this.drawGround(sy, TREAD);
        continue;
      }

      if (sy < -stepH - 40 || sy > H + 60) continue;
      if (sx + stepW < -20 || sx > W + 20) continue;

      const parity = ((s.idx % 2) + 2) % 2;
      const front = shadeHex(this.stairColor(s.idx, false), parity ? 0.9 : 1);
      const top = shadeHex(this.stairColor(s.idx, true), parity ? 0.95 : 1);

      /* 1px dark silhouette (acts as the outline) */
      ctx.fillStyle = INK;
      ctx.fillRect(sx - 1, sy - TREAD - 1, stepW + 2, TREAD + stepH + 2);

      /* riser face */
      ctx.fillStyle = front;
      ctx.fillRect(sx, sy, stepW, stepH);

      /* dither texture on the face */
      ctx.fillStyle = "rgba(8,3,22,0.16)";
      const off0 = parity ? 3 : 0;
      for (let yy = 4; yy < stepH - 2; yy += 6) {
        for (let xx = ((yy / 6) % 2 === 0 ? off0 : off0 + 3) % 6; xx < stepW - 2; xx += 6) {
          ctx.fillRect(sx + xx, sy + yy, 2, 2);
        }
      }

      /* shaded lip under the tread */
      ctx.fillStyle = "rgba(8,3,22,0.28)";
      ctx.fillRect(sx, sy, stepW, 2);
      /* right-edge shade */
      ctx.fillStyle = "rgba(8,3,22,0.18)";
      ctx.fillRect(sx + stepW - 2, sy, 2, stepH);

      /* tread slab */
      ctx.fillStyle = top;
      ctx.fillRect(sx, sy - TREAD, stepW, TREAD);
      /* tread highlight line */
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.fillRect(sx, sy - TREAD, stepW, 1);
      ctx.fillStyle = "rgba(255,255,255,0.14)";
      ctx.fillRect(sx, sy - TREAD + 1, stepW, 1);

      /* coin */
      if (s.coin && !s.coinTaken) {
        const cx = this.worldToScreenX(this.stepCenter(s));
        const cy = this.worldToScreenY(s.y - this.stepH * 0.62 + Math.round(Math.sin(this.time * 3 + s.coinPhase) * 2));
        const frames = [1, 0.55, 0.2, 0.55];
        const fr = frames[Math.floor(this.time * 7 + s.coinPhase * 3) % 4];
        blitSquash(ctx, COIN_SPR, COIN_PAL, cx, cy - 8, 2, fr);
      }
    }
  }

  /* Wide rooftop the run starts from — reads as "the ground". */
  private drawGround(sy: number, TREAD: number) {
    const { ctx, W, H } = this;
    const alt = this.altTint();
    const front = shadeHex(mixHex("#4f7fae", "#2c3f6e", alt), 1);
    const top = shadeHex(mixHex("#7fa8d8", "#4f6fa0", alt), 1);

    /* dark silhouette */
    ctx.fillStyle = INK;
    ctx.fillRect(-4, sy - TREAD - 1, W + 8, TREAD + (H - sy) + 8);

    /* front face down to the bottom of the screen */
    ctx.fillStyle = front;
    ctx.fillRect(0, sy, W, H - sy + 4);

    /* brick dither on the face */
    ctx.fillStyle = "rgba(8,3,22,0.2)";
    for (let yy = sy + 6; yy < H; yy += 7) {
      const off = ((yy / 7) % 2 === 0 ? 0 : 5);
      for (let xx = off; xx < W; xx += 10) ctx.fillRect(xx, yy, 4, 2);
    }

    /* rooftop slab */
    ctx.fillStyle = top;
    ctx.fillRect(0, sy - TREAD, W, TREAD);
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fillRect(0, sy - TREAD, W, 1);
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillRect(0, sy - TREAD + 1, W, 1);

    /* a couple of little rooftop details */
    ctx.fillStyle = INK;
    ctx.fillRect(Math.round(W * 0.12) - 1, sy - TREAD - 9, 14, 9);
    ctx.fillStyle = shadeHex(top, 0.7);
    ctx.fillRect(Math.round(W * 0.12), sy - TREAD - 8, 12, 7);
    ctx.fillStyle = INK;
    ctx.fillRect(Math.round(W * 0.8) - 1, sy - TREAD - 6, 10, 6);
    ctx.fillStyle = shadeHex(top, 0.7);
    ctx.fillRect(Math.round(W * 0.8), sy - TREAD - 5, 8, 4);
  }

  private drawFog() {
    const { ctx, W, H } = this;
    const danger = this.mode === "play" || this.mode === "dying" ? 1 - this.bar / 100 : 0.08;
    const fogH = Math.round(26 + danger * H * 0.4);
    const BANDS = 6;
    const bh = Math.ceil(fogH / BANDS);
    for (let i = 0; i < BANDS; i++) {
      const a = ((i + 1) / BANDS) * 0.85;
      ctx.fillStyle = `rgba(16,5,30,${Math.round(a * 4) / 4})`;
      ctx.fillRect(0, H - fogH + i * bh, W, bh);
    }
    if (danger > 0.45 && Math.floor(this.time * 4) % 2 === 0) {
      ctx.fillStyle = "#ff4d94";
      for (let x = 0; x < W; x += 6) {
        ctx.fillRect(x, H - fogH - ((x / 6) % 2 === 0 ? 2 : 0), 4, 2);
      }
    }
  }

  /* ------------------------------ player ------------------------------ */

  private drawPlayer() {
    const { ctx } = this;
    const skin = this.skin;
    const pal = charPalette(skin);
    const x = this.worldToScreenX(this.px);
    const y = this.worldToScreenY(this.py);
    const px = this.sprPx;
    const airborne = this.pstate === "jump" || this.pstate === "fall";

    /* turn spin: squash horizontally, swap facing mid-spin */
    let scx = 1;
    let drawFace: Side = this.face;
    if (this.turnT > 0) {
      const prog = 1 - this.turnT / TURN_T;
      scx = Math.max(0.15, Math.abs(Math.cos(Math.PI * prog)));
      drawFace = prog < 0.5 ? this.turnFrom : this.face;
    }
    const flip = drawFace === -1;

    /* landing squash / jump stretch — a continuous stretch→squash over the hop */
    let scy = 1;
    if (this.squash > 0 && !airborne) { scx *= 1 + this.squash * 0.18; scy = 1 - this.squash * 0.2; }
    else if (this.pstate === "jump") {
      const c = Math.cos(Math.PI * clamp(this.jt, 0, 1)); // 1 → -1 across the hop
      scx *= 1 - 0.09 * c;
      scy = 1 + 0.11 * c;
    }

    /* idle bob (whole-pixel) */
    let bob = 0;
    if (this.pstate === "stand" && this.turnT <= 0) {
      bob = Math.floor(this.time * 2.5) % 2 === 0 ? 0 : -1;
    }
    /* soft landing rebound */
    if (this.bounceT > 0 && !airborne) bob -= Math.round(Math.sin(this.bounceT * Math.PI) * 2);

    /* shadow */
    if (this.pstate === "stand") {
      ctx.fillStyle = "rgba(8,3,20,0.35)";
      ctx.fillRect(x - 6 * (px / 3) - 1, y - 1, 12 * (px / 3) + 2, 2);
    }

    const sprW = SPR_W * px, sprH = SPR_H * px;
    const anchorX = x, anchorY = y + bob;

    ctx.save();
    ctx.translate(anchorX, anchorY);
    if (this.pstate === "fall") ctx.rotate(Math.sin(this.deathT * 18) * 0.22);
    ctx.scale(scx, scy);

    const map = this.pstate === "fall" ? SPR_FALL : this.pstate === "jump" ? SPR_JUMP : SPR_STAND;
    blit(ctx, map, pal, Math.round(-sprW / 2), -sprH, px, flip);

    /* accessory (halo bobs, antenna blinks) */
    const acc = ACCESSORIES[skin.accessory];
    if (acc) {
      if (skin.accessory === "halo") {
        const hb = Math.round(Math.sin(this.time * 3) * 1);
        const shifted = { ...acc, oy: acc.oy + hb };
        blitAccessory(ctx, shifted, pal, Math.round(-sprW / 2), -sprH, px, flip);
      } else {
        blitAccessory(ctx, acc, pal, Math.round(-sprW / 2), -sprH, px, flip);
      }
      if (skin.accessory === "antenna" && Math.floor(this.time * 5) % 2 === 0) {
        ctx.fillStyle = "rgba(255,210,63,0.35)";
        const gx = Math.round(-sprW / 2 + (flip ? 7 : 6) * px - px);
        ctx.fillRect(gx, -sprH + acc.oy * px - px, 5 * px, 5 * px);
      }
    }
    ctx.restore();

    /* combo badge */
    if (this.mode === "play" && this.combo >= 4 && this.time - this.lastLand < 0.9) {
      const pop = this.comboPop > 0 ? 1 : 0;
      this.pixelText(`x${this.combo}`, x, y - sprH - 8 - pop * 2, 8, this.combo >= 10 ? "#ff5d7e" : "#ffd23f");
    }
  }

  private drawParticles() {
    const { ctx } = this;
    for (const p of this.particles) {
      const t = p.life / p.max;
      ctx.globalAlpha = Math.round((1 - t) * 4) / 4;
      const x = Math.round(this.worldToScreenX(p.x)), y = Math.round(this.worldToScreenY(p.y));
      if (p.kind === "ring") {
        const r = Math.round(p.size + t * 26);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(x - r, y - r, r * 2, r * 2);
        continue;
      }
      if (p.kind === "bubble") {
        const r = p.size + 1;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1;
        ctx.strokeRect(x - r, y - r, r * 2, r * 2);
        continue;
      }
      ctx.fillStyle = p.color;
      const sz = p.kind === "puff" && t > 0.5 ? p.size + 1 : p.size;
      if (p.plus) {
        ctx.fillRect(x - sz, y, sz * 3, sz);
        ctx.fillRect(x, y - sz, sz, sz * 3);
      } else {
        ctx.fillRect(x, y, sz, sz);
      }
    }
    ctx.globalAlpha = 1;
  }

  /* ------------------------------ pixel text ------------------------------ */

  private pixelText(text: string, x: number, y: number, size: number, color: string, outline = true) {
    const { ctx } = this;
    ctx.font = `${size}px "Press Start 2P", monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    x = Math.round(x); y = Math.round(y);
    if (outline) {
      const o = size >= 20 ? 3 : size >= 10 ? 2 : 1;
      ctx.fillStyle = INK;
      ctx.fillText(text, x + o, y + o);
      ctx.fillText(text, x - o, y);
      ctx.fillText(text, x + o, y);
      ctx.fillText(text, x, y - o);
      ctx.fillText(text, x, y + o);
    }
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  private drawTexts() {
    const { ctx } = this;
    for (const t of this.texts) {
      const k = t.life / t.max;
      const x = t.world ? this.worldToScreenX(t.x) : t.x;
      const y = t.world ? this.worldToScreenY(t.y) : t.y;
      const a = k < 0.15 ? k / 0.15 : 1 - Math.max(0, (k - 0.6) / 0.4);
      ctx.globalAlpha = Math.round(a * 4) / 4;
      this.pixelText(t.text, x, y, t.display ? t.size : t.size, t.color);
    }
    ctx.globalAlpha = 1;
  }

  /* ------------------------------ HUD ------------------------------ */

  private drawHUD() {
    const { ctx, W } = this;

    /* score — big, and it pops a size up on every landed step */
    const pop = this.stairPop > 0.45;
    this.pixelText(String(this.stairs), W / 2, pop ? 40 : 34, pop ? 32 : 24, "#fff3dc");
    this.pixelText("STAIRS", W / 2, 48, 8, "rgba(255,243,220,0.7)", false);

    /* segmented energy bar */
    const segs = 20, segW = 5, gap = 1;
    const bw = segs * (segW + gap) - gap;
    const bx = Math.round(W / 2 - bw / 2), by = 54;
    ctx.fillStyle = INK;
    ctx.fillRect(bx - 2, by - 2, bw + 4, 10);
    ctx.fillStyle = "#241242";
    ctx.fillRect(bx, by, bw, 6);
    const frac = clamp(this.bar / 100, 0, 1);
    const filled = Math.round(frac * segs);
    const col = frac > 0.55 ? "#3ff2c8" : frac > 0.28 ? "#ffd23f" : "#ff5d7e";
    const blinkOff = frac <= 0.28 && Math.floor(this.time * 6) % 2 === 0;
    if (!blinkOff) {
      ctx.fillStyle = col;
      for (let i = 0; i < filled; i++) ctx.fillRect(bx + i * (segW + gap), by + 1, segW, 4);
    }

    if (this.bar < 30 && this.mode === "play" && Math.floor(this.time * 4) % 2 === 0) {
      this.pixelText("KEEP CLIMBING!", W / 2, by + 20, 8, "#ff5d7e");
    }

    /* coin chip (left) */
    ctx.fillStyle = INK;
    ctx.fillRect(4, 4, 70, 18);
    ctx.fillStyle = "#241242";
    ctx.fillRect(5, 5, 68, 16);
    blit(ctx, COIN_SPR, COIN_PAL, 8, 9, 1);
    this.pixelText(String(this.walletShown()), 46, 17, 8, "#ffd23f", false);
    ctx.textAlign = "left";
    /* run coins */
    if (this.runCoins > 0) {
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.fillStyle = "rgba(255,210,63,0.85)";
      ctx.fillText(`+${this.runCoins}`, 6, 32);
    }

    /* best chip (right, left of the DOM pause button) */
    ctx.fillStyle = INK;
    ctx.fillRect(W - 78, 4, 60, 18);
    ctx.fillStyle = "#241242";
    ctx.fillRect(W - 77, 5, 58, 16);
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,243,220,0.6)";
    ctx.fillText("BEST", W - 74, 13);
    ctx.fillStyle = "#3ff2c8";
    ctx.fillText(String(Math.max(this.best, this.stairs)), W - 74, 21);

    /* tutorial for the first steps */
    if (this.mode === "play" && this.stairs < 10 && this.pstate !== "fall") {
      const blink = Math.floor(this.time * 4) % 2 === 0;
      if (blink) {
        const needTurn = this.face !== this.dirTo(this.idx + 1);
        if (needTurn) {
          const hx = this.worldToScreenX(this.px);
          const hy = this.worldToScreenY(this.py) - SPR_H * this.sprPx - 26;
          const wantDir = this.dirTo(this.idx + 1);
          blit(ctx, ARROW_SIDE, { U: "#3ff2c8" }, hx - 7 - wantDir * 12, hy - 6, 2, wantDir === 1);
          this.pixelText("STEP BEHIND!", hx, hy - 22, 8, "#3ff2c8");
          this.pixelText("L-SHIFT", hx, hy - 11, 8, "#fff3dc");
        } else {
          const next = this.stepAt(this.idx + 1);
          const nx = this.worldToScreenX(this.stepCenter(next));
          const ny = this.worldToScreenY(next.y) - 26;
          blit(ctx, ARROW_UP, { U: "#ffd23f" }, nx - 7, ny - 8, 2);
          this.pixelText("CLIMB!", nx, ny - 25, 8, "#ffd23f");
          this.pixelText("R-SHIFT", nx, ny - 14, 8, "#fff3dc");
        }
      }
    }
  }

  private walletCache = 0;
  setWallet(v: number) { this.walletCache = v; }
  private walletShown() { return this.walletCache; }

  /* chunky screen frame + danger / hit flashes */
  private drawFrame() {
    const { ctx, W, H } = this;
    ctx.fillStyle = "rgba(10,3,22,0.9)";
    ctx.fillRect(0, 0, W, 2);
    ctx.fillRect(0, H - 2, W, 2);
    ctx.fillRect(0, 0, 2, H);
    ctx.fillRect(W - 2, 0, 2, H);

    if (this.mode === "play" && this.bar < 30 && Math.floor(this.time * 5) % 2 === 0) {
      ctx.fillStyle = "rgba(255,45,85,0.5)";
      ctx.fillRect(0, 0, W, 2);
      ctx.fillRect(0, H - 2, W, 2);
      ctx.fillRect(0, 0, 2, H);
      ctx.fillRect(W - 2, 0, 2, H);
    }

    if (this.flashRed > 0) {
      ctx.fillStyle = `rgba(255,60,80,${Math.round(this.flashRed * 3) / 3 * 0.35})`;
      ctx.fillRect(0, 0, W, H);
    }
  }
}

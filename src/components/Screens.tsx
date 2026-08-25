import type { PointerEvent as RPointerEvent, ReactNode } from "react";
import { SKINS, skinById, type SkinDef } from "../game/skins";
import SkinAvatar from "./SkinAvatar";

/* ---------- tiny pixel icons (crisp rects only) ---------- */
export const CoinSvg = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden>
    <rect x="2" y="0" width="4" height="1" fill="#a3690c" />
    <rect x="1" y="1" width="6" height="1" fill="#ffd23f" />
    <rect x="0" y="2" width="8" height="4" fill="#ffd23f" />
    <rect x="1" y="6" width="6" height="1" fill="#c98a12" />
    <rect x="2" y="7" width="4" height="1" fill="#a3690c" />
    <rect x="2" y="2" width="2" height="2" fill="#fff0a8" />
    <rect x="5" y="4" width="2" height="2" fill="#c98a12" />
    <rect x="1" y="1" width="1" height="1" fill="#a3690c" />
    <rect x="6" y="1" width="1" height="1" fill="#a3690c" />
  </svg>
);

const StairsGlyph = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} shapeRendering="crispEdges" aria-hidden>
    <rect x="2" y="16" width="8" height="6" fill="#3ff2c8" />
    <rect x="8" y="10" width="8" height="6" fill="#3fd9b4" />
    <rect x="14" y="4" width="8" height="6" fill="#3ff2c8" />
    <rect x="2" y="16" width="8" height="2" fill="#c9fff0" />
    <rect x="8" y="10" width="8" height="2" fill="#c9fff0" />
    <rect x="14" y="4" width="8" height="2" fill="#c9fff0" />
    <rect x="2" y="21" width="20" height="1" fill="#12081f" />
  </svg>
);

const SoundOnIcon = () => (
  <svg width="20" height="20" viewBox="0 0 16 16" shapeRendering="crispEdges" fill="currentColor" aria-hidden>
    <rect x="2" y="6" width="3" height="5" />
    <rect x="5" y="4" width="3" height="9" />
    <rect x="10" y="5" width="2" height="2" />
    <rect x="12" y="7" width="2" height="3" />
    <rect x="10" y="10" width="2" height="2" />
  </svg>
);
const SoundOffIcon = () => (
  <svg width="20" height="20" viewBox="0 0 16 16" shapeRendering="crispEdges" fill="currentColor" aria-hidden>
    <rect x="2" y="6" width="3" height="5" />
    <rect x="5" y="4" width="3" height="9" />
    <rect x="10" y="6" width="2" height="2" />
    <rect x="12" y="8" width="2" height="2" />
    <rect x="12" y="6" width="2" height="2" />
    <rect x="10" y="8" width="2" height="2" />
    <rect x="14" y="6" width="1" height="1" />
    <rect x="9" y="5" width="1" height="1" />
    <rect x="9" y="11" width="1" height="1" />
    <rect x="14" y="10" width="1" height="1" />
  </svg>
);
const PauseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" shapeRendering="crispEdges" fill="currentColor" aria-hidden>
    <rect x="3" y="2" width="4" height="12" />
    <rect x="9" y="2" width="4" height="12" />
  </svg>
);

/* ---------- shared bits ---------- */
export function KeyCap({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return <span className={`keycap ${wide ? "px-4" : ""}`}>{children}</span>;
}

export function WalletChip({ wallet }: { wallet: number }) {
  return (
    <div className="chip flex items-center gap-2 px-3 py-1.5">
      <CoinSvg size={20} />
      <span className="font-body font-bold text-xl leading-none text-[#ffd23f] tabular-nums">{wallet}</span>
    </div>
  );
}

function SoundToggle({ muted, onToggle }: { muted: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="btn-arcade btn-plum h-11 w-11"
      aria-label={muted ? "Unmute" : "Mute"}
      title={muted ? "Unmute (sound off)" : "Mute"}
    >
      {muted ? <SoundOffIcon /> : <SoundOnIcon />}
    </button>
  );
}

/* ---------- START ---------- */
export function StartScreen(props: {
  wallet: number;
  best: number;
  skin: SkinDef;
  muted: boolean;
  onStart: () => void;
  onShop: () => void;
  onToggleMute: () => void;
}) {
  return (
    <div className="absolute inset-0 flex flex-col justify-between p-4 sm:p-7 pointer-events-none">
      {/* top row */}
      <div className="flex items-start justify-between gap-3 pointer-events-auto">
        <div className="flex items-center gap-2.5 chip px-3 py-2">
          <span className="animate-floaty"><SkinAvatar skin={props.skin} size={40} /></span>
          <div className="leading-tight">
            <div className="text-sm font-body tracking-[0.22em] text-[#b9a5e8]">CLIMBER</div>
            <div className="font-display text-[10px] text-[#fff3dc] mt-0.5">{props.skin.name}</div>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="chip px-3 py-2 text-right leading-tight">
            <div className="text-sm font-body tracking-[0.22em] text-[#b9a5e8]">BEST</div>
            <div className="font-display text-[11px] text-[#3ff2c8] tabular-nums mt-0.5">{props.best}</div>
          </div>
          <WalletChip wallet={props.wallet} />
          <SoundToggle muted={props.muted} onToggle={props.onToggleMute} />
        </div>
      </div>

      {/* middle: title block, left-weighted */}
      <div className="pointer-events-none select-none -mt-4">
        <div className="flex items-end gap-3">
          <StairsGlyph className="w-12 h-12 sm:w-16 sm:h-16 animate-wobble shrink-0 mb-1" />
          <div>
            <h1 className="font-display leading-[1.1] text-3xl sm:text-5xl md:text-6xl">
              <span className="text-[#ffd23f] pixel-shadow">SKY</span>
              <span className="text-[#3ff2c8] pixel-shadow">STEPS</span>
            </h1>
            <p className="mt-3 max-w-xs text-lg sm:text-xl leading-snug text-[#e8d9ff]/95 font-body">
              The staircase never ends. Your pixel legs disagree.
            </p>
            <div className="mt-3 font-display text-[10px] sm:text-xs text-[#ffd23f] blink pixel-shadow-sm">
              PRESS ANY SHIFT TO START
            </div>
          </div>
        </div>
      </div>

      {/* bottom: actions */}
      <div className="flex items-end justify-end gap-3 pointer-events-auto">
        <button onClick={props.onShop} className="btn-arcade btn-plum px-5 h-14 text-[11px]">
          <CoinSvg size={18} /> SKINS
        </button>
        <button onClick={props.onStart} className="btn-arcade btn-primary px-8 h-16 text-sm sm:text-base animate-pop">
          CLIMB
        </button>
      </div>
    </div>
  );
}

/* ---------- GAME OVER ---------- */
export function GameOverScreen(props: {
  stairs: number;
  runCoins: number;
  best: number;
  newBest: boolean;
  wallet: number;
  skin: SkinDef;
  onRetry: () => void;
  onShop: () => void;
  onMenu: () => void;
}) {
  return (
    <div className="absolute inset-0 bg-[#0d041f]/55 flex items-center justify-center p-4 pointer-events-auto">
      <div className="panel-arcade w-full max-w-md px-6 py-6 sm:px-8 sm:py-7 animate-pop text-center relative overflow-hidden">
        <div className="font-display text-xl sm:text-2xl text-[#ff5d7e] pixel-shadow">
          YOU TUMBLED
        </div>
        {props.newBest && (
          <div className="mt-3 inline-block font-display text-[10px] bg-[#3ff2c8] text-[#04302a] px-3 py-1.5 border-2 border-[#12081f] shadow-[0_3px_0_#12081f] -rotate-2">
            NEW BEST!
          </div>
        )}

        <div className="mt-5 flex items-center justify-center gap-5">
          <span className={props.newBest ? "animate-floaty" : ""}>
            <SkinAvatar skin={props.skin} size={96} />
          </span>
          <div className="text-left">
            <div className="mb-3">
              <div className="text-sm font-body tracking-[0.22em] text-[#b9a5e8]">STAIRS CLIMBED</div>
              <div className="font-display text-2xl sm:text-3xl text-[#fff3dc] tabular-nums leading-none mt-1">{props.stairs}</div>
            </div>
            <div className="flex gap-5">
              <div>
                <div className="text-sm font-body tracking-[0.22em] text-[#b9a5e8]">COINS</div>
                <div className="flex items-center gap-1.5 font-body font-bold text-xl text-[#ffd23f] tabular-nums">
                  <CoinSvg size={17} /> +{props.runCoins}
                </div>
              </div>
              <div>
                <div className="text-sm font-body tracking-[0.22em] text-[#b9a5e8]">BEST</div>
                <div className="font-body font-bold text-xl text-[#3ff2c8] tabular-nums">{props.best}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <button onClick={props.onRetry} className="btn-arcade btn-primary h-14 text-[11px] sm:text-xs">
            CLIMB AGAIN
            <span className="hidden sm:inline text-[9px] opacity-70 ml-1">(ANY SHIFT)</span>
          </button>
          <div className="flex gap-3">
            <button onClick={props.onShop} className="btn-arcade btn-mint flex-1 h-12 text-[10px]">
              <CoinSvg size={16} /> SKINS
            </button>
            <button onClick={props.onMenu} className="btn-arcade btn-plum flex-1 h-12 text-[10px]">
              MENU
            </button>
          </div>
          <div className="text-base font-body text-[#b9a5e8]">
            Wallet: <span className="text-[#ffd23f] font-bold tabular-nums">{props.wallet}</span> coins — spend them wisely.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- PAUSE ---------- */
export function PauseScreen(props: {
  onResume: () => void;
  onRestart: () => void;
  onMenu: () => void;
  muted: boolean;
  onToggleMute: () => void;
}) {
  return (
    <div className="absolute inset-0 bg-[#0d041f]/60 flex items-center justify-center p-4 pointer-events-auto">
      <div className="panel-arcade w-full max-w-sm px-7 py-7 text-center animate-pop">
        <div className="font-display text-2xl text-[#ffd23f] pixel-shadow">PAUSED</div>
        <p className="mt-2 text-lg font-body text-[#b9a5e8]">The stairs will wait. The mist, less so.</p>
        <div className="mt-6 flex flex-col gap-3">
          <button onClick={props.onResume} className="btn-arcade btn-mint py-4 text-xs">RESUME</button>
          <button onClick={props.onRestart} className="btn-arcade btn-primary h-12 text-[10px]">RESTART RUN</button>
          <div className="flex gap-3">
            <button onClick={props.onMenu} className="btn-arcade btn-plum flex-1 h-12 text-[10px]">MENU</button>
            <SoundToggle muted={props.muted} onToggle={props.onToggleMute} />
          </div>
        </div>
        <div className="mt-4 text-base font-body text-[#b9a5e8] flex items-center justify-center gap-1.5">
          <KeyCap>ESC</KeyCap> or <KeyCap>P</KeyCap> to resume
        </div>
      </div>
    </div>
  );
}

/* ---------- SHOP ---------- */
export function ShopScreen(props: {
  wallet: number;
  owned: string[];
  selected: string;
  onBuy: (id: string) => void;
  onEquip: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute inset-0 bg-[#0d041f]/70 flex items-center justify-center p-3 sm:p-6 pointer-events-auto">
      <div className="panel-arcade w-full max-w-2xl max-h-[92vh] flex flex-col animate-pop overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 sm:px-7 py-4 border-b-[3px] border-[#12081f]">
          <div>
            <div className="font-display text-sm sm:text-base text-[#fff3dc] pixel-shadow-sm">SKIN SHOP</div>
            <div className="text-base font-body text-[#b9a5e8] mt-1">Coins are earned mid-climb. Grab the shiny ones.</div>
          </div>
          <div className="flex items-center gap-3">
            <WalletChip wallet={props.wallet} />
            <button onClick={props.onClose} className="btn-arcade btn-coral h-11 px-4 text-[10px]" aria-label="Close shop">
              DONE
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-4 sm:p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
            {SKINS.map((s) => {
              const has = props.owned.includes(s.id);
              const active = props.selected === s.id;
              const affordable = props.wallet >= s.price;
              return (
                <div
                  key={s.id}
                  className={`skin-card relative rounded-sm border-[3px] p-3 flex flex-col items-center text-center ${
                    active
                      ? "border-[#3ff2c8] bg-[#123a35]/60 shadow-[0_5px_0_rgba(6,40,36,0.9)]"
                      : "border-[#6d48b8] bg-[#1d0f3a]/80 shadow-[0_5px_0_rgba(10,4,24,0.9)]"
                  }`}
                >
                  {active && (
                    <div className="absolute -top-2.5 font-display text-[8px] bg-[#3ff2c8] text-[#04302a] px-2 py-1 border-2 border-[#12081f]">
                      EQUIPPED
                    </div>
                  )}
                  {s.unlockAt && (
                    <div className={`absolute top-1.5 right-1.5 font-display text-[7px] px-1.5 py-0.5 border ${
                      has ? "bg-[#ffd23f] text-[#3a1d05] border-[#12081f]" : "bg-[#12081f] text-[#b9a5e8] border-[#6d48b8]/60"
                    }`}>
                      ★{s.unlockAt}
                    </div>
                  )}
                  <div className={has ? "" : s.unlockAt ? "opacity-35 saturate-0" : "opacity-90"}>
                    <SkinAvatar skin={s} size={80} />
                  </div>
                  <div className="font-display text-[10px] mt-1.5 text-[#fff3dc] leading-tight">{s.name}</div>
                  <div className="text-base font-body leading-snug text-[#b9a5e8] mt-1 min-h-[2.4em]">{s.blurb}</div>
                  <div className="mt-2 w-full">
                    {active ? (
                      <div className="h-10 flex items-center justify-center border-2 border-[#3ff2c8]/50 text-[#3ff2c8] font-display text-[8px] tracking-widest">
                        CLIMBING
                      </div>
                    ) : has ? (
                      <button onClick={() => props.onEquip(s.id)} className="btn-arcade btn-mint w-full h-10 text-[9px]">
                        EQUIP
                      </button>
                    ) : s.unlockAt ? (
                      <div className="h-10 flex flex-col items-center justify-center border-2 border-[#6d48b8]/50 text-[#b9a5e8] font-display text-[8px] tracking-wider leading-relaxed">
                        <StairsGlyph className="w-3.5 h-3.5 opacity-70" />
                        <span>REACH {s.unlockAt}</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => props.onBuy(s.id)}
                        className={`btn-arcade w-full h-10 text-[9px] ${affordable ? "btn-primary" : "btn-plum opacity-70"}`}
                      >
                        <CoinSvg size={15} /> {s.price}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-center text-base font-body text-[#b9a5e8]">
            Tip: every 10-step combo drops <span className="text-[#ffd23f] font-bold">+5 bonus coins</span>.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---------- touch controls during play ---------- */
const TurnClimbGlyph = () => (
  <svg width="30" height="30" viewBox="0 0 12 12" shapeRendering="crispEdges" fill="currentColor" aria-hidden>
    {/* U-turn arrow: up, across, and back down-left */}
    <rect x="7" y="0" width="3" height="2" />
    <rect x="6" y="1" width="1" height="1" />
    <rect x="10" y="1" width="1" height="1" />
    <rect x="8" y="2" width="2" height="5" />
    <rect x="3" y="7" width="5" height="2" />
    <rect x="2" y="6" width="2" height="4" />
    <rect x="1" y="7" width="1" height="2" />
    <rect x="8" y="6" width="2" height="1" />
  </svg>
);
const ClimbGlyph = () => (
  <svg width="30" height="30" viewBox="0 0 12 12" shapeRendering="crispEdges" fill="currentColor" aria-hidden>
    <rect x="5" y="0" width="2" height="2" />
    <rect x="3" y="2" width="6" height="2" />
    <rect x="1" y="4" width="2" height="1" />
    <rect x="9" y="4" width="2" height="1" />
    <rect x="4" y="4" width="4" height="7" />
    <rect x="3" y="10" width="6" height="2" />
  </svg>
);

function buzz() {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(9);
  } catch {
    /* haptics are flavor — never block a press */
  }
}

export function TouchControls({ onBack, onFwd }: { onBack: () => void; onFwd: () => void }) {
  const press = (fn: () => void) => (e: RPointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    buzz();
    fn();
  };
  return (
    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-3 sm:p-5 pointer-events-none">
      <button
        onPointerDown={press(onBack)}
        onContextMenu={(e) => e.preventDefault()}
        className="touch-btn touch-btn-mint pointer-events-auto text-[#3ff2c8]"
        aria-label="Turn and climb (L-SHIFT)"
      >
        <TurnClimbGlyph />
        <span className="font-display text-[8px] text-[#fff3dc]">TURN+CLIMB</span>
        <span className="keycap !text-[10px] !px-2 !py-0.5 mt-0.5">L-SHIFT</span>
      </button>
      <button
        onPointerDown={press(onFwd)}
        onContextMenu={(e) => e.preventDefault()}
        className="touch-btn touch-btn-gold pointer-events-auto text-[#ffd23f]"
        aria-label="Climb (R-SHIFT)"
      >
        <ClimbGlyph />
        <span className="font-display text-[8px] text-[#fff3dc]">CLIMB</span>
        <span className="keycap !text-[10px] !px-2 !py-0.5 mt-0.5">R-SHIFT</span>
      </button>
    </div>
  );
}

/* ---------- pause button during play ---------- */
export function PauseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="absolute top-3 right-3 btn-arcade btn-plum h-10 w-10 text-[#efe6ff] pointer-events-auto"
      aria-label="Pause (Esc)"
      title="Pause (Esc)"
    >
      <PauseIcon />
    </button>
  );
}

export { skinById };

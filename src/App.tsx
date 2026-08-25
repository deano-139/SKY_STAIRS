import { useCallback, useEffect, useRef, useState } from "react";
import { SkyStepsEngine, type RunResult } from "./game/engine";
import { skinById, SKINS } from "./game/skins";
import {
  StartScreen,
  GameOverScreen,
  PauseScreen,
  ShopScreen,
  PauseButton,
  TouchControls,
} from "./components/Screens";

const SAVE_KEY = "skysteps-save-v1";

interface SaveData {
  wallet: number;
  best: number;
  owned: string[];
  selected: string;
  muted: boolean;
}

function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const d = JSON.parse(raw) as Partial<SaveData>;
      return {
        wallet: typeof d.wallet === "number" ? Math.max(0, d.wallet) : 0,
        best: typeof d.best === "number" ? Math.max(0, d.best) : 0,
        owned: Array.isArray(d.owned) && d.owned.length ? d.owned : ["bloo"],
        selected: typeof d.selected === "string" ? d.selected : "bloo",
        muted: !!d.muted,
      };
    }
  } catch { /* fresh start */ }
  return { wallet: 0, best: 0, owned: ["bloo"], selected: "bloo", muted: false };
}

type Screen = "menu" | "playing" | "gameover";

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SkyStepsEngine | null>(null);

  const initial = useRef(loadSave()).current;
  /* "mobile mode" = any touch-capable device. Deliberately lenient so the
     on-screen buttons always appear for phone/tablet players. */
  const isTouch = useRef(
    typeof window !== "undefined" &&
      (navigator.maxTouchPoints > 0 || "ontouchstart" in window)
  ).current;
  const [screen, setScreen] = useState<Screen>("menu");
  const [paused, setPaused] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [wallet, setWallet] = useState(initial.wallet);
  const [best, setBest] = useState(initial.best);
  const [owned, setOwned] = useState<string[]>(initial.owned);
  const [selected, setSelected] = useState(initial.selected);
  const [muted, setMuted] = useState(initial.muted);
  const [lastRun, setLastRun] = useState<RunResult | null>(null);

  /* keep engine's best/wallet copies fresh */
  useEffect(() => { engineRef.current?.setBest(best); }, [best]);
  useEffect(() => { engineRef.current?.setWallet(wallet); }, [wallet]);

  /* boot engine once */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const eng = new SkyStepsEngine(
      canvas,
      {
        onStarted: () => {
          setScreen("playing");
          setPaused(false);
          setShopOpen(false);
          setLastRun(null);
        },
        onGameOver: (r) => {
          setLastRun(r);
          setBest(r.best);
          setScreen("gameover");
        },
        onCoin: () => setWallet((w) => w + 1),
        onPauseChange: (p) => setPaused(p),
        onMilestoneUnlocked: (id) =>
          setOwned((o) => (o.includes(id) ? o : [...o, id])),
      },
      skinById(initial.selected)
    );
    eng.setBest(initial.best);
    eng.setWallet(initial.wallet);
    eng.setMuted(initial.muted);
    eng.setOwnedMilestones(initial.owned);
    engineRef.current = eng;
    return () => {
      eng.destroy();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* persist */
  useEffect(() => {
    try {
      const d: SaveData = { wallet, best, owned, selected, muted };
      localStorage.setItem(SAVE_KEY, JSON.stringify(d));
    } catch { /* storage may be unavailable */ }
  }, [wallet, best, owned, selected, muted]);

  const selectedSkin = skinById(selected);

  const applySkin = useCallback((id: string) => {
    setSelected(id);
    engineRef.current?.setSkin(skinById(id));
  }, []);

  const handleStart = useCallback(() => {
    setShopOpen(false);
    engineRef.current?.start();
    engineRef.current?.sfx.click();
  }, []);

  const handleMenu = useCallback(() => {
    setShopOpen(false);
    engineRef.current?.toMenu();
    setScreen("menu");
    setPaused(false);
  }, []);

  const handleToggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      engineRef.current?.setMuted(next);
      if (!next) engineRef.current?.sfx.click();
      return next;
    });
  }, []);

  const handleBuy = useCallback(
    (id: string) => {
      const skin = skinById(id);
      const eng = engineRef.current;
      if (owned.includes(id)) return;
      if (wallet >= skin.price) {
        setWallet((w) => w - skin.price);
        setOwned((o) => [...o, id]);
        applySkin(id);
        eng?.sfx.buy();
      } else {
        eng?.sfx.denied();
      }
    },
    [owned, wallet, applySkin]
  );

  const handleEquip = useCallback(
    (id: string) => {
      if (!owned.includes(id)) return;
      applySkin(id);
      engineRef.current?.sfx.click();
    },
    [owned, applySkin]
  );

  const openShop = useCallback(() => {
    const eng = engineRef.current;
    if (screen === "playing" && !paused) eng?.setPaused(true);
    eng?.sfx.click();
    setShopOpen(true);
  }, [screen, paused]);

  return (
    <div className="relative w-full h-full overflow-hidden select-none" style={{ height: "100dvh" }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block touch-none" />
      <div className="absolute inset-0 scanlines" />

      {/* DOM UI layer */}
      <div className="absolute inset-0 pointer-events-none">
        {screen === "menu" && !shopOpen && (
          <StartScreen
            wallet={wallet}
            best={best}
            skin={selectedSkin}
            muted={muted}
            onStart={handleStart}
            onShop={openShop}
            onToggleMute={handleToggleMute}
          />
        )}

        {screen === "playing" && !paused && !shopOpen && (
          <PauseButton onClick={() => engineRef.current?.togglePause()} />
        )}

        {screen === "playing" && !paused && !shopOpen && isTouch && (
          <TouchControls
            onBack={() => engineRef.current?.pressBack()}
            onFwd={() => engineRef.current?.pressFwd()}
          />
        )}

        {screen === "playing" && paused && !shopOpen && (
          <PauseScreen
            onResume={() => engineRef.current?.setPaused(false)}
            onRestart={handleStart}
            onMenu={handleMenu}
            muted={muted}
            onToggleMute={handleToggleMute}
          />
        )}

        {screen === "gameover" && lastRun && !shopOpen && (
          <GameOverScreen
            stairs={lastRun.stairs}
            runCoins={lastRun.runCoins}
            best={lastRun.best}
            newBest={lastRun.newBest}
            wallet={wallet}
            skin={selectedSkin}
            onRetry={handleStart}
            onShop={openShop}
            onMenu={handleMenu}
          />
        )}

        {shopOpen && (
          <ShopScreen
            wallet={wallet}
            owned={owned}
            selected={selected}
            onBuy={handleBuy}
            onEquip={handleEquip}
            onClose={() => {
              engineRef.current?.sfx.click();
              setShopOpen(false);
            }}
          />
        )}
      </div>
    </div>
  );
}

export { SKINS };

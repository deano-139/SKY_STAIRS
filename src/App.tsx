import { useCallback, useEffect, useRef, useState } from "react";
import { SkyStepsEngine, type RunResult } from "./game/engine";
import { skinById, SKINS } from "./game/skins";
import {
  StartScreen,
  GameOverScreen,
  PauseScreen,
  ShopScreen,
  LeaderboardScreen,
  LoginScreen,
  PauseButton,
  TouchControls,
} from "./components/Screens";
import {
  initAnonymousPlayer,
  submitScore,
  saveGameState,
  loadGameState,
  getAccountOverview,
  incrementStat,
  isLoggedIn,
  hasTalo,
  getIdentifier,
  login,
  register,
  logout,
  type AccountOverview,
} from "./game/talo";

const SAVE_KEY = "skysteps-save-v1";
const SAVE_DEBOUNCE_MS = 1200;

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

type Screen = "menu" | "playing" | "gameover" | "login";
type LoginReturn = "menu" | "gameover";

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SkyStepsEngine | null>(null);
  const saveTimerRef = useRef<number | null>(null);

  const initial = useRef(loadSave()).current;
  const isTouch = useRef(
    typeof window !== "undefined" &&
      (navigator.maxTouchPoints > 0 || "ontouchstart" in window)
  ).current;

  const [screen, setScreen] = useState<Screen>("menu");
  const [paused, setPaused] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [wallet, setWallet] = useState(initial.wallet);
  const [best, setBest] = useState(initial.best);
  const [owned, setOwned] = useState<string[]>(initial.owned);
  const [selected, setSelected] = useState(initial.selected);
  const [muted, setMuted] = useState(initial.muted);
  const [lastRun, setLastRun] = useState<RunResult | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggedIn, setLoggedIn] = useState(isLoggedIn());
  const [overview, setOverview] = useState<AccountOverview | null>(null);
  const loginReturnRef = useRef<LoginReturn>("menu");

  useEffect(() => { engineRef.current?.setBest(best); }, [best]);
  useEffect(() => { engineRef.current?.setWallet(wallet); }, [wallet]);

  /* Anonymous Talo player for the leaderboard if not logged in */
  useEffect(() => {
    if (!hasTalo()) return;
    if (!isLoggedIn()) void initAnonymousPlayer();
  }, []);

  /* Load cloud save on boot if already logged in (session in localStorage) */
  useEffect(() => {
    if (!hasTalo() || !isLoggedIn()) return;
    void (async () => {
      const saved = await loadGameState();
      if (saved) {
        setBest(saved.best);
        setWallet(saved.wallet);
        setOwned(saved.ownedSkins);
        setSelected(saved.selectedSkin);
        setMuted(saved.muted);
        engineRef.current?.setBest(saved.best);
        engineRef.current?.setWallet(saved.wallet);
        engineRef.current?.setSkin(skinById(saved.selectedSkin));
      }
      const o = await getAccountOverview();
      setOverview(o);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Refresh account overview when back on menu/gameover */
  useEffect(() => {
    if (!loggedIn) { setOverview(null); return; }
    if (screen === "menu" || screen === "gameover") {
      void getAccountOverview().then((o) => setOverview(o));
    }
  }, [loggedIn, screen]);

  /* Boot engine once */
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
          setLeaderboardOpen(false);
          setLastRun(null);
        },
        onGameOver: (r) => {
          setLastRun(r);
          setBest(r.best);
          setScreen("gameover");
          void submitScore(r.stairs);
          if (isLoggedIn()) {
            void incrementStat("total_runs", 1);
            void incrementStat("total_stairs", r.stairs);
            if (r.runCoins > 0) void incrementStat("total_coins", r.runCoins);
          }
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

  /* Persist locally always; mirror to Talo (debounced) when logged in */
  useEffect(() => {
    try {
      const d: SaveData = { wallet, best, owned, selected, muted };
      localStorage.setItem(SAVE_KEY, JSON.stringify(d));
    } catch { /* ignore */ }

    if (!isLoggedIn()) return;

    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      void saveGameState({
        best,
        wallet,
        ownedSkins: owned,
        selectedSkin: selected,
        muted,
      });
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [wallet, best, owned, selected, muted]);

  const selectedSkin = skinById(selected);

  const applySkin = useCallback((id: string) => {
    setSelected(id);
    engineRef.current?.setSkin(skinById(id));
  }, []);

  const handleStart = useCallback(() => {
    setShopOpen(false);
    setLeaderboardOpen(false);
    engineRef.current?.start();
    engineRef.current?.sfx.click();
  }, []);

  const handleMenu = useCallback(() => {
    setShopOpen(false);
    setLeaderboardOpen(false);
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
    setLeaderboardOpen(false);
    setShopOpen(true);
  }, [screen, paused]);

  const openLeaderboard = useCallback(() => {
    const eng = engineRef.current;
    if (screen === "playing" && !paused) eng?.setPaused(true);
    eng?.sfx.click();
    setShopOpen(false);
    setLeaderboardOpen(true);
  }, [screen, paused]);

  const openLogin = useCallback((returnTo: LoginReturn) => {
    loginReturnRef.current = returnTo;
    setLoginError(null);
    setScreen("login");
  }, []);

  const handleLogin = useCallback(
    async (username: string, password: string, isRegister: boolean) => {
      setLoginError(null);
      const result = isRegister
        ? await register(username, password)
        : await login(username, password);

      if (result.ok) {
        setLoggedIn(true);
        /* Cloud is source of truth on login: pull state, apply everywhere */
        const saved = await loadGameState();
        if (saved) {
          setBest(saved.best);
          setWallet(saved.wallet);
          setOwned(saved.ownedSkins);
          setSelected(saved.selectedSkin);
          setMuted(saved.muted);
          engineRef.current?.setBest(saved.best);
          engineRef.current?.setWallet(saved.wallet);
          engineRef.current?.setSkin(skinById(saved.selectedSkin));
        }
        const o = await getAccountOverview();
        setOverview(o);
        setScreen(loginReturnRef.current);
      } else {
        setLoginError(result.error || "Something went wrong");
      }
    },
    []
  );

  const handleLogout = useCallback(() => {
    /* Flush pending save so we don't lose the last change */
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (isLoggedIn()) {
      void saveGameState({ best, wallet, ownedSkins: owned, selectedSkin: selected, muted });
    }
    logout();
    setLoggedIn(false);
    setOverview(null);
    setScreen("menu");
  }, [best, wallet, owned, selected, muted]);

  return (
    <div className="relative w-full h-full overflow-hidden select-none" style={{ height: "100dvh" }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block touch-none" />
      <div className="absolute inset-0 scanlines" />

      <div className="absolute inset-0 pointer-events-none">
        {screen === "menu" && !shopOpen && !leaderboardOpen && (
          <StartScreen
            wallet={wallet}
            best={best}
            skin={selectedSkin}
            muted={muted}
            loggedIn={loggedIn}
            username={getIdentifier()}
            overview={overview}
            onStart={handleStart}
            onShop={openShop}
            onLeaderboard={openLeaderboard}
            onLogin={() => openLogin("menu")}
            onLogout={handleLogout}
            onToggleMute={handleToggleMute}
          />
        )}

        {screen === "login" && (
          <LoginScreen
            onLogin={(u, p) => handleLogin(u, p, false)}
            onRegister={(u, p) => handleLogin(u, p, true)}
            onBack={() => { setLoginError(null); setScreen(loginReturnRef.current); }}
            error={loginError}
          />
        )}

        {screen === "playing" && !paused && !shopOpen && !leaderboardOpen && (
          <PauseButton onClick={() => engineRef.current?.togglePause()} />
        )}

        {screen === "playing" && !paused && !shopOpen && !leaderboardOpen && isTouch && (
          <TouchControls
            onBack={() => engineRef.current?.pressBack()}
            onFwd={() => engineRef.current?.pressFwd()}
          />
        )}

        {screen === "playing" && paused && !shopOpen && !leaderboardOpen && (
          <PauseScreen
            onResume={() => engineRef.current?.setPaused(false)}
            onRestart={handleStart}
            onMenu={handleMenu}
            muted={muted}
            onToggleMute={handleToggleMute}
          />
        )}

        {screen === "gameover" && lastRun && !shopOpen && !leaderboardOpen && (
          <GameOverScreen
            stairs={lastRun.stairs}
            runCoins={lastRun.runCoins}
            best={lastRun.best}
            newBest={lastRun.newBest}
            wallet={wallet}
            skin={selectedSkin}
            onRetry={handleStart}
            onShop={openShop}
            onLeaderboard={openLeaderboard}
            onMenu={handleMenu}
            onLogin={() => openLogin("gameover")}
            loggedIn={loggedIn}
            overview={overview}
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

        {leaderboardOpen && !shopOpen && (
          <LeaderboardScreen
            onClose={() => {
              engineRef.current?.sfx.click();
              setLeaderboardOpen(false);
            }}
          />
        )}
      </div>
    </div>
  );
}

export { SKINS };
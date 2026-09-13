/* ------------------------------------------------------------------
   Talo REST client with player auth + game saves for SKY_STEPS
   ------------------------------------------------------------------ */

const TALO_API = import.meta.env.VITE_TALO_API ?? "https://api.trytalo.com";
const TALO_KEY = import.meta.env.VITE_TALO_KEY ?? "";

const LB = "highest-stairs";

const SESSION_KEY = "skysteps-talo-session";
const ALIAS_KEY = "skysteps-talo-alias";
const PLAYER_KEY = "skysteps-talo-player";
const IDENTIFIER_KEY = "skysteps-talo-identifier";

/* ---------- token storage ---------- */

export function hasTalo(): boolean {
  return TALO_KEY.length > 0;
}

export function getAliasId(): string | null {
  return localStorage.getItem(ALIAS_KEY);
}

export function getPlayerId(): string | null {
  return localStorage.getItem(PLAYER_KEY);
}

export function getSessionToken(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

export function getIdentifier(): string | null {
  return localStorage.getItem(IDENTIFIER_KEY);
}

export function isLoggedIn(): boolean {
  return !!getSessionToken() && !!getAliasId() && !!getPlayerId();
}

interface SessionResponse {
  sessionToken: string;
  player: { id: number | string };
  alias: { id: string };
}

function storeSession(data: SessionResponse, identifier: string): void {
  localStorage.setItem(SESSION_KEY, data.sessionToken);
  localStorage.setItem(PLAYER_KEY, String(data.player.id));
  localStorage.setItem(ALIAS_KEY, data.alias.id);
  localStorage.setItem(IDENTIFIER_KEY, identifier);
}

export function logout(): void {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(PLAYER_KEY);
  localStorage.removeItem(ALIAS_KEY);
  localStorage.removeItem(IDENTIFIER_KEY);
}

/* ---------- request headers ---------- */

function gameHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${TALO_KEY}`,
  };
}

function playerHeaders(): HeadersInit {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${TALO_KEY}`,
  };
  const alias = getAliasId();
  const player = getPlayerId();
  const session = getSessionToken();
  if (alias) h["x-talo-alias"] = alias;
  if (player) h["x-talo-player"] = player;
  if (session) h["x-talo-session"] = session;
  return h;
}

/* ---------- auth ---------- */

export async function register(
  username: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  if (!hasTalo()) return { ok: false, error: "Talo not configured" };
  try {
    const res = await fetch(`${TALO_API}/v1/players/auth/register`, {
      method: "POST",
      headers: gameHeaders(),
      body: JSON.stringify({ identifier: username, password }),
    });
    const raw = await res.text();
    let data: any = null;
    try { data = raw ? JSON.parse(raw) : null; } catch { /* not JSON */ }

    if (!res.ok) {
      if (data?.errorCode === "IDENTIFIER_TAKEN") {
        return { ok: false, error: "Username already taken" };
      }
      return { ok: false, error: data?.message || `Registration failed (${res.status})` };
    }

    /* Registration may or may not return a session. Normalize first,
       then fall through to login if we didn't get one. */
    const sessionToken: string | undefined =
      data?.sessionToken ?? data?.session?.token;
    const playerId: number | string | undefined =
      data?.player?.id ?? data?.playerId;
    const aliasId: string | undefined =
      data?.alias?.id ?? data?.playerAlias?.id ?? data?.aliasId;

    if (sessionToken && aliasId) {
      storeSession(
        {
          sessionToken,
          player: { id: playerId ?? "" },
          alias: { id: aliasId },
        },
        username
      );
      return { ok: true };
    }

    /* No session from register — do a login round-trip. */
    return login(username, password);
  } catch (err) {
    console.error("[talo] register error:", err);
    return { ok: false, error: "Network error" };
  }
}

export async function login(
  username: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  if (!hasTalo()) return { ok: false, error: "Talo not configured" };
  try {
    const res = await fetch(`${TALO_API}/v1/players/auth/login`, {
      method: "POST",
      headers: gameHeaders(),
      body: JSON.stringify({ identifier: username, password }),
    });

    /* Read raw text first — HTML error pages won't parse as JSON. */
    const raw = await res.text();
    let data: any = null;
    try { data = raw ? JSON.parse(raw) : null; } catch { /* not JSON */ }

    if (!res.ok) {
      if (data?.errorCode === "INVALID_CREDENTIALS") {
        return { ok: false, error: "Invalid username or password" };
      }
      return { ok: false, error: data?.message || `Login failed (${res.status})` };
    }

    /* Talo's documented shape:
       { sessionToken, player: { id }, alias: { id, identifier } }
       Different versions / self-hosted variants nest these differently.
       Normalize across the known variants. */
    const sessionToken: string | undefined =
      data?.sessionToken ?? data?.session?.token;
    const playerId: number | string | undefined =
      data?.player?.id ?? data?.playerId ?? data?.player?.ID;
    const aliasId: string | undefined =
      data?.alias?.id ?? data?.playerAlias?.id ?? data?.aliasId;

    if (!sessionToken || !aliasId) {
      console.error("[talo] unexpected login response:", data);
      return {
        ok: false,
        error: "Login succeeded but no session returned. Check console.",
      };
    }

    storeSession(
      {
        sessionToken,
        player: { id: playerId ?? "" },
        alias: { id: aliasId },
      },
      username
    );
    return { ok: true };
  } catch (err) {
    console.error("[talo] login error:", err);
    return { ok: false, error: "Network error" };
  }
}

/* ---------- anonymous fallback (leaderboard before login) ---------- */

export async function initAnonymousPlayer(): Promise<string | null> {
  if (!hasTalo()) return null;
  const cached = getAliasId();
  if (cached) return cached;

  const identifier = "guest_" + Math.random().toString(36).slice(2, 10);
  try {
    const res = await fetch(
      `${TALO_API}/v1/players/identify?service=username&identifier=${encodeURIComponent(identifier)}`,
      { headers: gameHeaders() }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const aliasId: string | undefined = data?.alias?.id;
    const playerId: string | number | undefined = data?.player?.id;
    if (!aliasId) return null;
    localStorage.setItem(ALIAS_KEY, aliasId);
    if (playerId !== undefined) localStorage.setItem(PLAYER_KEY, String(playerId));
    /* Deliberately do NOT write IDENTIFIER_KEY — a guest isn't a
       registered account, so the menu shouldn't show a fake username. */
    return aliasId;
  } catch {
    return null;
  }
}

/* ---------- game saves ---------- */

export interface SaveSnapshot {
  best: number;
  wallet: number;
  ownedSkins: string[];
  selectedSkin: string;
  muted: boolean;
}

export async function saveGameState(state: SaveSnapshot): Promise<void> {
  if (!hasTalo() || !isLoggedIn()) return;
  try {
    await fetch(`${TALO_API}/v1/game-saves`, {
      method: "POST",
      headers: playerHeaders(),
      body: JSON.stringify({
        name: "skysteps-save",
        content: {
          objects: [
            {
              id: "skysteps-save-v1",
              name: "PlayerSave",
              data: [
                { key: "best", value: String(state.best) },
                { key: "wallet", value: String(state.wallet) },
                { key: "ownedSkins", value: JSON.stringify(state.ownedSkins) },
                { key: "selectedSkin", value: state.selectedSkin },
                { key: "muted", value: String(state.muted) },
              ],
            },
          ],
        },
      }),
    });
  } catch {
    /* ignore */
  }
}

export async function loadGameState(): Promise<SaveSnapshot | null> {
  if (!hasTalo() || !isLoggedIn()) return null;
  try {
    const res = await fetch(`${TALO_API}/v1/game-saves`, {
      headers: playerHeaders(),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const saves = data?.gameSaves ?? [];
    if (saves.length === 0) return null;
    const latest = saves[0];
    const obj = latest.content?.objects?.[0];
    if (!obj) return null;
    const get = (key: string): string | undefined =>
      obj.data?.find((d: { key: string; value: string }) => d.key === key)?.value;
    let ownedSkins: string[] = ["bloo"];
    try {
      const raw = get("ownedSkins");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) ownedSkins = parsed;
      }
    } catch {
      /* keep default */
    }
    return {
      best: Number(get("best") ?? 0) || 0,
      wallet: Number(get("wallet") ?? 0) || 0,
      ownedSkins,
      selectedSkin: get("selectedSkin") ?? "bloo",
      muted: get("muted") === "true",
    };
  } catch {
    return null;
  }
}

/* ---------- leaderboard ---------- */

export interface LeaderboardEntry {
  position: number;
  score: number;
  playerAlias: { identifier: string; id: string };
}

export async function submitScore(score: number): Promise<void> {
  if (!hasTalo() || score <= 0) return;
  const alias = getAliasId();
  if (!alias) return;
  try {
    await fetch(`${TALO_API}/v1/leaderboards/${LB}/entries`, {
      method: "POST",
      headers: playerHeaders(),
      body: JSON.stringify({ score }),
    });
  } catch {
    /* ignore */
  }
}

export async function fetchLeaderboard(
  page = 0
): Promise<{ entries: LeaderboardEntry[]; count: number; isLastPage: boolean }> {
  const empty = { entries: [] as LeaderboardEntry[], count: 0, isLastPage: true };
  if (!hasTalo()) return empty;
  try {
    const res = await fetch(
      `${TALO_API}/v1/leaderboards/${LB}/entries?page=${page}`,
      { headers: gameHeaders() }
    );
    if (!res.ok) return empty;
    const data = await res.json();
    return {
      entries: Array.isArray(data?.entries) ? data.entries : [],
      count: typeof data?.count === "number" ? data.count : 0,
      isLastPage: !!data?.isLastPage,
    };
  } catch {
    return empty;
  }
}

/* ---------- stats ---------- */

export async function incrementStat(
  key: string,
  delta: number
): Promise<void> {
  if (!hasTalo() || !isLoggedIn() || delta === 0) return;
  try {
    await fetch(`${TALO_API}/v1/game-stats/${key}/player`, {
      method: "POST",
      headers: playerHeaders(),
      body: JSON.stringify({ delta }),
    });
  } catch {
    /* ignore */
  }
}

/* ---------- account overview ---------- */

export interface AccountOverview {
  identifier: string;
  bestScore: number;
  position: number | null;
  totalRuns: number;
  totalStairs: number;
  totalCoins: number;
}

export async function getAccountOverview(): Promise<AccountOverview | null> {
  if (!hasTalo() || !isLoggedIn()) return null;
  const identifier = getIdentifier() ?? "climber";

  let bestScore = 0;
  let position: number | null = null;
  try {
    const res = await fetch(
      `${TALO_API}/v1/leaderboards/${LB}/entries?page=0`,
      { headers: playerHeaders() }
    );
    if (res.ok) {
      const data = await res.json();
      const myAlias = getAliasId();
      const mine = (data?.entries ?? []).find(
        (e: { playerAlias?: { id?: string } }) => e.playerAlias?.id === myAlias
      );
      if (mine) {
        bestScore = Number(mine.score) || 0;
        position = Number(mine.position) || null;
      }
    }
  } catch {
    /* ignore */
  }

  let totalRuns = 0;
  let totalStairs = 0;
  let totalCoins = 0;
  try {
    const res = await fetch(`${TALO_API}/v1/game-stats/player`, {
      headers: playerHeaders(),
    });
    if (res.ok) {
      const data = await res.json();
      const stats: Array<{ key: string; value: number }> = data?.stats ?? [];
      const find = (k: string) =>
        Number(stats.find((s) => s.key === k)?.value ?? 0) || 0;
      totalRuns = find("total_runs");
      totalStairs = find("total_stairs");
      totalCoins = find("total_coins");
    }
  } catch {
    /* ignore */
  }

  return { identifier, bestScore, position, totalRuns, totalStairs, totalCoins };
}

/* ---------- account deletion ---------- */

export async function deleteAccount(): Promise<void> {
  if (!hasTalo() || !isLoggedIn()) return;
  try {
    await fetch(`${TALO_API}/v1/players/auth`, {
      method: "DELETE",
      headers: playerHeaders(),
    });
  } catch {
    /* ignore */
  }
  logout();
}
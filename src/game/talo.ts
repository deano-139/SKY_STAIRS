/* ------------------------------------------------------------------
   Talo REST client with player auth + game saves for SKY_STEPS
   ------------------------------------------------------------------ */

const TALO_API = import.meta.env.VITE_TALO_API ?? "https://api.trytalo.com";
const TALO_KEY = import.meta.env.VITE_TALO_KEY ?? "";

const LB = "highest-stairs";

const SESSION_KEY = "skysteps-talo-session";
const ALIAS_KEY = "skysteps-talo-alias";
const PLAYER_KEY = "skysteps-talo-player";

function gameHeaders(extra: Record<string, string> = {}): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${TALO_KEY}`,
    ...extra,
  };
}

/* ---------- player auth ---------- */

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

export function isLoggedIn(): boolean {
  return !!getSessionToken() && !!getAliasId();
}

/** Register a new account with username + password. */
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
    const data = await res.json();
    if (!res.ok) {
      if (data?.errorCode === "IDENTIFIER_TAKEN") {
        return { ok: false, error: "Username already taken" };
      }
      return { ok: false, error: data?.message || "Registration failed" };
    }
    // auto-login after registration
    return login(username, password);
  } catch {
    return { ok: false, error: "Network error" };
  }
}

/** Login with username + password. */
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
    const data = await res.json();
    if (!res.ok) {
      if (data?.errorCode === "INVALID_CREDENTIALS") {
        return { ok: false, error: "Invalid username or password" };
      }
      return { ok: false, error: data?.message || "Login failed" };
    }
    // store session
    localStorage.setItem(SESSION_KEY, data.sessionToken);
    localStorage.setItem(ALIAS_KEY, data.alias.id);
    localStorage.setItem(PLAYER_KEY, data.player.id);
    return { ok: true };
  } catch {
    return { ok: false, error: "Network error" };
  }
}

export function logout(): void {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(ALIAS_KEY);
  localStorage.removeItem(PLAYER_KEY);
}

/* ---------- session-aware headers for player-scoped requests ---------- */

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

/* ---------- game saves (persists coins, best, owned skins) ---------- */

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
                { key: "best", value: String(state.best), type: "System.Int32" },
                { key: "wallet", value: String(state.wallet), type: "System.Int32" },
                { key: "ownedSkins", value: JSON.stringify(state.ownedSkins), type: "System.String" },
                { key: "selectedSkin", value: state.selectedSkin, type: "System.String" },
                { key: "muted", value: String(state.muted), type: "System.Boolean" },
              ],
            },
          ],
        },
      }),
    });
  } catch { /* ignore */ }
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
    const latest = saves[0]; // most recent
    const obj = latest.content?.objects?.[0];
    if (!obj) return null;
    const get = (key: string) => obj.data.find((d: any) => d.key === key)?.value;
    return {
      best: Number(get("best") ?? 0),
      wallet: Number(get("wallet") ?? 0),
      ownedSkins: JSON.parse(get("ownedSkins") ?? '["bloo"]'),
      selectedSkin: get("selectedSkin") ?? "bloo",
      muted: get("muted") === "true",
    };
  } catch {
    return null;
  }
}

/* ---------- leaderboard (works for anonymous players too) ---------- */

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
  } catch { /* ignore */ }
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

/* ---------- anonymous fallback (for leaderboard before login) ---------- */

export async function initAnonymousPlayer(): Promise<string | null> {
  if (!hasTalo()) return null;
  const cached = getAliasId();
  if (cached) return cached;

  const identifier = "guest_" + Math.random().toString(36).slice(2, 10);
  try {
    const res = await fetch(
      `${TALO_API}/v1/players/identify?service=username&identifier=${identifier}`,
      { headers: gameHeaders() }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const id = data?.alias?.id;
    if (id) {
      localStorage.setItem(ALIAS_KEY, id);
      localStorage.setItem(PLAYER_KEY, String(data.player?.id ?? ""));
    }
    return id;
  } catch {
    return null;
  }
}

/** Delete a player account (removes all leaderboard entries too). */
export async function deleteAccount(): Promise<void> {
  if (!hasTalo() || !isLoggedIn()) return;
  try {
    await fetch(`${TALO_API}/v1/players/auth`, {
      method: "DELETE",
      headers: playerHeaders(),
    });
  } catch { /* ignore */ }
  logout();
}
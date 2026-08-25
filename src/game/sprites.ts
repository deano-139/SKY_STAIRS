import type { SkinDef } from "./skins";

/* ------------------------------------------------------------------ */
/*  Pixel sprite maps. Every row has the same width; "." = transparent */
/* ------------------------------------------------------------------ */

export type SpriteMap = string[];
export type Palette = Record<string, string>;

/* character legend:
   O outline · B body · D body dark · H body light · W belly
   E eye white · P pupil · C blush · M mouth · S shoes            */

export const SPR_STAND: SpriteMap = [
  "....OOOOOOOO....",
  "..OOBBBBBBBBOO..",
  ".OBBHHBBBBBBBBO.",
  ".OBHHBBBBBBBBBO.",
  "OBHBBBBBBBBBBBBO",
  "OBBBBBBBBBBBBBBO",
  "OBBEEBBBBBBEEBBO",
  "OBBEPBBBBBBEPBBO",
  "OBCBBBBMMBBBBCBO",
  "OBBBBWWWWWWWBBBO",
  "OBBBWWWWWWWWWBBO",
  "OBBWWWWWWWWWBBBO",
  "OBBBWWWWWWWBBBBO",
  "...SSS....SSS...",
  "...SSS....SSS...",
];

export const SPR_JUMP: SpriteMap = [
  "....OOOOOOOO....",
  "..OOBBBBBBBBOO..",
  ".OBBHHBBBBBBBBO.",
  ".OBHHBBBBBBBBBO.",
  "OBHBBBBBBBBBBBBO",
  "OBBBBBBBBBBBBBBO",
  "OBBEEBBBBBBEEBBO",
  "OBBEPBBBBBBEPBBO",
  "OBCBBMMMMMMBBCBO",
  "OBBBBWWWWWWWBBBO",
  "OBBBWWWWWWWWWBBO",
  "OBBWWWWWWWWWBBBO",
  "OBBBWWWWWWWBBBBO",
  "..SSS......SSS..",
  ".SSS........SSS.",
];

export const SPR_FALL: SpriteMap = [
  "....OOOOOOOO....",
  "..OOBBBBBBBBOO..",
  ".OBBHHBBBBBBBBO.",
  ".OBHHBBBBBBBBBO.",
  "OBHBBBBBBBBBBBBO",
  "OBBBBBBBBBBBBBBO",
  "OBBEEBBBBBBEEBBO",
  "OBBEPBBBBBBEPBBO",
  "OBBBBBBMMBBBBBBO",
  "OBBBBWWWWWWWBBBO",
  "OBBBWWWWWWWWWBBO",
  "OBBWWWWWWWWWBBBO",
  "OBBBWWWWWWWBBBBO",
  "..SSS......SSS..",
  ".SS..........SS.",
];

export const SPR_W = 16;
export const SPR_H = 15;

/* ------------------------- accessories ------------------------- */
/* anchors are in sprite-pixel units relative to the 16x15 character */

export const ACC_CROWN: SpriteMap = [
  "G...G...G",
  "GG..G..GG",
  "GGGGGGGGG",
  "GGGGGGGGG",
  "GGRGGGRGG",
];

export const ACC_CAP: SpriteMap = [
  "...AAAAAA...",
  "..AAAAAAAA..",
  ".AAAAAAAAAA.",
  "AAAAAAAAAAAA",
  ".....KKKKKKK",
];

export const ACC_RIBBON: SpriteMap = [
  "AAA...AAA",
  "AAAA.AAAA",
  ".AAKKKAA.",
  "..A...A..",
];

export const ACC_HORNS: SpriteMap = [
  "A..........A",
  "AA........AA",
  "AAA......AAA",
  "AAAA....AAAA",
  ".AAA....AAA.",
];

export const ACC_ANTENNA: SpriteMap = [
  "GGG",
  "GGG",
  "GGG",
  ".K.",
  ".K.",
  ".K.",
  ".K.",
  ".K.",
];

export const ACC_HEADBAND: SpriteMap = [
  "AAAAAAAAAAAAAAKK",
  "AAAAAAAAAAAAAAKK",
  "TT..............",
  "T...............",
];

export const ACC_HALO: SpriteMap = [
  "..YYYYYY..",
  ".YY....YY.",
  ".YY....YY.",
  "..YYYYYY..",
];

export const ACC_SPROUT: SpriteMap = [
  ".NN.NN.",
  ".NNNNN.",
  "...N...",
  "...N...",
];

export const ACC_EARS: SpriteMap = [
  "A...A",
  "A...A",
  "A...A",
  "AA.AA",
];

export const ACC_HEADPHONES: SpriteMap = [
  "...KKKKKKKKKK...",
  "..KK........KK..",
  ".KK..........KK.",
  "PP............PP",
  "PP............PP",
];

export const ACC_FLOWER: SpriteMap = [
  ".A.A.",
  "AAYA.",
  ".A.A.",
  "..N..",
];

export const ACC_GOGGLES: SpriteMap = [
  "KKKKKKKKKK",
  "KLLKKKKLLK",
  "KUUKKKKUUK",
];

export interface AccPlacement {
  map: SpriteMap;
  ox: number;
  oy: number;
}

export const ACCESSORIES: Record<string, AccPlacement> = {
  crown: { map: ACC_CROWN, ox: 3, oy: -5 },
  cap: { map: ACC_CAP, ox: 2, oy: -4 },
  ribbon: { map: ACC_RIBBON, ox: -3, oy: -1 },
  horns: { map: ACC_HORNS, ox: 2, oy: -4 },
  antenna: { map: ACC_ANTENNA, ox: 6, oy: -8 },
  headband: { map: ACC_HEADBAND, ox: 0, oy: 2 },
  halo: { map: ACC_HALO, ox: 3, oy: -8 },
  sprout: { map: ACC_SPROUT, ox: 4, oy: -4 },
  ears: { map: ACC_EARS, ox: 5, oy: -4 },
  headphones: { map: ACC_HEADPHONES, ox: 0, oy: -3 },
  flower: { map: ACC_FLOWER, ox: 0, oy: 1 },
  goggles: { map: ACC_GOGGLES, ox: 3, oy: 3 },
};

/* --------------------------- pickups --------------------------- */

export const COIN_SPR: SpriteMap = [
  "..GGGG..",
  ".GYYYYG.",
  "GYLLYYYG",
  "GYLYYYDG",
  "GYYYYYDG",
  "GYYYYDDG",
  ".GDDDDG.",
  "..GGGG..",
];

export const ARROW_UP: SpriteMap = [
  "...U...",
  "..UUU..",
  ".UUUUU.",
  "UUUUUUU",
  "...U...",
  "...U...",
  "...U...",
];

export const ARROW_SIDE: SpriteMap = [
  "...U...",
  "..U....",
  ".U.....",
  "UUUUUUU",
  ".U.....",
  "..U....",
  "...U...",
];

/* --------------------------- scenery --------------------------- */

export const CLOUD_SPR: SpriteMap = [
  "....WWWWWW....",
  "..WWWWWWWWWW..",
  ".WWWWWWWWWWWW.",
  "WWWWWWWWWWWWWW",
  ".WWWWWWWWWWWW.",
  "....WWWWWW....",
];

export const MOON_SPR: SpriteMap = [
  "....MMMMM....",
  "..MMMMMMMMM..",
  ".MMMCMMMMMMM.",
  ".MMMMMMCMMMM.",
  "MMMMMMMMMMMMM",
  "MMMCMMMMMMMMM",
  "MMMMMMMMMCMMM",
  "MMMMMMMMMMMMM",
  ".MMMMCMMMMMM.",
  ".MMMMMMMCMMM.",
  "..MMMMMMMMM..",
  "....MMMMM....",
];

export const PLANET_SPR: SpriteMap = [
  "....PPPPP....",
  "..PPPPPPPPP..",
  ".PPPDDPPPPPP.",
  ".PPPPPPDDPPP.",
  "RPPPPPPPPPPPR",
  ".RPPPPPPPPPR.",
  "..RRPPPPPRR..",
  "....PPPPP....",
  ".....PPP.....",
];

/* --------------------------- palettes --------------------------- */

export function shadeHex(hex: string, f: number): string {
  const h = hex.replace("#", "");
  const n = [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ].map((v) => Math.max(0, Math.min(255, Math.round(v * f))));
  return `rgb(${n[0]},${n[1]},${n[2]})`;
}

/** Full palette for the character sprite from a skin definition. */
export function charPalette(s: SkinDef): Palette {
  return {
    O: s.outline,
    B: s.body,
    D: shadeHex(s.body, 0.6),
    H: shadeHex(s.body, 1.45),
    W: s.belly,
    S: shadeHex(s.outline, 1.6),
    A: s.accent,
    K: shadeHex(s.accent, 0.55),
    G: "#ffd23f",
    R: "#ff5d7e",
    Y: "#ffe9a3",
    N: "#4aa83a",
    T: shadeHex(s.accent, 0.8),
    E: "#ffffff",
    P: "#26123d",
    C: "#ff7d9c",
    M: "#8a3350",
    L: "#9fe8ff",
    U: "#5fb8d8",
  };
}

export const COIN_PAL: Palette = {
  G: "#a3690c",
  Y: "#ffd23f",
  L: "#fff0a8",
  D: "#c98a12",
};

export const CLOUD_PAL: Palette = { W: "rgba(255,238,216,0.30)" };
export const MOON_PAL: Palette = { M: "#fff3dc", C: "#e3cfa6" };
export const PLANET_PAL: Palette = { P: "#c98bff", D: "#8f5fd0", R: "#ffd9a0" };

/* --------------------------- morning life --------------------------- */

/* rooftop pedestrians — two walking frames, 6x9 */
export const WALKER_A: SpriteMap = [
  ".HHHH.",
  ".FFFF.",
  "..CC..",
  ".CCCC.",
  ".CCCC.",
  "..CC..",
  "..LL..",
  ".L..L.",
  ".L...L",
];
export const WALKER_B: SpriteMap = [
  ".HHHH.",
  ".FFFF.",
  "..CC..",
  ".CCCC.",
  ".CCCC.",
  "..CC..",
  "..LL..",
  "..LL..",
  "..LL..",
];
export const WALKER_PAL: Palette = {
  H: "#4a3325",
  F: "#ffd9b0",
  C: "#2fa8b8",
  L: "#33415e",
};

/* birds — flap frames, 5x3 */
export const BIRD_A: SpriteMap = [
  "W...W",
  ".WWW.",
  "..B..",
];
export const BIRD_B: SpriteMap = [
  ".....",
  "WWBWW",
  ".....",
];
export const BIRD_PAL: Palette = { W: "#2f3f6e", B: "#4a5f9e" };

/* little jet crossing the sky, 14x5 */
export const PLANE_SPR: SpriteMap = [
  "......WW......",
  "TT.FFFFFFFFFF.",
  "TTTFFFFFFFFFFN",
  "....WWW..WWW..",
  "......W.......",
];
export const PLANE_PAL: Palette = {
  F: "#f4f7ff",
  W: "#c9d6f2",
  T: "#8fa6cc",
  N: "#ff5d7e",
};

/* hot-air balloon, 9x12 */
export const BALLOON_SPR: SpriteMap = [
  "..RRRRR..",
  ".RWWRRWR.",
  "RRWWRRWWR",
  "RRWWRRWWR",
  "RRRRRRRRR",
  ".RRRRRRR.",
  "..RRRRR..",
  "...B.B...",
  "...B.B...",
  "..KKKKK..",
  "..KKKKK..",
  "...KKK...",
];
export const BALLOON_PAL: Palette = {
  R: "#ff6a5e",
  W: "#fff0bd",
  B: "#8a6a4a",
  K: "#b07a3e",
};

/* satellite drifting in space, 11x5 */
export const SATELLITE_SPR: SpriteMap = [
  "PPP..BB..PPP",
  "PPP..BB..PPP",
  "PPPBBBBBBPPP",
  ".....DD.....",
  ".....DD.....",
];
export const SATELLITE_PAL: Palette = {
  P: "#4f7fd6",
  B: "#dfe6f5",
  D: "#9fb4d8",
};



/* --------------------------- renderers --------------------------- */

/**
 * Blit a sprite map pixel by pixel.
 * (x, y) is the top-left in canvas pixels; px = size of one sprite pixel.
 * flip mirrors horizontally (used for facing left).
 */
export function blit(
  ctx: CanvasRenderingContext2D,
  map: SpriteMap,
  pal: Palette,
  x: number,
  y: number,
  px: number,
  flip = false
) {
  const w = map[0].length;
  for (let r = 0; r < map.length; r++) {
    const row = map[r];
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      if (ch === ".") continue;
      const col = pal[ch];
      if (!col) continue;
      const cc = flip ? w - 1 - c : c;
      ctx.fillStyle = col;
      ctx.fillRect(x + cc * px, y + r * px, px, px);
    }
  }
}

/** blit with a horizontal squash (coin spin) — keeps center aligned */
export function blitSquash(
  ctx: CanvasRenderingContext2D,
  map: SpriteMap,
  pal: Palette,
  cx: number,
  y: number,
  px: number,
  hscale: number
) {
  const w = map[0].length;
  const half = (w * hscale) / 2;
  for (let r = 0; r < map.length; r++) {
    const row = map[r];
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      if (ch === ".") continue;
      const col = pal[ch];
      if (!col) continue;
      const rel = (c + 0.5) / w - 0.5; // -0.5 .. 0.5
      if (Math.abs(rel) > half / w) continue;
      ctx.fillStyle = col;
      ctx.fillRect(Math.round(cx + rel * w * hscale * px), y + r * px, px, px);
    }
  }
}

/** Anchor-aware accessory blit that respects the character's facing. */
export function blitAccessory(
  ctx: CanvasRenderingContext2D,
  acc: AccPlacement,
  pal: Palette,
  sprX: number,
  sprY: number,
  px: number,
  flip: boolean
) {
  const aw = acc.map[0].length;
  const ox = flip ? (SPR_W - acc.ox - aw) * px : acc.ox * px;
  blit(ctx, acc.map, pal, sprX + ox, sprY + acc.oy * px, px, flip);
}

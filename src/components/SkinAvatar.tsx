import type { SkinDef } from "../game/skins";
import { SPR_STAND, ACCESSORIES, charPalette, type SpriteMap, type Palette } from "../game/sprites";

/** Pixel-art preview that mirrors the in-game canvas sprite. */
export default function SkinAvatar({ skin, size = 96 }: { skin: SkinDef; size?: number }) {
  const pal = charPalette(skin);
  const acc = ACCESSORIES[skin.accessory];
  const maps: { map: SpriteMap; ox: number; oy: number }[] = [{ map: SPR_STAND, ox: 0, oy: 0 }];
  if (acc) maps.push({ map: acc.map, ox: acc.ox, oy: acc.oy });

  const rects: { x: number; y: number; c: string }[] = [];
  for (const { map, ox, oy } of maps) {
    for (let r = 0; r < map.length; r++) {
      const row = map[r];
      for (let c = 0; c < row.length; c++) {
        const ch = row[c];
        if (ch === ".") continue;
        const col = pal[ch];
        if (!col) continue;
        rects.push({ x: ox + c, y: oy + r, c: col });
      }
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="-4 -9 24 25"
      shapeRendering="crispEdges"
      aria-label={skin.name}
    >
      {rects.map((p, i) => (
        <rect key={i} x={p.x} y={p.y} width={1.02} height={1.02} fill={p.c} />
      ))}
    </svg>
  );
}

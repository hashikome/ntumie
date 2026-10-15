import { hash } from "./avatar-generator";

// A hub's mark: four tiles from a fixed palette, seeded by the hub's immutable
// ID so a rename never changes it and nothing is uploaded or stored. Like person
// avatars, the palette stays the same in both themes.
const PALETTE = ["#1f3fbf", "#c9d3ff", "#2f4a3d", "#6b7a99", "#c48a5a", "#7aa38e"] as const;

/** Top-left, top-right, bottom-left, bottom-right; no tile repeats the one before it. */
export function hubMarkTiles(seed: string): string[] {
  const tiles: string[] = [];
  for (let index = 0; index < 4; index++) {
    const left = PALETTE.filter((color) => color !== tiles.at(-1));
    tiles.push(left[hash(seed, 20 + index) % left.length]);
  }
  return tiles;
}

export function renderHubMarkSvg(seed: string, size = 64): string {
  const [a, b, c, d] = hubMarkTiles(seed);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" role="img" aria-label="Hub mark">` +
    `<rect x="0" y="0" width="12" height="12" fill="${a}"/>` +
    `<rect x="12" y="0" width="12" height="12" fill="${b}"/>` +
    `<rect x="0" y="12" width="12" height="12" fill="${c}"/>` +
    `<rect x="12" y="12" width="12" height="12" fill="${d}"/>` +
    "</svg>"
  );
}

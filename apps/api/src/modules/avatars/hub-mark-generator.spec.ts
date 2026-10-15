import { describe, expect, it } from "bun:test";
import { hubMarkTiles, renderHubMarkSvg } from "./hub-mark-generator";

describe("hub mark generator", () => {
  it("draws four stable tiles from the palette with no tile repeating the one before", () => {
    const palette = ["#1f3fbf", "#c9d3ff", "#2f4a3d", "#6b7a99", "#c48a5a", "#7aa38e"];
    const seeds = Array.from(
      { length: 200 },
      (_, index) => `019a0000-0000-7000-8000-${index.toString(16).padStart(12, "0")}`,
    );
    const marks = new Set<string>();
    for (const seed of seeds) {
      const tiles = hubMarkTiles(seed);
      expect(tiles).toHaveLength(4);
      for (const tile of tiles) expect(palette).toContain(tile);
      for (let index = 1; index < 4; index++) expect(tiles[index]).not.toBe(tiles[index - 1]);
      expect(renderHubMarkSvg(seed)).toBe(renderHubMarkSvg(seed));
      expect(renderHubMarkSvg(seed)).not.toContain(seed);
      marks.add(tiles.join());
    }
    // Neighbouring IDs still look different.
    expect(marks.size).toBeGreaterThan(100);
  });
});

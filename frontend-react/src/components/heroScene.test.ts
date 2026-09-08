import { describe, it, expect } from "vitest";
import {
  COLOR_COUNTS,
  FAMILIES,
  TEMPLATES,
  buildPalette,
  createHeroScene,
  type ColorCount,
} from "./heroScene";

const HEX = /^#[0-9A-Fa-f]{6}$/;

// createHeroScene calls rng() exactly three times: count, family, variant.
function rngOf(...values: number[]): () => number {
  let i = 0;
  return () => values[i++];
}

describe("createHeroScene", () => {
  it("reaches every colour count from 2 to 6", () => {
    const counts = COLOR_COUNTS.map((_, i) =>
      // rng for count = (i + 0.5) / 5 lands squarely in bucket i.
      createHeroScene(rngOf((i + 0.5) / 5, 0.1, 0.1)).count,
    );
    expect(counts).toEqual([2, 3, 4, 5, 6]);
  });

  it("reaches both artwork variants", () => {
    expect(createHeroScene(rngOf(0.5, 0.1, 0.1)).variant).toBe("A");
    expect(createHeroScene(rngOf(0.5, 0.1, 0.9)).variant).toBe("B");
  });

  it("reaches all three palette families", () => {
    const names = FAMILIES.map((_, i) => createHeroScene(rngOf(0.5, (i + 0.5) / 3, 0.1)).paletteName);
    expect(names).toEqual(["Earth & air", "Sea & sky", "Wine & roses"]);
  });

  it("keeps the maximum rng value ([0,1) upper edge) inside every array", () => {
    const edge = 1 - Number.EPSILON;
    const scene = createHeroScene(rngOf(edge, edge, edge));
    // count is the last count, family the last family, variant B — nothing overflows.
    expect(scene.count).toBe(6);
    expect(scene.paletteName).toBe("Wine & roses");
    expect(scene.variant).toBe("B");
    expect(scene.colors).toHaveLength(6);
  });

  it("produces N distinct valid HEX colours for every count", () => {
    for (const count of COLOR_COUNTS) {
      for (const family of FAMILIES) {
        const colors = buildPalette(family, count);
        expect(colors).toHaveLength(count);
        colors.forEach((c) => expect(c).toMatch(HEX));
        expect(new Set(colors).size).toBe(count);
      }
    }
  });

  it("makes every colour index visible in the artwork (background or a shape)", () => {
    // For all 30 compatible scenes: colour 0 is the background, and the union with the shape
    // colours must cover 0..N-1 — no colour lives only in the swatches or the chip.
    for (const count of COLOR_COUNTS) {
      for (const variant of TEMPLATES[count]) {
        const used = new Set<number>([0]);
        variant.shapes.forEach(([colorIndex]) => used.add(colorIndex));
        for (let i = 0; i < count; i++) {
          expect(used.has(i)).toBe(true);
        }
      }
    }
  });

  it("chooses the artwork independently of the palette", () => {
    // Same count + variant rng, different family rng → same template, different palette.
    const a = createHeroScene(rngOf(0.5, 0.1, 0.1));
    const b = createHeroScene(rngOf(0.5, 0.9, 0.1));
    expect(a.templateName).toBe(b.templateName);
    expect(a.paletteName).not.toBe(b.paletteName);
  });
});

describe("buildPalette ordering", () => {
  it("matches the approved role order for each count", () => {
    const f = FAMILIES[0];
    const expected: Record<ColorCount, string[]> = {
      2: [f.paper, f.accent],
      3: [f.paper, f.accent, f.olive],
      4: [f.paper, f.accent, f.sage, f.olive],
      5: [f.paper, f.accent, f.olive, f.ink, f.sage],
      6: [f.paper, f.accent, f.olive, f.ink, f.sage, f.gold],
    };
    for (const count of COLOR_COUNTS) {
      expect(buildPalette(f, count)).toEqual(expected[count]);
    }
  });
});

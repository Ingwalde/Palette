import { describe, it, expect } from "vitest";
import { dominantColors, medianCut, quantizeToHex, rgbToHex, type RGB } from "./quantize";

describe("rgbToHex", () => {
  it("formats an RGB triple as uppercase hex", () => {
    expect(rgbToHex([0, 0, 0])).toBe("#000000");
    expect(rgbToHex([255, 255, 255])).toBe("#FFFFFF");
    expect(rgbToHex([15, 145, 153])).toBe("#0F9199");
  });
});

describe("medianCut", () => {
  it("returns nothing for no pixels", () => {
    expect(medianCut([], 4)).toEqual([]);
  });

  it("never returns more colours than pixels", () => {
    const pixels: RGB[] = [
      [10, 10, 10],
      [250, 250, 250],
    ];
    expect(medianCut(pixels, 8)).toHaveLength(2);
  });

  it("separates two well-defined clusters into two colours", () => {
    // A tight dark cluster and a tight light cluster; median cut should land one box on each.
    const dark: RGB[] = Array.from({ length: 20 }, (_, i) => [i % 5, i % 5, i % 5]);
    const light: RGB[] = Array.from({ length: 20 }, (_, i) => [
      250 + (i % 5),
      250 + (i % 5),
      250 + (i % 5),
    ]);
    const colors = medianCut([...dark, ...light], 2);
    expect(colors).toHaveLength(2);
    // Sorted by luma: the dark cluster first.
    expect(colors[0][0]).toBeLessThan(50);
    expect(colors[1][0]).toBeGreaterThan(200);
  });

  it("orders the result from darkest to lightest", () => {
    const pixels: RGB[] = [
      [255, 255, 255],
      [128, 128, 128],
      [0, 0, 0],
    ];
    const colors = medianCut(pixels, 3);
    const lumas = colors.map(([r]) => r);
    expect(lumas).toEqual([...lumas].sort((a, b) => a - b));
  });

  it("does not mutate the caller's pixel array", () => {
    const pixels: RGB[] = [
      [200, 0, 0],
      [0, 0, 200],
      [0, 200, 0],
    ];
    const snapshot = JSON.stringify(pixels);
    medianCut(pixels, 2);
    expect(JSON.stringify(pixels)).toBe(snapshot);
  });
});

describe("dominantColors", () => {
  it("returns nothing for no pixels", () => {
    expect(dominantColors([], 4)).toEqual([]);
  });

  it("keeps a solid region's true colour instead of a muddy average", () => {
    // A large vivid-orange block with a little dark and light noise around it. Median-cut averaging
    // returned a greyed tan here; popularity must give back the orange essentially intact.
    const orange: RGB[] = Array.from({ length: 300 }, () => [250, 86, 47] as RGB);
    const dark: RGB[] = Array.from({ length: 30 }, () => [20, 20, 20] as RGB);
    const light: RGB[] = Array.from({ length: 30 }, () => [245, 245, 245] as RGB);
    const colors = dominantColors([...orange, ...dark, ...light], 2);
    const near = colors.find(([r, g, b]) => Math.hypot(r - 250, g - 86, b - 47) < 20);
    expect(near).toBeDefined();
  });

  it("ranks by dominance: the biggest cluster wins for a single colour", () => {
    const many: RGB[] = Array.from({ length: 100 }, () => [200, 30, 30] as RGB);
    const few: RGB[] = Array.from({ length: 10 }, () => [30, 30, 200] as RGB);
    expect(dominantColors([...many, ...few], 1)).toEqual([[200, 30, 30]]);
  });

  it("does not list two near-identical swatches when a distinct one is available", () => {
    const cream: RGB[] = Array.from({ length: 200 }, () => [235, 228, 208] as RGB);
    const cream2: RGB[] = Array.from({ length: 150 }, () => [232, 225, 205] as RGB);
    const accent: RGB[] = Array.from({ length: 120 }, () => [250, 86, 47] as RGB);
    const colors = dominantColors([...cream, ...cream2, ...accent], 2);
    const hasAccent = colors.some(
      ([r, g, b]) => Math.hypot(r - 250, g - 86, b - 47) < 20,
    );
    expect(hasAccent).toBe(true);
  });
});

describe("quantizeToHex", () => {
  it("maps a known buffer to sorted hex swatches", () => {
    const pixels: RGB[] = [
      [255, 0, 0],
      [0, 255, 0],
      [0, 0, 255],
      [255, 255, 0],
    ];
    const hexes = quantizeToHex(pixels, 4);
    expect(hexes).toHaveLength(4);
    expect(hexes.every((h) => /^#[0-9A-F]{6}$/.test(h))).toBe(true);
  });

  it("de-duplicates identical swatches", () => {
    const pixels: RGB[] = Array.from({ length: 10 }, () => [100, 100, 100] as RGB);
    expect(quantizeToHex(pixels, 5)).toEqual(["#646464"]);
  });
});

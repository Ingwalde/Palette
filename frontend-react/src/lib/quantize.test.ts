import { describe, it, expect } from "vitest";
import { medianCut, quantizeToHex, rgbToHex, type RGB } from "./quantize";

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

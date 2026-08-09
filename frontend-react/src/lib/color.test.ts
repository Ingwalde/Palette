import { describe, it, expect } from "vitest";
import { getPaletteContrastStatus } from "./color";

describe("getPaletteContrastStatus", () => {
  it("rates black-on-white as excellent (21:1)", () => {
    const { label, ratio } = getPaletteContrastStatus(["#000000", "#FFFFFF"]);
    expect(ratio).toBe(21);
    expect(label).toBe("Excellent contrast");
  });

  it("rates two near-identical light colors as low contrast", () => {
    const { label, ratio } = getPaletteContrastStatus(["#CCCCCC", "#DDDDDD"]);
    expect(ratio).toBeLessThan(3);
    expect(label).toBe("Low contrast");
  });

  it("uses the darkest and lightest colors regardless of order", () => {
    const a = getPaletteContrastStatus(["#FFFFFF", "#406EB7", "#000000"]);
    const b = getPaletteContrastStatus(["#000000", "#FFFFFF", "#406EB7"]);
    expect(a).toEqual(b);
    expect(a.ratio).toBe(21);
  });

  it("throws on an invalid HEX", () => {
    expect(() => getPaletteContrastStatus(["not-a-color", "#FFFFFF"])).toThrow(
      /Invalid HEX/,
    );
  });
});

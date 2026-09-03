import { describe, it, expect } from "vitest";
import {
  getContrastMatrix,
  getPaletteContrastStatus,
  toHslString,
  toRgbString,
} from "./color";

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

describe("getContrastMatrix", () => {
  it("is N×N with an empty diagonal", () => {
    const m = getContrastMatrix(["#000000", "#FFFFFF", "#808080"]);
    expect(m).toHaveLength(3);
    expect(m[0]).toHaveLength(3);
    expect(m[0][0]).toBeNull();
    expect(m[1][1]).toBeNull();
    expect(m[2][2]).toBeNull();
  });

  it("labels black-vs-white AAA at 21:1 and is symmetric", () => {
    const m = getContrastMatrix(["#000000", "#FFFFFF"]);
    expect(m[0][1]).toEqual({ ratio: 21, level: "AAA" });
    expect(m[1][0]).toEqual({ ratio: 21, level: "AAA" });
  });

  it("marks a low-contrast pair with a dash", () => {
    const m = getContrastMatrix(["#777777", "#808080"]);
    expect(m[0][1]?.level).toBe("—");
  });
});

describe("toRgbString / toHslString", () => {
  it("converts primaries", () => {
    expect(toRgbString("#FF0000")).toBe("rgb(255, 0, 0)");
    expect(toHslString("#FF0000")).toBe("hsl(0, 100%, 50%)");
    expect(toRgbString("#000000")).toBe("rgb(0, 0, 0)");
    expect(toHslString("#FFFFFF")).toBe("hsl(0, 0%, 100%)");
  });
});

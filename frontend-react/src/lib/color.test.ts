import { describe, it, expect } from "vitest";
import {
  formatColor,
  formatContrastRatio,
  getContrastLevel,
  getContrastMatrix,
  getContrastRatio,
  getPaletteContrastStatus,
  toHslString,
  toOklchString,
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

  it("does not round a ~4.478 pair up to AA", () => {
    // #777 on #fff is ~4.478:1 — just under the 4.5 AA threshold. The old code rounded the ratio to
    // 4.5 before levelling and wrongly labelled it AA.
    const m = getContrastMatrix(["#777777", "#FFFFFF"]);
    expect(m[0][1]?.ratio).toBeCloseTo(4.478, 2);
    expect(m[0][1]?.level).toBe("—");
  });
});

describe("getContrastRatio + getContrastLevel", () => {
  it("keeps full precision for the AA threshold comparison", () => {
    const ratio = getContrastRatio("#777777", "#FFFFFF");
    expect(ratio).toBeCloseTo(4.478, 2);
    expect(ratio).toBeLessThan(4.5);
    expect(getContrastLevel(ratio)).toBe("—");
  });

  it("is symmetric in its two colours", () => {
    expect(getContrastRatio("#777777", "#FFFFFF")).toBeCloseTo(
      getContrastRatio("#FFFFFF", "#777777"),
      10,
    );
  });

  it("levels by the exact 4.5 and 7 thresholds", () => {
    expect(getContrastLevel(4.49)).toBe("—");
    expect(getContrastLevel(4.5)).toBe("AA");
    expect(getContrastLevel(6.99)).toBe("AA");
    expect(getContrastLevel(7)).toBe("AAA");
    expect(getContrastLevel(21)).toBe("AAA");
  });
});

describe("formatContrastRatio", () => {
  it("rounds to one decimal for display, dropping a trailing zero", () => {
    expect(formatContrastRatio(4.478089)).toBe("4.5");
    expect(formatContrastRatio(21)).toBe("21");
    expect(formatContrastRatio(7)).toBe("7");
    expect(formatContrastRatio(3.24)).toBe("3.2");
  });
});

describe("getPaletteContrastStatus levelling", () => {
  it("calls a ~4.478 darkest/lightest pair Medium, not Good", () => {
    const status = getPaletteContrastStatus(["#777777", "#FFFFFF"]);
    expect(status.ratio).toBeLessThan(4.5);
    expect(status.label).toBe("Medium contrast");
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

describe("toOklchString", () => {
  it("matches known OKLCH values", () => {
    expect(toOklchString("#000000")).toBe("oklch(0.000 0.000 0.0)");
    // sRGB red's published OKLCH is ~0.628 / 0.258 / 29.2.
    expect(toOklchString("#FF0000")).toBe("oklch(0.628 0.258 29.2)");
  });

  it("gives white lightness 1 and no chroma", () => {
    const white = toOklchString("#FFFFFF");
    expect(white.startsWith("oklch(1.000 0.000")).toBe(true);
  });
});

describe("formatColor", () => {
  it("dispatches to each format and normalises hex", () => {
    expect(formatColor("#ff0000", "hex")).toBe("#FF0000");
    expect(formatColor("#ff0000", "rgb")).toBe("rgb(255, 0, 0)");
    expect(formatColor("#ff0000", "hsl")).toBe("hsl(0, 100%, 50%)");
    expect(formatColor("#ff0000", "oklch")).toBe("oklch(0.628 0.258 29.2)");
  });
});

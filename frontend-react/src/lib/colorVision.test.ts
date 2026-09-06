import { describe, it, expect } from "vitest";
import { CVD_TYPES, cvdLabel } from "./colorVision";

describe("colorVision", () => {
  it("defines the three dichromat types", () => {
    expect(CVD_TYPES.map((t) => t.id)).toEqual([
      "protanopia",
      "deuteranopia",
      "tritanopia",
    ]);
  });

  it("gives each a valid 4x5 feColorMatrix (20 numbers)", () => {
    for (const type of CVD_TYPES) {
      const nums = type.matrix.trim().split(/\s+/).map(Number);
      expect(nums).toHaveLength(20);
      expect(nums.every((n) => Number.isFinite(n))).toBe(true);
    }
  });

  it("resolves labels by id", () => {
    expect(cvdLabel("deuteranopia")).toBe("Deuteranopia");
    expect(cvdLabel("none")).toBeUndefined();
  });
});

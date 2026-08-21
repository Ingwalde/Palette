import { describe, it, expect } from "vitest";
import { generateExportText, getExportFilename } from "./exportGenerators";
import type { Palette } from "../types/api";

const palette: Palette = {
  id: 1,
  slug: "sea-breeze",
  name: "Sea Breeze",
  description: "Fresh.",
  colors: ["#006D77", "#83C5BE"],
  tags: ["cold"],
  created_at: "",
  updated_at: "",
};

describe("generateExportText", () => {
  it("emits CSS custom properties under :root", () => {
    const css = generateExportText([palette], "css");
    expect(css).toContain(":root {");
    expect(css).toContain("--sea-breeze-1: #006D77;");
    expect(css).toContain("--sea-breeze-2: #83C5BE;");
    expect(css).toContain("/* Sea Breeze */");
  });

  it("emits valid JSON round-tripping the palettes", () => {
    const json = generateExportText([palette], "json");
    expect(JSON.parse(json)).toEqual([palette]);
  });
});

describe("getExportFilename", () => {
  it("uses the slug for a single palette", () => {
    expect(getExportFilename([palette], "css")).toBe("sea-breeze-palette.css");
  });

  it("uses a generic name for multiple palettes", () => {
    expect(getExportFilename([palette, palette], "json")).toBe("palette-export.json");
  });
});

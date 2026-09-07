import { describe, it, expect } from "vitest";
import { palettePath } from "./palettePath";

describe("palettePath", () => {
  it("scopes the URL by owner handle and slug", () => {
    expect(palettePath({ owner_handle: "palette", slug: "sea-breeze" })).toBe(
      "/u/palette/sea-breeze",
    );
    expect(palettePath({ owner_handle: "ann", slug: "desert-clay" })).toBe(
      "/u/ann/desert-clay",
    );
  });

  it("encodes handle and slug", () => {
    expect(palettePath({ owner_handle: "a b", slug: "c/d" })).toBe("/u/a%20b/c%2Fd");
  });
});

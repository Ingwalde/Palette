import { describe, it, expect, beforeEach } from "vitest";
import {
  applyTheme,
  normalizeTheme,
  persistTheme,
  readStoredTheme,
  THEME_STORAGE_KEY,
} from "./theme";

describe("normalizeTheme", () => {
  it("keeps explicit choices and defaults everything else to system", () => {
    expect(normalizeTheme("light")).toBe("light");
    expect(normalizeTheme("dark")).toBe("dark");
    expect(normalizeTheme("system")).toBe("system");
    expect(normalizeTheme(null)).toBe("system");
    expect(normalizeTheme("nonsense")).toBe("system");
  });
});

describe("applyTheme", () => {
  it("sets data-theme for an explicit choice and removes it for system", () => {
    const root = document.createElement("html");
    applyTheme("dark", root);
    expect(root.getAttribute("data-theme")).toBe("dark");
    applyTheme("light", root);
    expect(root.getAttribute("data-theme")).toBe("light");
    applyTheme("system", root);
    expect(root.hasAttribute("data-theme")).toBe(false);
  });
});

describe("persistTheme / readStoredTheme", () => {
  beforeEach(() => localStorage.clear());

  it("stores an explicit choice and reads it back", () => {
    persistTheme("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(readStoredTheme()).toBe("dark");
  });

  it("deletes the key for system so the media query decides", () => {
    persistTheme("light");
    persistTheme("system");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    expect(readStoredTheme()).toBe("system");
  });
});

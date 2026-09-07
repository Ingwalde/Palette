// Theme primitives, kept out of the React context module so both can be imported without pulling
// in components (and so Fast Refresh stays happy).

export type Theme = "system" | "light" | "dark";

// Mirrors public/theme-init.js — keep the key in sync. That script stamps the attribute before
// first paint; the ThemeProvider owns it afterwards.
export const THEME_STORAGE_KEY = "palette:theme";

/** Coerce a stored value to a valid Theme; anything unexpected means "system". */
export function normalizeTheme(raw: string | null): Theme {
  return raw === "light" || raw === "dark" ? raw : "system";
}

/**
 * Reflect a theme onto the document. An explicit choice sets data-theme so it beats the
 * prefers-color-scheme media query; "system" removes the attribute so the media query decides.
 * Pure over its inputs (takes the root element) so it is unit-testable.
 */
export function applyTheme(
  theme: Theme,
  root: HTMLElement = document.documentElement,
): void {
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

export function readStoredTheme(): Theme {
  try {
    return normalizeTheme(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
}

export function persistTheme(theme: Theme): void {
  try {
    // "system" is the absence of a choice, so it deletes the key rather than storing a value.
    if (theme === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // No persistence available; the in-memory choice still works for this session.
  }
}

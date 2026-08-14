import { createGlobalTheme, createGlobalThemeContract } from "@vanilla-extract/css";

/**
 * Design tokens, typed.
 *
 * The custom property names are pinned to the ones the original stylesheets already use
 * (`--color-bg`, `--radius-md`, …) rather than letting vanilla-extract generate hashed ones.
 * That is what makes an incremental migration possible: every rule still living in
 * styles/vanilla/*.css keeps resolving `var(--color-bg)` untouched, while migrated code reads
 * the same value through `vars.color.bg` with autocomplete and a compile error if it is
 * renamed.
 *
 * Once nothing global is left, the second argument can be dropped and the names hashed.
 */
export const vars = createGlobalThemeContract({
  color: {
    bg: "color-bg",
    surface: "color-surface",
    surfaceStrong: "color-surface-strong",
    text: "color-text",
    muted: "color-muted",
    border: "color-border",
    primary: "color-primary",
    primarySoft: "color-primary-soft",
    danger: "color-danger",
    success: "color-success",
  },
  shadow: {
    soft: "shadow-soft",
  },
  radius: {
    lg: "radius-lg",
    md: "radius-md",
    sm: "radius-sm",
  },
  layout: {
    container: "container",
  },
  motion: {
    transition: "transition",
  },
});

createGlobalTheme(":root", vars, {
  color: {
    bg: "#f7f2eb",
    surface: "#fffaf2",
    surfaceStrong: "#efe7dc",
    text: "#2f2d2a",
    // Darkened from #746c63 for WCAG AA contrast on surface backgrounds.
    muted: "#625a51",
    border: "rgba(47, 45, 42, 0.14)",
    primary: "#302f2c",
    primarySoft: "#e7d8c9",
    danger: "#a64444",
    success: "#4b7f52",
  },
  shadow: {
    soft: "0 18px 50px rgba(47, 45, 42, 0.08)",
  },
  radius: {
    lg: "28px",
    md: "18px",
    sm: "12px",
  },
  layout: {
    container: "1180px",
  },
  motion: {
    transition: "180ms ease",
  },
});

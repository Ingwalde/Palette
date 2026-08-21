import { createGlobalTheme, createThemeContract } from "@vanilla-extract/css";

/**
 * Design tokens, typed.
 *
 * The custom property names used to be pinned to the ones the original stylesheets wrote by
 * hand (`--color-bg`, `--radius-md`, …), so that rules still living in `styles/vanilla/*.css`
 * kept resolving them while migrated code read the same values through `vars.color.bg`. That
 * note ended with the condition for finishing the job: once nothing global was left, the pinned
 * names could go and vanilla-extract could generate its own.
 *
 * Nothing global is left — there are no plain stylesheets under `src` any more, and no code
 * refers to these properties by string. So the names are generated now, which means a token can
 * be renamed or removed with the compiler as the only thing that has to agree, and two
 * unrelated `--muted` definitions can never collide in the global custom-property namespace.
 */
export const vars = createThemeContract({
  color: {
    bg: null,
    surface: null,
    surfaceStrong: null,
    text: null,
    muted: null,
    border: null,
    primary: null,
    primarySoft: null,
    danger: null,
    success: null,
  },
  shadow: {
    soft: null,
  },
  radius: {
    lg: null,
    md: null,
    sm: null,
  },
  layout: {
    container: null,
  },
  motion: {
    transition: null,
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

import {
  assignVars,
  createGlobalTheme,
  createThemeContract,
  globalStyle,
} from "@vanilla-extract/css";

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
 *
 * The theme is delivered three ways, and every colour token is defined in all three so none can
 * borrow the host's default: `:root` carries the full light palette; the same tokens are
 * reassigned for the system preference under `:root:not([data-theme="light"])` + a
 * prefers-color-scheme media query (so an explicit "light" choice wins over the OS); and the
 * explicit `:root[data-theme="dark"]` reassigns them again so the toggle beats the media query in
 * both directions. See ThemeContext for the toggle and public/theme-init.js for the pre-paint set.
 */
export const vars = createThemeContract({
  color: {
    bg: null,
    surface: null,
    surfaceStrong: null,
    // A translucent surface for the glassy panels and cards that sit over the page's soft
    // gradient. Load-bearing: it is what lets the background show through, so it has to flip with
    // the theme rather than stay a light wash over a dark page.
    surfaceGlass: null,
    text: null,
    muted: null,
    border: null,
    primary: null,
    primarySoft: null,
    // Text and icons drawn on top of `primary` (and the danger button, which flips lightness with
    // the theme the same way). Light theme: cream on near-black. Dark theme: near-black on cream.
    onPrimary: null,
    // The focus ring colour, used inside the `0 0 0 4px …` outlines so the ring is visible on both
    // grounds instead of a fixed dark ink that vanishes on a dark page.
    focus: null,
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

const light = {
  color: {
    bg: "#f7f2eb",
    surface: "#fffaf2",
    surfaceStrong: "#efe7dc",
    surfaceGlass: "rgba(255, 250, 242, 0.80)",
    text: "#2f2d2a",
    // Darkened from #746c63 for WCAG AA contrast on surface backgrounds.
    muted: "#625a51",
    border: "rgba(47, 45, 42, 0.14)",
    primary: "#302f2c",
    primarySoft: "#e7d8c9",
    onPrimary: "#f7f2eb",
    focus: "rgba(48, 47, 44, 0.30)",
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
};

// Only the colours and the shadow change between themes; radius/layout/motion are shared, so the
// dark override reassigns just the colour + shadow tokens.
const darkColors = {
  bg: "#1b1916",
  surface: "#262320",
  surfaceStrong: "#33302a",
  surfaceGlass: "rgba(38, 35, 32, 0.80)",
  text: "#f2ede4",
  // Lightened counterpart of the light-theme muted; AA on the dark surfaces.
  muted: "#b3a99b",
  border: "rgba(242, 237, 228, 0.16)",
  // Primary flips to a warm light so buttons read as the strong action on a dark ground.
  primary: "#ece3d6",
  primarySoft: "#48413a",
  onPrimary: "#26231f",
  focus: "rgba(236, 227, 214, 0.34)",
  // Lighter red/green so the semantic colours keep AA contrast on the dark ground.
  danger: "#e08a8a",
  success: "#84bf8f",
};
const darkShadow = { soft: "0 18px 50px rgba(0, 0, 0, 0.45)" };

createGlobalTheme(":root", vars, light);

// System preference, but only when the user has not made an explicit choice ("light" wins here,
// "dark" is handled by the selector below which also covers the toggle).
globalStyle(':root:not([data-theme="light"])', {
  "@media": {
    "(prefers-color-scheme: dark)": {
      vars: assignVars(vars, {
        ...light,
        color: darkColors,
        shadow: darkShadow,
      }),
    },
  },
});

// Explicit dark choice — beats the media query in both directions.
globalStyle(':root[data-theme="dark"]', {
  vars: assignVars(vars, { ...light, color: darkColors, shadow: darkShadow }),
});

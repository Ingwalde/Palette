import { globalFontFace, globalStyle } from "@vanilla-extract/css";
import { vars } from "./theme.css";

/**
 * Poppins, served from this origin instead of fonts.googleapis.com.
 *
 * The stylesheet link Google gives you is render-blocking and lives on a third-party host, so
 * first paint waited on a DNS lookup, a TLS handshake and a CSS round trip before it could
 * even discover which font file to request. Serving the four weights ourselves — 31 kB of
 * woff2 for the latin subset — removes that chain, and lets the CSP drop both
 * fonts.googleapis.com and fonts.gstatic.com. Nothing about the page reaches Google now.
 *
 * These are the latin subsets of the same v24 files Google was serving, so the glyphs are
 * identical; the screenshot baselines are what confirms it.
 *
 * Weights 400/500/600/700 only, matching what the old link requested. Two rules ask for 800,
 * which was never loaded then either — the browser has always synthesised or rounded it.
 */
const WEIGHTS = [400, 500, 600, 700] as const;
for (const weight of WEIGHTS) {
  globalFontFace("Poppins", {
    src: `url("/fonts/poppins-${weight}.woff2") format("woff2")`,
    fontWeight: weight,
    fontStyle: "normal",
    // Show the fallback immediately and swap when Poppins lands, rather than holding text
    // invisible: the same behaviour Google's `&display=swap` was asking for.
    fontDisplay: "swap",
    unicodeRange:
      "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
  });
}

/**
 * The document-level layer: reset, typography, focus ring, and the handful of utility classes
 * used from every corner of the app.
 *
 * Element selectors only. Everything that can belong to a component or carry a class does —
 * the utilities that used to live here are scoped exports in ui.css now, so nothing in the app
 * is styled by a name a typo could break.
 */

globalStyle("*", {
  boxSizing: "border-box",
});

globalStyle("html", {
  scrollBehavior: "smooth",
  "@media": {
    // Every animated component in the app honours this preference — the empty state, the modal,
    // the palette card, the admin switch — and the one motion nobody opted out of was the
    // largest: "Random palette" glides the whole document. For a reader who asked their system
    // to stop moving things, a page that scrolls itself is the worst offender left.
    "(prefers-reduced-motion: reduce)": {
      scrollBehavior: "auto",
    },
  },
});

globalStyle("body", {
  minHeight: "100vh",
  margin: 0,
  fontFamily: `"Poppins", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,
  color: vars.color.text,
  background: `radial-gradient(circle at top left, rgba(231, 216, 201, 0.8), transparent 34rem), ${vars.color.bg}`,
});

globalStyle("a", {
  color: "inherit",
  textDecoration: "none",
});

globalStyle("button, input, select, textarea", {
  font: "inherit",
});

globalStyle("button, select", {
  cursor: "pointer",
});

globalStyle("button:disabled", {
  cursor: "not-allowed",
  opacity: 0.55,
});

globalStyle("img", {
  display: "block",
  maxWidth: "100%",
});

globalStyle("main", {
  width: "100%",
});

// A clear keyboard-focus ring on every interactive element that does not define its own.
// :focus-visible fires for keyboard focus, not mouse clicks. Components with a bespoke focus
// style override this with their own rule.
globalStyle(":focus-visible", {
  outline: `2px solid ${vars.color.primary}`,
  outlineOffset: "2px",
});

globalStyle("h1, h2, h3, p", {
  marginTop: 0,
});

globalStyle("h1", {
  maxWidth: "760px",
  marginBottom: "18px",
  // Was clamp(2.4rem, 6vw, 5rem) — big enough that the home hero ate the whole first screen and
  // not one palette showed without scrolling, on a site whose point is palettes. Smaller, so the
  // grid starts above the fold. Global on purpose: every page's h1 was oversized.
  fontSize: "clamp(2.2rem, 4.5vw, 3.6rem)",
  lineHeight: 1.14,
  letterSpacing: "-0.06em",
});

globalStyle("h2", {
  marginBottom: "8px",
  fontSize: "clamp(1.7rem, 3vw, 2.6rem)",
  lineHeight: 1.08,
  letterSpacing: "-0.04em",
});

globalStyle("pre", {
  margin: 0,
});

globalStyle("::selection", {
  color: "#fff",
  background: vars.color.primary,
});

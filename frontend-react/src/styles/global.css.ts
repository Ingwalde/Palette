import { globalStyle } from "@vanilla-extract/css";
import { vars } from "./theme.css";

/**
 * The document-level layer: reset, typography, focus ring, and the handful of utility classes
 * used from every corner of the app.
 *
 * This is the part that is *meant* to stay global — scoping a reset to a component makes no
 * sense. The utility classes (`.section`, `.eyebrow`, `.muted`, …) are still declared by class
 * name on purpose: components reference them as plain strings today, and turning them into
 * scoped exports is a later step in the migration, not this one.
 *
 * Replaces the former styles/vanilla/base.css verbatim; the visual baselines are the proof.
 */

globalStyle("*", {
  boxSizing: "border-box",
});

globalStyle("html", {
  scrollBehavior: "smooth",
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

globalStyle(".section", {
  width: `min(${vars.layout.container}, calc(100% - 32px))`,
  marginInline: "auto",
});

globalStyle(".visually-hidden", {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
});

// A clear keyboard-focus ring on every interactive element that does not define its own.
// :focus-visible fires for keyboard focus, not mouse clicks. Components with a bespoke focus
// style override this with their own rule.
globalStyle(":focus-visible", {
  outline: `2px solid ${vars.color.primary}`,
  outlineOffset: "2px",
});

// Skip-to-content link — visible only when focused.
globalStyle(".skip-link", {
  position: "absolute",
  left: "12px",
  top: "-48px",
  zIndex: 1000,
  padding: "10px 16px",
  borderRadius: "10px",
  background: vars.color.primary,
  color: "#fff",
  fontWeight: 600,
  textDecoration: "none",
  transition: "top 160ms ease",
});

globalStyle(".skip-link:focus", {
  top: "12px",
});

globalStyle(".eyebrow", {
  margin: "0 0 10px",
  color: vars.color.muted,
  fontSize: "0.78rem",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
});

globalStyle(".muted", {
  color: vars.color.muted,
});

globalStyle("h1, h2, h3, p", {
  marginTop: 0,
});

globalStyle("h1", {
  maxWidth: "760px",
  marginBottom: "18px",
  fontSize: "clamp(2.4rem, 6vw, 5rem)",
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

// Carried over unchanged, though docs/css-dead-report.md lists both as dead: the class was set
// by the vanilla router, which no longer exists, and nothing in src references it. Kept
// because removing rules is a separate decision from moving them.
globalStyle("main.spa-fade", {
  transition: "opacity 280ms ease",
  willChange: "opacity",
});

globalStyle("main.spa-fade--out", {
  opacity: 0,
});

globalStyle("main.spa-fade", {
  "@media": {
    // An opacity-only fade is not "motion", so keep it — just shorter — rather than an abrupt
    // instant page swap.
    "(prefers-reduced-motion: reduce)": {
      transition: "opacity 140ms ease",
    },
  },
});

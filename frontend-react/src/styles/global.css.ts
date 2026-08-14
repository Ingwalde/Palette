import { globalStyle } from "@vanilla-extract/css";
import { vars } from "./theme.css";

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

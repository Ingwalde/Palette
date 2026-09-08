import { style } from "@vanilla-extract/css";
import { vars } from "../styles/theme.css";

const PHONE = "(max-width: 680px)";

export const head = style({
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  paddingTop: "40px",
  paddingBottom: "8px",
});

export const backLink = style({
  color: vars.color.muted,
  textDecoration: "none",
  fontSize: "0.95rem",
  width: "fit-content",
  transition: vars.motion.transition,
  ":hover": { color: vars.color.text },
});

export const title = style({
  margin: 0,
});

export const description = style({
  margin: 0,
  color: vars.color.muted,
  maxWidth: "60ch",
});

export const byline = style({
  margin: 0,
  color: vars.color.muted,
  fontSize: "0.95rem",
});

export const removed = style({
  margin: "4px 0 0",
  padding: "8px 12px",
  width: "fit-content",
  borderRadius: vars.radius.sm,
  color: vars.color.danger,
  background: "rgba(166, 68, 68, 0.1)",
  fontSize: "0.9rem",
  fontWeight: 600,
});

export const owner = style({
  color: vars.color.text,
  fontWeight: 600,
});

export const tags = style({
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  marginTop: "4px",
});

export const colorsSection = style({
  display: "flex",
  flexDirection: "column",
  gap: "20px",
  paddingTop: "8px",
});

export const simBar = style({
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "12px",
});

export const simLabel = style({
  fontSize: "0.85rem",
  fontWeight: 600,
  color: vars.color.muted,
});

export const simOptions = style({
  position: "relative",
  display: "grid",
  gridTemplateColumns: "repeat(var(--sim-count), 1fr)",
  padding: "3px",
  borderRadius: "999px",
  border: `1px solid ${vars.color.border}`,
  background: vars.color.surfaceStrong,
});

// The gliding thumb that sits under the active choice. Its position and width are measured from the
// active button in JS (see PalettePage) and written into --sim-x / --sim-w, so it tracks labels of
// different widths instead of assuming equal columns. Only position and width animate — the labels
// just change colour, so nothing inverts mid-slide.
export const simThumb = style({
  position: "absolute",
  top: "3px",
  bottom: "3px",
  left: 0,
  width: "var(--sim-w, 0px)",
  borderRadius: "999px",
  background: vars.color.surface,
  boxShadow: vars.shadow.soft,
  transform: "translateX(var(--sim-x, 3px))",
  transition:
    "transform 260ms cubic-bezier(0.22, 1, 0.36, 1), width 260ms cubic-bezier(0.22, 1, 0.36, 1)",
  pointerEvents: "none",
  "@media": {
    "(prefers-reduced-motion: reduce)": { transition: "none" },
  },
});

export const simOption = style({
  position: "relative",
  zIndex: 1,
  border: "none",
  cursor: "pointer",
  padding: "6px 12px",
  borderRadius: "999px",
  fontSize: "0.8rem",
  fontWeight: 600,
  fontFamily: "inherit",
  whiteSpace: "nowrap",
  color: vars.color.muted,
  background: "transparent",
  transition: "color 200ms ease",
  selectors: {
    "&:hover": { color: vars.color.text },
    // The active label rides the surface thumb — text colour, never an inverted pill.
    '&[aria-pressed="true"]': { color: vars.color.text },
  },
});

export const simNote = style({
  margin: 0,
  fontSize: "0.85rem",
  color: vars.color.muted,
});

export const colors = style({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: "12px",
});

export const colorBlock = style({
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  minHeight: "150px",
  padding: "18px",
  border: "none",
  borderRadius: vars.radius.md,
  cursor: "pointer",
  textAlign: "left",
  justifyContent: "flex-end",
  fontFamily: "inherit",
  boxShadow: vars.shadow.soft,
  transition: vars.motion.transition,
  ":hover": { transform: "translateY(-2px)" },
});

export const colorHex = style({
  fontSize: "1.1rem",
  fontWeight: 700,
  letterSpacing: "0.02em",
});

export const colorAlt = style({
  fontSize: "0.8rem",
  opacity: 0.85,
});

export const actions = style({
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
});

export const contrastSection = style({
  paddingTop: "12px",
});

// The matrix scrolls sideways when it has more columns than fit. On a phone that looked like the
// table was simply cut off, so fade the right edge to signal "there's more" — `--fade-r` is set to
// 0 by JS (see PalettePage) once scrolled to the end, and stays 0 when the whole table already fits.
export const matrixScroll = style({
  overflowX: "auto",
  WebkitMaskImage:
    "linear-gradient(to right, #000 calc(100% - var(--fade-r, 24px)), transparent)",
  maskImage:
    "linear-gradient(to right, #000 calc(100% - var(--fade-r, 24px)), transparent)",
});

export const matrix = style({
  borderCollapse: "collapse",
  fontSize: "0.85rem",
  minWidth: "min-content",
});

export const matrixCorner = style({
  // Pinned with the row-header column so it never scrolls off; opaque so ratio cells slide under it.
  position: "sticky",
  left: 0,
  zIndex: 2,
  background: vars.color.surface,
});

export const matrixHead = style({
  padding: "8px 10px",
  fontWeight: 600,
  whiteSpace: "nowrap",
  textAlign: "left",
  color: vars.color.text,
  borderBottom: `1px solid ${vars.color.border}`,
});

// The first column (each row's colour) stays put while the ratio grid scrolls horizontally, so you
// never lose track of which pair a cell belongs to on a narrow screen.
export const matrixRowHead = style([
  matrixHead,
  {
    position: "sticky",
    left: 0,
    zIndex: 1,
    background: vars.color.surface,
  },
]);

export const matrixSwatch = style({
  display: "inline-block",
  width: "12px",
  height: "12px",
  borderRadius: "3px",
  marginRight: "6px",
  verticalAlign: "middle",
  border: `1px solid ${vars.color.border}`,
});

export const matrixCell = style({
  padding: "8px 10px",
  textAlign: "center",
  borderBottom: `1px solid ${vars.color.border}`,
  color: vars.color.muted,
  "@media": {
    [PHONE]: { padding: "6px 8px" },
  },
});

export const matrixRatio = style({
  display: "block",
  color: vars.color.text,
  fontWeight: 600,
});

export const matrixLevel = style({
  display: "block",
  fontSize: "0.7rem",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
});

export const similarSection = style({
  paddingTop: "12px",
  paddingBottom: "48px",
});

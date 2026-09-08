import { style } from "@vanilla-extract/css";
import { vars } from "../styles/theme.css";

const NARROW = "(max-width: 920px)";
const PHONE = "(max-width: 680px)";

export const widget = style({
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  width: "min(440px, 100%)",
  marginLeft: "auto",
  "@media": {
    [NARROW]: { marginLeft: 0 },
  },
});

// The whole preview is one link to the featured palette — a real palette doing its job, not four
// painted rectangles. Hovering (or focusing) it reveals each swatch's hex; the Shuffle button below
// swaps in another. Kept a single link so it stays one clean tab stop.
export const windowLink = style({
  position: "relative",
  display: "block",
  borderRadius: "28px",
  overflow: "hidden",
  border: `1px solid ${vars.color.border}`,
  background: vars.color.surfaceGlass,
  boxShadow: vars.shadow.soft,
  textDecoration: "none",
  color: "inherit",
  transition: `transform ${vars.motion.transition}, box-shadow ${vars.motion.transition}`,
  selectors: {
    "&:hover": { transform: "translateY(-3px)", boxShadow: vars.shadow.soft },
    "&:focus-visible": { outline: `2px solid ${vars.color.focus}`, outlineOffset: "2px" },
  },
  "@media": {
    "(prefers-reduced-motion: reduce)": { transition: "none" },
  },
});

export const badge = style({
  position: "absolute",
  top: "12px",
  left: "12px",
  zIndex: 1,
  padding: "4px 10px",
  borderRadius: "999px",
  fontSize: "0.72rem",
  fontWeight: 700,
  color: vars.color.text,
  background: `color-mix(in srgb, ${vars.color.surface} 90%, transparent)`,
  WebkitBackdropFilter: "blur(6px)",
  backdropFilter: "blur(6px)",
});

export const strip = style({
  display: "grid",
  gridTemplateColumns: "repeat(var(--count), 1fr)",
  height: "220px",
  "@media": {
    [PHONE]: { height: "150px" },
  },
});

export const swatch = style({
  position: "relative",
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
  paddingBottom: "14px",
});

export const hex = style({
  fontSize: "0.72rem",
  fontWeight: 700,
  letterSpacing: "0.02em",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  opacity: 0,
  transform: "translateY(4px)",
  transition: `opacity ${vars.motion.transition}, transform ${vars.motion.transition}`,
  selectors: {
    [`${windowLink}:hover &`]: { opacity: 1, transform: "none" },
    [`${windowLink}:focus-visible &`]: { opacity: 1, transform: "none" },
  },
  "@media": {
    // Touch has no hover — show the hex so a phone visitor still gets the values.
    [PHONE]: { opacity: 1, transform: "none" },
    "(prefers-reduced-motion: reduce)": { transition: "none" },
  },
});

export const caption = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  padding: "14px 16px",
  borderTop: `1px solid ${vars.color.border}`,
  background: vars.color.surface,
});

export const name = style({
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontWeight: 700,
});

export const arrow = style({
  flexShrink: 0,
  color: vars.color.muted,
  transition: `transform ${vars.motion.transition}, color ${vars.motion.transition}`,
  selectors: {
    [`${windowLink}:hover &`]: { transform: "translateX(3px)", color: vars.color.text },
  },
  "@media": {
    "(prefers-reduced-motion: reduce)": { transition: "none" },
  },
});

export const shuffle = style({
  alignSelf: "flex-start",
});

export const shuffleIcon = style({
  width: "16px",
  height: "16px",
  marginRight: "8px",
});

import { style } from "@vanilla-extract/css";
import { vars } from "../styles/theme.css";

const PHONE = "(max-width: 680px)";

export const router = style({
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "16px",
  "@media": {
    [PHONE]: { gridTemplateColumns: "1fr" },
  },
});

export const card = style({
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  padding: "22px",
  borderRadius: vars.radius.lg,
  border: `1px solid ${vars.color.border}`,
  background: vars.color.surfaceGlass,
  boxShadow: vars.shadow.soft,
  textDecoration: "none",
  color: "inherit",
  transition: `transform ${vars.motion.transition}, border-color ${vars.motion.transition}`,
  selectors: {
    "&:hover": { transform: "translateY(-3px)", borderColor: vars.color.focus },
    "&:focus-visible": { outline: `2px solid ${vars.color.focus}`, outlineOffset: "2px" },
  },
  "@media": {
    "(prefers-reduced-motion: reduce)": { transition: "none" },
  },
});

export const icon = style({
  display: "grid",
  placeItems: "center",
  width: "44px",
  height: "44px",
  marginBottom: "4px",
  borderRadius: "14px",
  color: vars.color.onPrimary,
  background: vars.color.primary,
});

export const iconGlyph = style({
  width: "22px",
  height: "22px",
});

export const title = style({
  display: "flex",
  alignItems: "center",
  gap: "8px",
  fontSize: "1.05rem",
  fontWeight: 700,
});

export const arrow = style({
  color: vars.color.muted,
  transition: `transform ${vars.motion.transition}, color ${vars.motion.transition}`,
  selectors: {
    [`${card}:hover &`]: { transform: "translateX(3px)", color: vars.color.text },
  },
  "@media": {
    "(prefers-reduced-motion: reduce)": { transition: "none" },
  },
});

export const blurb = style({
  margin: 0,
  color: vars.color.muted,
  fontSize: "0.92rem",
  lineHeight: 1.6,
});

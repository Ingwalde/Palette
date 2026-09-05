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

export const matrixScroll = style({
  overflowX: "auto",
});

export const matrix = style({
  borderCollapse: "collapse",
  fontSize: "0.85rem",
  minWidth: "min-content",
});

export const matrixCorner = style({
  background: "transparent",
});

export const matrixHead = style({
  padding: "8px 10px",
  fontWeight: 600,
  whiteSpace: "nowrap",
  textAlign: "left",
  color: vars.color.text,
  borderBottom: `1px solid ${vars.color.border}`,
});

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

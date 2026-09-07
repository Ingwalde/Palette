import { style, styleVariants } from "@vanilla-extract/css";
import { vars } from "../styles/theme.css";

export const list = style({
  display: "flex",
  flexDirection: "column",
  gap: "14px",
  paddingBottom: "48px",
});

export const item = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "16px",
  padding: "18px",
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  background: vars.color.surface,
});

export const swatches = style({
  display: "flex",
  gap: "4px",
  flexShrink: 0,
});

export const swatch = style({
  width: "26px",
  height: "26px",
  borderRadius: "8px",
  border: `1px solid ${vars.color.border}`,
});

export const info = style({
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  minWidth: "180px",
  flex: 1,
});

export const title = style({
  margin: 0,
  fontSize: "1.05rem",
});

export const titleLink = style({
  color: "inherit",
  textDecoration: "none",
  ":hover": { color: vars.color.muted },
});

export const badge = style({
  display: "inline-flex",
  alignItems: "center",
  width: "fit-content",
  gap: "6px",
  padding: "2px 10px",
  borderRadius: "999px",
  fontSize: "0.72rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
});

export const badgeKind = styleVariants({
  public: { color: vars.color.success, background: "rgba(75, 127, 82, 0.12)" },
  private: { color: vars.color.muted, background: vars.color.surfaceStrong },
});

export const actions = style({
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  marginLeft: "auto",
});

export const headerRow = style({
  display: "flex",
  flexWrap: "wrap",
  gap: "12px",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "18px",
});

import { style } from "@vanilla-extract/css";
import { vars } from "../styles/theme.css";

export const panel = style({
  display: "flex",
  flexDirection: "column",
  gap: "20px",
  maxWidth: "640px",
});

export const sources = style({
  display: "flex",
  flexDirection: "column",
  gap: "16px",
});

export const urlRow = style({
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
});

export const urlInput = style({
  flex: "1 1 260px",
});

export const divider = style({
  display: "flex",
  alignItems: "center",
  gap: "12px",
  color: vars.color.muted,
  fontSize: "0.85rem",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  "::before": { content: '""', flex: 1, height: "1px", background: vars.color.border },
  "::after": { content: '""', flex: 1, height: "1px", background: vars.color.border },
});

export const countRow = style({
  display: "flex",
  alignItems: "center",
  gap: "12px",
});

export const countValue = style({
  fontWeight: 600,
  minWidth: "1.5ch",
  textAlign: "right",
});

export const result = style({
  display: "flex",
  flexDirection: "column",
  gap: "16px",
});

export const swatches = style({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))",
  gap: "10px",
});

export const swatch = style({
  display: "flex",
  flexDirection: "column",
  justifyContent: "flex-end",
  minHeight: "88px",
  padding: "10px",
  borderRadius: vars.radius.md,
  boxShadow: vars.shadow.soft,
  fontSize: "0.8rem",
  fontWeight: 700,
  letterSpacing: "0.02em",
});

export const error = style({
  color: vars.color.danger,
  fontSize: "0.9rem",
  margin: 0,
});

export const preview = style({
  maxHeight: "220px",
  width: "auto",
  borderRadius: vars.radius.md,
  boxShadow: vars.shadow.soft,
  alignSelf: "flex-start",
});

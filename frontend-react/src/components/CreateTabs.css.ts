import { style } from "@vanilla-extract/css";
import { vars } from "../styles/theme.css";

export const tabs = style({
  display: "inline-flex",
  gap: "2px",
  padding: "3px",
  marginBottom: "8px",
  borderRadius: "999px",
  border: `1px solid ${vars.color.border}`,
  background: vars.color.surfaceStrong,
});

export const tab = style({
  padding: "8px 18px",
  borderRadius: "999px",
  fontSize: "0.9rem",
  fontWeight: 600,
  textDecoration: "none",
  color: vars.color.muted,
  background: "transparent",
  transition: "color 200ms ease, background 200ms ease",
  selectors: {
    "&:hover": { color: vars.color.text },
  },
});

export const tabActive = style({
  color: vars.color.onPrimary,
  background: vars.color.primary,
});

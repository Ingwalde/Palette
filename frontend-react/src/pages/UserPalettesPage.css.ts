import { style } from "@vanilla-extract/css";
import { vars } from "../styles/theme.css";

export const profileHeader = style({
  display: "flex",
  alignItems: "center",
  gap: "16px",
});

export const avatar = style({
  width: "64px",
  height: "64px",
  flexShrink: 0,
  borderRadius: "50%",
  objectFit: "cover",
  border: `1px solid ${vars.color.border}`,
});

// Fallback avatar: the handle's initial on the accent.
export const avatarFallback = style({
  display: "grid",
  placeItems: "center",
  width: "64px",
  height: "64px",
  flexShrink: 0,
  borderRadius: "50%",
  color: vars.color.onPrimary,
  background: vars.color.primary,
  fontSize: "1.6rem",
  fontWeight: 700,
});

export const profileText = style({
  display: "grid",
  gap: "2px",
});

export const profileMeta = style({
  margin: 0,
  color: vars.color.muted,
  fontSize: "0.9rem",
});

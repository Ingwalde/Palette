import { keyframes, style } from "@vanilla-extract/css";
import { vars } from "../../styles/theme.css";

const fade = keyframes({
  from: { opacity: 0 },
  to: { opacity: 1 },
});

const pop = keyframes({
  from: { opacity: 0, transform: "translateY(8px) scale(0.98)" },
  to: { opacity: 1, transform: "translateY(0) scale(1)" },
});

const noMotion = {
  "@media": {
    "(prefers-reduced-motion: reduce)": { animation: "none" },
  },
} as const;

export const overlay = style({
  position: "fixed",
  inset: 0,
  zIndex: 1000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
  background: "rgba(20, 16, 12, 0.42)",
  animation: `${fade} 160ms ease both`,
  ...noMotion,
});

export const dialog = style({
  width: "100%",
  maxWidth: "420px",
  display: "grid",
  gap: "14px",
  padding: "24px",
  borderRadius: vars.radius.lg,
  background: vars.color.surface,
  boxShadow: "0 20px 50px rgba(0, 0, 0, 0.25)",
  animation: `${pop} 180ms ease both`,
  ...noMotion,
});

export const title = style({
  margin: 0,
  fontSize: "1.15rem",
});

export const message = style({
  margin: 0,
  color: vars.color.muted,
});

/** Sits alongside the shared input; only the width belongs to the modal. */
export const input = style({
  width: "100%",
});

export const actions = style({
  display: "flex",
  justifyContent: "flex-end",
  gap: "10px",
  marginTop: "4px",
});

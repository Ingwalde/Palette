import { keyframes, style } from "@vanilla-extract/css";
import { vars } from "../../styles/theme.css";

const slideIn = keyframes({
  from: { opacity: 0, transform: "translateY(14px)" },
  to: { opacity: 1, transform: "translateY(0)" },
});

/** Fixed stack in the bottom-right corner; toasts pile upward as they arrive. */
export const container = style({
  position: "fixed",
  right: "18px",
  bottom: "18px",
  zIndex: 50,
  display: "grid",
  gap: "10px",
  width: "min(360px, calc(100% - 36px))",
});

export const toast = style({
  padding: "14px 16px",
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  color: vars.color.text,
  background: vars.color.surface,
  boxShadow: vars.shadow.soft,
  animation: `${slideIn} 300ms cubic-bezier(0.22, 1, 0.36, 1) both`,
  transition: "opacity 250ms ease, transform 250ms ease",
});

export const error = style({
  color: "#fff",
  background: vars.color.danger,
});

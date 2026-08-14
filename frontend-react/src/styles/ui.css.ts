import { style, styleVariants } from "@vanilla-extract/css";
import { vars } from "./theme.css";

/**
 * Primitives shared across the whole app.
 *
 * `.button` alone appears in 33 files, so it has to exist in vanilla-extract before any
 * component can migrate — otherwise every component migration is blocked on it.
 *
 * The legacy `.button` / `.field` / `.hint` / `.form-actions` rules stay in
 * styles/vanilla/components.css for now: 32 of those files still reference them by string.
 * The duplication is deliberate and temporary, and it disappears as the last consumer moves.
 *
 * Deliberately NOT here: `.input`. It is one member of a four-selector group
 * (`.search-field input, .input, .select, .textarea`) sharing a base rule and its focus and
 * placeholder states. Pulling one out means copying those declarations and keeping two copies
 * in step until the rest follow, so the whole form-control family migrates together in a
 * later step instead.
 */

export const button = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "46px",
  padding: "0 18px",
  border: "1px solid transparent",
  borderRadius: "999px",
  font: "inherit",
  fontWeight: 700,
  color: vars.color.text,
  whiteSpace: "nowrap",
  cursor: "pointer",
  transition: `transform ${vars.motion.transition}, box-shadow ${vars.motion.transition}, background ${vars.motion.transition}`,
  selectors: {
    "&:hover:not(:disabled)": {
      transform: "translateY(-2px)",
    },
  },
});

export const buttonVariant = styleVariants({
  primary: {
    color: "#fff",
    background: vars.color.primary,
    boxShadow: "0 12px 28px rgba(47, 45, 42, 0.18)",
  },
  secondary: {
    color: vars.color.text,
    borderColor: vars.color.border,
    background: vars.color.surface,
  },
  danger: {
    color: "#fff",
    background: vars.color.danger,
  },
  ghost: {
    minHeight: "38px",
    paddingInline: "14px",
    borderColor: vars.color.border,
    background: "transparent",
  },
  saved: {
    color: vars.color.text,
    background: vars.color.primarySoft,
  },
});

export const field = style({
  display: "grid",
  gap: "8px",
  fontWeight: 700,
});

export const hint = style({
  color: vars.color.muted,
  fontWeight: 500,
});

export const formActions = style({
  display: "grid",
  gap: "10px",
});

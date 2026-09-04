import { globalStyle, keyframes, style } from "@vanilla-extract/css";
import { vars } from "../styles/theme.css";

const cardIn = keyframes({
  from: { opacity: 0, transform: "translateY(12px) scale(0.98)" },
  to: { opacity: 1, transform: "translateY(0) scale(1)" },
});

export const card = style({
  position: "relative",
  display: "flex",
  flexDirection: "column",
  gap: "18px",
  minHeight: "100%",
  padding: "18px",
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.lg,
  background: "rgba(255, 250, 242, 0.78)",
  boxShadow: vars.shadow.soft,
  overflow: "hidden",
  animation: `${cardIn} 560ms cubic-bezier(0.22, 1, 0.36, 1) both`,
  selectors: {
    // A gentle cascade so results ripple in as you search, flat past the eighth card.
    "&:nth-child(1)": { animationDelay: "0ms" },
    "&:nth-child(2)": { animationDelay: "65ms" },
    "&:nth-child(3)": { animationDelay: "130ms" },
    "&:nth-child(4)": { animationDelay: "195ms" },
    "&:nth-child(5)": { animationDelay: "260ms" },
    "&:nth-child(6)": { animationDelay: "325ms" },
    "&:nth-child(7)": { animationDelay: "390ms" },
    "&:nth-child(8)": { animationDelay: "455ms" },
    "&:nth-child(n + 9)": { animationDelay: "500ms" },
  },
  "@media": {
    "(prefers-reduced-motion: reduce)": { animation: "none" },
  },
});

export const header = style({
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "14px",
});

export const title = style({
  margin: "0 0 6px",
  fontSize: "1.18rem",
  letterSpacing: "-0.04em",
});

export const titleLink = style({
  color: "inherit",
  textDecoration: "none",
  transition: vars.motion.transition,
  ":hover": { color: vars.color.muted },
  // A visible target for keyboard focus that does not shift layout.
  ":focus-visible": { textDecoration: "underline" },
});

export const meta = style({
  margin: 0,
  color: vars.color.muted,
  fontSize: "0.9rem",
});

export const colors = style({
  display: "grid",
  gridAutoFlow: "column",
  gridAutoColumns: "1fr",
  minHeight: "130px",
  overflow: "hidden",
  borderRadius: "20px",
  border: "1px solid rgba(47, 45, 42, 0.08)",
  "@media": {
    // Shorter on phones. The rule lived in pages.css under the 680px breakpoint.
    "(max-width: 680px)": { minHeight: "110px" },
  },
});

/**
 * The hex label is an ::after fed by data-color, and the fill comes from the inline
 * --swatch-color custom property, so both of those names have to survive the move.
 */
export const swatch = style({
  position: "relative",
  border: 0,
  background: "var(--swatch-color)",
  WebkitTapHighlightColor: "transparent",
  selectors: {
    "&::after": {
      content: "attr(data-color)",
      position: "absolute",
      left: "50%",
      bottom: "10px",
      transform: "translate(-50%, 10px)",
      padding: "5px 8px",
      borderRadius: "999px",
      color: "#fff",
      background: "rgba(0, 0, 0, 0.48)",
      fontSize: "0.72rem",
      fontWeight: 700,
      opacity: 0,
      transition:
        "opacity 260ms cubic-bezier(0.22, 1, 0.36, 1), transform 260ms cubic-bezier(0.22, 1, 0.36, 1)",
    },
    "&:hover::after, &:focus-visible::after": {
      transform: "translate(-50%, 0)",
      opacity: 1,
    },
  },
});

/**
 * Set when a tap reveals the hex.
 *
 * Declared after `swatch` on purpose: this rule and the base `&::after` have identical
 * specificity, so the later one wins and a revealed swatch keeps its label. Reordering these
 * two declarations would silently hide it again.
 */
export const swatchRevealed = style({
  selectors: {
    "&::after": {
      transform: "translate(-50%, 0)",
      opacity: 1,
    },
  },
});

// On touch devices hover "sticks", so suppress the hover reveal — but only while the swatch
// has not been explicitly revealed by a tap. The :not() carries enough specificity to beat
// the hover rule above without touching the revealed one.
globalStyle(`${swatch}:not(${swatchRevealed}):hover::after`, {
  "@media": {
    "(hover: none)": {
      transform: "translate(-50%, 10px)",
      opacity: 0,
    },
  },
});

export const tags = style({
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
});

export const footer = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: "10px 12px",
  marginTop: "auto",
});

export const contrastBadge = style({
  display: "inline-flex",
  alignItems: "center",
  minHeight: "34px",
  padding: "0 12px",
  borderRadius: "999px",
  color: vars.color.text,
  background: vars.color.primarySoft,
  fontSize: "0.82rem",
  fontWeight: 700,
  whiteSpace: "nowrap",
  // It links to the contrast table on the palette page now.
  textDecoration: "none",
  transition: vars.motion.transition,
  ":hover": { background: vars.color.surfaceStrong },
});

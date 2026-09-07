import { style } from "@vanilla-extract/css";
import { vars } from "../styles/theme.css";

// A gliding pill under the active tab, mirroring the color-vision control on PalettePage: only
// the thumb position animates, and the active label just changes colour, so nothing inverts
// mid-slide (which is what made the old cream-on-cream active tab hard to read).
export const tabs = style({
  position: "relative",
  display: "inline-grid",
  gridTemplateColumns: "repeat(var(--tab-count), 1fr)",
  // Pull the strip up toward the header — the shared hero has a generous top pad meant for a
  // bare eyebrow, and it read as too much air above the tabs on phones.
  marginTop: "-26px",
  marginBottom: "18px",
  padding: "3px",
  borderRadius: "999px",
  border: `1px solid ${vars.color.border}`,
  background: vars.color.surfaceStrong,
});

export const thumb = style({
  position: "absolute",
  top: "3px",
  bottom: "3px",
  left: "3px",
  width: "calc((100% - 6px) / var(--tab-count))",
  borderRadius: "999px",
  background: vars.color.surface,
  boxShadow: vars.shadow.soft,
  transform: "translateX(calc(var(--tab-active) * 100%))",
  transition: "transform 260ms cubic-bezier(0.22, 1, 0.36, 1)",
  pointerEvents: "none",
  "@media": {
    "(prefers-reduced-motion: reduce)": { transition: "none" },
  },
});

export const tab = style({
  position: "relative",
  zIndex: 1,
  textAlign: "center",
  padding: "8px 18px",
  borderRadius: "999px",
  fontSize: "0.9rem",
  fontWeight: 600,
  textDecoration: "none",
  color: vars.color.muted,
  background: "transparent",
  transition: "color 200ms ease",
  selectors: {
    "&:hover": { color: vars.color.text },
  },
});

// The active label rides the surface thumb — it only takes the text colour, never an inverted pill.
export const tabActive = style({
  color: vars.color.text,
});

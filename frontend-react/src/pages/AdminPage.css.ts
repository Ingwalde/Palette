import { globalStyle, style } from "@vanilla-extract/css";
import { vars } from "../styles/theme.css";
import { button } from "../styles/ui.css";

const NARROW = "(max-width: 920px)";
const PHONE = "(max-width: 680px)";

/** Shared card surface. `.export-panel` still uses the legacy copy until ExportPage moves. */
const surface = {
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.lg,
  background: "rgba(255, 250, 242, 0.78)",
  boxShadow: vars.shadow.soft,
} as const;

export const access = style({
  maxWidth: "720px",
  paddingBottom: "60px",
});

export const accessCard = style({
  ...surface,
  display: "grid",
  gap: "18px",
  padding: "24px",
});

export const layout = style({
  display: "block",
  paddingBottom: "60px",
});

export const toolbar = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: "16px",
  marginBottom: "24px",
});

export const mode = style({
  position: "relative",
  display: "inline-flex",
  padding: "5px",
  border: `1px solid ${vars.color.border}`,
  borderRadius: "999px",
  background: vars.color.surface,
});

/**
 * Sliding pill behind the active tab, mirroring the main nav indicator. It follows the
 * `data-active` attribute on the container rather than a class, so that attribute selector
 * has to survive the move.
 */
export const modePill = style({
  position: "absolute",
  top: "5px",
  bottom: "5px",
  left: "5px",
  width: "calc(50% - 5px)",
  borderRadius: "999px",
  background: vars.color.primary,
  boxShadow: "0 10px 24px rgba(47, 45, 42, 0.14)",
  transition: "left 280ms cubic-bezier(0.22, 1, 0.36, 1)",
  selectors: {
    '[data-active="tags"] &': { left: "50%" },
  },
  "@media": {
    "(prefers-reduced-motion: reduce)": { transition: "none" },
  },
});

export const modeButton = style({
  position: "relative",
  zIndex: 1,
  flex: "1 1 0",
  minWidth: "104px",
  padding: "9px 20px",
  border: "none",
  borderRadius: "999px",
  background: "none",
  color: vars.color.muted,
  font: "inherit",
  fontWeight: 600,
  cursor: "pointer",
  transition: "color 200ms ease",
});

export const modeButtonActive = style({
  color: "#fff",
});

export const view = style({
  display: "grid",
  gridTemplateColumns: "320px minmax(0, 1fr)",
  gap: "24px",
  alignItems: "start",
  selectors: {
    // [hidden] has to win over display:grid so only the active mode shows.
    "&[hidden]": { display: "none" },
  },
  "@media": {
    [NARROW]: { gridTemplateColumns: "1fr" },
  },
});

/**
 * Deliberately not sticky, unlike the export panel it shares a rule with in the old
 * stylesheet: the whole admin page scrolls together, rather than the form pinning while the
 * list slides past it. The legacy sheet said `position: sticky` and then took it back two
 * rules later; only the outcome is kept.
 */
export const form = style({
  ...surface,
  position: "static",
  display: "grid",
  gap: "18px",
  padding: "20px",
});

export const list = style({
  ...surface,
  minWidth: 0,
  padding: "20px",
});

export const listSearch = style({
  marginBottom: "16px",
});

export const items = style({
  display: "grid",
  gap: "14px",
});

export const pagination = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "16px",
  marginTop: "18px",
});

export const paginationInfo = style({
  color: vars.color.muted,
  fontSize: "0.9rem",
});

export const item = style({
  display: "grid",
  gap: "14px",
  padding: "16px",
  border: `1px solid ${vars.color.border}`,
  borderRadius: "22px",
  background: vars.color.surface,
});

export const itemTop = style({
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "16px",
  "@media": {
    [PHONE]: { alignItems: "flex-start", flexDirection: "column" },
  },
});

/** A tag row is short enough to centre, unlike a palette row with its swatch strip. */
export const itemTopTag = style({
  alignItems: "center",
});

export const itemTitle = style({
  marginBottom: "4px",
  fontSize: "1rem",
});

export const itemSlug = style({
  marginBottom: 0,
  color: vars.color.muted,
  fontSize: "0.86rem",
});

export const itemActions = style({
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
});

export const swatches = style({
  display: "grid",
  gridAutoFlow: "column",
  gridAutoColumns: "1fr",
  height: "46px",
  overflow: "hidden",
  borderRadius: "999px",
  border: `1px solid ${vars.color.border}`,
});

// Each span is filled from the inline --swatch-color property, same as the palette card.
globalStyle(`${swatches} span`, {
  background: "var(--swatch-color)",
});

// --- Tag editing -------------------------------------------------------------------------

export const tagEditor = style({
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  selectors: {
    "&:empty": { display: "none" },
  },
});

export const tagSuggest = style({
  position: "relative",
});

export const tagSuggestMenu = style({
  position: "absolute",
  zIndex: 20,
  top: "calc(100% + 6px)",
  left: 0,
  right: 0,
  display: "grid",
  gap: "2px",
  maxHeight: "200px",
  overflowY: "auto",
  overscrollBehavior: "contain",
  padding: "6px",
  border: `1px solid ${vars.color.border}`,
  borderRadius: "16px",
  background: vars.color.surface,
  boxShadow: "0 16px 40px rgba(0, 0, 0, 0.16)",
  selectors: {
    // [hidden] must win over display:grid, or the menu leaves a visible strip.
    "&[hidden]": { display: "none" },
  },
});

export const tagSuggestOption = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  width: "100%",
  padding: "9px 12px",
  border: "none",
  borderRadius: "10px",
  background: "none",
  color: vars.color.text,
  font: "inherit",
  textAlign: "left",
  cursor: "pointer",
  transition: "background 120ms ease",
  selectors: {
    "&:hover": { background: vars.color.primarySoft },
  },
});

export const tagSuggestName = style({
  fontWeight: 600,
});

export const tagChip = style({
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "5px 6px 5px 12px",
  borderRadius: "999px",
  background: vars.color.surface,
  border: `1px solid ${vars.color.border}`,
  fontSize: "0.86rem",
  fontWeight: 600,
});

export const tagChipRemove = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "20px",
  height: "20px",
  padding: 0,
  border: "none",
  borderRadius: "999px",
  background: "rgba(0, 0, 0, 0.06)",
  color: vars.color.muted,
  fontSize: "0.72rem",
  lineHeight: 1,
  cursor: "pointer",
  transition: "background 140ms ease, color 140ms ease",
  selectors: {
    "&:hover": {
      background: "rgba(200, 60, 60, 0.14)",
      color: "#b23b3b",
    },
  },
});

export const tagAddRow = style({
  display: "grid",
  gap: "10px",
  marginTop: "-2px",
  "@media": {
    "(max-width: 560px)": { gridTemplateColumns: "1fr" },
  },
});

globalStyle(`${tagAddRow} ${button}`, {
  justifySelf: "start",
});

export const tagItemInfo = style({
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "10px",
  minWidth: 0,
});

globalStyle(`${tagItemInfo} ${itemTitle}`, {
  marginBottom: 0,
});

export const tagBadge = style({
  padding: "3px 10px",
  borderRadius: "999px",
  fontSize: "0.72rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.03em",
});

/** Built at runtime as tagBadgeKind[tag.kind], so both keys have to exist. */
export const tagBadgeKind = {
  purpose: style({ background: "rgba(60, 120, 90, 0.16)", color: "#2f6b46" }),
  free: style({ background: "rgba(0, 0, 0, 0.06)", color: vars.color.muted }),
};

export const tagItemCount = style({
  color: vars.color.muted,
  fontSize: "0.84rem",
});

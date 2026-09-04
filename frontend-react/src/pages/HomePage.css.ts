import { globalStyle, style } from "@vanilla-extract/css";
import { vars } from "../styles/theme.css";

const NARROW = "(max-width: 920px)";

export const hero = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.1fr) minmax(320px, 0.8fr)",
  gap: "34px",
  alignItems: "center",
  padding: "84px 0 54px",
  "@media": {
    [NARROW]: { gridTemplateColumns: "1fr" },
    "(max-width: 680px)": { paddingTop: "56px" },
  },
});

export const heroActions = style({
  display: "flex",
  flexWrap: "wrap",
  gap: "12px",
  marginTop: "28px",
});

export const heroWhatsNew = style({
  display: "inline-block",
  marginTop: "16px",
  color: vars.color.muted,
  fontSize: "0.9rem",
  textDecoration: "underline",
  textUnderlineOffset: "3px",
  transition: vars.motion.transition,
  ":hover": { color: vars.color.text },
});

export const heroPreview = style({
  display: "flex",
  justifyContent: "flex-end",
  // It is a link to the featured palette now, so reset the anchor styling.
  textDecoration: "none",
  color: "inherit",
  "@media": {
    [NARROW]: { justifyContent: "flex-start" },
  },
});

export const heroPreviewWindow = style({
  width: "min(420px, 100%)",
  padding: "18px",
  border: `1px solid ${vars.color.border}`,
  borderRadius: "34px",
  background: "rgba(255, 250, 242, 0.78)",
  boxShadow: vars.shadow.soft,
});

/** The mock browser chrome above the sample swatches. */
export const heroPreviewTop = style({
  height: "54px",
  marginBottom: "16px",
  borderRadius: "20px",
  background: "#302f2c",
});

export const heroPreviewGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "14px",
});

// The swatches show the featured palette's real colours now, so the colour comes from an inline
// style in the markup; only the shared shape lives here.
globalStyle(`${heroPreviewGrid} span`, {
  minHeight: "120px",
  borderRadius: "24px",
  "@media": {
    "(max-width: 680px)": { minHeight: "88px" },
  },
});

// A neutral fill for the placeholder shown while the list loads, so the layout does not jump.
export const heroPreviewSwatchPlaceholder = style({
  background: vars.color.surfaceStrong,
});

export const toolbarSection = style({
  padding: "16px 0 36px",
});

export const tagFilters = style({
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
});

export const tagButton = style({
  display: "inline-flex",
  alignItems: "center",
  minHeight: "34px",
  padding: "0 12px",
  borderRadius: "999px",
  fontSize: "0.85rem",
  fontWeight: 600,
  border: `1px solid ${vars.color.border}`,
  color: vars.color.muted,
  background: vars.color.surface,
  selectors: {
    "&:hover": { color: "#fff", background: vars.color.primary },
  },
});

export const tagButtonActive = style({
  color: "#fff",
  background: vars.color.primary,
});

// A "purpose" tag (a standard category) is marked with a leading dot, not colour — colour in this
// app carries palette data, so it must not double as a category cue.
export const tagButtonPurpose = style({
  selectors: {
    "&::before": {
      content: '""',
      width: "6px",
      height: "6px",
      marginRight: "6px",
      borderRadius: "50%",
      background: "currentColor",
      opacity: 0.6,
      flexShrink: 0,
    },
  },
});

export const tagCount = style({
  // No opacity: fading the count dropped it to ~2.7:1 and failed WCAG AA. A lighter weight carries
  // the "secondary" cue while the colour stays the chip's own (AA on the surface).
  fontWeight: 400,
});

// Same pill shape as a tag but visually secondary — it is a control, not a filter.
export const moreTags = style({
  display: "inline-flex",
  alignItems: "center",
  minHeight: "34px",
  padding: "0 12px",
  borderRadius: "999px",
  fontSize: "0.85rem",
  fontWeight: 600,
  border: `1px dashed ${vars.color.border}`,
  color: vars.color.muted,
  background: "transparent",
  selectors: {
    "&:hover": { color: vars.color.text, borderColor: vars.color.muted },
  },
});

// The overflow tags share the wrapping row; as a flex child it flows onto its own line(s).
export const moreTagsList = style({
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
  flexBasis: "100%",
  // An explicit display would otherwise override the `hidden` attribute, leaving the region on
  // screen while it is meant to be collapsed.
  selectors: {
    "&[hidden]": { display: "none" },
  },
});

export const resultCount = style({
  color: vars.color.muted,
  fontWeight: 700,
});

/** Offsets the in-page anchor jump from "Browse palettes" below the sticky header. */
export const palettesAnchor = style({
  scrollMarginTop: "100px",
});

export const loadMore = style({
  display: "flex",
  justifyContent: "center",
  marginTop: "28px",
});

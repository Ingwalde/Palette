import { style } from "@vanilla-extract/css";
import { vars } from "../styles/theme.css";

// A wrapped row of actions. The homepage hero no longer uses it, but the 404 page's button pair
// still does (NotFoundPage), so it stays here.
export const heroActions = style({
  display: "flex",
  flexWrap: "wrap",
  gap: "12px",
  marginTop: "28px",
});

// The editorial hero (components/HeroEditorial) already spaces itself; the toolbar just needs a
// little air above the framed search panel that follows it.
export const toolbarSection = style({
  padding: "24px 0 36px",
  // The hero's "Observe" cue jumps here (the tools just below the fold), not all the way to the
  // catalogue — so offset the landing from the sticky header.
  scrollMarginTop: "96px",
});

// The whole search station — field, sort/format selects and the tag filters — sits on one framed
// surface so it reads as a single tool rather than three loose controls floating on the page.
export const searchPanel = style({
  display: "grid",
  gap: "16px",
  padding: "20px",
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.lg,
  background: vars.color.surfaceGlass,
  boxShadow: vars.shadow.soft,
  "@media": {
    "(max-width: 680px)": { padding: "16px" },
  },
});

// The search field grows; the two selects hold a fixed size on the right and wrap under the field
// on a phone. (The old grid put three controls in a two-column track, dropping the format select
// onto its own full-width row.)
export const toolbarRow = style({
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "12px",
});

export const searchGrow = style({
  flex: "1 1 320px",
  minWidth: 0,
});

export const toolbarControls = style({
  display: "grid",
  // Wide enough that the longest options ("Most popular", "OKLCH") show in full — the old
  // 180/128 track clipped the sort to an ellipsis and the format to "H…".
  gridTemplateColumns: "200px 160px",
  gap: "10px",
  flexShrink: 0,
  "@media": {
    "(max-width: 680px)": { gridTemplateColumns: "1fr 1fr", width: "100%" },
  },
});

export const tagFilters = style({
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
  // A hairline separates the filters from the field/selects above within the shared panel.
  paddingTop: "16px",
  borderTop: `1px solid ${vars.color.border}`,
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
    "&:hover": { color: vars.color.onPrimary, background: vars.color.primary },
  },
});

export const tagButtonActive = style({
  color: vars.color.onPrimary,
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

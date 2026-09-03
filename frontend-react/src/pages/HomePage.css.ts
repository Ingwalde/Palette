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

export const heroPreview = style({
  display: "flex",
  justifyContent: "flex-end",
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

// Four decorative swatches, coloured by position. They carry no content, so the colours live
// here rather than in the markup.
globalStyle(`${heroPreviewGrid} span`, {
  minHeight: "120px",
  borderRadius: "24px",
  "@media": {
    "(max-width: 680px)": { minHeight: "88px" },
  },
});

globalStyle(`${heroPreviewGrid} span:nth-child(1)`, { background: "#0d1846" });
globalStyle(`${heroPreviewGrid} span:nth-child(2)`, { background: "#406eb7" });
globalStyle(`${heroPreviewGrid} span:nth-child(3)`, { background: "#e95623" });
globalStyle(`${heroPreviewGrid} span:nth-child(4)`, { background: "#e3e3e3" });

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

import { globalStyle, style } from "@vanilla-extract/css";

/** The admin palette editor's dynamic list of HEX rows. */
export const editor = style({
  display: "grid",
  gap: "8px",
});

export const row = style({
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "10px",
});

export const picker = style({
  flex: "0 0 46px",
  width: "46px",
  height: "46px",
  padding: 0,
  border: "none",
  borderRadius: "12px",
  background: "none",
  cursor: "pointer",
  WebkitAppearance: "none",
  appearance: "none",
  transition: "box-shadow 160ms ease",
  selectors: {
    "&:hover": { boxShadow: "0 0 0 2px rgba(0, 0, 0, 0.12)" },
    "&:focus-visible": {
      outline: "none",
      boxShadow: "0 0 0 3px rgba(0, 0, 0, 0.16)",
    },
  },
});

// Render the colour itself as a clean, borderless rounded square filling the control —
// browsers otherwise draw the swatch with their own square border and padding. These are
// vendor pseudo-elements, so they need globalStyle rather than a `selectors` entry.
globalStyle(`${picker}::-webkit-color-swatch-wrapper`, {
  padding: 0,
});

globalStyle(`${picker}::-webkit-color-swatch`, {
  border: "none",
  borderRadius: "12px",
});

globalStyle(`${picker}::-moz-color-swatch`, {
  border: "none",
  borderRadius: "12px",
});

/** Sits alongside the shared input. */
export const hex = style({
  flex: "1 1 110px",
  minWidth: 0,
  width: "110px",
  textTransform: "uppercase",
});

export const remove = style({
  flex: "0 0 auto",
  minHeight: "46px",
  paddingInline: "14px",
});

export const footer = style({
  display: "flex",
  alignItems: "center",
  gap: "12px",
  marginTop: "8px",
});

export const fields = style({
  display: "grid",
  gap: "20px",
  minWidth: 0,
  margin: 0,
  padding: 0,
  border: 0,
});
export const preview = style({
  display: "flex",
  height: "120px",
  borderRadius: "16px",
  overflow: "hidden",
  background:
    "repeating-linear-gradient(45deg, transparent, transparent 8px, #8883 8px, #8883 16px)",
});
globalStyle(`${preview} > span`, {
  flex: 1,
  minWidth: 0,
  display: "grid",
  placeItems: "center",
  overflowWrap: "anywhere",
});
export const reorder = style({ display: "flex", gap: "4px" });
export const error = style({ flexBasis: "100%" });

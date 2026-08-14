import { globalStyle, style } from "@vanilla-extract/css";

/** The admin palette editor's dynamic list of HEX rows. */
export const editor = style({
  display: "grid",
  gap: "8px",
});

export const row = style({
  display: "flex",
  alignItems: "center",
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

/** Sits alongside the still-global `.input`. */
export const hex = style({
  flex: "1 1 auto",
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

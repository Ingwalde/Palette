import { style } from "@vanilla-extract/css";
import { vars } from "../styles/theme.css";

export const card = style({
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
  border: `1px solid ${vars.color.border}`,
  borderRadius: "18px",
  background: vars.color.surface,
  overflow: "hidden",
  transition: "border-color 180ms ease, box-shadow 180ms ease",
  ":hover": {
    borderColor: vars.color.muted,
    boxShadow: "0 5px 20px rgba(30, 32, 25, 0.06)",
  },
  "@media": { "(prefers-reduced-motion: reduce)": { transition: "none" } },
});
export const colors = style({
  display: "flex",
  position: "relative",
  height: "176px",
  overflow: "hidden",
  "@media": { "(max-width: 680px)": { height: "160px" } },
});
export const swatch = style({
  flex: "1 1 0",
  minWidth: 0,
  border: 0,
  padding: 0,
  background: "var(--swatch-color)",
  cursor: "copy",
  WebkitTapHighlightColor: "transparent",
  ":focus-visible": {
    outline: "3px solid white",
    outlineOffset: "-5px",
    boxShadow: "inset 0 0 0 2px #292d28",
  },
});
export const colorLabel = style({
  position: "absolute",
  left: "50%",
  bottom: "12px",
  transform: "translateX(-50%)",
  maxWidth: "calc(100% - 20px)",
  padding: "6px 10px",
  borderRadius: "8px",
  color: "#fff",
  background: "rgba(25, 27, 23, 0.92)",
  fontSize: "0.72rem",
  fontWeight: 500,
  textAlign: "center",
  overflowWrap: "anywhere",
  pointerEvents: "none",
});
export const body = style({
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  padding: "16px 18px 12px",
  flex: 1,
});
export const header = style({
  display: "flex",
  alignItems: "center",
  gap: "12px",
  justifyContent: "space-between",
});
export const title = style({
  margin: 0,
  minWidth: 0,
  fontSize: "1.03rem",
  fontWeight: 600,
  letterSpacing: "-0.035em",
  lineHeight: 1.4,
});
export const titleLink = style({
  color: vars.color.text,
  textDecoration: "none",
  overflowWrap: "anywhere",
  ":hover": { textDecoration: "underline", textUnderlineOffset: "4px" },
});
export const save = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "6px",
  minHeight: "36px",
  flexShrink: 0,
  padding: "0 11px",
  borderRadius: "999px",
  border: `1px solid ${vars.color.border}`,
  background: "transparent",
  color: vars.color.text,
  fontSize: "0.74rem",
  fontWeight: 500,
  ":hover": { background: vars.color.primarySoft },
  ":disabled": { opacity: 0.6, cursor: "wait" },
});
export const saved = style({
  color: vars.color.onPrimary,
  background: vars.color.primary,
  borderColor: vars.color.primary,
  ":hover": { background: vars.color.primary, opacity: 0.9 },
});
export const authorRow = style({
  display: "flex",
  alignItems: "center",
  gap: "6px",
  minWidth: 0,
});
export const authorAvatar = style({
  width: "18px",
  height: "18px",
  flexShrink: 0,
  borderRadius: "50%",
  objectFit: "cover",
});
export const authorMark = style({
  display: "grid",
  placeItems: "center",
  width: "18px",
  height: "18px",
  flexShrink: 0,
  borderRadius: "50%",
  color: vars.color.muted,
  background: vars.color.surfaceStrong,
  fontSize: "0.62rem",
  fontWeight: 600,
});
export const authorName = style({ color: vars.color.muted, fontSize: "0.73rem" });
export const authorLink = style([
  authorName,
  {
    textDecoration: "none",
    overflowWrap: "anywhere",
    ":hover": { textDecoration: "underline" },
  },
]);
export const colorCount = style({
  color: vars.color.muted,
  fontSize: "0.68rem",
  marginLeft: "auto",
  flexShrink: 0,
});
export const footer = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "4px 8px",
  marginTop: "auto",
  paddingTop: "9px",
  borderTop: `1px solid ${vars.color.border}`,
});
export const tags = style({
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "4px 7px",
  minWidth: 0,
  flex: "1 1 0",
});
export const tag = style({
  display: "inline-flex",
  alignItems: "center",
  minHeight: "30px",
  fontSize: "0.69rem",
  color: vars.color.muted,
  textDecoration: "none",
  overflowWrap: "anywhere",
  ":hover": {
    color: vars.color.text,
    textDecoration: "underline",
    textUnderlineOffset: "3px",
  },
});
export const moreTags = style([
  tag,
  {
    justifyContent: "center",
    minWidth: "30px",
    padding: "0 5px",
    border: 0,
    borderRadius: "6px",
    background: vars.color.surfaceStrong,
  },
]);
export const copy = style({
  display: "inline-flex",
  gap: "5px",
  alignItems: "center",
  minHeight: "34px",
  padding: "0 0 0 4px",
  background: "transparent",
  color: vars.color.muted,
  border: 0,
  fontSize: "0.69rem",
  flexShrink: 0,
  ":hover": { color: vars.color.text },
});
export const extraTags = style([
  tags,
  { paddingTop: "3px", flex: "none", selectors: { "&[hidden]": { display: "none" } } },
]);

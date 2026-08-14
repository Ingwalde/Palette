import { globalStyle, style } from "@vanilla-extract/css";
import { vars } from "../styles/theme.css";

export const layout = style({
  display: "grid",
  gridTemplateColumns: "320px minmax(0, 1fr)",
  gap: "24px",
  alignItems: "start",
  paddingBottom: "60px",
  "@media": {
    "(max-width: 920px)": { gridTemplateColumns: "1fr" },
  },
});

/** Settings column. Sticks beside the preview until the layout collapses to one column. */
export const panel = style({
  position: "sticky",
  top: "104px",
  display: "grid",
  gap: "18px",
  padding: "20px",
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.lg,
  background: "rgba(255, 250, 242, 0.78)",
  boxShadow: vars.shadow.soft,
  "@media": {
    "(max-width: 920px)": { position: "static" },
  },
});

export const panelActions = style({
  display: "grid",
  gap: "10px",
});

export const result = style({
  minWidth: 0,
});

export const codeOutput = style({
  minHeight: "520px",
  padding: "22px",
  overflow: "auto",
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.lg,
  color: "#f7f2eb",
  background: "#252421",
  fontSize: "0.9rem",
  lineHeight: 1.7,
  "@media": {
    "(max-width: 680px)": {
      minHeight: "260px",
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
    },
  },
});

export const imagePreview = style({
  display: "grid",
  gap: "14px",
});

export const imageFrame = style({
  padding: "16px",
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.lg,
  background: "rgba(255, 250, 242, 0.88)",
  boxShadow: vars.shadow.soft,
});

globalStyle(`${imageFrame} img`, {
  width: "100%",
  height: "auto",
  borderRadius: "22px",
  display: "block",
});

export const imageCaption = style({
  margin: 0,
  color: vars.color.muted,
  fontSize: "0.95rem",
  lineHeight: 1.7,
});

// --- Palette picker ----------------------------------------------------------------------

export const picker = style({
  display: "grid",
  gap: "12px",
});

/** Flows with the page rather than scrolling in its own box, so the wheel scrolls the page. */
export const pickerResults = style({
  display: "grid",
  gap: "10px",
});

export const pickerOption = style({
  display: "grid",
  // The original declared this twice — `minmax(0, 1fr) 96px` and then a single column further
  // down the file, which simply won by source order. Only the winner is kept.
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: "12px",
  alignItems: "center",
  width: "100%",
  padding: "12px",
  border: `1px solid ${vars.color.border}`,
  borderRadius: "22px",
  color: vars.color.text,
  background: "rgba(255, 250, 242, 0.72)",
  cursor: "pointer",
  textAlign: "left",
  transition: `border-color ${vars.motion.transition}, background ${vars.motion.transition}, transform ${vars.motion.transition}`,
  selectors: {
    "&:hover": {
      borderColor: "rgba(47, 45, 42, 0.35)",
      background: vars.color.primarySoft,
      transform: "translateY(-1px)",
    },
  },
  "@media": {
    "(max-width: 680px)": { gridTemplateColumns: "1fr" },
  },
});

export const pickerOptionSelected = style({
  borderColor: "rgba(47, 45, 42, 0.35)",
  background: vars.color.primarySoft,
  transform: "translateY(-1px)",
});

export const pickerOptionInfo = style({
  display: "grid",
  gap: "4px",
  minWidth: 0,
});

globalStyle(`${pickerOptionInfo} strong, ${pickerOptionInfo} small`, {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

globalStyle(`${pickerOptionInfo} small`, {
  color: vars.color.muted,
  fontWeight: 600,
});

export const pickerSwatches = style({
  display: "grid",
  gridAutoFlow: "column",
  gridAutoColumns: "1fr",
  height: "34px",
  overflow: "hidden",
  border: `1px solid ${vars.color.border}`,
  borderRadius: "999px",
  // Also declared twice; 112px is the one that applied.
  width: "112px",
  "@media": {
    "(max-width: 680px)": { width: "120px" },
  },
});

globalStyle(`${pickerSwatches} span`, {
  background: "var(--swatch-color)",
});

export const pickerStatus = style({
  margin: 0,
  color: vars.color.muted,
  fontSize: "0.9rem",
  fontWeight: 600,
});

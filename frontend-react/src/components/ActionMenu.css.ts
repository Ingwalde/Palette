import { globalStyle, style } from "@vanilla-extract/css";
import { vars } from "../styles/theme.css";
export const root = style({ position: "relative" });
export const trigger = style({
  display: "inline-flex",
  alignItems: "center",
  gap: "10px",
});
// A centred CSS chevron avoids the font-dependent baseline of the old text glyph.
export const chevron = style({
  position: "relative",
  display: "block",
  width: "14px",
  height: "14px",
  flexShrink: 0,
  "::before": {
    content: '""',
    position: "absolute",
    left: "3px",
    top: "2px",
    width: "8px",
    height: "8px",
    borderRight: "2px solid currentColor",
    borderBottom: "2px solid currentColor",
    transform: "rotate(45deg)",
  },
  selectors: {
    [`${trigger}[aria-expanded="true"] &`]: { transform: "rotate(180deg)" },
  },
});
export const panel = style({
  position: "absolute",
  left: 0,
  top: "calc(100% + 6px)",
  zIndex: 30,
  width: "max-content",
  minWidth: 0,
  maxWidth: "calc(100vw - 40px)",
  padding: "6px",
  border: `1px solid ${vars.color.border}`,
  borderRadius: "14px",
  background: vars.color.surface,
  boxShadow: vars.shadow.soft,
  selectors: { "&[hidden]": { display: "none" } },
});
globalStyle(`${panel} > button, ${panel} > a`, {
  display: "block",
  width: "100%",
  minHeight: "42px",
  padding: "10px 12px",
  border: 0,
  borderRadius: "9px",
  textAlign: "left",
  font: "inherit",
  fontSize: "0.82rem",
  color: vars.color.text,
  background: "transparent",
  textDecoration: "none",
  whiteSpace: "normal",
  overflowWrap: "anywhere",
});
globalStyle(`${panel} > button:hover, ${panel} > a:hover`, {
  background: vars.color.primarySoft,
});

// Separate reporting from the everyday palette actions.
globalStyle(`${panel} > hr`, {
  border: 0,
  borderTop: `1px solid ${vars.color.border}`,
  margin: "6px 8px",
});
globalStyle(`${panel} > button:disabled`, {
  opacity: 0.6,
  cursor: "wait",
});

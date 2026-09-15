import { globalStyle, style } from "@vanilla-extract/css";
import { vars } from "../styles/theme.css";
export const root = style({ position: "relative" });
export const panel = style({
  position: "absolute",
  right: 0,
  top: "calc(100% + 6px)",
  zIndex: 30,
  minWidth: "180px",
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

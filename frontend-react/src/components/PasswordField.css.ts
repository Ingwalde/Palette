import { globalStyle, style } from "@vanilla-extract/css";
import { vars } from "../styles/theme.css";
import { input } from "../styles/ui.css";

/** Positioning context for the eye toggle that sits inside the input. */
export const wrapper = style({
  position: "relative",
  display: "block",
});

// Room for the toggle inside the field. The input is a scoped style now, so this no longer
// reaches into the global namespace.
globalStyle(`${wrapper} ${input}`, {
  paddingRight: "52px",
});

export const toggle = style({
  position: "absolute",
  top: "50%",
  right: "10px",
  transform: "translateY(-50%)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "34px",
  height: "34px",
  padding: 0,
  border: "none",
  borderRadius: "10px",
  background: "none",
  color: vars.color.muted,
  cursor: "pointer",
  transition: "color 140ms ease, background 140ms ease",
  selectors: {
    "&:hover": {
      color: vars.color.text,
      background: "rgba(0, 0, 0, 0.06)",
    },
  },
});

globalStyle(`${toggle} svg`, {
  display: "block",
});

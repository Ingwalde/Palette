import { globalStyle, style } from "@vanilla-extract/css";
import { vars } from "../styles/theme.css";

export const layout = style({
  display: "grid",
  gap: "18px",
  paddingBottom: "34px",
});

export const card = style({
  padding: "24px",
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.lg,
  background: "rgba(255, 250, 242, 0.82)",
  boxShadow: vars.shadow.soft,
});

export const version = style({
  display: "inline-flex",
  alignItems: "center",
  minHeight: "34px",
  margin: "0 0 12px",
  padding: "7px 12px",
  borderRadius: "999px",
  color: "#fff",
  background: vars.color.primary,
  fontSize: "0.84rem",
  fontWeight: 800,
});

globalStyle(`${card} h2`, { marginBottom: "12px" });

globalStyle(`${card} ul`, {
  display: "grid",
  gap: "8px",
  margin: 0,
  paddingLeft: "20px",
  color: vars.color.muted,
  lineHeight: 1.7,
});

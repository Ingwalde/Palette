import { globalStyle, keyframes, style } from "@vanilla-extract/css";
import { vars } from "../styles/theme.css";

const riseIn = keyframes({
  from: { opacity: 0, transform: "translateY(8px)" },
  to: { opacity: 1, transform: "translateY(0)" },
});

const lineIn = keyframes({
  from: { opacity: 0, transform: "translateY(6px)" },
  to: { opacity: 1, transform: "translateY(0)" },
});

export const root = style({
  gridColumn: "1 / -1",
  padding: "44px 24px",
  border: `1px dashed ${vars.color.border}`,
  borderRadius: vars.radius.lg,
  textAlign: "center",
  background: "rgba(255, 250, 242, 0.58)",
  animation: `${riseIn} 550ms ease both`,
  "@media": {
    "(prefers-reduced-motion: reduce)": {
      animation: "none",
    },
  },
});

// The heading and copy stagger in behind the container.
globalStyle(`${root} h3`, {
  marginBottom: "8px",
  animation: `${lineIn} 500ms ease 120ms both`,
});

globalStyle(`${root} p`, {
  marginBottom: 0,
  color: vars.color.muted,
  animation: `${lineIn} 500ms ease 280ms both`,
});

globalStyle(`${root} h3, ${root} p`, {
  "@media": {
    "(prefers-reduced-motion: reduce)": {
      animation: "none",
    },
  },
});

// Carried over as-is: the original reduced-motion rule covers the container, the heading and
// the paragraph but not this one. Left unchanged so the migration stays behaviour-preserving —
// worth fixing, but as its own decision rather than a silent change.
export const action = style({
  marginTop: "20px",
  animation: `${lineIn} 500ms ease 400ms both`,
});

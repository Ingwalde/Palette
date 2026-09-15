import { keyframes, style } from "@vanilla-extract/css";
import { vars } from "../styles/theme.css";

const shimmer = keyframes({
  from: { backgroundPosition: "200% 0" },
  to: { backgroundPosition: "-200% 0" },
});

export const card = style({
  display: "flex",
  flexDirection: "column",
  gap: "14px",
  padding: "0 0 18px",
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.lg,
  background: vars.color.surface,
  overflow: "hidden",
});

const bar = style({
  borderRadius: vars.radius.sm,
  background: `linear-gradient(90deg, ${vars.color.surfaceStrong} 25%, ${vars.color.border} 37%, ${vars.color.surfaceStrong} 63%)`,
  backgroundSize: "200% 100%",
  animation: `${shimmer} 1.4s ease-in-out infinite`,
  "@media": {
    // A shimmer is motion; a reader who asked for stillness gets a flat placeholder.
    "(prefers-reduced-motion: reduce)": { animation: "none" },
  },
});

export const title = style([bar, { width: "55%", height: "20px", marginLeft: "18px" }]);
export const line = style([bar, { width: "80%", height: "12px", marginLeft: "18px" }]);
export const swatches = style([bar, { width: "100%", height: "176px" }]);
export const footer = style([bar, { width: "40%", height: "14px", marginLeft: "18px" }]);

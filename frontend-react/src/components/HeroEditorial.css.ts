import { createVar, globalStyle, style } from "@vanilla-extract/css";

// Editorial hero — concept 02 from the approved handoff. Its surfaces are a touch warmer than the
// app's global tokens (paper #FFFDF7 vs #fffaf2, ink #292D28), so they live as local vars and flip
// with the app's own theme state: light on :root, dark under the system preference (unless an
// explicit light choice wins) and under the explicit dark stamp — the same three-state pattern the
// global theme uses, so the manual toggle and persistence drive this hero too.
const paper = createVar();
const text = createVar();
const muted = createVar();
const line = createVar();
const ink = createVar();
const onInk = createVar();
const shadow = createVar();
const arch = createVar();

const LIGHT = {
  [paper]: "#FFFDF7",
  [text]: "#292D28",
  [muted]: "#656A61",
  [line]: "#DEDED4",
  [ink]: "#292D28",
  [onInk]: "#FFFDF7",
  [shadow]: "rgba(37, 38, 26, 0.1)",
  [arch]: "#E4E6D6",
};
const DARK = {
  [paper]: "#292721",
  [text]: "#F3EEE3",
  [muted]: "#B8B9AE",
  [line]: "#49493F",
  [ink]: "#F3EEE3",
  [onInk]: "#292D28",
  [shadow]: "rgba(0, 0, 0, 0.32)",
  [arch]: "#333B2E",
};

// Query container = the full section width, so `cqw` on the heading matches the reference (which
// measured against the whole window, not the padded content). No padding here — padding is on the
// inner `hero` — otherwise cqw would shrink by the padding and the heading would come out small.
export const heroWrap = style({
  containerType: "inline-size",
  containerName: "heroEd",
});

export const hero = style({
  vars: LIGHT,
  color: text,
  padding: "42px 46px 31px",
  fontFamily: '"Poppins", system-ui, sans-serif',
  "@container": {
    "heroEd (max-width: 760px)": { padding: "34px 30px 25px" },
    "heroEd (max-width: 620px)": { padding: "31px 25px 22px" },
  },
});
globalStyle(`:root:not([data-theme="light"]) ${hero}`, {
  "@media": { "(prefers-color-scheme: dark)": { vars: DARK } },
});
globalStyle(`:root[data-theme="dark"] ${hero}`, { vars: DARK });

export const grid = style({
  display: "grid",
  gridTemplateColumns: "1.1fr 1fr",
  alignItems: "center",
  gap: "26px",
  "@container": {
    "heroEd (max-width: 620px)": { gridTemplateColumns: "1fr", gap: "23px" },
  },
});

export const eyebrow = style({
  margin: 0,
  color: muted,
  fontSize: "11px",
  fontWeight: 500,
  letterSpacing: "0.15em",
  lineHeight: 1.5,
  textTransform: "uppercase",
});

export const heading = style({
  margin: "18px 0 0",
  color: text,
  fontWeight: 700,
  letterSpacing: "-0.065em",
  lineHeight: 1.07,
  fontSize: "clamp(44px, 6.7cqw, 70px)",
  textWrap: "balance",
  "@container": {
    "heroEd (max-width: 620px)": {
      marginTop: "13px",
      fontSize: "clamp(45px, 12cqw, 64px)",
    },
  },
});

export const headingItalic = style({
  display: "block",
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontWeight: 400,
  fontStyle: "italic",
  letterSpacing: "-0.06em",
  lineHeight: 0.98,
});

export const copy = style({
  margin: "21px 0 0",
  color: muted,
  fontSize: "13px",
  lineHeight: 1.8,
  maxWidth: "34ch",
  "@container": {
    "heroEd (max-width: 620px)": {
      marginTop: "16px",
      fontSize: "12px",
      maxWidth: "38ch",
    },
  },
});

export const actions = style({
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "22px",
  marginTop: "25px",
  "@container": {
    "heroEd (max-width: 620px)": { marginTop: "18px" },
  },
});

export const primary = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "10px",
  minHeight: "44px",
  padding: "12px 19px",
  border: `1px solid ${ink}`,
  borderRadius: "999px",
  background: ink,
  color: onInk,
  fontWeight: 500,
  fontSize: "12px",
  lineHeight: 1.5,
  textDecoration: "none",
  selectors: {
    "&:hover": { textDecoration: "underline", textUnderlineOffset: "4px" },
  },
});

export const primaryIcon = style({ width: "16px", height: "16px" });

// --- right-hand artwork ---------------------------------------------------------------------
export const stage = style({
  position: "relative",
  height: "350px",
  isolation: "isolate",
  "@container": {
    "heroEd (max-width: 760px)": { height: "302px" },
    "heroEd (max-width: 620px)": {
      height: "182px",
      maxWidth: "380px",
      width: "100%",
      margin: "0 auto",
    },
  },
});
globalStyle(`${stage}::before`, {
  content: '""',
  position: "absolute",
  width: "80%",
  height: "84%",
  borderRadius: "50% 50% 0 0",
  background: arch,
  bottom: "3%",
  right: "3%",
  zIndex: -1,
});

export const print = style({
  position: "absolute",
  top: "12px",
  left: "9%",
  width: "76%",
  height: "297px",
  padding: "14px",
  background: paper,
  boxShadow: `0 12px 28px ${shadow}`,
  transform: "rotate(-7deg)",
  "@container": {
    "heroEd (max-width: 760px)": { height: "260px", padding: "12px" },
    "heroEd (max-width: 620px)": {
      left: "12%",
      width: "56%",
      top: "5px",
      height: "168px",
      padding: "8px",
      transform: "rotate(-6deg)",
    },
  },
});

export const printArt = style({
  position: "relative",
  height: "212px",
  overflow: "hidden",
  background: "var(--s1)",
  "@container": {
    "heroEd (max-width: 760px)": { height: "177px" },
    "heroEd (max-width: 620px)": { height: "112px" },
  },
});

export const circle = style({
  position: "absolute",
  width: "55%",
  aspectRatio: "1",
  borderRadius: "50%",
  background: "var(--s0)",
  top: "10%",
  left: "24%",
});
export const archShape = style({
  position: "absolute",
  width: "68%",
  height: "63%",
  borderRadius: "100px 100px 0 0",
  background: "var(--s2)",
  left: "-10%",
  bottom: 0,
});
export const square = style({
  position: "absolute",
  width: "49%",
  height: "46%",
  borderRadius: "100px 0 0 0",
  background: "var(--s4)",
  right: 0,
  bottom: 0,
});

export const printTitle = style({
  fontFamily: "Georgia, serif",
  fontSize: "24px",
  lineHeight: 1.1,
  letterSpacing: "-0.035em",
  marginTop: "13px",
  color: text,
  "@container": {
    "heroEd (max-width: 620px)": { fontSize: "19px", marginTop: "7px" },
  },
});

export const printCaption = style({
  display: "flex",
  justifyContent: "space-between",
  fontSize: "11px",
  color: muted,
  marginTop: "5px",
  "@container": {
    "heroEd (max-width: 620px)": { display: "none" },
  },
});

export const chip = style({
  position: "absolute",
  bottom: "8px",
  right: 0,
  width: "43%",
  height: "148px",
  background: paper,
  padding: "9px",
  boxShadow: `0 9px 24px ${shadow}`,
  transform: "rotate(9deg)",
  "@container": {
    "heroEd (max-width: 760px)": { height: "127px" },
    "heroEd (max-width: 620px)": {
      width: "32%",
      right: "9%",
      height: "113px",
      bottom: 0,
      padding: "7px",
    },
  },
});

export const chipColor = style({
  height: "100px",
  background: "var(--s0)",
  "@container": {
    "heroEd (max-width: 760px)": { height: "80px" },
    "heroEd (max-width: 620px)": { height: "76px" },
  },
});

export const chipHex = style({
  display: "block",
  marginTop: "7px",
  color: text,
  fontSize: "11px",
  fontWeight: 500,
  "@container": {
    "heroEd (max-width: 620px)": { marginTop: "5px" },
  },
});

// --- under-hero row -------------------------------------------------------------------------
export const bottom = style({
  marginTop: "27px",
  paddingTop: "15px",
  borderTop: `1px solid ${line}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  "@container": {
    "heroEd (max-width: 620px)": { marginTop: "15px", flexWrap: "wrap" },
  },
});

export const swatches = style({
  display: "flex",
  alignItems: "center",
  gap: "6px",
});
globalStyle(`${swatches} span`, {
  width: "26px",
  height: "26px",
  borderRadius: "50%",
});
globalStyle(`${swatches} span:nth-child(1)`, { background: "var(--s0)" });
globalStyle(`${swatches} span:nth-child(2)`, { background: "var(--s1)" });
globalStyle(`${swatches} span:nth-child(3)`, { background: "var(--s2)" });
globalStyle(`${swatches} span:nth-child(4)`, { background: "var(--s3)" });
globalStyle(`${swatches} span:nth-child(5)`, { background: "var(--s4)" });

export const bottomLabel = style({
  color: muted,
  fontSize: "11px",
  "@container": {
    "heroEd (max-width: 620px)": { display: "none" },
  },
});

export const shuffle = style({
  display: "inline-flex",
  alignItems: "center",
  gap: "7px",
  border: 0,
  padding: "7px 0",
  minHeight: "36px",
  background: "transparent",
  color: muted,
  fontFamily: "inherit",
  fontSize: "11px",
  fontWeight: 500,
  cursor: "pointer",
  selectors: {
    "&:hover": { color: text },
    "&:focus-visible": { outline: `2px solid ${ink}`, outlineOffset: "2px" },
  },
});

export const shuffleIcon = style({ width: "14px", height: "14px" });

// The reference's slim feature line, kept as a quiet transition into the real catalogue below.
export const featureRow = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: "12px",
  marginTop: "18px",
  paddingTop: "19px",
  borderTop: `1px solid ${line}`,
  color: muted,
  fontSize: "11px",
});
globalStyle(`${hero} ${featureRow} > span:last-child`, {
  display: "flex",
  gap: "20px",
});

// Only the decorative shapes ease between presets, and only when motion is allowed.
globalStyle(
  [circle, archShape, square, chipColor, `${swatches} span`, printArt].join(", "),
  {
    "@media": {
      "(prefers-reduced-motion: no-preference)": {
        transition: "background-color 0.22s ease",
      },
    },
  },
);

export const srOnly = style({
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
});

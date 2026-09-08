import { createVar, globalStyle, keyframes, style } from "@vanilla-extract/css";

// A gentle downward bob on the "Observe" chevron, hinting at the catalogue below.
const nudge = keyframes({
  "0%, 100%": { transform: "translateY(0)" },
  "50%": { transform: "translateY(3px)" },
});

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
  // Fill the first screen so the catalogue's search station always starts just below the fold — on
  // a fresh load the visitor sees only the hero, and a small scroll reveals the tools. `svh` keeps
  // this honest on mobile (where the URL bar changes the viewport); the offset is the sticky
  // header's flow height plus its top margin.
  minHeight: "calc(100svh - 92px)",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
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

// Fixed-height letterbox that holds the art field. The field itself paints the artwork background;
// this wrapper centres it and matches that background so any spare space is seamless.
export const printArt = style({
  position: "relative",
  height: "212px",
  overflow: "hidden",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  "@container": {
    "heroEd (max-width: 760px)": { height: "177px" },
    "heroEd (max-width: 620px)": { height: "112px" },
  },
});

// The approved colour studies are authored for a 1.18 art field, so the field keeps that ratio
// (width derived from the fixed height). Circles stay circular across every colour count, and the
// field clips shapes that run past its edge — the paper card and its shadow are never clipped.
export const artField = style({
  position: "relative",
  height: "100%",
  aspectRatio: "1.18",
  maxWidth: "100%",
  overflow: "hidden",
});

// Every artwork shape: position, size and radius come inline from the template tuple, colour from
// the scene palette.
export const shape = style({
  position: "absolute",
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
  marginTop: "52px",
  paddingTop: "15px",
  borderTop: `1px solid ${line}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  "@container": {
    "heroEd (max-width: 620px)": { marginTop: "28px", flexWrap: "wrap" },
  },
});

export const swatches = style({
  display: "flex",
  alignItems: "center",
  gap: "6px",
});
// The swatch colours are the featured palette's real colours, set inline in the markup.
globalStyle(`${swatches} span`, {
  width: "26px",
  height: "26px",
  borderRadius: "50%",
});

// A quiet scroll cue in the middle of the under-hero row: "Observe" with a double chevron, linking
// to the catalogue anchor below the fold.
export const bottomLabel = style({
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  color: muted,
  fontSize: "11px",
  fontWeight: 500,
  textDecoration: "none",
  selectors: {
    "&:hover": { color: text },
    "&:focus-visible": { outline: `2px solid ${ink}`, outlineOffset: "2px" },
  },
  "@container": {
    "heroEd (max-width: 620px)": { display: "none" },
  },
});

export const observeIcon = style({
  width: "13px",
  height: "13px",
  "@media": {
    "(prefers-reduced-motion: no-preference)": {
      animation: `${nudge} 1.8s ease-in-out infinite`,
    },
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

// Only the decorative colours ease between scenes, and only when motion is allowed.
globalStyle([shape, chipColor, `${swatches} span`].join(", "), {
  "@media": {
    "(prefers-reduced-motion: no-preference)": {
      transition: "background-color 0.22s ease",
    },
  },
});

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

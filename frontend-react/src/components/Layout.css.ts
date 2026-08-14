import { globalStyle, style } from "@vanilla-extract/css";
import { vars } from "../styles/theme.css";

const PHONE = "(max-width: 680px)";
const NARROW = "(max-width: 820px)";

export const header = style({
  position: "sticky",
  top: 0,
  zIndex: 20,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: `min(${vars.layout.container}, calc(100% - 32px))`,
  margin: "16px auto 0",
  padding: "12px",
  border: `1px solid ${vars.color.border}`,
  borderRadius: "999px",
  background: "rgba(255, 250, 242, 0.82)",
  boxShadow: vars.shadow.soft,
  backdropFilter: "blur(18px)",
  "@media": {
    [PHONE]: {
      alignItems: "flex-start",
      borderRadius: "28px",
      flexDirection: "column",
      gap: "12px",
      marginBottom: "8px",
    },
  },
});

/** Verify has no navigation, so its header only carries the centred logo. */
export const headerBare = style({
  justifyContent: "center",
});

export const logo = style({
  display: "inline-flex",
  alignItems: "center",
  gap: "10px",
  paddingLeft: "4px",
  fontWeight: 700,
});

export const logoMark = style({
  display: "grid",
  width: "40px",
  height: "40px",
  placeItems: "center",
  borderRadius: "50%",
  color: "#fff",
  background: vars.color.primary,
});

export const logoText = style({
  letterSpacing: "-0.03em",
});

export const nav = style({
  position: "relative",
  display: "flex",
  gap: "4px",
  "@media": {
    // All tabs on one row, shrinking evenly to fit without clipping or overlapping.
    [PHONE]: {
      width: "100%",
      flexWrap: "nowrap",
      justifyContent: "space-between",
      gap: 0,
    },
  },
});

/**
 * Added imperatively by Layout once the pill has been measured, so it does not fly in from
 * the corner on first paint. It is a class name in JS, which is exactly why it must be this
 * exported binding and not a string literal.
 */
export const navReady = style({});

/**
 * The sliding pill behind the active link. Layout writes its geometry into these four custom
 * properties from JS, so the names have to stay spelled exactly like this.
 */
export const navIndicator = style({
  position: "absolute",
  top: 0,
  left: 0,
  zIndex: 0,
  width: "var(--nav-indicator-width, 0)",
  height: "var(--nav-indicator-height, 0)",
  borderRadius: "999px",
  background: vars.color.primary,
  boxShadow: "0 10px 24px rgba(47, 45, 42, 0.14)",
  opacity: 0,
  transform: "translate3d(var(--nav-indicator-x, 0), var(--nav-indicator-y, 0), 0)",
  transition:
    "transform 280ms cubic-bezier(0.22, 1, 0.36, 1), width 280ms cubic-bezier(0.22, 1, 0.36, 1), height 280ms cubic-bezier(0.22, 1, 0.36, 1), opacity 180ms ease",
  pointerEvents: "none",
  selectors: {
    [`${navReady} &`]: { opacity: 1 },
  },
  "@media": {
    // Wider, softer highlight — gentler corners.
    [PHONE]: { borderRadius: "18px" },
  },
});

const navItemPhone = {
  flex: "1 1 0",
  minWidth: 0,
  minHeight: "40px",
  padding: "9px 4px",
  fontSize: "0.76rem",
  whiteSpace: "nowrap",
  borderRadius: "18px",
} as const;

export const navLink = style({
  position: "relative",
  zIndex: 1,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "39px",
  padding: "10px 16px",
  borderRadius: "999px",
  color: vars.color.muted,
  fontSize: "0.95rem",
  fontWeight: 600,
  lineHeight: 1.2,
  background: "transparent",
  transition: "color 220ms ease, font-weight 220ms ease, transform 220ms ease",
  selectors: {
    "&:hover": {
      color: vars.color.text,
      transform: "translateY(-1px)",
    },
  },
  "@media": {
    [PHONE]: navItemPhone,
  },
});

/** Logout is a <button> dressed as a nav link, so it needs the button resets too. */
export const navButton = style({
  border: 0,
  appearance: "none",
  WebkitAppearance: "none",
  fontFamily: "inherit",
  fontSize: "0.95rem",
  lineHeight: 1.2,
  background: "transparent",
  cursor: "pointer",
  "@media": {
    [PHONE]: navItemPhone,
  },
});

export const navLinkActive = style({
  selectors: {
    "&, &:hover": {
      color: "#fff",
      fontWeight: 700,
    },
  },
});

export const footer = style({
  marginTop: "44px",
  marginBottom: "24px",
});

export const footerPanel = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "24px",
  padding: "20px 24px",
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.lg,
  background: "rgba(255, 250, 242, 0.84)",
  boxShadow: vars.shadow.soft,
  backdropFilter: "blur(16px)",
  "@media": {
    [NARROW]: {
      alignItems: "flex-start",
      flexDirection: "column",
    },
  },
});

export const footerContent = style({
  display: "grid",
  gap: "12px",
});

export const footerEyebrow = style({
  margin: "0 0 6px",
  color: vars.color.primary,
  fontSize: "0.78rem",
  fontWeight: 800,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
});

export const footerText = style({
  maxWidth: "680px",
  margin: 0,
  color: vars.color.muted,
  lineHeight: 1.7,
});

export const footerFeatures = style({
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
});

globalStyle(`${footerFeatures} span`, {
  display: "inline-flex",
  alignItems: "center",
  minHeight: "32px",
  padding: "7px 12px",
  border: "1px solid rgba(47, 45, 42, 0.12)",
  borderRadius: "999px",
  color: vars.color.text,
  background: "rgba(239, 231, 220, 0.72)",
  fontSize: "0.84rem",
  fontWeight: 700,
  whiteSpace: "nowrap",
  "@media": {
    [NARROW]: { whiteSpace: "normal" },
  },
});

// The original declared .site-footer__meta twice — layout here, min-width further down the
// file. Different properties, so both applied; merged into one.
export const footerMeta = style({
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "flex-end",
  gap: "10px",
  minWidth: "max-content",
  selectors: {
    // [hidden] has to beat the display rule above (the admin-only links).
    "&[hidden]": { display: "none" },
  },
  "@media": {
    [NARROW]: {
      justifyContent: "flex-start",
      minWidth: 0,
    },
  },
});

globalStyle(`${footerMeta} span, ${footerMeta} a`, {
  display: "inline-flex",
  alignItems: "center",
  minHeight: "34px",
  padding: "7px 12px",
  border: `1px solid ${vars.color.border}`,
  borderRadius: "999px",
  color: vars.color.text,
  background: vars.color.surface,
  fontSize: "0.86rem",
  fontWeight: 700,
  whiteSpace: "nowrap",
});

globalStyle(`${footerMeta} a`, {
  color: "#fff",
  background: vars.color.primary,
  transition: `transform ${vars.motion.transition}, box-shadow ${vars.motion.transition}`,
});

globalStyle(`${footerMeta} a:hover`, {
  transform: "translateY(-1px)",
  boxShadow: "0 10px 24px rgba(47, 45, 42, 0.14)",
});

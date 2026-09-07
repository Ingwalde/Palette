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
  // A proportional side gap (rather than a fixed 32px) so the header always reads as a floating
  // pill: on a narrow window it keeps a visible margin instead of stretching nearly edge-to-edge,
  // and on a wide one it caps at the container width and centres. Percentage, not vw, so the gap
  // is unaffected by the scrollbar.
  width: `min(${vars.layout.container}, 92%)`,
  margin: "16px auto 0",
  padding: "12px",
  border: `1px solid ${vars.color.border}`,
  borderRadius: "999px",
  // Nearly opaque, not the 0.80 surfaceGlass the cards use: the header is sticky and scrolls over
  // the page's content, and a palette's large vivid swatches bled through the glass enough to wash
  // out the muted nav labels. 94% keeps a hint of the frosted look while staying legible over
  // anything behind it.
  background: `color-mix(in srgb, ${vars.color.surface} 94%, transparent)`,
  boxShadow: vars.shadow.soft,
  backdropFilter: "blur(18px)",
  "@media": {
    // The phone header is just the logo and the compact actions on one row, so it stays a pill.
    [PHONE]: {
      gap: "8px",
      paddingLeft: "8px",
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
  color: vars.color.onPrimary,
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
    // The full nav does not fit a phone; it moves into the overflow menu (see mobileActions).
    [PHONE]: { display: "none" },
  },
});

// Shown only on the desktop header; the phone header hides it and offers the theme in the menu.
export const desktopOnly = style({
  "@media": {
    [PHONE]: { display: "none" },
  },
});

// The phone-only cluster on the right of the header: the account avatar and the overflow menu.
export const mobileActions = style({
  display: "none",
  "@media": {
    [PHONE]: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
  },
});

// The account as a round avatar (its initial) linking to the profile page.
export const avatar = style({
  display: "grid",
  placeItems: "center",
  width: "40px",
  height: "40px",
  flexShrink: 0,
  borderRadius: "50%",
  color: vars.color.onPrimary,
  background: vars.color.primary,
  fontWeight: 700,
  textDecoration: "none",
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
  boxShadow: vars.shadow.soft,
  opacity: 0,
  transform: "translate3d(var(--nav-indicator-x, 0), var(--nav-indicator-y, 0), 0)",
  // Only the opacity is animated — the pill repositions instantly. It used to glide between links,
  // but the active label flips to onPrimary the moment it is selected, so while the pill was still
  // travelling the newly-active label sat on the bare header with an inverted (near-invisible)
  // colour. Instant repositioning keeps the label and its pill always in step.
  transition: "opacity 180ms ease",
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
  // Colour changes instantly (no transition): the active label must reach its on-pill colour the
  // same instant the pill lands under it, or it flashes low-contrast on the way. Transform still
  // eases for the hover lift.
  transition: "font-weight 220ms ease, transform 220ms ease",
  selectors: {
    "&:hover": {
      color: vars.color.text,
      transform: "translateY(-1px)",
    },
  },
  "@media": {
    [PHONE]: navItemPhone,
    "(prefers-reduced-motion: reduce)": { transition: "none" },
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
      color: vars.color.onPrimary,
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
  background: vars.color.surfaceGlass,
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
  border: `1px solid ${vars.color.border}`,
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
  color: vars.color.onPrimary,
  background: vars.color.primary,
  transition: `transform ${vars.motion.transition}, box-shadow ${vars.motion.transition}`,
});

globalStyle(`${footerMeta} a:hover`, {
  transform: "translateY(-1px)",
  boxShadow: "0 10px 24px rgba(47, 45, 42, 0.14)",
});

export const themeToggle = style({
  display: "inline-flex",
  gap: "2px",
  padding: "3px",
  borderRadius: "999px",
  border: `1px solid ${vars.color.border}`,
  background: vars.color.surfaceStrong,
  flexShrink: 0,
});

export const themeOption = style({
  border: "none",
  cursor: "pointer",
  padding: "6px 10px",
  borderRadius: "999px",
  fontSize: "0.78rem",
  fontWeight: 600,
  color: vars.color.muted,
  background: "transparent",
  fontFamily: "inherit",
  transition: vars.motion.transition,
  selectors: {
    "&:hover": { color: vars.color.text },
    '&[aria-pressed="true"]': {
      color: vars.color.onPrimary,
      background: vars.color.primary,
    },
  },
});

export const mobileMenuRoot = style({
  position: "relative",
});

export const mobileMenuButton = style({
  display: "grid",
  placeItems: "center",
  width: "40px",
  height: "40px",
  flexShrink: 0,
  border: `1px solid ${vars.color.border}`,
  borderRadius: "50%",
  cursor: "pointer",
  color: vars.color.text,
  background: vars.color.surfaceStrong,
});

// A three-line hamburger drawn with the box and two pseudo-elements.
export const mobileMenuIcon = style({
  position: "relative",
  width: "18px",
  height: "2px",
  borderRadius: "2px",
  background: "currentColor",
  "::before": {
    content: '""',
    position: "absolute",
    left: 0,
    top: "-6px",
    width: "18px",
    height: "2px",
    borderRadius: "2px",
    background: "currentColor",
  },
  "::after": {
    content: '""',
    position: "absolute",
    left: 0,
    top: "6px",
    width: "18px",
    height: "2px",
    borderRadius: "2px",
    background: "currentColor",
  },
});

export const mobileMenuPanel = style({
  position: "absolute",
  top: "calc(100% + 10px)",
  right: 0,
  zIndex: 30,
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  minWidth: "180px",
  padding: "8px",
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.md,
  background: `color-mix(in srgb, ${vars.color.surface} 97%, transparent)`,
  boxShadow: vars.shadow.soft,
  backdropFilter: "blur(18px)",
});

export const mobileMenuItem = style({
  padding: "10px 14px",
  borderRadius: vars.radius.sm,
  fontSize: "0.95rem",
  fontWeight: 600,
  textDecoration: "none",
  color: vars.color.text,
  background: "transparent",
  transition: vars.motion.transition,
  selectors: {
    "&:hover": { background: vars.color.surfaceStrong },
  },
});

export const mobileMenuItemActive = style({
  color: vars.color.onPrimary,
  background: vars.color.primary,
  selectors: {
    "&:hover": { background: vars.color.primary },
  },
});

export const mobileMenuDivider = style({
  height: "1px",
  margin: "4px 6px",
  background: vars.color.border,
});

import { globalStyle, keyframes, style } from "@vanilla-extract/css";
import { vars } from "../styles/theme.css";

const menuIn = keyframes({
  from: { opacity: 0, transform: "translateY(-6px) scale(0.98)" },
  to: { opacity: 1, transform: "translateY(0) scale(1)" },
});

export const root = style({
  position: "relative",
  width: "100%",
  zIndex: 5,
});

/** Raises the whole control while its menu is out, so the menu clears neighbouring cards. */
export const rootOpen = style({
  zIndex: 35,
});

export const button = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "14px",
  width: "100%",
  minHeight: "54px",
  padding: "0 22px 0 28px",
  border: `1px solid ${vars.color.border}`,
  borderRadius: "999px",
  color: vars.color.text,
  background:
    "linear-gradient(180deg, rgba(255, 250, 242, 0.96), rgba(255, 250, 242, 0.82))",
  boxShadow: "0 10px 30px rgba(47, 45, 42, 0.04)",
  fontWeight: 700,
  textAlign: "left",
  transition: `border-color ${vars.motion.transition}, box-shadow ${vars.motion.transition}, transform ${vars.motion.transition}`,
  selectors: {
    "&:hover": {
      borderColor: "rgba(47, 45, 42, 0.28)",
      boxShadow: "0 0 0 4px rgba(48, 47, 44, 0.07), 0 12px 34px rgba(47, 45, 42, 0.08)",
    },
    [`${rootOpen} &`]: {
      borderColor: "rgba(47, 45, 42, 0.28)",
      boxShadow: "0 0 0 4px rgba(48, 47, 44, 0.07), 0 12px 34px rgba(47, 45, 42, 0.08)",
    },
    "&:focus-visible": {
      outline: "none",
      borderColor: "rgba(47, 45, 42, 0.38)",
      boxShadow: "0 0 0 4px rgba(48, 47, 44, 0.12)",
    },
  },
});

export const label = style({
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const chevron = style({
  position: "relative",
  flex: "0 0 34px",
  width: "34px",
  height: "34px",
  marginRight: "2px",
  borderRadius: "50%",
  background: "rgba(48, 47, 44, 0.08)",
  transition: `transform ${vars.motion.transition}, background ${vars.motion.transition}`,
  selectors: {
    [`${rootOpen} &`]: {
      transform: "rotate(180deg)",
      background: "rgba(48, 47, 44, 0.13)",
    },
  },
});

// The chevron is drawn from two rotated bars rather than an icon file.
globalStyle(`${chevron}::before, ${chevron}::after`, {
  content: "",
  position: "absolute",
  top: "16px",
  width: "9px",
  height: "2px",
  borderRadius: "999px",
  background: vars.color.text,
});

globalStyle(`${chevron}::before`, { left: "10px", transform: "rotate(45deg)" });
globalStyle(`${chevron}::after`, { right: "10px", transform: "rotate(-45deg)" });

export const menu = style({
  position: "absolute",
  top: "calc(100% + 10px)",
  left: 0,
  right: 0,
  display: "grid",
  gap: "6px",
  padding: "10px",
  border: `1px solid ${vars.color.border}`,
  borderRadius: "24px",
  background: "rgba(255, 250, 242, 0.98)",
  boxShadow: "0 24px 70px rgba(47, 45, 42, 0.18)",
  backdropFilter: "blur(18px)",
  animation: `${menuIn} 150ms ease both`,
  // The original set max-height twice — 290px here, then min(280px, calc(100vh - 180px)) in a
  // later "viewport fit" block that simply won by source order. Only the winner is kept.
  maxHeight: "min(280px, calc(100vh - 180px))",
  overflowY: "auto",
  overscrollBehavior: "contain",
  scrollbarWidth: "thin",
  selectors: {
    "&[hidden]": {
      display: "none",
    },
  },
});

export const option = style({
  display: "flex",
  alignItems: "center",
  minHeight: "42px",
  width: "100%",
  padding: "0 14px",
  border: 0,
  borderRadius: "16px",
  color: vars.color.muted,
  background: "transparent",
  fontWeight: 700,
  textAlign: "left",
  transition: `background ${vars.motion.transition}, color ${vars.motion.transition}, transform ${vars.motion.transition}`,
  selectors: {
    "&:hover, &:focus-visible": {
      outline: "none",
      color: vars.color.text,
      background: vars.color.primarySoft,
    },
  },
});

export const optionSelected = style({
  selectors: {
    "&, &:hover, &:focus-visible": {
      color: "#fff",
      background: vars.color.primary,
    },
  },
});

// Owned by ExportPage, not by this component: its panel is short, so the menu is capped
// tighter there. Moves into the page's own styles when ExportPage migrates.
globalStyle(`.export-panel ${menu}`, {
  maxHeight: "220px",
});

// Same story for the admin tag editor. Redundant with the root rule above, but kept rather
// than judged: the admin tags view has no screenshot baseline to prove otherwise.
globalStyle(`.tag-add-row ${root}`, {
  width: "100%",
});

import { globalStyle, style } from "@vanilla-extract/css";
import { vars } from "../styles/theme.css";
import { button } from "../styles/ui.css";

const PHONE = "(max-width: 680px)";

/** Slightly tighter than the shared page hero. */
export const pageHero = style({
  paddingTop: "56px",
});

export const layout = style({
  display: "grid",
  placeItems: "start",
  paddingBottom: "48px",
});

export const card = style({
  display: "flex",
  flexDirection: "column",
  gap: "22px",
  width: "min(560px, 100%)",
  padding: "28px",
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.lg,
  background: "rgba(255, 250, 242, 0.9)",
  boxShadow: vars.shadow.soft,
  marginBottom: "32px",
});

export const cardHeader = style({
  display: "flex",
  alignItems: "center",
  gap: "18px",
  "@media": {
    [PHONE]: { alignItems: "flex-start" },
  },
});

export const avatar = style({
  display: "grid",
  width: "72px",
  height: "72px",
  flex: "0 0 72px",
  placeItems: "center",
  borderRadius: "50%",
  color: "#fff",
  background: vars.color.primary,
  fontSize: "1.6rem",
  fontWeight: 700,
  boxShadow: "0 14px 32px rgba(47, 45, 42, 0.18)",
});

export const detail = style({
  display: "flex",
  alignItems: "baseline",
  gap: "12px",
  padding: "12px 0",
  borderTop: `1px solid ${vars.color.border}`,
  borderBottom: `1px solid ${vars.color.border}`,
});

export const detailLabel = style({
  minWidth: "68px",
  color: vars.color.muted,
  fontSize: "0.8rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
});

export const detailValue = style({
  color: vars.color.text,
  fontWeight: 600,
  wordBreak: "break-all",
});

/** Shown until the address is confirmed; the only orange thing in the app. */
export const verifyBanner = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  padding: "14px 16px",
  borderRadius: "12px",
  border: "1px solid rgba(233, 86, 35, 0.35)",
  background: "rgba(233, 86, 35, 0.1)",
});

export const verifyBannerText = style({
  margin: 0,
  flex: "1 1 240px",
  color: vars.color.text,
  fontSize: "0.92rem",
  lineHeight: 1.5,
});

export const actions = style({
  display: "grid",
  gap: "14px",
});

export const actionsMain = style({
  display: "flex",
  flexWrap: "wrap",
  gap: "12px",
  "@media": {
    [PHONE]: { flexDirection: "column" },
  },
});

export const logout = style({
  width: "max-content",
  minWidth: "240px",
  "@media": {
    [PHONE]: { width: "100%", minWidth: 0 },
  },
});

// The buttons beside logout stretch on a phone too. Anchored to the row rather than to the
// still-global `.button`, so it does not reach across the whole document.
globalStyle(`${actionsMain} ${button}`, {
  "@media": {
    [PHONE]: { width: "100%", minWidth: 0 },
  },
});

export const passwordForm = style({
  display: "grid",
  gap: "16px",
  paddingTop: "24px",
  borderTop: `1px solid ${vars.color.border}`,
});

globalStyle(`${passwordForm} h3`, {
  margin: "4px 0 8px",
  fontSize: "1.35rem",
});

export const dangerZone = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  padding: "16px",
  borderRadius: "12px",
  border: `1px solid ${vars.color.danger}`,
  background: "rgba(190, 60, 60, 0.06)",
});

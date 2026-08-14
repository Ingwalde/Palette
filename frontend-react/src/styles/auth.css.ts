import { globalStyle, style } from "@vanilla-extract/css";
import { vars } from "./theme.css";
import { formActions } from "./ui.css";

/**
 * Styles for the four pages reached from an email link or the login screen.
 *
 * These rules used to be scoped under `.auth-page` on <body>, which is why lib/useBodyClass.ts
 * existed at all: a React page cannot select an ancestor, so it had to reach out and toggle a
 * class on the document. Scoping them to the layout element instead removes both the hook and
 * the reason for it.
 *
 * The descendant rules below stay as globalStyle because they reach into children — `.field`
 * and `.button` are still global, the form-actions row is not. Either way they are anchored to
 * a generated class rather than to <body>, so the reach is one container deep.
 */

/**
 * Self-contained: it does NOT sit alongside the global `.page-hero`.
 *
 * The original rule was `.auth-page .page-hero--auth`, specificity 0,2,0, which comfortably
 * beat `.page-hero { padding: 78px 0 36px }`. A single generated class ties with `.page-hero`
 * instead, so which padding wins comes down to stylesheet order — and the pages came out 34px
 * taller. Carrying the two descendant rules here as well means the element needs no global
 * class at all, and the outcome stops depending on import order.
 */
export const pageHero = style({
  padding: "56px 0 24px",
});

globalStyle(`${pageHero} h1`, {
  marginBottom: "12px",
});

globalStyle(`${pageHero} p`, {
  maxWidth: "620px",
  color: vars.color.muted,
  fontSize: "1.05rem",
  lineHeight: 1.8,
});

export const layout = style({
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "24px",
  alignItems: "stretch",
  paddingBottom: "56px",
  "@media": {
    "(max-width: 920px)": {
      gridTemplateColumns: "1fr",
    },
  },
});

/** Single-column variant for the pages that show one card. */
export const layoutSingle = style({
  gridTemplateColumns: "minmax(0, 460px)",
  justifyContent: "center",
  "@media": {
    "(max-width: 920px)": {
      gridTemplateColumns: "1fr",
    },
  },
});

export const card = style({
  display: "grid",
  alignContent: "start",
  gap: "18px",
  minWidth: 0,
  padding: "28px",
  border: `1px solid ${vars.color.border}`,
  borderRadius: vars.radius.lg,
  background: "rgba(255, 250, 242, 0.88)",
  boxShadow: vars.shadow.soft,
});

export const cardCentered = style({
  margin: "0 auto",
  maxWidth: "460px",
  textAlign: "center",
});

export const cardAside = style({
  margin: 0,
  fontSize: "0.9rem",
});

export const cardResult = style({
  display: "grid",
  gap: "14px",
  justifyItems: "start",
});

/** Verify has no nav or footer, so its card is centred in the viewport instead. */
export const verifyShell = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "calc(100vh - 160px)",
  padding: "clamp(32px, 8vh, 96px) 16px 48px",
});

/** The verify card is the centred card plus a width cap — composed, not a descendant rule. */
export const verifyCard = style([cardCentered, { width: "min(460px, 100%)" }]);

globalStyle(`${card} h2`, {
  margin: "4px 0 8px",
});

globalStyle(`${card} .field`, {
  margin: 0,
});

globalStyle(`${card} ${formActions}`, {
  display: "flex",
  marginTop: "4px",
});

globalStyle(`${card} ${formActions} .button`, {
  width: "auto",
  minWidth: "170px",
  "@media": {
    "(max-width: 920px)": {
      width: "100%",
    },
  },
});

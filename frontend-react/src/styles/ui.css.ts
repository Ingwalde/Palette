import { globalStyle, style, styleVariants } from "@vanilla-extract/css";
import { vars } from "./theme.css";

/**
 * Primitives shared across the whole app.
 *
 * `.button` alone appears in 33 files, so it has to exist in vanilla-extract before any
 * component can migrate — otherwise every component migration is blocked on it.
 *
 * The legacy `.button` / `.field` / `.hint` / `.form-actions` rules stay in
 * styles/vanilla/components.css for now: 32 of those files still reference them by string.
 * The duplication is deliberate and temporary, and it disappears as the last consumer moves.
 *
 * The form controls at the bottom of this file arrived later, once they could move as a set.
 */

export const button = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "46px",
  padding: "0 18px",
  border: "1px solid transparent",
  borderRadius: "999px",
  font: "inherit",
  fontWeight: 700,
  color: vars.color.text,
  whiteSpace: "nowrap",
  cursor: "pointer",
  transition: `transform ${vars.motion.transition}, box-shadow ${vars.motion.transition}, background ${vars.motion.transition}`,
  selectors: {
    "&:hover:not(:disabled)": {
      transform: "translateY(-2px)",
    },
  },
});

export const buttonVariant = styleVariants({
  primary: {
    color: "#fff",
    background: vars.color.primary,
    boxShadow: "0 12px 28px rgba(47, 45, 42, 0.18)",
  },
  secondary: {
    color: vars.color.text,
    borderColor: vars.color.border,
    background: vars.color.surface,
  },
  danger: {
    color: "#fff",
    background: vars.color.danger,
  },
  ghost: {
    minHeight: "38px",
    paddingInline: "14px",
    borderColor: vars.color.border,
    background: "transparent",
  },
  saved: {
    color: vars.color.text,
    background: vars.color.primarySoft,
  },
});

export const field = style({
  display: "grid",
  gap: "8px",
  fontWeight: 700,
});

export const hint = style({
  color: vars.color.muted,
  fontWeight: 500,
});

export const formActions = style({
  display: "grid",
  gap: "10px",
});

// --- Form controls -----------------------------------------------------------------------
//
// Deferred from the earlier component steps because these four selectors shared a base rule
// plus their focus and placeholder states: pulling one out meant keeping two copies in sync.
// They move together here.
//
// `.select` stays behind in styles/vanilla/components.css: it has no callers left — the
// CustomSelect component replaced every native one — so importing it here would only create
// an export nothing uses.

const controlBase = {
  width: "100%",
  font: "inherit",
  border: `1px solid ${vars.color.border}`,
  color: vars.color.text,
  background: vars.color.surface,
  outline: "none",
  boxShadow: "0 10px 30px rgba(47, 45, 42, 0.04)",
  transition: `border-color ${vars.motion.transition}, box-shadow ${vars.motion.transition}`,
} as const;

const controlFocus = {
  borderColor: "rgba(47, 45, 42, 0.35)",
  boxShadow: "0 0 0 4px rgba(48, 47, 44, 0.08)",
} as const;

// Placeholder styled to match the page: Poppins, muted warm tone, lighter while focused.
const placeholder = {
  color: vars.color.muted,
  opacity: 0.7,
  fontWeight: 400,
  fontSize: "0.9rem",
  letterSpacing: "0.01em",
} as const;

export const input = style({
  ...controlBase,
  minHeight: "50px",
  borderRadius: "999px",
  padding: "0 20px",
  selectors: {
    "&:focus": controlFocus,
    "&::placeholder": placeholder,
    "&:focus::placeholder": { opacity: 0.55 },
  },
});

export const textarea = style({
  ...controlBase,
  minHeight: "120px",
  padding: "15px 18px",
  borderRadius: "22px",
  resize: "none",
  selectors: {
    "&:focus": controlFocus,
    "&::placeholder": placeholder,
    "&:focus::placeholder": { opacity: 0.55 },
  },
});

/** Wraps a search input so the clear button can sit inside it. */
export const searchField = style({
  position: "relative",
  display: "flex",
  alignItems: "center",
});

/** Same job, but inline rather than a flex row. */
export const searchInputWrap = style({
  position: "relative",
  display: "block",
});

const CLEAR_ICON = (stroke: string) =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M7 7l10 10M17 7L7 17' stroke='%23${stroke}' stroke-width='3.4' stroke-linecap='round'/%3E%3C/svg%3E")`;

export const searchClear = style({
  position: "absolute",
  top: "50%",
  right: "18px",
  transform: "translateY(-50%)",
  // Revealed only once the field has text; see the sibling rule below.
  display: "none",
  width: "30px",
  height: "30px",
  padding: 0,
  border: "none",
  cursor: "pointer",
  backgroundColor: "transparent",
  backgroundImage: CLEAR_ICON("746c63"),
  backgroundRepeat: "no-repeat",
  backgroundPosition: "center",
  backgroundSize: "21px 21px",
  transition: `transform ${vars.motion.transition}, background-image ${vars.motion.transition}`,
  selectors: {
    "&:hover": {
      backgroundImage: CLEAR_ICON("302f2c"),
      transform: "translateY(-50%) scale(1.12)",
    },
    "&:active": { transform: "translateY(-50%) scale(0.92)" },
    "&:focus-visible": {
      outline: `2px solid ${vars.color.primary}`,
      outlineOffset: "2px",
    },
  },
});

// The search input inside `searchField` carries no class of its own — the original stylesheet
// reached it through `.search-field input`, a descendant selector, so reproduce exactly that
// rather than asking the call sites to add a class.
//
// Deliberately NOT extended to `searchInputWrap`: it was never in those groups. The export
// page's input there carries the class directly, and widening the rule to cover it shifted
// that page's layout.
globalStyle(`${searchField} input`, {
  ...controlBase,
  minHeight: "50px",
  borderRadius: "999px",
  padding: "0 20px",
});

globalStyle(`${searchField} input:focus`, controlFocus);
globalStyle(`${searchField} input::placeholder`, placeholder);
globalStyle(`${searchField} input:focus::placeholder`, { opacity: 0.55 });

// Room on the right so the text never runs under the clear button, and the button itself only
// appears once something is typed. Written as globalStyle because both rules cross from the
// input to a sibling.
globalStyle(
  `${searchField} input[type="search"], ${searchInputWrap} input[type="search"]`,
  { paddingRight: "58px" },
);

globalStyle(
  `${searchField} input[type="search"]:not(:placeholder-shown) ~ ${searchClear}, ${searchInputWrap} input[type="search"]:not(:placeholder-shown) ~ ${searchClear}`,
  { display: "block" },
);

// Typed search text is bold; the placeholder above stays regular weight.
globalStyle('input[type="search"]', { fontWeight: 600 });

// The native clear button is replaced by the one above.
globalStyle('input[type="search"]::-webkit-search-cancel-button', {
  WebkitAppearance: "none",
  appearance: "none",
  display: "none",
});

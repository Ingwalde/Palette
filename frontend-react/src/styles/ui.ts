import { button, buttonVariant } from "./ui.css";

/**
 * Helpers over the vanilla-extract primitives.
 *
 * They live here rather than in ui.css.ts because a `.css.ts` file may only export plain
 * objects, arrays, strings, numbers and null/undefined — the compiler serialises its exports,
 * so a function export fails the build.
 */

/** `buttonClass()` for a plain button, `buttonClass("primary")` for a variant. */
export function buttonClass(variant?: keyof typeof buttonVariant): string {
  return variant ? `${button} ${buttonVariant[variant]}` : button;
}

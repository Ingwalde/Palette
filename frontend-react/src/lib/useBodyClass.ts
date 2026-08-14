import { useEffect } from "react";

// Toggle a class on <body> while a page is mounted.
//
// Only needed because styles/vanilla/*.css is still global and scopes some rules under a
// body class (e.g. `.auth-page` in pages.css). Scoping those styles to their components
// retires this hook.
export function useBodyClass(className: string): void {
  useEffect(() => {
    document.body.classList.add(className);
    return () => document.body.classList.remove(className);
  }, [className]);
}

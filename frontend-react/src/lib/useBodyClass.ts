import { useEffect } from "react";

// Toggle a class on <body> while a page is mounted — mirrors the per-page body classes the
// vanilla HTML sets (e.g. `auth-page`), which the shared stylesheets scope their rules under.
export function useBodyClass(className: string): void {
  useEffect(() => {
    document.body.classList.add(className);
    return () => document.body.classList.remove(className);
  }, [className]);
}

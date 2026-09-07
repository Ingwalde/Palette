// Runs synchronously in <head>, before first paint, to stamp the saved theme choice on <html>
// so the page never flashes the light default before React mounts. Kept as a separate file (not
// inline) because the production CSP is script-src 'self' with no 'unsafe-inline'.
//
// Only an explicit "light"/"dark" choice is stamped; "system" (or no stored value) leaves the
// attribute off, so the prefers-color-scheme media query in the stylesheet decides. Mirrors the
// write side in ThemeContext — keep the key and values in sync.
(function () {
  try {
    var choice = localStorage.getItem("palette:theme");
    if (choice === "dark" || choice === "light") {
      document.documentElement.setAttribute("data-theme", choice);
    }
  } catch {
    // Storage can throw (private mode, blocked cookies). Fall through to the system preference.
  }
})();

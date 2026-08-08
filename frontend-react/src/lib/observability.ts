// Single funnel for client-side errors. Today it logs; wiring a Sentry (or similar) client
// here is the only change needed to ship them off-box — the ErrorBoundary and the global
// handlers below already route everything through this function.
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  if (import.meta.env.DEV) {
    console.error("[palette]", error, context ?? "");
  }
  // e.g. Sentry.captureException(error, { extra: context });
}

let installed = false;

// Catch errors that escape React (async, event handlers, resource loads) so they are reported
// consistently rather than lost to the console.
export function initObservability(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("error", (event) => {
    reportError(event.error ?? event.message, { source: "window.onerror" });
  });
  window.addEventListener("unhandledrejection", (event) => {
    reportError(event.reason, { source: "unhandledrejection" });
  });
}

// Single funnel for client-side errors. In dev it logs; in prod it forwards to Sentry when a
// DSN is configured. The ErrorBoundary and the global handlers below already route everything
// through reportError, so this is the only place error transport lives.
import type * as SentryReact from "@sentry/react";

// Loaded lazily (dynamic import) only when a DSN is present, so the Sentry SDK stays out of the
// initial bundle for builds that ship without observability.
let sentry: typeof SentryReact | null = null;

export function reportError(error: unknown, context?: Record<string, unknown>): void {
  if (import.meta.env.DEV) {
    console.error("[palette]", error, context ?? "");
  }
  sentry?.captureException(error, context ? { extra: context } : undefined);
}

let installed = false;

// Catch errors that escape React (async, event handlers, resource loads) so they are reported
// consistently rather than lost to the console. Also boots Sentry when configured.
export function initObservability(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("error", (event) => {
    reportError(event.error ?? event.message, { source: "window.onerror" });
  });
  window.addEventListener("unhandledrejection", (event) => {
    reportError(event.reason, { source: "unhandledrejection" });
  });
  void initSentry();
}

// Sentry is opt-in: with no VITE_SENTRY_DSN the SDK is never fetched and reportError just logs
// in dev. When set (injected at build time), browserTracingIntegration also captures Web Vitals
// — LCP/CLS/INP — as measurements on the pageload transaction.
async function initSentry(): Promise<void> {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;
  const mod = await import("@sentry/react");
  mod.init({
    dsn,
    // `release` is deliberately not set here. When the image is built with an auth token,
    // @sentry/vite-plugin injects the commit as the release and uploads the matching source
    // maps under it; passing a value here would override that and detach the traces from the
    // maps that could symbolicate them.
    environment: import.meta.env.MODE,
    integrations: [mod.browserTracingIntegration()],
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  });
  sentry = mod;
}

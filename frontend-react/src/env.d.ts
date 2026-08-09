/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Sentry DSN for client-side error + Web Vitals reporting. Unset = observability off.
  readonly VITE_SENTRY_DSN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

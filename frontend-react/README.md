# Palette — React + TypeScript frontend

The new frontend for [Palette](../README.md), migrated from the vanilla ES-module build to
**Vite + React + TypeScript**. It ships incrementally on the **4.8.x** line; the vanilla
`frontend/` stays the deployed build until this reaches feature parity.

## Stack

- **Vite** + **React 19** + **TypeScript** (strict)
- **React Router** for routing, **TanStack Query** for server state
- **Vitest** + **Testing Library** for unit/component tests, **Playwright** for E2E
- **oxlint** (lint) + **Prettier** (format)

## Scripts

```bash
npm install
npm run dev          # dev server
npm run build        # typecheck (tsc -b) + production build
npm run preview      # serve the production build
npm run lint         # oxlint
npm run typecheck    # tsc -b
npm run test         # vitest (unit/component)
npm run test:e2e     # playwright (builds + previews, then runs specs)
npm run format       # prettier --write
```

## Observability

Client errors and Web Vitals are reported to Sentry when a DSN is configured — otherwise the
SDK is never loaded and `reportError` just logs in dev.

| Var | Purpose |
| --- | --- |
| `VITE_SENTRY_DSN` | Sentry DSN (public, client-safe). Unset = observability off. Inlined at **build** time — pass it as a Docker build arg / CI variable, not a runtime env. |

`reportError` in `src/lib/observability.ts` is the single funnel: the `ErrorBoundary` and the
global `error`/`unhandledrejection` handlers all route through it, so Sentry is wired in one
place. Source maps are emitted (`build.sourcemap`) so minified stack traces symbolicate.

## Layout

```
src/
├── main.tsx              # providers: QueryClient + Router
├── App.tsx               # routes
├── components/           # shared UI (Layout, …)
├── pages/                # route components (HomePage, placeholders)
├── lib/                  # apiBase, queryClient (typed API layer lands in 4.8.1)
├── styles/               # tokens.css (ported), global.css
└── test/setup.ts         # jest-dom matchers for Vitest
e2e/                      # Playwright specs
```

## Roadmap

- **4.8.0** — this scaffold (tooling, shell, tokens, first tests). ← you are here
- **4.8.1** — typed API layer + TanStack Query client (CSRF + refresh-on-401), auth context
- **4.8.2+** — pages ported one per release, each with tests
- later 4.8.x — frontend Sentry + error boundary, full Playwright suite, cutover, WCAG AA

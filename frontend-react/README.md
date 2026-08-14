# Palette — React + TypeScript frontend

The frontend for [Palette](../README.md). Migrated from the original vanilla ES-module build
over the 4.8.x line; the cutover completed in **4.8.0**, and this is the only frontend — the
old `frontend/` directory was removed.

Built by Vite and served in production by nginx from a multi-stage `Dockerfile`. The image is
built in CI and pulled by the VM, which is too small to build it itself.

## Stack

- **Vite** + **React 19** + **TypeScript** (strict)
- **React Router** for routing, **TanStack Query** for server state
- **Vitest** + **Testing Library** for unit/component tests, **Playwright** + **axe-core**
  for E2E and accessibility
- **oxlint** (lint) + **Prettier** (format)

## Scripts

```bash
npm install
npm run dev            # dev server
npm run build          # typecheck (tsc -b) + production build
npm run preview        # serve the production build
npm run lint           # oxlint
npm run typecheck      # tsc -b
npm run format         # prettier --write
npm run format:check   # prettier --check
npm run test           # vitest (unit/component)
npm run test:coverage  # vitest with the coverage gate
npm run test:e2e       # playwright (builds + previews, then runs specs)
```

All of these run in CI on every pull request — see `.github/workflows/ci.yml`.

## Observability

Client errors and Web Vitals are reported to Sentry when a DSN is configured — otherwise the
SDK is never loaded and `reportError` just logs in dev.

| Var               | Purpose                                                                                                                                                  |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_SENTRY_DSN` | Sentry DSN (public, client-safe). Unset = observability off. Inlined at **build** time — pass it as a Docker build arg / CI variable, not a runtime env. |

`reportError` in `src/lib/observability.ts` is the single funnel: the `ErrorBoundary` and the
global `error`/`unhandledrejection` handlers all route through it, so Sentry is wired in one
place.

Source maps are built as `hidden` — emitted for symbolication but not linked from the bundles,
and deleted in the Docker build before they reach nginx, so the TypeScript source is not
published.

## Layout

```
src/
├── main.tsx              # providers: Query, Router, Auth, Toast, Modal, ErrorBoundary
├── App.tsx               # routes
├── api/                  # typed API layer (auth, palettes, favorites, tags)
├── auth/                 # AuthContext
├── components/           # shared UI (Layout, EmptyState, PasswordField, modal/, toast/, …)
├── pages/                # one component per route
├── lib/                  # apiBase, http, queryClient, colour + export helpers, observability
├── styles/               # theme tokens, global layer, shared primitives (*.css.ts)
└── test/setup.ts         # jest-dom matchers for Vitest
e2e/                      # Playwright specs (a11y, flows, home, email links)
```

## Styling

**vanilla-extract**, compiled at build time to plain CSS with zero runtime. Each component and
page owns a `*.css.ts` beside it; `styles/` holds the design tokens, the document-level layer
(reset, typography, focus ring) and the primitives shared across the app — button, form
controls, page furniture.

Tokens are declared with `createGlobalThemeContract` against the original custom-property
names (`--color-bg`, `--radius-md`, …). That is what let the migration proceed a component at
a time: the not-yet-migrated global CSS kept resolving those variables untouched.

Two checks keep the styling honest and neither is optional:

```bash
npm run css:orphans        # class names in markup that no stylesheet defines
./scripts/visual.sh        # screenshot baselines, compared at zero tolerance
```

Screenshots run inside the pinned Playwright image, because rendering is host-specific — see
`playwright.visual.config.ts`. They caught several regressions that no functional test could
see, including layouts shifting by tens of pixels and components losing their styles outright.

## API base URL

`src/lib/apiBase.ts` picks the base from the page protocol: over HTTPS the API is same-origin
at `/api/v1` behind the reverse proxy; otherwise it is `http://<hostname>:8000/api/v1`, which
is the local Docker Compose setup. The production CSP allows only the former, plus Sentry —
see `nginx.conf.template` and `docker-compose.prod.yml`.

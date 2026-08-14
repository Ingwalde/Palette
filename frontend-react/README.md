# Palette — React + TypeScript frontend

The frontend for [Palette](../README.md). Migrated from the original vanilla ES-module build
over the 4.8.x line; the cutover completed in **4.8.0**, and this is the only frontend — the
old `frontend/` directory was removed.

Built by Vite and served in production by nginx from a multi-stage `Dockerfile`. The image is
built in CI and pulled by the VM, which is too small to build it itself.

## Stack

- **Vite** + **React 19** + **TypeScript** (strict)
- **React Router** for routing (every route but home is code-split), **TanStack Query** for
  server state
- **vanilla-extract** for styling — typed, zero-runtime CSS-in-TS
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
npm run test:visual    # screenshot baselines, in the pinned container
npm run test:integration  # the real Compose stack, not a stubbed API
npm run lighthouse     # performance budget, in the pinned container
npm run css:orphans    # class names in markup that no stylesheet defines
```

All of these run in CI on every pull request — see `.github/workflows/ci.yml`, which is seven
jobs: backend tests, ruff/mypy, this package's lint-types-test-build, the stubbed E2E and axe
suite, the screenshot baselines, the performance budget and the integration stack.

`test:visual`, `test:integration` and `lighthouse` each need something a bare `playwright test`
cannot arrange — a fixed rendering environment, a running stack, a browser Lighthouse can
drive — so each is a wrapper under `scripts/`. Run them through the npm script or the script
directly; both do the same thing.

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
e2e/                      # Playwright specs (a11y, flows, focus, home, email links)
e2e/visual/               # screenshot baselines — pinned container only
e2e/integration/          # the real Compose stack — scripts/integration.sh only
```

The two directories under `e2e/` are excluded from the default Playwright config by
`testIgnore`, because each needs something that config does not provide: a fixed rendering
environment, or a running backend.

## Routing and code splitting

Every route except home is `React.lazy`, with the `Suspense` boundary inside `<main>` so a
chunk arriving never blanks the header and footer around it. Home stays eagerly imported: it
is what most visits render first, and deferring it would trade a smaller download for a slower
paint on the route that matters most.

The split moved the entry chunk from 336 kB to 249 kB and first paint from 737 ms to 560 ms,
measured by the Lighthouse job.

Two consequences worth knowing. React holds the page you are leaving on screen until the next
one's chunk resolves, so `RouteFallback` is only ever seen on a _direct_ load of a lazy route —
a bookmark, or an email link into `/verify`. And any test that renders a route now has to await
it: a synchronous `getByRole` runs before the import resolves.

## Accessibility

Beyond the axe suite, which audits pages that have already rendered, two behaviours are
handled explicitly because a single-page app does not get them for free:

- **Navigation.** `RouteAnnouncer` moves focus to the `<main>` landmark and writes the new
  page's heading into a live region. A full page load does both; React Router does neither. The
  first render is skipped, or focus would land past the skip link.
- **Dialogs.** `aria-modal="true"` tells assistive technology the page behind is inert, but the
  browser still walks Tab into it. `ModalProvider` puts focus in the dialog, traps it there and
  returns it to whatever opened it — focusing **Cancel** first, so Enter on an unexpected
  confirmation dismisses rather than deletes.

`e2e/focus.spec.ts` covers both, and each test was checked by removing its fix and watching it
fail.

## Styling

**vanilla-extract**, compiled at build time to plain CSS with zero runtime. Each component and
page owns a `*.css.ts` beside it; `styles/` holds the design tokens, the document-level layer
(reset, typography, focus ring) and the primitives shared across the app — button, form
controls, page furniture.

Tokens are declared with `createGlobalThemeContract` against the original custom-property
names (`--color-bg`, `--radius-md`, …). That is what let the migration proceed a component at
a time: the not-yet-migrated global CSS kept resolving those variables untouched.

Poppins is served from this origin, not from fonts.googleapis.com: four weights, 31 kB of
woff2 in `public/fonts/`, declared with `globalFontFace` in `styles/global.css.ts` and the two
above-the-fold weights preloaded from `index.html`. That removes a render-blocking request to a
third party and lets the CSP drop both Google hosts, so no request leaves this origin. The
files are the same latin subsets Google was serving, which is why the screenshot baselines did
not move.

Two checks keep the styling honest and neither is optional:

```bash
npm run css:orphans        # class names in markup that no stylesheet defines
./scripts/visual.sh        # screenshot baselines, compared at zero tolerance
```

Screenshots run inside the pinned Playwright image, because rendering is host-specific — see
`playwright.visual.config.ts`. They caught several regressions that no functional test could
see, including layouts shifting by tens of pixels and components losing their styles outright.

## Performance budget

`lighthouserc.json` asserts asset sizes as **errors** and timings as **warnings**, and the CI
job fails only on the former. Lab timings on a shared runner move between runs on identical
code; a gate that a re-run turns green teaches people to re-run rather than to look. Sizes are
deterministic, so those are the real gate.

Run it locally with `npm run lighthouse`. It uses the pinned container for two reasons: a
number measured on your machine says nothing about CI, and chrome-launcher cannot delete its
own temp directory on Windows, so the audit completes and then the process dies with `EPERM`
— which looks like a failure and is not one.

One caveat about the numbers. The audit runs against the static `dist` with no backend, so the
page passes through an extra cycle of loading and error states that it would not in
production. Asset sizes are unaffected; the timings are mildly pessimistic.

## API base URL

`src/lib/apiBase.ts` picks the base from the page protocol: over HTTPS the API is same-origin
at `/api/v1` behind the reverse proxy; otherwise it is `http://<hostname>:8000/api/v1`, which
is the local Docker Compose setup. The production CSP allows only the former, plus Sentry —
see `nginx.conf.template` and `docker-compose.prod.yml`.

# Changelog

## v4.9.1 — What a file-by-file review found

A read of the backend against its own stated intentions, and the fixes for what did not hold.

### Security

- **The API was reachable from the public internet, around the proxy.** Compose published port
  8000 on every interface, so `http://<public-ip>:8000` answered directly: past Cloudflare, past
  Caddy's TLS, and past the rate limiter — because uvicorn runs with `--forwarded-allow-ips=*`,
  so anyone reaching it could set their own `X-Forwarded-For` and get a fresh bucket per request,
  making the five-logins-a-minute limit no limit at all. The Dockerfile already said trusting all
  forwarders was safe *because* the port was proxy-only; that was the assumption, and Compose
  broke it. Both ports now bind to loopback, which is where Caddy looks for them anyway.
- **Argon2 concurrency is bounded.** Moving hashing off the event loop removed the only thing
  serialising it: `asyncio.to_thread` uses an executor sized for I/O, and every hash asks for
  64 MiB, so enough concurrent logins could ask for more memory than the ~1 GB VM has. A
  semaphore makes the surplus wait instead of the machine dying.
- **Changing a password now enforces the rule registration enforces.** A password containing the
  account's own name or email is refused at registration; the change-password endpoint did not
  check, so the rule was one request away from optional.

### Fixed

- **Saving a palette twice at once returned 500.** Two clicks on the same heart both passed the
  "already a favorite?" check, and the unique constraint failed the loser. The favorites path was
  missed when this class of race was fixed elsewhere in v4.9.0; saving something already saved is
  now the success it looks like.
- **A damaged password hash returned 500 instead of failing to verify.** Only the
  wrong-password subclass was caught, so a corrupt row raised through the handler.

### Changed

- **Expired refresh tokens are purged at startup.** Every login wrote a row and every rotation
  wrote another while the old one was only flagged revoked, so the table grew for the lifetime of
  the deployment and nothing read the old rows again.
- **The models and the migrations agree again, and CI keeps them that way.** The four pg_trgm
  search indexes from migration 0008 were never declared on the model, so `alembic check` failed
  and the next `alembic revision --autogenerate` would have written a migration dropping them —
  a diff with nothing obviously wrong about it, quietly returning every search to a sequential
  scan. The indexes are declared now, `alembic check` runs in CI against a schema built from
  scratch, and the test database gets the same extension and indexes production has instead of a
  schema missing four of them.

### Frontend

- **A stalled request can no longer hang the interface forever.** `fetch` has no timeout of its
  own and nothing supplied one, so a connection that died mid-flight left the page on its loading
  state with no error and no way out but a reload. Requests now carry a 20-second abort signal —
  and a caller's own signal still wins, so nothing loses its cancellation to it.
- **`Content-Type: application/json` is sent only when there is a body.** It went on every
  request, including bodyless GETs, where it describes a request that does not exist — and it
  would have overwritten the boundary a form upload has to carry.

### Tests

- **The favorites endpoints have a test file.** Every other router had one; favorites had two
  incidental calls inside the palettes tests, leaving the 404 branches, the CSRF requirement and
  — the reason this mattered — whether one account can read another's saved palettes entirely
  unasserted. The router goes from 74% to 100%.

## v4.9.0 — Hardened sign-in, a stated password policy, stricter types

### Security

- **Login costs the same whether the account exists or not.** The time a failed login takes no
  longer reveals which usernames and emails are real: verification runs against a dummy hash when
  the account is missing, so accounts cannot be enumerated by timing.
- **A twelve-character password floor, stated on the form.** The minimum is enforced server-side
  and the rules are shown where they apply, instead of failing silently on submit.
- **The API sends security headers and answers only for known hosts.** Every response — errors
  included — carries `nosniff`, `DENY`, a referrer policy and a `default-src 'none'` CSP; HSTS is
  sent only over HTTPS so it cannot pin a browser during local development. `ALLOWED_HOSTS`
  rejects a request whose Host the API does not serve.
- **Argon2 runs off the event loop with a pinned cost.** Hashing no longer blocks the async
  request path, and the cost parameters are fixed rather than left to library defaults.
- **A published disclosure policy** (`SECURITY.md`): how to report a vulnerability and what to
  expect in return.

### Fixed

- **A lost write race answers `409`, not `500`.** Two requests creating the same unique row now
  return a conflict the client can handle, instead of a server error.
- **Seeding refuses to promote an existing user to admin.** The default-admin seed only creates;
  it never elevates an account that already exists.

### Changed

- **TypeScript strict mode is on**, so every frontend file is type-checked under `strict`.

## v4.8.7 — Stolen sessions, detected and ended

### Security

- **A replayed refresh token now ends every session for that account.** Rotation is single use:
  each refresh revokes the token presented and issues a new one, so exactly one is valid per
  session at a time. A revoked-but-unexpired token coming back therefore means it exists in two
  places — the legitimate client always replaces its own after rotating. Until now that answered
  `401` and nothing else, indistinguishable from a token that never existed.

  The response is deliberately blunt, because the server cannot tell which side it is talking
  to: whoever rotated first now holds a valid token and looks entirely normal, and whoever
  presents the stale copy might be the victim who was raced or the thief who lost. Ending the
  session costs the real user one login, which they can complete because they know the
  password, and costs an attacker everything, because they do not. `token_version` is bumped as
  well as the refresh family being revoked — access tokens are stateless and live for a day, so
  revoking refresh tokens alone would leave a stolen one working until it expired.

- **You can end every session yourself.** `POST /auth/logout-all` had existed since v4.8.4 with
  no way to reach it. The profile page now has a confirmed control beside Logout: if the system
  can detect a stolen session, the person it belongs to should be able to answer.

### CI

- `css:orphans` runs on every pull request. Every style is a build-time hash, so a class name
  written as a string in markup matches nothing and fails silently — no error, no missing
  import, just an unstyled element. The check has existed since the vanilla-extract migration
  and was the last guard still run by hand.

### Notes

- **Reserving height for the palette grid was considered and rejected on evidence.** The static
  Lighthouse audit has been reporting a Cumulative Layout Shift of 0.218 against a 0.1 target.
  Measured against the real stack with a `layout-shift` observer, the same page records
  **0.0000**; throttled to a slow 3G so the data cannot arrive before first paint, **0.0129** —
  and the elements that move are `body` and the nav indicator, not the palette grid or the
  footer the static audit blamed. The number belongs to an environment with no backend, and
  reshaping the page would have cost a round of screenshot baselines to move something no
  visitor experiences.

## v4.8.6 — Code scanning, current dependencies, generated screenshots

Housekeeping, and one thing that had been quietly wrong for eight releases.

### Security

- **CodeQL analyses this repository's own code** — JavaScript/TypeScript and Python — on every
  push, every pull request, and once a week. Dependabot and the audit steps added in v4.8.4
  cover known vulnerabilities in dependencies we pull in; nothing looked at the code written
  here. The weekly run matters as much as the per-push one: CodeQL ships new queries, and a
  pattern published next month can match code committed last year that no push would
  re-analyse. Started on `security-and-quality` rather than the narrower default.

### Dependencies

Every open Dependabot pull request is applied — four GitHub Actions majors, twelve grouped
minors across pip and npm, and two development majors held back and examined last:

- **TypeScript 6 → 7** is not a compiler release, it is a different compiler: the Go port.
  `bin/tsc` is a shim, and the work is done by a platform-specific native binary shipped as an
  optional dependency, twenty of them in the lockfile. The question worth answering was not
  whether it type-checks here but whether the right binary resolves where the code is actually
  built — it does, the production image builds on linux from a lockfile generated on Windows.
  The bundle keeps its content hashes, so the native compiler emits byte-identical output for
  this project.
- **`@vanilla-extract/css` 1.18 → 1.21** was the other one worth watching, since it generates
  the class names. All nineteen screenshot baselines stayed byte-identical and the stylesheet
  kept its hash.

Dependabot's version updates now target a long-lived `deps` branch rather than `main`, so
routine churn collects in one place and arrives as a single deliberate merge. Security updates
still go straight to the default branch, which is the behaviour worth having.

### Documentation

- **The README screenshots are generated.** They had been captured by hand and then went eight
  releases untouched: the hero in `home.png` still advertised v4.7.1 and described that
  release's features, and `export.png`'s footer agreed. `npm run screenshots` brings the
  Compose stack up, captures against the real backend and seeded database, and tears it down.
- Fixed two things a knowledge-graph pass over the repository surfaced, both verified against
  the code first: `docs/database.md` claimed the connection uses `postgresql+psycopg://` when
  Compose injects `asyncpg` for both the backend and the tests, and the README's project
  structure still listed the `frontend/` directory deleted at the v4.8.0 cutover — while not
  listing `frontend-react/` at all.
- The `DATABASE_URL` validator's error message named the wrong driver too, so a misconfigured
  deploy would have been pointed at `psycopg` at the moment it was least helpful.

## v4.8.5 — Accessibility, performance and real end-to-end tests

Backend untouched — this release is the frontend and the pipeline around it.

### Accessibility

Two defects the axe suite in v4.8.1 could not reach. It audits a page that has already
rendered; these are about what happens *between* pages, and what the keyboard can do while a
dialog is open.

- **Navigating announced nothing and moved nothing.** A full page load tells a screen reader
  where it landed — the browser resets focus and reads the new document — and React Router does
  neither, so activating a nav link left focus on the link with no announcement. Focus now moves
  to the `<main>` landmark and the new page's heading is written into a live region. Both are
  needed: moving focus to a container announces the container, not what changed. The first
  render is skipped deliberately, or focus would land past the skip link.
- **Dialogs had `aria-modal="true"` and no focus management.** That attribute tells assistive
  technology the page behind is inert; the browser still walks Tab into the buttons under the
  overlay. `autoFocus` sat only on the prompt's input, so the destructive **Delete palette**
  confirmation opened with focus on the list button behind it. Focus now enters the dialog, is
  trapped, and returns to whatever opened it — landing on **Cancel**, so Enter on a dialog that
  appeared unexpectedly dismisses rather than deletes.

### Performance

Measured with Lighthouse in a container, three runs, against the previous release:

| | v4.8.4 | v4.8.5 |
| --- | --- | --- |
| Entry chunk | 336.3 kB | 248.8 kB |
| Entry CSS | 29.4 kB | 13.7 kB |
| Scripts transferred | 101.9 kB | 96.3 kB |
| First contentful paint | 736.9 ms | 559.9 ms |
| Speed Index | 736.9 | 620.5 |

- **Every route except home is code-split.** A visitor who only browses palettes no longer
  downloads the admin editor, the export page's canvas renderer and the whole changelog. Home
  stays eager: deferring it would trade a smaller download for a slower paint on the route that
  matters most.
- **Poppins is served from this origin** — four weights, 31 kB of woff2, preloaded. That removes
  a render-blocking request to a third party and lets the Content-Security-Policy drop
  `fonts.googleapis.com` and `fonts.gstatic.com`. **No request from the page now leaves this
  origin**, verified in a browser against the running stack.
- **A performance budget runs on every pull request.** Asset sizes fail the build; timings only
  warn, because lab numbers on a shared runner move between runs on identical code and a gate a
  re-run turns green teaches people to re-run instead of to look.

### Testing

- **A second end-to-end suite runs against the real stack** — nginx, FastAPI, PostgreSQL and
  Redis — and writes real rows. The existing specs stub every response, which is what makes them
  fast and what stops them noticing when the front end and the API stop agreeing. These assert
  the seams: the login response is the user with no token in the body and three `Set-Cookie`
  headers, two httpOnly and the CSRF half deliberately not; a cookie-authenticated mutation
  without `X-CSRF-Token` is refused; a favourite survives a round trip through the database; an
  admin's new palette is findable by search, which exercises the server-side slug.
- The login assertion is the one that would have caught the dead `Token` schema removed in
  v4.8.4 — it described a body containing `access_token`, the documentation repeated it, and
  nothing tested it.

### Observability

- **Source maps are uploaded to Sentry and the build is tagged with its commit**, so a stack
  trace resolves against the exact bundle that produced it. Maps are still deleted before they
  reach nginx. The auth token is a BuildKit secret rather than a build arg, since build args are
  recorded in image history. All of it is optional: with no token the plugin is never added, and
  local and pull-request builds are unchanged.
- The plugin's build telemetry is off. The page was just made to reach no third party; the build
  should not quietly be the exception.

### Notes

- **Cumulative Layout Shift is not asserted.** The static audit reported 0.218 against a 0.1
  target, and it is an artefact of that environment: a real browser instrumented with a
  `layout-shift` observer records no shifts at all on the same build. Field CLS already arrives
  from real users through the Web Vitals reporting added in v4.8.3.
- Lighthouse is fetched at a pinned version when it runs rather than being a dependency. Its
  tree reaches `extract-zip`, whose high-severity advisory has no fixed version, and committing
  it would have meant either a permanently red `npm audit` or narrowing that audit for every dev
  dependency to hide one finding.

## v4.8.4 — Code review remediation

An external code review found twelve defects; all twelve are fixed here, along with five
adjacent problems found while confirming them. Two were breaking production silently. The
release also finishes the v4.8.0 cutover: the last of the vanilla frontend — its global
stylesheets — is gone.

### Fixed

- **Email links led to a 404.** `email_service` built verification and reset links against
  `/verify.html` and `/reset-password.html`, paths belonging to the vanilla frontend deleted in
  v4.8.0. Email confirmation and password reset had been unusable since that release. A test now
  pins both paths against the real React routes, so renaming a route fails the suite.
- **CSP blocked Sentry.** The nginx `connect-src` never listed an ingest host, so the v4.8.3
  frontend observability work reported nothing in production. The policy is now a template:
  ingest hosts are static, and the dev-only backend ports come from `CONNECT_SRC_EXTRA`, set for
  local Compose and empty in production.
- **500 when deleting a favourited palette.** `favorites` and `refresh_tokens` had foreign keys
  with no `ON DELETE` action, so removing a palette anyone had saved raised a foreign-key
  violation. Migration `0006` recreates all three with `ON DELETE CASCADE`, resolving the real
  constraint names from `pg_constraint` rather than assuming Postgres's defaults.
- **Truncated backups looked valid.** `backup-db.sh` redirected into the final filename, so a
  `pg_dump` that died mid-stream left a plausible-looking `.gz` behind. It now writes to a
  temporary file and renames only after the dump succeeds — which matters more now that the
  deploy depends on it.
- **The test suite talked to production services.** `backend/.env` is bind-mounted into the test
  container, so runs picked up the real `RESEND_API_KEY` and `SENTRY_DSN`. The `tests` service
  blanks both.
- **Home page empty, loading and error states** were hand-rolled markup duplicating the
  `EmptyState` component, and had been unstyled since the React port. They use the component now.
- **`/404`** rendered the migration-era `PlaceholderPage` instead of a real not-found page.

### Security

- **Access tokens are revocable.** Each user row carries a `token_version`; access tokens carry
  it as a `ver` claim, and `get_current_user` compares the two on a row it already loads — so
  revocation costs no extra query. Changing a password, resetting one, or the new
  `POST /auth/logout-all` retires every token already issued, immediately rather than at expiry.
- **Reset links are single use.** The reset token carries the user's `token_version`, and
  completing a reset bumps it, so replaying the same link fails for the rest of its window.
- **`change_password` revokes refresh tokens**, matching `reset_password`, which already did.
- **Production and staging secrets are separate files.** `secrets.enc.env` had picked up a second
  copy of `POSTGRES_DB` and all three `DEFAULT_ADMIN_*` keys — staging values appended to the
  production file. dotenv resolves duplicates last-wins, so production had been running on the
  second block, admin password included. Staging also inherited `backend/.env`, meaning it shared
  production's credentials outright; it now has its own decrypted env file and `env_file:
  !override` so no production value can leak through a key staging forgot to set.
- **Source maps are no longer published.** The build emits them `hidden` for Sentry and the image
  build deletes them, instead of serving the readable TypeScript source to anyone who asks.

### Changed

- **The global stylesheets are gone** — 2309 lines of `src/styles/vanilla/` migrated to
  vanilla-extract, one `.css.ts` per component or page, with the design tokens as a typed
  contract. Class names are build-time hashes; nothing addresses a style by string any more, and
  `npm run css:orphans` fails the build if anything does. Nineteen Playwright screenshot
  baselines, compared at zero pixel tolerance, held byte-identical across the whole migration.
- **Deploys ship the commit CI validated.** The workflow checked out `main`'s head, which is not
  necessarily the commit that went green. It now checks out `workflow_run.head_sha`, takes a
  database backup before `up -d` — migrations run at startup, so that is the point of no
  return — and layers `docker-compose.prod.yml`.
- **The production image no longer contains pytest.** Test dependencies moved behind an
  `INSTALL_DEV` build arg that only the `tests` service passes.

### Performance

- **Tag aggregation runs in Postgres.** `GET /tags` read every palette's tag array and counted in
  Python. One `jsonb_array_elements_text` + `GROUP BY` replaces it: 125.5 ms to 15.4 ms.
- **Search is indexed.** Migration `0008` adds `pg_trgm` and trigram indexes over the search
  predicates, and repairs the GIN index that `0003` could skip on databases that predated
  Alembic: 67.4 ms to 2.46 ms. Search also escapes `%` and `_` now, so they match literally
  rather than acting as wildcards.
- **Slugs resolve in one query** instead of one per candidate, and seeding is a single bulk
  insert instead of a commit per palette.

### Accessibility

- The tag filter chips expose their state through `aria-pressed`, and the remaining labelled
  containers carry a role, so a screen reader can tell which filters are active.

### CI

- The Playwright and axe suites run on every pull request — the e2e job that would have caught
  the broken email links. Added `format:check`, `pip-audit` and `npm audit`.

### Notes

- **Everyone is signed out once by this release.** Access tokens minted before the `ver` claim
  existed have no version to compare, so they are rejected. Signing in again is the whole fix.
- Documentation was audited against the code and corrected throughout: `docs/database.md` still
  claimed Alembic was planned while eight migrations ran at startup, and `docs/api.md` documented
  `Authorization: Bearer` auth and a login response containing an `access_token`, neither of
  which has been true since v4.5.

## v4.8.3 — Frontend observability

Wires the existing client-error funnel to Sentry, opt-in via a build-time DSN.

### Added

- **Sentry error + Web Vitals reporting** — `reportError` (the single funnel behind the
  `ErrorBoundary` and the global `error`/`unhandledrejection` handlers) now forwards exceptions
  to `@sentry/react` when `VITE_SENTRY_DSN` is set. `browserTracingIntegration` also captures
  Web Vitals (LCP/CLS/INP). Source maps are emitted so minified traces symbolicate.

### Changed

- The Sentry SDK is loaded lazily and only when a DSN is configured — builds without
  `VITE_SENTRY_DSN` tree-shake it out entirely (no bundle cost, `reportError` just logs in dev).
- The frontend image accepts a `VITE_SENTRY_DSN` build arg (fed from the `VITE_SENTRY_DSN` CI
  variable) so the DSN is inlined at build time.

## v4.8.1 — Accessibility & deploy hardening

Follow-up polish after the v4.8 React cutover.

### Added

- **WCAG 2 AA pass** — an axe-core E2E suite asserting zero WCAG2A/2AA violations across every
  page; fixed the failures it found (muted-text contrast, an unlabelled admin colour picker).

### Fixed

- **Deploy resilience** — the frontend image build (`npm ci` + Vite) was OOM-killing the ~1 GB
  production VM and blowing past the SSH command timeout, taking the site down. The deploy now
  ensures a 2 GB swap file and uses a 40-minute command timeout; and the frontend image is built
  in CI and pushed to GHCR so the VM only *pulls* it — no heavy build on the small box.

## v4.8.0 — React + TypeScript frontend

Full rewrite of the frontend from vanilla ES modules to **React 19 + TypeScript (Vite)**, ported
1:1 to the original design and cut over to production.

### Added

- **`frontend-react/`** — a Vite + React 19 + TypeScript (strict) app: React Router, TanStack
  Query for server state, a typed API layer over `lib/http` (httpOnly-cookie auth, double-submit
  CSRF, single-flight refresh-on-401), and an `AuthContext`. **All pages ported 1:1** — home
  (grid, search, tag filters, sort, favorites), auth, favorites, export (incl. the PNG canvas),
  profile, admin, verify, changelog. Component kit: custom select, modal, toast, error boundary,
  password field. The vanilla CSS is reused verbatim so the app is pixel-identical.
- **Frontend tooling** — oxlint (lint), Prettier (format), Vitest + Testing Library
  (unit/component), and Playwright (E2E), all gated in CI (lint, type-check, tests, build).

### Changed

- **Cutover** — served in production by nginx from a multi-stage Docker image; the old vanilla
  `frontend/` directory was removed.

### Notes

- Backend untouched — API contracts unchanged.

## v4.7.1 — Presentation: screenshots & diagrams

### Added

- **Screenshot-rich README** — a Screenshots section (`docs/assets/`) and a **live-demo** link to
  [palettes-app.com](https://palettes-app.com) at the top, so the visual product is visible without
  running the stack.
- **Mermaid diagrams** — `docs/architecture.md` gathers an **ER** data model (five tables), the
  production **request path** (Cloudflare → Caddy → nginx/FastAPI → PostgreSQL/Redis) and the
  **auth flow** (httpOnly cookies + CSRF + refresh rotation). The ER and request-path diagrams are
  also embedded in the README.
- **SOPS secret encryption completed** (from 4.5.0 scaffold) — production secrets are committed
  encrypted as `secrets.enc.env` and decrypted into `backend/.env` during deploy; the age private
  key stays on the VM. See `docs/secrets.md`.

### Fixed

- Palette card footer now wraps on narrow cards, so the **Copy name** button is no longer
  clipped by the card edge next to a long contrast badge.

## v4.7.0 — Continuous delivery

### Added

- **Auto-deploy workflow** (`.github/workflows/deploy.yml`) — after the CI workflow succeeds on
  `main`, deploys production over SSH (pull, rebuild, restart frontend, wait for `/health/ready`).
  Requires the `DEPLOY_HOST`/`DEPLOY_USER`/`DEPLOY_SSH_KEY` repository secrets.
- **Staging** Compose override (`docker-compose.staging.yml`) — an isolated second stack on the
  same VM (its own database, ports 8001/5501) for smoke-testing. `docs/deploy.md` documents the
  deploy-key setup, staging usage and an optional subdomain-based browser staging.

## v4.6.0 — Operations & observability

### Added

- **Readiness probe** `GET /health/ready` — checks the database (and Redis when configured) and
  returns 503 when a dependency is down. The Compose backend healthcheck uses it, so the backend
  only reports healthy once it can serve traffic. `GET /health` stays as the liveness probe.
- **Sentry error tracking** — wired in via `sentry-sdk[fastapi]`, off unless `SENTRY_DSN` is set;
  when enabled, unhandled errors are reported with request context (no PII).
- **Database backup script** `scripts/backup-db.sh` — gzipped `pg_dump` with retention and a
  daily cron example (`docs/ops.md`); `backups/` is git-ignored.

## v4.5.0 — Security hardening

### Changed

- **Auth moved to httpOnly cookies.** Access and refresh tokens are now delivered as httpOnly
  cookies (unreadable to JavaScript) instead of `localStorage`, so an XSS bug can no longer
  steal them. `localStorage` keeps only the non-sensitive user object for UI state.

### Added

- **CSRF protection** (double-submit): a readable `csrf_token` cookie must be echoed in the
  `X-CSRF-Token` header on every mutating request; auth-bootstrap endpoints are exempt.
- **Content-Security-Policy** and security headers (X-Frame-Options, X-Content-Type-Options,
  Referrer-Policy, Permissions-Policy) served with the frontend.
- **Rate limiting on every mutating endpoint** — palettes, tags and favorites writes, password
  change and account delete (in addition to the existing auth limits).
- **Encrypted secrets via SOPS + age** — `.sops.yaml`, a deploy flow and `docs/secrets.md`.
- First **accessibility** pass: a global keyboard-focus ring, a skip-to-content link, and
  tab/tabpanel semantics on the admin Palettes/Tags switch.

## v4.4.4 — Admin & form UX pass

### Added

- Show/hide (eye) toggle on every password field — login, register, change-password and
  reset-password. A crossed-out eye means the password is hidden; an open eye means it's shown.
- Styled tag-suggestions dropdown on the palette form (filter as you type, pick to add a chip),
  replacing the native `<datalist>`.
- Pagination on the admin tag list (10 per page), matching the palette list.

### Changed

- The admin form no longer sticks while scrolling, so the admin page scrolls as one piece.

- The Palettes/Tags admin switch is an animated sliding tab, matching the main navigation.
- The palette form's Description is no longer resizable, and the tag-catalog "kind" picker uses
  the app's custom select styling.
- The export palette list flows into the page instead of a nested scroll box, so scrolling over
  it scrolls the page. With no search, it shows just 3 random palettes instead of a long list.
- Removed the redundant Logout button from the admin panel (log out from the account page).
- Removed the TXT format from the export page (CSS, SCSS, JSON and PNG remain).

### Fixed

- The admin panel now shows only the selected Palettes **or** Tags view; both were rendering
  at once because the `hidden` attribute lost to the view's `display: grid`.
- Restored the export page's two-column layout. A v4.4.2 change to the shared
  `.export-layout, .admin-layout` rule left the export settings panel and the generated-output
  preview overlapping.

## v4.4.3 — Password reset, admin modals and list search

### Added

- **Password reset by email**: `POST /api/v1/auth/forgot-password` sends a reset link (always
  a generic response so it can't probe which emails exist) and `POST /api/v1/auth/reset-password`
  sets the new password from a purpose-scoped token, logging out existing sessions. New
  `forgot-password` and `reset-password` frontend pages, linked from the login form.
- **Search and pagination** on the admin palette list (10 per page, backed by the existing
  paginated palettes endpoint).

### Changed

- Admin delete/rename actions use styled, accessible **modal dialogs** instead of the browser's
  `confirm`/`prompt`.

## v4.4.2 — Tag catalog and admin tag management

### Added

- A **tag catalog** table (`tags`) plus `GET/POST/PATCH/DELETE /api/v1/tags`. Tags can exist
  independently of palettes and be flagged as `purpose` (standard "what is this palette for"
  categories) or `free`. Ten purpose categories are seeded on first run.
- The admin panel has a **Palettes / Tags** mode switch. The Tags view lists every tag with
  its kind and palette usage count, and can add, rename, delete, or reclassify tags.
- Renaming or deleting a tag propagates across all palettes that use it.

### Changed

- The palette form takes tags as removable **chips** (Enter or comma to add) with
  autocomplete suggestions from the tag catalog, instead of a comma-separated text field.

## v4.4.1 — Session-expiry message and colour-swatch polish

### Fixed

- The favorites page now shows a "Please log in again" prompt (with a login button) when
  the session has expired, instead of a misleading "backend is not available" message.

### Changed

- The admin colour picker renders the colour as a clean rounded square (styled swatch), with
  hover and focus states.

## v4.4.0 — Diverse palettes and dynamic colour editor

### Added

- Seed palettes now include 3- and 5-colour sets (previously every default was 4 colours).
- The admin colour input is a dynamic list of HEX rows — each with a native colour picker and
  a hex field — with add/remove controls, bounded to 1–8 colours (was a comma-separated text
  field).

### Changed

- Palette swatch grids (palette card, admin list, export picker) auto-flow so any colour count
  fills the row evenly, instead of assuming exactly four columns.

## v4.3.1 — Security and infrastructure hardening

### Added

- Rotating refresh tokens: login and email verification issue an access + refresh pair;
  `POST /api/v1/auth/refresh` rotates them (single-use), `POST /api/v1/auth/logout` revokes
  the refresh token server-side. The frontend transparently refreshes an expired access
  token and retries the request.
- Redis-backed rate limiting so limits are shared across worker processes / instances
  (adds a `redis` service to Docker Compose).

### Changed

- Passwords are hashed with **Argon2id**; existing PBKDF2-SHA256 hashes still verify and are
  transparently upgraded to Argon2 on the next successful login.
- The application request path runs on **async SQLAlchemy** (asyncpg); Alembic migrations
  stay synchronous (psycopg).

### Fixed

- Even vertical spacing in the account card.

## v4.3.0 — Account management and backend hardening

### Added — account & UI

- Delete account: `DELETE /api/v1/auth/me` removes the current account and its favorites
  (204), re-authenticated with the account password. A "Danger zone" button confirms,
  deletes, logs out and returns home. The last remaining admin account cannot be deleted
  (guarded server-side).
- The account page shows the signed-in email in a clear labeled field.
- The home page tag filter shows `All` plus up to ten random tags (a lighter, rotating set).

### Added — API & backend

- Versioned API: all routes are served under `/api/v1`.
- `GET /api/v1/palettes` is paginated — it returns `{ items, total, limit, offset }` with an
  `X-Total-Count` header and `limit` / `offset` query parameters.
- Errors follow RFC 7807: responses use `application/problem+json`
  (`type` / `title` / `status` / `detail`).
- Palette search, tag filtering and sorting run in SQL; `colors` / `tags` are stored as
  JSONB with a GIN index on `tags` for indexed tag containment.
- Structured startup logging (configurable with `LOG_LEVEL`).

### Changed — configuration & database

- Settings are a typed `pydantic-settings` model with fail-fast validation, replacing the
  scattered `os.getenv` calls.
- The schema is managed by Alembic migrations. On startup the app adopts a pre-Alembic
  database safely (stamp baseline + idempotent upgrade), replacing the ad-hoc startup
  `ALTER`. Default palettes moved to `seed_palettes.json`.

### Changed — tooling & code quality

- Ruff (lint + format), mypy and a pytest coverage gate (80%) run in CI and via pre-commit;
  dependencies are pinned.
- Frontend API modules share one HTTP client (`httpClient.js`); dead code removed (the old
  `storage.js`, unused exports) and UI helpers deduplicated.

## v4.2.1 — Verify page polish and auto-login

### Changed

- Clicking the email verification link now signs the user in automatically: `GET
  /api/auth/verify` returns an access token, and the verify page stores the session and
  sends the user straight to their account.
- Friendlier, randomized success message on the verify page.

### Fixed

- The verify page now centers its card in the viewport with clear spacing below the header.

## v4.2.0 — Email verification

### Release summary

Palette v4.2.0 adds email verification on registration. New accounts receive a
Resend-backed verification email with a one-time link; a friendly verify page confirms the
address, an "email not verified" banner with a resend button appears on the account page,
and login is still allowed while an account is unverified.

### Added

- Email verification on registration: `POST /api/auth/register` emails a signed, expiring,
  purpose-scoped verification link (JWT) via Resend. `GET /api/auth/verify` confirms the
  address, and a rate-limited `POST /api/auth/resend-verification` re-sends it with a
  generic response (no account enumeration).
- `frontend/verify.html` — friendly confirmation page with an OK button, and an inline
  resend form when the link is invalid or expired.
- "Email not verified" banner with a resend button on the account page.
- `email_service` module using the Resend HTTP API, with a console fallback when
  `RESEND_API_KEY` is not set; new `RESEND_API_KEY`, `EMAIL_FROM` and `PUBLIC_BASE_URL`
  environment variables.
- `User.email_verified` / `email_verified_at`, added to existing databases by an
  idempotent startup migration (`ADD COLUMN IF NOT EXISTS`).

### Changed

- The registration response and `GET /api/auth/me` now include `email_verified`.
- Bearer authentication rejects purpose-scoped (verification) tokens.
- Backend API version bumped to `4.2.0`; frontend version strings updated to v4.2.

## v4.1.2 — Production hardening: proxy-aware rate limiting, hidden docs

### Fixed

- Rate limiting now uses the real client IP behind the reverse proxy. Uvicorn runs with
  `--proxy-headers --forwarded-allow-ips=*`, so slowapi keys limits on the forwarded client
  address instead of the Docker gateway IP. Previously every request appeared to come from
  the gateway, so a handful of logins could rate-limit every user.

### Added

- `ENABLE_API_DOCS` environment flag. Interactive API docs (`/api/docs`, `/api/redoc`,
  `/api/openapi.json`) are disabled by default and only served when it is set to `true`, so
  Swagger UI is not exposed in production. Local development enables it in `backend/.env`.

### Changed

- Backend API version bumped to `4.1.2`.

## v4.1.1 — HTTPS / reverse-proxy deploy fixes

### Fixed

- Frontend API base URL is now same-origin (`/api`) when the app is served over HTTPS, so
  it works behind a TLS reverse proxy (e.g. Caddy) with no mixed-content errors. Local HTTP
  Docker dev keeps the direct `http://<host>:8000/api` behavior.
- "API docs" links use a relative `/api/docs` instead of a hardcoded
  `http://localhost:8000/docs`, so they resolve through the reverse proxy in production.

### Changed

- FastAPI serves its interactive docs under `/api` (`/api/docs`, `/api/redoc`,
  `/api/openapi.json`), so every backend route shares the `/api/*` prefix and a single
  reverse-proxy rule covers both the app and its docs.

## v4.1.0 — Mobile fixes, UX polish and CI

### Release summary

Palette v4.1.0 adds continuous integration on GitHub Actions and a broad pass of mobile
and UX fixes found on small screens (iPhone 13, 390px wide) and during navigation.

### Added

- GitHub Actions CI (`.github/workflows/ci.yml`) running the backend test suite (the
  `test` Docker Compose profile: disposable PostgreSQL + pytest) on every pull request
  and on pushes to `main`.

### Fixed — navigation

- Navigation tabs stay on one row on small screens, shrinking evenly instead of
  clipping or overflowing; the active/last item is no longer cut off.
- Softer, chunkier nav highlight pill (no stadium rounding that clipped labels), with
  spacing between the header and the page content.
- SPA navigation restores the `<body>` class on content swap, so page-scoped styles
  (e.g. the login/auth form spacing) apply after navigating in-app.
- Page transition keeps a gentle fade even under reduced-motion (opacity only), instead
  of an abrupt instant swap; longer, smoother fade otherwise.
- "Browse palettes" and other in-page anchor links now scroll natively instead of being
  swallowed by the SPA router.

### Fixed — search and forms

- Custom, centered search clear button on the home and export fields; bold search text
  and a smaller, page-styled placeholder.
- Native `<select>` no longer flashes before it is enhanced into the custom dropdown.
- Export "Generated output" block wraps long lines and is shorter on mobile.

### Fixed — palette cards and feedback

- Palette cards animate in with a staggered fade/slide; the empty state fades in.
- Contrast badge stays on one line.
- Button text uses an explicit dark colour (no default blue on iOS) and never wraps.
- Hex tooltips on color swatches reveal on tap on touch devices, auto-hide after a short
  time, and fade in/out smoothly; no stray tap highlight.
- Toasts reuse a single element and update in place, so rapid copies show only the
  latest action instead of stacking, and appear/disappear smoothly.
- More line spacing in the hero heading.

## v4.0.0 — PostgreSQL, Docker and UX

### Release summary

Palette v4.0.0 moves the backend fully onto PostgreSQL, ships the whole stack as a
Docker Compose setup (PostgreSQL, backend, static frontend), and adds a smoother
single-page navigation experience with polished search and animations. SQLite and the
non-Docker run mode are removed — Docker is the only supported way to run the app.

### Added — backend & infrastructure

- `docker-compose.yml` with `db` (PostgreSQL 16), `backend` and `frontend` (nginx) services.
- `backend/Dockerfile` (python:3.12-slim, non-root) and `.dockerignore` files.
- `DATABASE_URL` environment variable; `POSTGRES_USER/PASSWORD/DB` for the db service.
- `psycopg[binary]` (psycopg 3) PostgreSQL driver.
- Persistent `pgdata` volume for the database.
- `test` Compose profile: pytest runs against a disposable PostgreSQL (`test-db`).
- nginx dev config with no-store caching so edits show up on a plain reload.

### Added — frontend & UX

- Single-page navigation: nav tabs, Account and Changelog swap content via `fetch`
  without a full reload (`js/router.js`), with a soft cross-fade of the page content.
- The nav indicator slides between tabs within the same document.
- Admin-only footer links (API docs / Changelog), hidden for guests and regular users.
- Custom, centered search clear button on the home and export search fields.
- Bold search text and page-styled placeholders.
- Palette cards animate in with a staggered fade/slide; the empty state fades in.
- Dynamic API base (`http://<host>:8000/api`) so the app also works over the LAN
  (e.g. viewing on a phone on the same Wi-Fi).

### Changed

- Database engine is built from a mandatory `DATABASE_URL`; the app hard-fails at
  startup if it is missing or not a `postgresql://` URL.
- The test suite runs against PostgreSQL instead of in-memory SQLite.
- API version bumped to `4.0.0`; frontend version strings updated to v4.0.

### Removed

- SQLite support and the local SQLite file (`palette.db`).
- The SQLite-only startup `ALTER TABLE` migration helper (`run_startup_migrations`).
- The non-Docker (venv + uvicorn + SQLite) run path from the docs.

## v3.3.0 — Security Hardening and Tests

### Release summary

Palette v3.3.0 hardens the backend and adds a first automated test suite. It makes `SECRET_KEY` mandatory, replaces wildcard CORS with an explicit allowlist, rate-limits authentication endpoints, switches to timing-safe password comparison, moves timestamps to timezone-aware UTC, fixes login by email, and synchronises version strings across the project to 3.3.

### Added

- Login and registration rate limiting with slowapi (`5/minute` login, `10/hour` register).
- Explicit `CORS_ORIGINS` allowlist environment variable.
- Automated backend test suite with pytest: `test_security`, `test_auth_api`, `test_crud`, `test_palettes_api`.
- `backend/pytest.ini` and `backend/tests/` package.
- README test instructions and mandatory-`SECRET_KEY` documentation.

### Changed

- `SECRET_KEY` is now mandatory; the app refuses to start with a missing or placeholder value.
- CORS `allow_origins` no longer uses `"*"`; origins come from `CORS_ORIGINS`.
- Timestamps (`created_at`, `updated_at`) are timezone-aware UTC instead of naive `datetime.utcnow`.
- Backend API version bumped to `3.3.0`; frontend version strings updated to v3.3.

### Fixed

- Login by email returned `422` because `UserLogin` inherited the strict username pattern validator; it now accepts a username or an email.

### Security

- Password comparison uses `hmac.compare_digest` (timing-safe) instead of `==`.
- Loud startup warning when `DEFAULT_ADMIN_PASSWORD` is still a placeholder.

## v3.2.0 — Export Workflow and UI Polish

### Release summary

Palette v3.2.0 improves the v3.1 authentication release with a more focused export flow, selected palette export, PNG palette card generation, frontend changelog page and UI/navigation polish.

### Added

- Added `Choose palette` export source.
- Added palette search inside the export page.
- Added selected-palette export.
- Added PNG export for a single selected palette card.
- Added `frontend/changelog.html`.
- Added bottom project information panel on each frontend page.
- Added project-focused footer highlights.
- Added footer link to API docs and frontend changelog page.
- Added navigation hard-refresh stability improvements.

### Changed

- Removed `All palettes` from the Export source dropdown.
- `Choose palette` is now the default Export source.
- `Favorites only` remains available for account-based favorites export.
- Selected palette PNG export now generates only the selected palette card.
- Changelog page does not highlight any top navigation tab.
- Palette contrast ratio is displayed with one decimal.
- Create account button now uses the same primary style as Login.
- Login page redirects logged-in users to Account.
- Backend login accepts username or email.

### Fixed

- Fixed Login/Register page styling.
- Fixed navigation active indicator after hard refresh.
- Fixed Changelog footer link returning 404.
- Fixed Export dropdown overflow without scrolling the whole left panel.

### GitHub release

Suggested tag:

```text
v3.2.0
```

Suggested release title:

```text
Palette v3.2.0 — Export Workflow and UI Polish
```

---

# Changelog

## v3.1.0 — Authentication, User Accounts and User Favorites


### Release summary

Palette v3.1.0 expands the project from a full-stack palette manager into a user-aware application with authentication, account pages, role-based admin access and database-backed favorites.

#### Highlights

- Added username, email and password registration.
- Added login with Bearer token authentication.
- Added personal account page.
- Added password change with confirmation.
- Added user-based favorites stored in SQLite.
- Added favorites API.
- Added role-based admin access.
- Replaced `X-Admin-Token` with admin user roles.
- Hidden Admin navigation for guests and regular users.
- Updated documentation for v3.1.

#### Upgrade notes from v3.0

- Create or update `backend/.env` using `backend/.env.example`.
- Restart the backend after replacing files.
- If local database state causes issues during testing, delete `backend/palette.db` and restart the backend.
- Old localStorage favorites are not used by the new user-based favorites system.

#### GitHub release

Suggested tag:

```text
v3.1.0
```

Suggested release title:

```text
Palette v3.1.0 — Authentication & User Accounts
```

### Added

- Added user registration with username, email and password.
- Added login with Bearer token authentication.
- Added JWT access tokens using PyJWT.
- Added password hashing with PBKDF2-SHA256.
- Added `/api/auth/register` endpoint.
- Added `/api/auth/login` endpoint.
- Added `/api/auth/me` endpoint.
- Added `/api/auth/password` endpoint for password changes.
- Added personal account page: `profile.html`.
- Added account navigation state: `Login` becomes `Account` after login.
- Added logout inside the personal account page.
- Added `users` table.
- Added `favorites` table.
- Added user-based favorites stored in the SQLite database.
- Added favorites API endpoints.
- Added admin role checks for protected palette actions.
- Added hidden Admin navigation for guests and regular users.
- Added automatic first admin user creation from `.env` settings.
- Added frontend authentication utilities:
  - `authApi.js`
  - `authStorage.js`
  - `authNav.js`
- Added frontend favorites API module:
  - `favoritesApi.js`
- Added documentation for authentication, database, setup, troubleshooting and security.

### Changed

- Replaced `X-Admin-Token` protection with role-based admin access.
- Palette create/update/delete endpoints now require a logged-in admin user.
- Favorites moved from browser `localStorage` to backend database storage.
- Favorites page now requires login.
- Export page now supports account-based favorites when `Favorites only` is selected.
- Admin tab is visible only for admin users.
- Login no longer changes directly to Logout in navigation; logged-in users see `Account`.
- Password management moved into the account page.
- README updated from v3.0 to v3.1.
- API documentation updated to use Bearer tokens instead of admin token headers.
- Roadmap updated: v3.1 is no longer planned; it is implemented.

### Security

- Passwords are not stored in plain text.
- Password hashes use PBKDF2-SHA256 with salt.
- Protected routes require `Authorization: Bearer <token>`.
- Admin actions require `is_admin = true`.
- `.env` remains ignored by Git.
- Default admin credentials must be changed before sharing or deployment.

### Notes

- SQLite is used for local development.
- Tokens are stored on the frontend for local development usage.
- Email verification and password reset by email are not implemented yet.

---

## v3.0.0 — Full-Stack Backend API Update

### Added

- Added FastAPI backend.
- Added SQLite database for palette storage.
- Added SQLAlchemy palette model.
- Added Pydantic schemas and request/response validation.
- Added REST API for palette management.
- Added public API endpoints for reading palettes and tags.
- Added backend search by name, description, slug and tags.
- Added backend tag filtering.
- Added backend sorting by name.
- Added automatic seed data for default palettes.
- Added Swagger UI documentation.
- Added frontend API service with `fetch`.
- Added loading and error states for backend connection.
- Added admin page for CRUD testing.
- Added admin token protection for create, update and delete actions.
- Added backend environment configuration through `.env`.
- Added `.env.example` template.
- Added PNG export through the frontend Canvas API.
- Added PNG preview before downloading the image.
- Added custom dropdown components styled to match the site UI.
- Added `start_project.bat` for easier local startup on Windows.
- Added API documentation in `docs/api.md`.
- Added roadmap documentation in `ROADMAP.md`.

### Changed

- Changed project architecture from frontend-only to full-stack.
- Replaced static palette loading from `palettes.js` with backend API requests.
- Moved frontend files into the `frontend/` folder.
- Added backend files inside the `backend/` folder.
- Updated home page to load palettes, tags, search and sorting from backend data.
- Updated export page to support backend-loaded palettes and PNG image export.
- Improved dropdown UI and fixed dropdown closing behavior.

---

## v2.0.0 — JavaScript Refactor & Export Update

### Added

- Added modular JavaScript structure with ES Modules.
- Added separate data, utility, component and page modules.
- Added favorites with `localStorage`.
- Added export page for CSS variables, SCSS variables, JSON and TXT.
- Added HEX color copying.
- Added full palette copying.
- Added contrast status for palettes.
- Added toast notifications.
- Added empty states.
- Added responsive layout improvements.

### Changed

- Split JavaScript logic into smaller files.
- Split CSS into base, component and page styles.
- Improved project structure for portfolio presentation.

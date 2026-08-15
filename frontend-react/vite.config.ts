/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import { sentryVitePlugin } from "@sentry/vite-plugin";

/**
 * Source maps reach Sentry, and never the browser.
 *
 * The plugin only runs when an auth token is present, which is the production image build and
 * nowhere else: a local `npm run build`, a pull-request build and anyone's checkout all skip it
 * silently rather than failing on a missing credential. The token arrives as a BuildKit secret,
 * so it is mounted for one RUN step instead of being baked into a layer the way a build arg
 * would be.
 *
 * `release` ties the uploaded maps to the commit, so a stack trace in Sentry resolves against
 * the exact build that produced it rather than whatever is newest.
 *
 * A rejected token logs an error and lets the build succeed — verified by building with a
 * deliberately invalid one. That is the right trade for a deploy path (a Sentry outage must not
 * block a release) but it means a stale token stops uploads without anything turning red. If
 * traces stop symbolicating, this is the first place to look.
 */
const sentryUpload = process.env.SENTRY_AUTH_TOKEN
  ? [
      sentryVitePlugin({
        authToken: process.env.SENTRY_AUTH_TOKEN,
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        release: { name: process.env.SENTRY_RELEASE },
        // The Dockerfile deletes the .map files after this runs; telling the plugin not to
        // would leave them for nginx to serve.
        sourcemaps: { filesToDeleteAfterUpload: [] },
        // On by default, and it reports build data to Sentry whether or not the upload works.
        // The page itself now talks to no third party at all; the build should not quietly be
        // the exception.
        telemetry: false,
      }),
    ]
  : [];

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), vanillaExtractPlugin(), ...sentryUpload],
  // "hidden": emit source maps for Sentry to symbolicate with, but omit the sourceMappingURL
  // comment so browsers never request them. The Dockerfile deletes them before they reach
  // nginx — a plain `true` published the entire TypeScript source at /assets/*.map.
  build: { sourcemap: "hidden" },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    // Has to exceed the 5s asyncUtilTimeout set in the setup file, or a slow `findBy` would
    // fail the test on the runner's budget before its own wait expired.
    testTimeout: 15000,
    // Playwright specs live under e2e/ and run with their own runner, not Vitest.
    exclude: ["**/node_modules/**", "**/dist/**", "e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/test/**",
        "src/main.tsx",
        "src/**/*.d.ts",
        "src/types/**",
        // Canvas PNG rendering is verified by the Playwright/axe E2E — jsdom has no 2D context,
        // so unit-"covering" it would just execute draw calls against a fake ctx (vanity coverage).
        "src/lib/exportGenerators.ts",
      ],
      // Floor for everything except the canvas renderer (E2E-covered). Kept just under the
      // achieved numbers so it ratchets against regressions.
      thresholds: { lines: 78, functions: 70, statements: 75, branches: 68 },
    },
  },
});

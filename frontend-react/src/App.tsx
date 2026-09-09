import { lazy, Suspense, type ComponentType } from "react";
import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { RouteFallback } from "./components/RouteFallback";
import { HomePage } from "./pages/HomePage";

/**
 * `lazy`, but a failed chunk import reloads the page once instead of hitting the error boundary.
 *
 * After a deploy the asset hashes change and the previous bundle's chunks are gone, so a tab that
 * was left open before the deploy 404s the moment it navigates to a route it had not loaded yet.
 * A single reload picks up the new `index.html` (served `no-store`) and its current chunks. The
 * timestamp guard means a genuinely broken import (offline, a real 500) still surfaces rather than
 * looping: it reloads at most once per 10 seconds.
 */
function lazyWithReload<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(() =>
    factory().catch((error: unknown) => {
      const KEY = "palette:chunk-reload-at";
      try {
        const last = Number(sessionStorage.getItem(KEY) ?? 0);
        if (Date.now() - last > 10_000) {
          sessionStorage.setItem(KEY, String(Date.now()));
          window.location.reload();
          // Hold until the reload replaces the document.
          return new Promise<{ default: T }>(() => {});
        }
      } catch {
        // No sessionStorage (private mode): fall through and surface the error.
      }
      throw error;
    }),
  );
}

/**
 * Every route below the landing page is fetched on demand.
 *
 * The whole app used to arrive as one 336 kB chunk, so a visitor who only ever browses
 * palettes still paid for the admin editor, the export page's canvas renderer and the full
 * changelog. Home stays eagerly imported: it is what the majority of visits render first, and
 * deferring it would trade a smaller download for a slower first paint on the one route that
 * matters most.
 *
 * Verify is split for a different reason. It is reached once, from an email link, by a user
 * who will never see it again.
 */
const LoginPage = lazyWithReload(() =>
  import("./pages/LoginPage").then((m) => ({ default: m.LoginPage })),
);
const FavoritesPage = lazyWithReload(() =>
  import("./pages/FavoritesPage").then((m) => ({ default: m.FavoritesPage })),
);
const ExportPage = lazyWithReload(() =>
  import("./pages/ExportPage").then((m) => ({ default: m.ExportPage })),
);
const ProfilePage = lazyWithReload(() =>
  import("./pages/ProfilePage").then((m) => ({ default: m.ProfilePage })),
);
const AdminPage = lazyWithReload(() =>
  import("./pages/AdminPage").then((m) => ({ default: m.AdminPage })),
);
const ForgotPasswordPage = lazyWithReload(() =>
  import("./pages/ForgotPasswordPage").then((m) => ({ default: m.ForgotPasswordPage })),
);
const ResetPasswordPage = lazyWithReload(() =>
  import("./pages/ResetPasswordPage").then((m) => ({ default: m.ResetPasswordPage })),
);
const ChangelogPage = lazyWithReload(() =>
  import("./pages/ChangelogPage").then((m) => ({ default: m.ChangelogPage })),
);
const VerifyPage = lazyWithReload(() =>
  import("./pages/VerifyPage").then((m) => ({ default: m.VerifyPage })),
);
const NotFoundPage = lazyWithReload(() =>
  import("./pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage })),
);
const PalettePage = lazyWithReload(() =>
  import("./pages/PalettePage").then((m) => ({ default: m.PalettePage })),
);
const PaletteEditorPage = lazyWithReload(() =>
  import("./pages/PaletteEditorPage").then((m) => ({ default: m.PaletteEditorPage })),
);
const YourPalettesPage = lazyWithReload(() =>
  import("./pages/YourPalettesPage").then((m) => ({ default: m.YourPalettesPage })),
);
const ImportPage = lazyWithReload(() =>
  import("./pages/ImportPage").then((m) => ({ default: m.ImportPage })),
);
const UserPalettesPage = lazyWithReload(() =>
  import("./pages/UserPalettesPage").then((m) => ({ default: m.UserPalettesPage })),
);

export function App() {
  return (
    <Routes>
      {/* Verify has its own bare shell — no nav or footer — so the email link lands on a
          single-purpose page rather than the full site chrome. */}
      <Route
        path="verify"
        element={
          <Suspense fallback={<RouteFallback />}>
            <VerifyPage />
          </Suspense>
        }
      />

      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="palettes/new" element={<PaletteEditorPage />} />
        <Route path="import" element={<ImportPage />} />
        <Route path="palettes/mine" element={<YourPalettesPage />} />
        <Route path="u/:handle" element={<UserPalettesPage />} />
        <Route path="u/:handle/:slug" element={<PalettePage />} />
        <Route path="u/:handle/:slug/edit" element={<PaletteEditorPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="favorites" element={<FavoritesPage />} />
        <Route path="export" element={<ExportPage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route path="changelog" element={<ChangelogPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

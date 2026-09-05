import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { RouteFallback } from "./components/RouteFallback";
import { HomePage } from "./pages/HomePage";

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
const LoginPage = lazy(() =>
  import("./pages/LoginPage").then((m) => ({ default: m.LoginPage })),
);
const FavoritesPage = lazy(() =>
  import("./pages/FavoritesPage").then((m) => ({ default: m.FavoritesPage })),
);
const ExportPage = lazy(() =>
  import("./pages/ExportPage").then((m) => ({ default: m.ExportPage })),
);
const ProfilePage = lazy(() =>
  import("./pages/ProfilePage").then((m) => ({ default: m.ProfilePage })),
);
const AdminPage = lazy(() =>
  import("./pages/AdminPage").then((m) => ({ default: m.AdminPage })),
);
const ForgotPasswordPage = lazy(() =>
  import("./pages/ForgotPasswordPage").then((m) => ({ default: m.ForgotPasswordPage })),
);
const ResetPasswordPage = lazy(() =>
  import("./pages/ResetPasswordPage").then((m) => ({ default: m.ResetPasswordPage })),
);
const ChangelogPage = lazy(() =>
  import("./pages/ChangelogPage").then((m) => ({ default: m.ChangelogPage })),
);
const VerifyPage = lazy(() =>
  import("./pages/VerifyPage").then((m) => ({ default: m.VerifyPage })),
);
const NotFoundPage = lazy(() =>
  import("./pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage })),
);
const PalettePage = lazy(() =>
  import("./pages/PalettePage").then((m) => ({ default: m.PalettePage })),
);
const PaletteEditorPage = lazy(() =>
  import("./pages/PaletteEditorPage").then((m) => ({ default: m.PaletteEditorPage })),
);
const YourPalettesPage = lazy(() =>
  import("./pages/YourPalettesPage").then((m) => ({ default: m.YourPalettesPage })),
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
        <Route path="palettes/mine" element={<YourPalettesPage />} />
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

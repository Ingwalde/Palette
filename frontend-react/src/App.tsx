import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { FavoritesPage } from "./pages/FavoritesPage";
import { ExportPage } from "./pages/ExportPage";
import { ProfilePage } from "./pages/ProfilePage";
import { AdminPage } from "./pages/AdminPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { ChangelogPage } from "./pages/ChangelogPage";
import { VerifyPage } from "./pages/VerifyPage";
import { PlaceholderPage } from "./pages/PlaceholderPage";

export function App() {
  return (
    <Routes>
      {/* Verify uses its own bare shell (no nav/footer), like the vanilla verify page. */}
      <Route path="verify" element={<VerifyPage />} />

      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="favorites" element={<FavoritesPage />} />
        <Route path="export" element={<ExportPage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route path="changelog" element={<ChangelogPage />} />
        <Route path="*" element={<PlaceholderPage name="Not found" />} />
      </Route>
    </Routes>
  );
}

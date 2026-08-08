import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { FavoritesPage } from "./pages/FavoritesPage";
import { PlaceholderPage } from "./pages/PlaceholderPage";

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="favorites" element={<FavoritesPage />} />
        <Route path="export" element={<PlaceholderPage name="Export" />} />
        <Route path="admin" element={<PlaceholderPage name="Admin" />} />
        <Route path="profile" element={<PlaceholderPage name="Profile" />} />
        <Route
          path="forgot-password"
          element={<PlaceholderPage name="Forgot password" />}
        />
        <Route
          path="reset-password"
          element={<PlaceholderPage name="Reset password" />}
        />
        <Route path="verify" element={<PlaceholderPage name="Verify email" />} />
        <Route path="changelog" element={<PlaceholderPage name="Changelog" />} />
        <Route path="*" element={<PlaceholderPage name="Not found" />} />
      </Route>
    </Routes>
  );
}

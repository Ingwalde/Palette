import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { PlaceholderPage } from "./pages/PlaceholderPage";

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="favorites" element={<PlaceholderPage name="Favorites" />} />
        <Route path="export" element={<PlaceholderPage name="Export" />} />
        <Route path="admin" element={<PlaceholderPage name="Admin" />} />
        <Route path="login" element={<PlaceholderPage name="Login" />} />
        <Route path="profile" element={<PlaceholderPage name="Profile" />} />
        <Route path="*" element={<PlaceholderPage name="Not found" />} />
      </Route>
    </Routes>
  );
}

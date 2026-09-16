import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "./auth/AuthContext";
import { ToastProvider } from "./components/toast/ToastProvider";
import { ModalProvider } from "./components/modal/ModalProvider";
import { ColorFormatProvider } from "./components/ColorFormatContext";
import { ThemeProvider } from "./components/ThemeContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { initObservability } from "./lib/observability";
import { App } from "./App";
// Document-level layer: reset, design tokens, typography. Everything else is scoped to the
// component or page that owns it.
import "./styles/global.css";

initObservability();
const router = createBrowserRouter([
  {
    path: "*",
    element: (
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    ),
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <ModalProvider>
            <ColorFormatProvider>
              <ThemeProvider>
                <RouterProvider router={router} />
              </ThemeProvider>
            </ColorFormatProvider>
          </ModalProvider>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);

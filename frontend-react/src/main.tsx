import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "./auth/AuthContext";
import { ToastProvider } from "./components/toast/ToastProvider";
import { ModalProvider } from "./components/modal/ModalProvider";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { initObservability } from "./lib/observability";
import { App } from "./App";
// Global stylesheets carried over verbatim from the original frontend, which is why the port
// came out pixel-identical. Still unscoped: see styles/vanilla/ in the README.
import "./styles/vanilla/base.css";
import "./styles/vanilla/components.css";
import "./styles/vanilla/pages.css";

initObservability();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <ModalProvider>
            <BrowserRouter>
              <ErrorBoundary>
                <App />
              </ErrorBoundary>
            </BrowserRouter>
          </ModalProvider>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);

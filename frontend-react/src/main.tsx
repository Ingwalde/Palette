import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "./auth/AuthContext";
import { ToastProvider } from "./components/toast/ToastProvider";
import { ModalProvider } from "./components/modal/ModalProvider";
import { App } from "./App";
// Reuse the vanilla stylesheets verbatim so the React app is visually 1:1 with the
// original frontend. These are retired once the migration is complete.
import "./styles/vanilla/base.css";
import "./styles/vanilla/components.css";
import "./styles/vanilla/pages.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <ModalProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </ModalProvider>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);

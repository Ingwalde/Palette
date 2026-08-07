import { QueryClient } from "@tanstack/react-query";

// Shared query client. Defaults tuned for a small read-mostly app; the typed fetch layer
// and CSRF/refresh handling land in 4.8.1.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

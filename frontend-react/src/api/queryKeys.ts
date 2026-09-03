import type { PaletteListParams } from "../types/api";

// Centralised React Query keys so invalidation stays consistent across the app.
export const queryKeys = {
  auth: ["auth", "me"] as const,
  palettes: (params: PaletteListParams = {}) => ["palettes", params] as const,
  palette: (handle: string, slug: string) => ["palette", handle, slug] as const,
  tags: ["tags"] as const,
  favorites: ["favorites"] as const,
};

import type { PaletteListParams } from "../types/api";

// Centralised React Query keys so invalidation stays consistent across the app.
export const queryKeys = {
  auth: ["auth", "me"] as const,
  palettes: (params: PaletteListParams = {}) => ["palettes", params] as const,
  // Kept under the "palettes" prefix so usePalette can still seed a page from it; the "infinite"
  // segment separates it from the plain list's cache entry.
  palettesInfinite: (params: PaletteListParams = {}) =>
    ["palettes", "infinite", params] as const,
  palette: (handle: string, slug: string) => ["palette", handle, slug] as const,
  tags: ["tags"] as const,
  favorites: ["favorites"] as const,
};

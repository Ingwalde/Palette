import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listPalettes } from "./palettes";
import { listTags } from "./tags";
import { listFavorites, addFavorite, removeFavorite, clearFavorites } from "./favorites";
import { queryKeys } from "./queryKeys";
import { useAuth } from "../auth/AuthContext";
import type { PaletteListParams } from "../types/api";

export function usePalettes(params: PaletteListParams = {}) {
  return useQuery({
    queryKey: queryKeys.palettes(params),
    queryFn: () => listPalettes(params),
  });
}

export function useTags() {
  return useQuery({
    queryKey: queryKeys.tags,
    queryFn: listTags,
    staleTime: 5 * 60_000,
  });
}

// Favorites are per-user; only fetched when signed in.
export function useFavorites() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: queryKeys.favorites,
    queryFn: listFavorites,
    enabled: isAuthenticated,
    staleTime: 30_000,
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, saved }: { slug: string; saved: boolean }) =>
      saved ? removeFavorite(slug) : addFavorite(slug),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.favorites }),
  });
}

export function useClearFavorites() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clearFavorites,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.favorites }),
  });
}

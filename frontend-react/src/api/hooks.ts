import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getPalette, listPalettes } from "./palettes";
import { listTags } from "./tags";
import { listFavorites, addFavorite, removeFavorite, clearFavorites } from "./favorites";
import { queryKeys } from "./queryKeys";
import { useAuth } from "../auth/AuthContext";
import type { Palette, PaletteList, PaletteListParams } from "../types/api";

export function usePalettes(params: PaletteListParams = {}) {
  return useQuery({
    queryKey: queryKeys.palettes(params),
    queryFn: () => listPalettes(params),
    // The catalogue is public and changes rarely — without a stale window every mount refetched
    // it, so opening a palette and coming back re-fetched the whole grid for no new data.
    staleTime: 60_000,
  });
}

export function usePalette(handle: string, slug: string) {
  const queryClient = useQueryClient();
  // Seed the page from whatever palette list is already cached, so arriving from a card renders
  // instantly and only refreshes in the background. carrying the list's own dataUpdatedAt keeps
  // the freshness honest — a cold arrival straight from a link finds nothing and loads normally.
  const cached = () => {
    for (const [key, data] of queryClient.getQueriesData<PaletteList>({
      queryKey: ["palettes"],
    })) {
      const hit = data?.items.find((p) => p.slug === slug && p.owner_handle === handle);
      if (hit) return { hit, updatedAt: queryClient.getQueryState(key)?.dataUpdatedAt };
    }
    return undefined;
  };
  return useQuery({
    queryKey: queryKeys.palette(handle, slug),
    queryFn: () => getPalette(handle, slug),
    enabled: Boolean(handle && slug),
    initialData: () => cached()?.hit,
    initialDataUpdatedAt: () => cached()?.updatedAt,
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
    mutationFn: ({ slug, saved }: { slug: string; saved: boolean; palette?: Palette }) =>
      saved ? removeFavorite(slug) : addFavorite(slug),
    // Flip the heart before the round trip. The favorites list is the single source the card
    // reads its saved state from, so editing the cache updates every card showing this palette
    // at once; the request then confirms it. The `palette` argument is what a re-add needs to
    // put the row back — remove/add both return void, so the cache cannot recover it otherwise.
    onMutate: async ({ slug, saved, palette }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.favorites });
      const previous = queryClient.getQueryData<Palette[]>(queryKeys.favorites);
      queryClient.setQueryData<Palette[]>(queryKeys.favorites, (current = []) =>
        saved
          ? current.filter((p) => p.slug !== slug)
          : palette && !current.some((p) => p.slug === slug)
            ? [palette, ...current]
            : current,
      );
      return { previous };
    },
    // Put the real state back on failure: an optimistic flip that the server rejected must not
    // stick, or the card would claim a save that did not happen.
    onError: (_err, _vars, context) => {
      if (context?.previous)
        queryClient.setQueryData(queryKeys.favorites, context.previous);
    },
    // Reconcile with the server either way — order and any fields the optimistic copy lacked.
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.favorites }),
  });
}

export function useClearFavorites() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clearFavorites,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.favorites }),
  });
}

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { getPalette, getPublicProfile, listPalettes, listUserPalettes } from "./palettes";
import { listTags } from "./tags";
import { listFavorites, addFavorite, removeFavorite, clearFavorites } from "./favorites";
import { queryKeys } from "./queryKeys";
import { useAuth } from "../auth/AuthContext";
import {
  clearGuestFavorites,
  getGuestFavorites,
  toggleGuestFavorite,
} from "../lib/guestFavorites";
import type { Palette, PaletteList, PaletteListParams } from "../types/api";

// The home grid pages in 24 at a time — a multiple of the three-column grid, so the last row is
// never ragged.
const PAGE_SIZE = 24;

export function usePalettes(params: PaletteListParams = {}) {
  return useQuery({
    queryKey: queryKeys.palettes(params),
    queryFn: () => listPalettes(params),
    // The catalogue is public and changes rarely — without a stale window every mount refetched
    // it, so opening a palette and coming back re-fetched the whole grid for no new data.
    staleTime: 60_000,
  });
}

export function usePalettesInfinite(params: PaletteListParams = {}) {
  return useInfiniteQuery({
    queryKey: queryKeys.palettesInfinite(params),
    queryFn: ({ pageParam }) =>
      listPalettes({ ...params, limit: PAGE_SIZE, offset: pageParam }),
    initialPageParam: 0,
    // The next offset, or undefined once the pages cover `total`. Changing a filter changes the
    // query key, so pagination resets on its own — no separate reset logic.
    getNextPageParam: (last) =>
      last.offset + last.items.length < last.total ? last.offset + PAGE_SIZE : undefined,
    staleTime: 60_000,
  });
}

// A public profile header (/u/:handle). `retry: false` so a 404 (unknown handle) surfaces at once
// rather than after the default retries.
export function useUserProfile(handle: string) {
  return useQuery({
    queryKey: queryKeys.userProfile(handle),
    queryFn: () => getPublicProfile(handle),
    enabled: handle !== "",
    retry: false,
    staleTime: 60_000,
  });
}

// The profile's own palette grid, paged like the home feed.
export function useUserPalettesInfinite(handle: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.userPalettes(handle),
    queryFn: ({ pageParam }) =>
      listUserPalettes(handle, { limit: PAGE_SIZE, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last) =>
      last.offset + last.items.length < last.total ? last.offset + PAGE_SIZE : undefined,
    enabled: handle !== "",
    retry: false,
    staleTime: 60_000,
  });
}

// Palettes cached under the "palettes" prefix come in two shapes — the plain list ({ items }) and
// the infinite query ({ pages: [{ items }] }). Flatten either to the palettes it holds.
function itemsOf(data: unknown): Palette[] {
  if (!data || typeof data !== "object") return [];
  if (Array.isArray((data as PaletteList).items)) return (data as PaletteList).items;
  const pages = (data as { pages?: PaletteList[] }).pages;
  return pages ? pages.flatMap((p) => p.items) : [];
}

export function usePalette(handle: string, slug: string) {
  const queryClient = useQueryClient();
  // Seed the page from whatever palette list is already cached, so arriving from a card renders
  // instantly and only refreshes in the background. carrying the list's own dataUpdatedAt keeps
  // the freshness honest — a cold arrival straight from a link finds nothing and loads normally.
  const cached = () => {
    for (const [key, data] of queryClient.getQueriesData({ queryKey: ["palettes"] })) {
      const hit = itemsOf(data).find((p) => p.slug === slug && p.owner_handle === handle);
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

// The favorites cache key is split by auth state: the server list and the on-device guest list are
// genuinely different data, and keying them apart makes React Query refetch the moment auth flips
// (same-key/different-queryFn would keep serving the stale one). Both start with `queryKeys.favorites`,
// so an invalidate or teardown on that prefix still clears both.
function favoritesKey(isAuthenticated: boolean) {
  return [...queryKeys.favorites, isAuthenticated ? "user" : "guest"] as const;
}

// Favorites: the signed-in user's from the server, or the logged-out visitor's from this device.
export function useFavorites() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: favoritesKey(isAuthenticated),
    queryFn: isAuthenticated ? listFavorites : async () => getGuestFavorites(),
    staleTime: 30_000,
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const key = favoritesKey(isAuthenticated);
  return useMutation({
    mutationFn: async ({
      slug,
      saved,
      palette,
    }: {
      slug: string;
      saved: boolean;
      palette?: Palette;
    }) => {
      // Logged out: keep it on this device (merged into the account on sign-in).
      if (!isAuthenticated) {
        if (palette) toggleGuestFavorite(palette, saved);
        return;
      }
      return saved ? removeFavorite(slug) : addFavorite(slug);
    },
    // Flip the heart before the round trip. The favorites list is the single source the card
    // reads its saved state from, so editing the cache updates every card showing this palette
    // at once; the request then confirms it. The `palette` argument is what a re-add needs to
    // put the row back — remove/add both return void, so the cache cannot recover it otherwise.
    onMutate: async ({ slug, saved, palette }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Palette[]>(key);
      queryClient.setQueryData<Palette[]>(key, (current = []) =>
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
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    // Reconcile with the server either way — order and any fields the optimistic copy lacked.
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

export function useClearFavorites() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  return useMutation({
    mutationFn: isAuthenticated
      ? clearFavorites
      : async () => {
          clearGuestFavorites();
        },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: favoritesKey(isAuthenticated) }),
  });
}

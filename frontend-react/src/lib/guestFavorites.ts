import type { Palette } from "../types/api";

// A logged-out visitor's favorites, kept on this device only. When they sign in, these are merged
// into their account (see AuthContext) and cleared. Stored as whole palettes so the favorites page
// can render them without a round trip; capped so the entry stays small.
const KEY = "palette:guest-favorites";
const MAX = 100;

export function getGuestFavorites(): Palette[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as Palette[]) : [];
  } catch {
    return [];
  }
}

function write(list: Palette[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    // No storage available (private mode, quota): the in-memory query cache still reflects the
    // toggle for this session; it just will not persist.
  }
}

/** Add or remove a palette from the guest set, returning the new list. */
export function toggleGuestFavorite(palette: Palette, saved: boolean): Palette[] {
  const list = getGuestFavorites();
  const next = saved
    ? list.filter((p) => p.slug !== palette.slug)
    : list.some((p) => p.slug === palette.slug)
      ? list
      : [palette, ...list];
  write(next);
  return next;
}

export function clearGuestFavorites(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}

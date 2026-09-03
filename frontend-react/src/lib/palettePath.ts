import type { Palette } from "../types/api";

// The single place that knows a palette's URL shape. Every Link, navigate, share and export
// goes through here, so changing the scheme is one edit rather than a grep across the app.
export function palettePath(palette: Pick<Palette, "owner_handle" | "slug">): string {
  return `/u/${encodeURIComponent(palette.owner_handle)}/${encodeURIComponent(palette.slug)}`;
}

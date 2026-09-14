// Matches PaletteBase.colors (backend/app/schemas.py); the hero has its own 2–6 range.
export const COLOR_COUNTS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
export function readColorCount(raw: string | null): number | undefined {
  return raw && /^[1-8]$/.test(raw) ? Number(raw) : undefined;
}

/** Tags always lead to the same catalogue filter, retaining other current catalogue choices. */
export function tagPath(tag: string, pathname: string, search: string) {
  const params = pathname === "/" ? new URLSearchParams(search) : new URLSearchParams();
  params.set("tag", tag);
  return `/?${params.toString()}#find`;
}

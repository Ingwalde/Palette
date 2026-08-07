import { request, toQuery } from "../lib/http";
import type { Palette, PaletteList, PaletteListParams } from "../types/api";

export function listPalettes(params: PaletteListParams = {}): Promise<PaletteList> {
  return request<PaletteList>(`/palettes${toQuery({ ...params })}`);
}

export function getPalette(slug: string): Promise<Palette> {
  return request<Palette>(`/palettes/${encodeURIComponent(slug)}`);
}

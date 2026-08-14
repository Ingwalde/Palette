import { request, toQuery } from "../lib/http";
import type { Palette, PaletteList, PaletteListParams } from "../types/api";

export function listPalettes(params: PaletteListParams = {}): Promise<PaletteList> {
  return request<PaletteList>(`/palettes${toQuery({ ...params })}`);
}

export interface PalettePayload {
  name: string;
  description: string;
  colors: string[];
  tags: string[];
}

const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) });

export function createPalette(payload: PalettePayload): Promise<Palette> {
  return request<Palette>("/palettes", { method: "POST", ...json(payload) });
}

export function updatePalette(id: number, payload: PalettePayload): Promise<Palette> {
  return request<Palette>(`/palettes/${id}`, { method: "PUT", ...json(payload) });
}

export function deletePalette(id: number): Promise<void> {
  return request<void>(`/palettes/${id}`, { method: "DELETE" });
}

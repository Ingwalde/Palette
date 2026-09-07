import { request, toQuery } from "../lib/http";
import type {
  Palette,
  PaletteList,
  PaletteListParams,
  PaletteVisibility,
} from "../types/api";

export function listPalettes(params: PaletteListParams = {}): Promise<PaletteList> {
  return request<PaletteList>(`/palettes${toQuery({ ...params })}`);
}

export function listMyPalettes(): Promise<PaletteList> {
  return request<PaletteList>("/palettes/mine");
}

export function getPalette(handle: string, slug: string): Promise<Palette> {
  return request<Palette>(
    `/users/${encodeURIComponent(handle)}/palettes/${encodeURIComponent(slug)}`,
  );
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

// Publish ("public") or hide ("private") — the PATCH-on-PUT the backend takes on the same route.
export function setPaletteVisibility(
  id: number,
  visibility: PaletteVisibility,
): Promise<Palette> {
  return request<Palette>(`/palettes/${id}`, { method: "PUT", ...json({ visibility }) });
}

// Copy a palette into your own account as a private draft, with lineage recorded.
export function forkPalette(id: number): Promise<Palette> {
  return request<Palette>(`/palettes/${id}/fork`, { method: "POST" });
}

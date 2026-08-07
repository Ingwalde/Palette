import { request } from "../lib/http";
import type { Palette } from "../types/api";

export function listFavorites(): Promise<Palette[]> {
  return request<Palette[]>("/favorites");
}

export function addFavorite(slug: string): Promise<void> {
  return request<void>(`/favorites/${encodeURIComponent(slug)}`, { method: "POST" });
}

export function removeFavorite(slug: string): Promise<void> {
  return request<void>(`/favorites/${encodeURIComponent(slug)}`, { method: "DELETE" });
}

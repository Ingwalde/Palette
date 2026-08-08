import { request } from "../lib/http";
import type { Tag, TagKind } from "../types/api";

export function listTags(): Promise<Tag[]> {
  return request<Tag[]>("/tags");
}

const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) });

export function createTag(payload: { name: string; kind: TagKind }): Promise<Tag> {
  return request<Tag>("/tags", { method: "POST", ...json(payload) });
}

export function updateTag(
  name: string,
  payload: { name?: string; kind?: TagKind },
): Promise<Tag> {
  return request<Tag>(`/tags/${encodeURIComponent(name)}`, {
    method: "PATCH",
    ...json(payload),
  });
}

export function deleteTag(name: string): Promise<void> {
  return request<void>(`/tags/${encodeURIComponent(name)}`, { method: "DELETE" });
}

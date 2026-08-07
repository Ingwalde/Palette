import { request } from "../lib/http";
import type { Tag } from "../types/api";

export function listTags(): Promise<Tag[]> {
  return request<Tag[]>("/tags");
}

import { request as apiRequest } from "./httpClient.js";

// Full tag catalog: [{ name, kind, count }]. Public (used for palette-form suggestions).
export function getTagCatalog() {
  return apiRequest("/tags");
}

export function createTag(payload) {
  return apiRequest("/tags", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateTag(name, payload) {
  return apiRequest(`/tags/${encodeURIComponent(name)}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function deleteTag(name) {
  return apiRequest(`/tags/${encodeURIComponent(name)}`, {
    method: "DELETE"
  });
}

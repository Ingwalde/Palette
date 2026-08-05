import { getAccessToken } from "../utils/authStorage.js";
import { request as apiRequest } from "./httpClient.js";

function getAuthHeaders() {
  const token = getAccessToken();

  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Full tag catalog: [{ name, kind, count }]. Public (used for palette-form suggestions).
export function getTagCatalog() {
  return apiRequest("/tags");
}

export function createTag(payload) {
  return apiRequest("/tags", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
}

export function updateTag(name, payload) {
  return apiRequest(`/tags/${encodeURIComponent(name)}`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
}

export function deleteTag(name) {
  return apiRequest(`/tags/${encodeURIComponent(name)}`, {
    method: "DELETE",
    headers: getAuthHeaders()
  });
}

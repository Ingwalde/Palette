import { getAccessToken } from "../utils/authStorage.js";
import { request as apiRequest } from "./httpClient.js";

function getAuthHeaders() {
  const token = getAccessToken();

  return token
    ? { Authorization: `Bearer ${token}` }
    : {};
}

export function buildPaletteQuery(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value && value !== "all" && value !== "default") {
      query.set(key, value);
    }
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

export function getPalettes(params = {}) {
  return apiRequest(`/palettes${buildPaletteQuery(params)}`);
}

export function getTags() {
  return apiRequest("/palettes/tags");
}

export function createPalette(payload) {
  return apiRequest("/palettes", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
}

export function updatePalette(id, payload) {
  return apiRequest(`/palettes/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
}

export function deletePalette(id) {
  return apiRequest(`/palettes/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders()
  });
}

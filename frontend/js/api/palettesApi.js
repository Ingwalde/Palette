import { request as apiRequest } from "./httpClient.js";

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

export async function getPalettes(params = {}) {
  // The list endpoint returns a paginated envelope { items, total, limit, offset };
  // callers only need the items array.
  const data = await apiRequest(`/palettes${buildPaletteQuery(params)}`);
  return data.items;
}

export function getPalettesPage(params = {}) {
  // Returns the full paginated envelope { items, total, limit, offset } — used by the admin
  // list, which needs the total for pagination.
  return apiRequest(`/palettes${buildPaletteQuery(params)}`);
}

export function getTags() {
  return apiRequest("/palettes/tags");
}

export function createPalette(payload) {
  return apiRequest("/palettes", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updatePalette(id, payload) {
  return apiRequest(`/palettes/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function deletePalette(id) {
  return apiRequest(`/palettes/${id}`, {
    method: "DELETE"
  });
}

const API_BASE_URL = "http://localhost:8000/api";
const ADMIN_TOKEN_KEY = "palette:admin-token";

async function apiRequest(endpoint, options = {}) {
  const { headers = {}, ...requestOptions } = options;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...requestOptions,
    headers: {
      "Content-Type": "application/json",
      ...headers
    }
  });

  if (!response.ok) {
    let message = `API request failed with status ${response.status}`;

    try {
      const errorData = await response.json();
      message = errorData.detail || message;
    } catch {
      // Keep the default message if the response is not JSON.
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function getAdminHeaders() {
  const token = sessionStorage.getItem(ADMIN_TOKEN_KEY);

  return {
    "X-Admin-Token": token || ""
  };
}

export function saveAdminToken(token) {
  sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function getAdminToken() {
  return sessionStorage.getItem(ADMIN_TOKEN_KEY);
}

export function clearAdminToken() {
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
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

export function getPalette(slug) {
  return apiRequest(`/palettes/${slug}`);
}

export function getTags() {
  return apiRequest("/palettes/tags");
}

export function createPalette(payload) {
  return apiRequest("/palettes", {
    method: "POST",
    headers: getAdminHeaders(),
    body: JSON.stringify(payload)
  });
}

export function updatePalette(id, payload) {
  return apiRequest(`/palettes/${id}`, {
    method: "PUT",
    headers: getAdminHeaders(),
    body: JSON.stringify(payload)
  });
}

export function deletePalette(id) {
  return apiRequest(`/palettes/${id}`, {
    method: "DELETE",
    headers: getAdminHeaders()
  });
}

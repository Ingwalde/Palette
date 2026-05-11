import { getAccessToken } from "../utils/authStorage.js";

const API_BASE_URL = "http://localhost:8000/api";

let favoriteKeysCache = null;

async function apiRequest(endpoint, options = {}) {
  const token = getAccessToken();

  if (!token) {
    throw new Error("Log in to use favorites");
  }

  const { headers = {}, ...requestOptions } = options;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...requestOptions,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...headers
    }
  });

  if (!response.ok) {
    let message = `API request failed with status ${response.status}`;

    try {
      const errorData = await response.json();
      message = formatApiError(errorData.detail) || message;
    } catch {
      // Keep the default message if the response is not JSON.
    }

    if (response.status === 401) {
      message = "Log in again to use favorites";
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function getFavoritePalettes() {
  return apiRequest("/favorites");
}

export async function getFavoriteKeys({ forceRefresh = false } = {}) {
  if (favoriteKeysCache && !forceRefresh) {
    return favoriteKeysCache;
  }

  favoriteKeysCache = await apiRequest("/favorites/keys");
  return favoriteKeysCache;
}

export async function isFavoritePalette(slug) {
  const favoriteKeys = await getFavoriteKeys();
  return favoriteKeys.includes(slug);
}

export async function addFavorite(slug) {
  const palette = await apiRequest(`/favorites/${encodeURIComponent(slug)}`, {
    method: "POST"
  });

  favoriteKeysCache = null;
  await getFavoriteKeys({ forceRefresh: true });
  return palette;
}

export async function removeFavorite(slug) {
  await apiRequest(`/favorites/${encodeURIComponent(slug)}`, {
    method: "DELETE"
  });

  favoriteKeysCache = null;
}

export async function clearFavoritePalettes() {
  const result = await apiRequest("/favorites", {
    method: "DELETE"
  });

  favoriteKeysCache = [];
  return result;
}

export function resetFavoritesCache() {
  favoriteKeysCache = null;
}

function formatApiError(detail) {
  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => item?.msg || JSON.stringify(item))
      .filter(Boolean)
      .join("; ");
  }

  if (detail && typeof detail === "object") {
    return detail.message || JSON.stringify(detail);
  }

  return "";
}

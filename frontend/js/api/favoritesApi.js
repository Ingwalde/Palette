import { getAccessToken } from "../utils/authStorage.js";
import { request } from "./httpClient.js";

let favoriteKeysCache = null;

// Favorites always require a logged-in user; inject the token and give a friendlier
// message on auth failure. The rest is the shared JSON request helper.
async function apiRequest(endpoint, options = {}) {
  const token = getAccessToken();

  if (!token) {
    throw new Error("Log in to use favorites");
  }

  try {
    return await request(endpoint, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.headers || {})
      }
    });
  } catch (error) {
    if (error.status === 401) {
      // Preserve the status so callers can distinguish an expired session from a
      // backend outage, while still surfacing a friendly message.
      const authError = new Error("Log in again to use favorites");
      authError.status = 401;
      throw authError;
    }
    throw error;
  }
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


const FAVORITES_KEY = "palette:favorites";

export function getFavoriteKeys() {
  try {
    const saved = JSON.parse(localStorage.getItem(FAVORITES_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    console.warn("Favorites could not be parsed from localStorage", error);
    return [];
  }
}

export function setFavoriteKeys(keys) {
  const uniqueKeys = [...new Set(keys)];
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(uniqueKeys));
  return uniqueKeys;
}

export function isFavorite(key) {
  return getFavoriteKeys().includes(key);
}

export function toggleFavorite(key) {
  const favorites = getFavoriteKeys();
  const exists = favorites.includes(key);

  const nextFavorites = exists
    ? favorites.filter((favoriteKey) => favoriteKey !== key)
    : [...favorites, key];

  setFavoriteKeys(nextFavorites);

  return {
    isFavorite: !exists,
    favorites: nextFavorites
  };
}

export function clearFavorites() {
  localStorage.removeItem(FAVORITES_KEY);
}

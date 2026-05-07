const FAVORITES_KEY = "palette:favorites";

export function getFavoriteIds() {
  try {
    const saved = JSON.parse(localStorage.getItem(FAVORITES_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    console.warn("Favorites could not be parsed from localStorage", error);
    return [];
  }
}

export function setFavoriteIds(ids) {
  const uniqueIds = [...new Set(ids)];
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(uniqueIds));
  return uniqueIds;
}

export function isFavorite(id) {
  return getFavoriteIds().includes(id);
}

export function toggleFavorite(id) {
  const favorites = getFavoriteIds();
  const exists = favorites.includes(id);

  const nextFavorites = exists
    ? favorites.filter((favoriteId) => favoriteId !== id)
    : [...favorites, id];

  setFavoriteIds(nextFavorites);

  return {
    isFavorite: !exists,
    favorites: nextFavorites
  };
}

export function clearFavorites() {
  localStorage.removeItem(FAVORITES_KEY);
}

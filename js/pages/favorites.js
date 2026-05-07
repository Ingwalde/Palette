import { palettes } from "../data/palettes.js";
import { createPaletteCard } from "../components/paletteCard.js";
import { createEmptyState } from "../components/emptyState.js";
import { clearElement, qs } from "../utils/dom.js";
import { clearFavorites, getFavoriteIds } from "../utils/storage.js";
import { showToast } from "../utils/toast.js";

const elements = {
  grid: qs("#favoritesGrid"),
  favoriteCount: qs("#favoriteCount"),
  clearButton: qs("#clearFavoritesBtn")
};

initFavoritesPage();

function initFavoritesPage() {
  renderFavorites();

  elements.clearButton.addEventListener("click", () => {
    clearFavorites();
    showToast("Favorites cleared");
    renderFavorites();
  });
}

function renderFavorites() {
  const favoritePalettes = getFavoritePalettes();

  clearElement(elements.grid);
  elements.favoriteCount.textContent = `${favoritePalettes.length} saved palette${favoritePalettes.length === 1 ? "" : "s"}`;
  elements.clearButton.disabled = favoritePalettes.length === 0;

  if (favoritePalettes.length === 0) {
    elements.grid.append(createEmptyState("No favorites yet", "Go to the home page and save your first palette."));
    return;
  }

  favoritePalettes.forEach((palette) => {
    elements.grid.append(createPaletteCard(palette, { onFavoriteChange: renderFavorites }));
  });
}

function getFavoritePalettes() {
  const favoriteIds = getFavoriteIds();
  return palettes.filter((palette) => favoriteIds.includes(palette.id));
}

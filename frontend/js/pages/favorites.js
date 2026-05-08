import { getPalettes } from "../api/palettesApi.js";
import { createPaletteCard, getPaletteFavoriteKey } from "../components/paletteCard.js";
import { createEmptyState } from "../components/emptyState.js";
import { clearElement, qs } from "../utils/dom.js";
import { clearFavorites, getFavoriteKeys } from "../utils/storage.js";
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

async function renderFavorites() {
  clearElement(elements.grid);
  elements.favoriteCount.textContent = "Loading...";
  elements.grid.append(createEmptyState("Loading favorites", "The frontend is loading palettes from the backend API."));

  try {
    const allPalettes = await getPalettes();
    const favoriteKeys = getFavoriteKeys();
    const favoritePalettes = allPalettes.filter((palette) => favoriteKeys.includes(getPaletteFavoriteKey(palette)));

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
  } catch (error) {
    clearElement(elements.grid);
    elements.favoriteCount.textContent = "API error";
    elements.clearButton.disabled = true;
    elements.grid.append(createEmptyState(
      "Backend is not available",
      "Start FastAPI with: uvicorn app.main:app --reload"
    ));
    showToast(error.message, "error");
  }
}

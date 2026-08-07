import { createPaletteCard } from "../components/paletteCard.js";
import { createEmptyState } from "../components/emptyState.js";
import { clearElement, qs } from "../utils/dom.js";
import { getStoredUser } from "../utils/authStorage.js";
import { clearFavoritePalettes, getFavoritePalettes } from "../api/favoritesApi.js";
import { showToast } from "../utils/toast.js";

const elements = {
  grid: qs("#favoritesGrid"),
  favoriteCount: qs("#favoriteCount"),
  clearButton: qs("#clearFavoritesBtn")
};

initFavoritesPage();

function initFavoritesPage() {
  renderFavorites();

  elements.clearButton.addEventListener("click", async () => {
    await handleClearFavorites();
  });
}

async function renderFavorites() {
  clearElement(elements.grid);

  if (!getStoredUser()) {
    elements.favoriteCount.textContent = "Login required";
    elements.clearButton.disabled = true;
    elements.grid.append(createEmptyState(
      "Log in to view favorites",
      "Favorites are now connected to your account. Log in to save and view your palettes."
    ));
    return;
  }

  elements.favoriteCount.textContent = "Loading...";
  elements.clearButton.disabled = true;
  elements.grid.append(createEmptyState("Loading favorites", "The app is loading your saved palettes from the backend API."));

  try {
    const favoritePalettes = await getFavoritePalettes();

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
    elements.clearButton.disabled = true;

    if (error.status === 401 || error.status === 403) {
      // The access token expired and the refresh token is gone/rejected, so the client
      // has already been logged out. Ask the user to sign in again instead of blaming
      // the backend.
      elements.favoriteCount.textContent = "Login required";
      elements.grid.append(createEmptyState(
        "Please log in again",
        "Your session has expired. Log in again to view and manage your saved palettes.",
        { label: "Log in", href: "login.html" }
      ));
      showToast("Session expired — please log in again", "error");
      return;
    }

    elements.favoriteCount.textContent = "API error";
    elements.grid.append(createEmptyState(
      "Favorites are not available",
      "We couldn't reach the server just now. Check your connection and try again."
    ));
    showToast(error.message, "error");
  }
}

async function handleClearFavorites() {
  if (!getStoredUser()) {
    showToast("Log in to clear favorites", "error");
    return;
  }

  elements.clearButton.disabled = true;

  try {
    await clearFavoritePalettes();
    showToast("Favorites cleared");
    await renderFavorites();
  } catch (error) {
    showToast(error.message, "error");
    elements.clearButton.disabled = false;
  }
}

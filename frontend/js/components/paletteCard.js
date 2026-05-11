import { createElement } from "../utils/dom.js";
import { copyToClipboard, getPaletteContrastStatus } from "../utils/color.js";
import { getAccessToken } from "../utils/authStorage.js";
import { addFavorite, isFavoritePalette, removeFavorite } from "../api/favoritesApi.js";
import { showToast } from "../utils/toast.js";

export function getPaletteFavoriteKey(palette) {
  return palette.slug || String(palette.id);
}

export function createPaletteCard(palette, options = {}) {
  const favoriteKey = getPaletteFavoriteKey(palette);
  const card = createElement("article", {
    className: "palette-card",
    attrs: {
      "data-palette-id": favoriteKey
    }
  });

  const header = createElement("div", { className: "palette-card__header" });
  const titleBlock = createElement("div");
  const title = createElement("h3", {
    className: "palette-card__title",
    text: palette.name
  });
  const meta = createElement("p", {
    className: "palette-card__meta",
    text: palette.description
  });

  const favoriteButton = createFavoriteButton(favoriteKey, options.onFavoriteChange);

  titleBlock.append(title, meta);
  header.append(titleBlock, favoriteButton);

  const colors = createElement("div", {
    className: "palette-card__colors",
    attrs: {
      "aria-label": `${palette.name} colors`
    }
  });

  palette.colors.forEach((color) => {
    const swatch = createElement("button", {
      className: "color-swatch",
      attrs: {
        type: "button",
        style: `--swatch-color: ${color}`,
        "data-color": color,
        "aria-label": `Copy ${color}`
      }
    });

    swatch.addEventListener("click", async () => {
      await copyToClipboard(color);
      showToast(`${color} copied`);
    });

    colors.append(swatch);
  });

  const tags = createElement("div", { className: "palette-card__tags" });
  palette.tags.forEach((tag) => {
    tags.append(createElement("span", { className: "tag", text: `#${tag}` }));
  });

  const footer = createElement("div", { className: "palette-card__footer" });
  const contrast = getPaletteContrastStatus(palette.colors);
  const contrastBadge = createElement("span", {
    className: "contrast-badge",
    text: `${contrast.label} · ${contrast.ratio}:1`
  });

  const copyPaletteButton = createElement("button", {
    className: "button button--ghost",
    text: "Copy name",
    attrs: {
      type: "button"
    }
  });

  copyPaletteButton.addEventListener("click", async () => {
    await copyToClipboard(palette.name);
    showToast(`Palette name copied: ${palette.name}`);
  });

  footer.append(contrastBadge, copyPaletteButton);
  card.append(header, colors, tags, footer);

  return card;
}

function createFavoriteButton(favoriteKey, onFavoriteChange) {
  const button = createElement("button", {
    className: "button button--ghost",
    attrs: {
      type: "button",
      "aria-label": "Toggle favorite"
    }
  });

  const setButtonState = (saved) => {
    button.textContent = saved ? "♥ Saved" : "♡ Save";
    button.classList.toggle("button--saved", saved);
  };

  const refreshFavoriteState = async () => {
    if (!getAccessToken()) {
      setButtonState(false);
      return;
    }

    try {
      const saved = await isFavoritePalette(favoriteKey);
      setButtonState(saved);
    } catch {
      setButtonState(false);
    }
  };

  setButtonState(false);
  refreshFavoriteState();

  button.addEventListener("click", async () => {
    if (!getAccessToken()) {
      showToast("Log in to save favorites");
      return;
    }

    button.disabled = true;

    try {
      const saved = await isFavoritePalette(favoriteKey);

      if (saved) {
        await removeFavorite(favoriteKey);
        setButtonState(false);
        showToast("Removed from favorites");
      } else {
        await addFavorite(favoriteKey);
        setButtonState(true);
        showToast("Added to favorites");
      }

      if (typeof onFavoriteChange === "function") {
        onFavoriteChange();
      }
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      button.disabled = false;
    }
  });

  return button;
}

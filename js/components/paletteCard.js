import { createElement } from "../utils/dom.js";
import { copyToClipboard, getPaletteContrastStatus } from "../utils/color.js";
import { isFavorite, toggleFavorite } from "../utils/storage.js";
import { showToast } from "../utils/toast.js";

export function createPaletteCard(palette, options = {}) {
  const card = createElement("article", {
    className: "palette-card",
    attrs: {
      "data-palette-id": palette.id
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

  const favoriteButton = createFavoriteButton(palette.id, options.onFavoriteChange);

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
    text: "Copy palette",
    attrs: {
      type: "button"
    }
  });

  copyPaletteButton.addEventListener("click", async () => {
    await copyToClipboard(palette.colors.join(", "));
    showToast(`${palette.name} copied`);
  });

  footer.append(contrastBadge, copyPaletteButton);
  card.append(header, colors, tags, footer);

  return card;
}

function createFavoriteButton(paletteId, onFavoriteChange) {
  const button = createElement("button", {
    className: "button button--ghost",
    attrs: {
      type: "button",
      "aria-label": "Toggle favorite"
    }
  });

  const updateButton = () => {
    const saved = isFavorite(paletteId);
    button.textContent = saved ? "♥ Saved" : "♡ Save";
    button.classList.toggle("button--saved", saved);
  };

  updateButton();

  button.addEventListener("click", () => {
    const result = toggleFavorite(paletteId);
    updateButton();
    showToast(result.isFavorite ? "Added to favorites" : "Removed from favorites");

    if (typeof onFavoriteChange === "function") {
      onFavoriteChange(result);
    }
  });

  return button;
}

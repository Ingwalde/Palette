import { palettes, getAllTags } from "../data/palettes.js";
import { createPaletteCard } from "../components/paletteCard.js";
import { createEmptyState } from "../components/emptyState.js";
import { clearElement, createElement, qs, qsa } from "../utils/dom.js";

const state = {
  search: "",
  tag: "all",
  sort: "default"
};

const elements = {
  grid: qs("#paletteGrid"),
  searchInput: qs("#searchInput"),
  sortSelect: qs("#sortSelect"),
  tagFilters: qs("#tagFilters"),
  resultCount: qs("#resultCount"),
  randomPaletteBtn: qs("#randomPaletteBtn")
};

initHomePage();

function initHomePage() {
  renderTagFilters();
  bindEvents();
  renderPalettes();
}

function bindEvents() {
  elements.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value.trim().toLowerCase();
    renderPalettes();
  });

  elements.sortSelect.addEventListener("change", (event) => {
    state.sort = event.target.value;
    renderPalettes();
  });

  elements.randomPaletteBtn.addEventListener("click", () => {
    const randomPalette = palettes[Math.floor(Math.random() * palettes.length)];
    state.search = randomPalette.name.toLowerCase();
    state.tag = "all";
    state.sort = "default";

    elements.searchInput.value = randomPalette.name;
    elements.sortSelect.value = "default";
    updateActiveTagButton();
    renderPalettes();
    qs("#palettes")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function renderTagFilters() {
  clearElement(elements.tagFilters);

  getAllTags().forEach((tag) => {
    const button = createElement("button", {
      className: `tag-button${tag === state.tag ? " tag-button--active" : ""}`,
      text: tag === "all" ? "All" : `#${tag}`,
      attrs: {
        type: "button",
        "data-tag": tag
      }
    });

    button.addEventListener("click", () => {
      state.tag = tag;
      updateActiveTagButton();
      renderPalettes();
    });

    elements.tagFilters.append(button);
  });
}

function updateActiveTagButton() {
  qsa(".tag-button", elements.tagFilters).forEach((button) => {
    button.classList.toggle("tag-button--active", button.dataset.tag === state.tag);
  });
}

function renderPalettes() {
  const filteredPalettes = getFilteredPalettes();

  clearElement(elements.grid);
  elements.resultCount.textContent = `${filteredPalettes.length} palette${filteredPalettes.length === 1 ? "" : "s"}`;

  if (filteredPalettes.length === 0) {
    elements.grid.append(createEmptyState("No palettes found", "Try another name, tag or filter."));
    return;
  }

  filteredPalettes.forEach((palette) => {
    elements.grid.append(createPaletteCard(palette));
  });
}

function getFilteredPalettes() {
  const filtered = palettes.filter((palette) => {
    const searchTarget = [palette.name, palette.description, ...palette.tags]
      .join(" ")
      .toLowerCase();

    const matchesSearch = state.search === "" || searchTarget.includes(state.search);
    const matchesTag = state.tag === "all" || palette.tags.includes(state.tag);

    return matchesSearch && matchesTag;
  });

  return sortPalettes(filtered);
}

function sortPalettes(items) {
  const sorted = [...items];

  if (state.sort === "az") {
    return sorted.sort((a, b) => a.name.localeCompare(b.name));
  }

  if (state.sort === "za") {
    return sorted.sort((a, b) => b.name.localeCompare(a.name));
  }

  return sorted;
}

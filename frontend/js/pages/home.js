import { getPalettes, getTags } from "../api/palettesApi.js";
import { createPaletteCard } from "../components/paletteCard.js";
import { createEmptyState } from "../components/emptyState.js";
import { clearElement, createElement, qs, qsa } from "../utils/dom.js";
import { showToast } from "../utils/toast.js";
import { initCustomSelects, syncCustomSelect } from "../utils/customSelect.js";

const state = {
  search: "",
  tag: "all",
  sort: "default",
  allPalettes: []
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

async function initHomePage() {
  initCustomSelects();
  bindEvents();
  await renderTagFilters();
  await renderPalettes();
}

function bindEvents() {
  elements.searchInput.addEventListener("input", debounce((event) => {
    state.search = event.target.value.trim().toLowerCase();
    renderPalettes();
  }, 250));

  elements.sortSelect.addEventListener("change", (event) => {
    state.sort = event.target.value;
    renderPalettes();
  });

  elements.randomPaletteBtn.addEventListener("click", async () => {
    try {
      const palettes = state.allPalettes.length > 0 ? state.allPalettes : await getPalettes();
      const randomPalette = palettes[Math.floor(Math.random() * palettes.length)];

      if (!randomPalette) return;

      state.search = randomPalette.name.toLowerCase();
      state.tag = "all";
      state.sort = "default";

      elements.searchInput.value = randomPalette.name;
      elements.sortSelect.value = "default";
      syncCustomSelect(elements.sortSelect);
      updateActiveTagButton();
      await renderPalettes();
      qs("#palettes")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      showToast(error.message, "error");
    }
  });
}

async function renderTagFilters() {
  clearElement(elements.tagFilters);

  try {
    const tags = await getTags();
    ["all", ...tags].forEach((tag) => {
      const button = createElement("button", {
        className: `tag-button${tag === state.tag ? " tag-button--active" : ""}`,
        text: tag === "all" ? "All" : `#${tag}`,
        attrs: {
          type: "button",
          "data-tag": tag
        }
      });

      button.addEventListener("click", async () => {
        state.tag = tag;
        updateActiveTagButton();
        await renderPalettes();
      });

      elements.tagFilters.append(button);
    });
  } catch (error) {
    elements.tagFilters.append(createElement("span", {
      className: "muted",
      text: "Tags could not be loaded. Start the backend server and refresh the page."
    }));
    showToast(error.message, "error");
  }
}

function updateActiveTagButton() {
  qsa(".tag-button", elements.tagFilters).forEach((button) => {
    button.classList.toggle("tag-button--active", button.dataset.tag === state.tag);
  });
}

async function renderPalettes() {
  clearElement(elements.grid);
  elements.resultCount.textContent = "Loading...";
  elements.grid.append(createEmptyState("Loading palettes", "The frontend is requesting data from the backend API."));

  try {
    const palettes = await getPalettes({
      search: state.search,
      tag: state.tag,
      sort: state.sort
    });

    if (!state.search && state.tag === "all") {
      state.allPalettes = palettes;
    }

    clearElement(elements.grid);
    elements.resultCount.textContent = `${palettes.length} palette${palettes.length === 1 ? "" : "s"}`;

    if (palettes.length === 0) {
      elements.grid.append(createEmptyState("No palettes found", "Try another name, tag or filter."));
      return;
    }

    palettes.forEach((palette) => {
      elements.grid.append(createPaletteCard(palette));
    });
  } catch (error) {
    clearElement(elements.grid);
    elements.resultCount.textContent = "API error";
    elements.grid.append(createEmptyState(
      "Backend is not available",
      "Start FastAPI with: uvicorn app.main:app --reload"
    ));
    showToast(error.message, "error");
  }
}

function debounce(callback, delay = 250) {
  let timeoutId;

  return (...args) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => callback(...args), delay);
  };
}

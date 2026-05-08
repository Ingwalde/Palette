import {
  clearAdminToken,
  createPalette,
  deletePalette,
  getAdminToken,
  getPalettes,
  saveAdminToken,
  updatePalette
} from "../api/palettesApi.js";
import { createEmptyState } from "../components/emptyState.js";
import { parseCommaSeparatedList } from "../utils/color.js";
import { clearElement, createElement, qs } from "../utils/dom.js";
import { showToast } from "../utils/toast.js";

const elements = {
  adminAccess: qs("#adminAccess"),
  adminPanel: qs("#adminPanel"),
  adminTokenInput: qs("#adminTokenInput"),
  unlockAdminButton: qs("#unlockAdminBtn"),
  lockAdminButton: qs("#lockAdminBtn"),
  form: qs("#paletteForm"),
  formTitle: qs("#formTitle"),
  paletteId: qs("#paletteId"),
  nameInput: qs("#nameInput"),
  descriptionInput: qs("#descriptionInput"),
  colorsInput: qs("#colorsInput"),
  tagsInput: qs("#tagsInput"),
  submitButton: qs("#submitButton"),
  cancelEditButton: qs("#cancelEditButton"),
  adminItems: qs("#adminItems"),
  adminCount: qs("#adminCount")
};

initAdminPage();

function initAdminPage() {
  bindEvents();

  if (getAdminToken()) {
    unlockAdminPanel({ shouldRender: true });
  } else {
    lockAdminPanel({ showMessage: false });
  }
}

function bindEvents() {
  elements.unlockAdminButton.addEventListener("click", () => {
    const token = elements.adminTokenInput.value.trim();

    if (!token) {
      showToast("Enter admin token", "error");
      return;
    }

    saveAdminToken(token);
    unlockAdminPanel({ shouldRender: true });
    showToast("Admin panel unlocked");
  });

  elements.adminTokenInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      elements.unlockAdminButton.click();
    }
  });

  elements.lockAdminButton.addEventListener("click", () => {
    clearAdminToken();
    resetForm();
    lockAdminPanel({ showMessage: true });
  });

  elements.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await savePalette();
  });

  elements.cancelEditButton.addEventListener("click", resetForm);
}

function unlockAdminPanel({ shouldRender = false } = {}) {
  elements.adminAccess.classList.add("hidden");
  elements.adminPanel.classList.remove("hidden");

  if (shouldRender) {
    renderAdminList();
  }
}

function lockAdminPanel({ showMessage = true } = {}) {
  elements.adminAccess.classList.remove("hidden");
  elements.adminPanel.classList.add("hidden");
  elements.adminTokenInput.value = "";

  if (showMessage) {
    showToast("Admin panel locked");
  }
}

async function savePalette() {
  const payload = {
    name: elements.nameInput.value.trim(),
    description: elements.descriptionInput.value.trim(),
    colors: parseCommaSeparatedList(elements.colorsInput.value),
    tags: parseCommaSeparatedList(elements.tagsInput.value).map((tag) => tag.toLowerCase())
  };

  const editingId = elements.paletteId.value;

  try {
    if (editingId) {
      await updatePalette(editingId, payload);
      showToast("Palette updated");
    } else {
      await createPalette(payload);
      showToast("Palette created");
    }

    resetForm();
    await renderAdminList();
  } catch (error) {
    handleAdminError(error);
  }
}

async function renderAdminList() {
  clearElement(elements.adminItems);
  elements.adminCount.textContent = "Loading...";
  elements.adminItems.append(createEmptyState("Loading palettes", "The admin panel is requesting database data."));

  try {
    const palettes = await getPalettes({ sort: "az" });

    clearElement(elements.adminItems);
    elements.adminCount.textContent = `${palettes.length} palette${palettes.length === 1 ? "" : "s"}`;

    if (palettes.length === 0) {
      elements.adminItems.append(createEmptyState("No palettes in database", "Create your first palette using the form."));
      return;
    }

    palettes.forEach((palette) => {
      elements.adminItems.append(createAdminItem(palette));
    });
  } catch (error) {
    clearElement(elements.adminItems);
    elements.adminCount.textContent = "API error";
    elements.adminItems.append(createEmptyState(
      "Backend is not available",
      "Start FastAPI with: uvicorn app.main:app --reload"
    ));
    showToast(error.message, "error");
  }
}

function createAdminItem(palette) {
  const item = createElement("article", { className: "admin-item" });

  const top = createElement("div", { className: "admin-item__top" });
  const titleBlock = createElement("div");
  const title = createElement("h3", { className: "admin-item__title", text: palette.name });
  const slug = createElement("p", { className: "admin-item__slug", text: `/${palette.slug}` });
  titleBlock.append(title, slug);

  const actions = createElement("div", { className: "admin-item__actions" });
  const editButton = createElement("button", {
    className: "button button--ghost",
    text: "Edit",
    attrs: { type: "button" }
  });
  const deleteButton = createElement("button", {
    className: "button button--danger",
    text: "Delete",
    attrs: { type: "button" }
  });

  editButton.addEventListener("click", () => fillForm(palette));
  deleteButton.addEventListener("click", async () => {
    await removePalette(palette.id);
  });

  actions.append(editButton, deleteButton);
  top.append(titleBlock, actions);

  const swatches = createElement("div", { className: "admin-swatches" });
  palette.colors.forEach((color) => {
    swatches.append(createElement("span", {
      attrs: {
        style: `--swatch-color: ${color}`,
        title: color
      }
    }));
  });

  const tags = createElement("div", { className: "palette-card__tags" });
  palette.tags.forEach((tag) => {
    tags.append(createElement("span", { className: "tag", text: `#${tag}` }));
  });

  item.append(top, swatches, tags);
  return item;
}

function fillForm(palette) {
  elements.paletteId.value = palette.id;
  elements.nameInput.value = palette.name;
  elements.descriptionInput.value = palette.description;
  elements.colorsInput.value = palette.colors.join(", ");
  elements.tagsInput.value = palette.tags.join(", ");
  elements.formTitle.textContent = "Edit palette";
  elements.submitButton.textContent = "Update palette";
  elements.cancelEditButton.hidden = false;
  elements.form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetForm() {
  elements.form.reset();
  elements.paletteId.value = "";
  elements.formTitle.textContent = "Add palette";
  elements.submitButton.textContent = "Create palette";
  elements.cancelEditButton.hidden = true;
}

async function removePalette(id) {
  try {
    await deletePalette(id);
    showToast("Palette deleted");
    await renderAdminList();
  } catch (error) {
    handleAdminError(error);
  }
}

function handleAdminError(error) {
  showToast(error.message, "error");

  if (error.message.toLowerCase().includes("admin token") || error.message.includes("401") || error.message.includes("403")) {
    clearAdminToken();
    lockAdminPanel({ showMessage: false });
    showToast("Admin token is invalid or missing", "error");
  }
}

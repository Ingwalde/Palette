import {
  createPalette,
  deletePalette,
  getPalettes,
  updatePalette
} from "../api/palettesApi.js";
import { createTag, deleteTag, getTagCatalog, updateTag } from "../api/tagsApi.js";
import { getCurrentUser } from "../api/authApi.js";
import { createBackendErrorState, createEmptyState } from "../components/emptyState.js";
import { clearElement, createElement, qs } from "../utils/dom.js";
import { clearAuth, getStoredUser } from "../utils/authStorage.js";
import { showToast } from "../utils/toast.js";

const elements = {
  adminAccess: qs("#adminAccess"),
  adminAccessTitle: qs("#adminAccessTitle"),
  adminAccessMessage: qs("#adminAccessMessage"),
  refreshAccessButton: qs("#refreshAccessBtn"),
  adminPanel: qs("#adminPanel"),
  adminUserInfo: qs("#adminUserInfo"),
  logoutAdminButton: qs("#logoutAdminBtn"),
  modePalettesButton: qs("#modePalettesBtn"),
  modeTagsButton: qs("#modeTagsBtn"),
  palettesView: qs("#palettesView"),
  tagsView: qs("#tagsView"),
  form: qs("#paletteForm"),
  formTitle: qs("#formTitle"),
  paletteId: qs("#paletteId"),
  nameInput: qs("#nameInput"),
  descriptionInput: qs("#descriptionInput"),
  colorEditor: qs("#colorEditor"),
  addColorBtn: qs("#addColorBtn"),
  tagEditor: qs("#tagEditor"),
  tagInput: qs("#tagInput"),
  tagSuggestions: qs("#tagSuggestions"),
  submitButton: qs("#submitButton"),
  cancelEditButton: qs("#cancelEditButton"),
  adminItems: qs("#adminItems"),
  adminCount: qs("#adminCount"),
  tagForm: qs("#tagForm"),
  newTagName: qs("#newTagName"),
  newTagKind: qs("#newTagKind"),
  tagItems: qs("#tagItems"),
  tagCount: qs("#tagCount")
};

const DEFAULT_COLOR = "#3f4e4f";
const MAX_COLORS = 8;
const MAX_TAGS = 12;

let tagCatalog = [];

initAdminPage();

function initAdminPage() {
  bindEvents();
  renderColors([]);
  checkAdminAccess();
}

function bindEvents() {
  elements.refreshAccessButton.addEventListener("click", checkAdminAccess);

  elements.logoutAdminButton.addEventListener("click", () => {
    clearAuth();
    resetForm();
    showAccessMessage("Login required", "You have been logged out. Login with an admin account to continue.");
    showToast("Logged out");
  });

  elements.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await savePalette();
  });

  elements.cancelEditButton.addEventListener("click", resetForm);
  elements.addColorBtn.addEventListener("click", () => addColorRow());

  // Tag chip editor on the palette form.
  elements.tagInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag(elements.tagInput.value);
      elements.tagInput.value = "";
    }
  });

  // Admin mode switch (Palettes / Tags).
  elements.modePalettesButton.addEventListener("click", () => switchMode("palettes"));
  elements.modeTagsButton.addEventListener("click", () => switchMode("tags"));

  // Tag catalog management.
  elements.tagForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await addTagFromForm();
  });
}

/* ------------------------------- Colour editor ------------------------------ */

function createColorRow(value = DEFAULT_COLOR) {
  const row = createElement("div", { className: "color-row" });
  const picker = createElement("input", {
    className: "color-row__picker",
    attrs: { type: "color", value }
  });
  const hex = createElement("input", {
    className: "input color-row__hex",
    attrs: { type: "text", value: value.toUpperCase(), maxlength: "7", "aria-label": "HEX color" }
  });
  const remove = createElement("button", {
    className: "button button--ghost color-row__remove",
    text: "✕",
    attrs: { type: "button", "aria-label": "Remove color" }
  });

  picker.addEventListener("input", () => {
    hex.value = picker.value.toUpperCase();
  });
  hex.addEventListener("input", () => {
    if (/^#[0-9a-fA-F]{6}$/.test(hex.value)) {
      picker.value = hex.value;
    }
  });
  remove.addEventListener("click", () => {
    if (elements.colorEditor.querySelectorAll(".color-row").length > 1) {
      row.remove();
      updateAddColorState();
    }
  });

  row.append(picker, hex, remove);
  return row;
}

function renderColors(colors) {
  clearElement(elements.colorEditor);
  const list = colors && colors.length ? colors : [DEFAULT_COLOR];
  list.slice(0, MAX_COLORS).forEach((color) => elements.colorEditor.append(createColorRow(color)));
  updateAddColorState();
}

function addColorRow(value = DEFAULT_COLOR) {
  if (elements.colorEditor.querySelectorAll(".color-row").length >= MAX_COLORS) {
    return;
  }
  elements.colorEditor.append(createColorRow(value));
  updateAddColorState();
}

function updateAddColorState() {
  const count = elements.colorEditor.querySelectorAll(".color-row").length;
  elements.addColorBtn.disabled = count >= MAX_COLORS;
}

function readColors() {
  return [...elements.colorEditor.querySelectorAll(".color-row__hex")]
    .map((input) => input.value.trim())
    .filter(Boolean);
}

/* -------------------------------- Tag chips --------------------------------- */

function normalizeTag(value) {
  return value.trim().toLowerCase().replace(/#/g, "");
}

function createTagChip(value) {
  const chip = createElement("span", {
    className: "tag-chip",
    text: value,
    attrs: { "data-value": value }
  });
  const remove = createElement("button", {
    className: "tag-chip__remove",
    text: "✕",
    attrs: { type: "button", "aria-label": `Remove ${value}` }
  });
  remove.addEventListener("click", () => chip.remove());
  chip.append(remove);
  return chip;
}

function addTag(raw) {
  const value = normalizeTag(raw);
  if (!value) {
    return;
  }

  const existing = readTags();
  if (existing.includes(value)) {
    return;
  }
  if (existing.length >= MAX_TAGS) {
    showToast(`Up to ${MAX_TAGS} tags per palette`, "error");
    return;
  }

  elements.tagEditor.append(createTagChip(value));
}

function renderTags(tags) {
  clearElement(elements.tagEditor);
  (tags || []).forEach((tag) => addTag(tag));
}

function readTags() {
  return [...elements.tagEditor.querySelectorAll(".tag-chip")]
    .map((chip) => chip.dataset.value)
    .filter(Boolean);
}

function populateTagSuggestions() {
  clearElement(elements.tagSuggestions);
  tagCatalog.forEach((tag) => {
    elements.tagSuggestions.append(createElement("option", { attrs: { value: tag.name } }));
  });
}

async function loadTagCatalog() {
  try {
    tagCatalog = await getTagCatalog();
    populateTagSuggestions();
  } catch {
    // Suggestions are a nice-to-have; ignore a catalog fetch failure here.
  }
}

/* ------------------------------- Mode switch -------------------------------- */

function switchMode(mode) {
  const tagsMode = mode === "tags";
  elements.palettesView.hidden = tagsMode;
  elements.tagsView.hidden = !tagsMode;
  elements.modePalettesButton.classList.toggle("admin-mode__btn--active", !tagsMode);
  elements.modeTagsButton.classList.toggle("admin-mode__btn--active", tagsMode);

  if (tagsMode) {
    renderTagList();
  }
}

/* ------------------------------ Admin access -------------------------------- */

async function checkAdminAccess() {
  const storedUser = getStoredUser();

  if (!storedUser) {
    showAccessMessage("Login required", "You need to login with an admin account to manage palettes.");
    return;
  }

  try {
    const user = await getCurrentUser();

    if (!user.is_admin) {
      showAccessMessage("Admin role required", `User ${user.username} is logged in, but this account does not have admin access.`);
      return;
    }

    showAdminPanel(user);
    await loadTagCatalog();
    await renderAdminList();
  } catch (error) {
    clearAuth();
    showAccessMessage("Session expired", "Login again to continue working with the admin panel.");
    showToast(error.message, "error");
  }
}

function showAdminPanel(user) {
  elements.adminAccess.classList.add("hidden");
  elements.adminPanel.classList.remove("hidden");
  elements.adminUserInfo.textContent = `Admin session · ${user.username}`;
}

function showAccessMessage(title, message) {
  elements.adminAccess.classList.remove("hidden");
  elements.adminPanel.classList.add("hidden");
  elements.adminAccessTitle.textContent = title;
  elements.adminAccessMessage.textContent = message;
}

/* ------------------------------ Palette CRUD -------------------------------- */

async function savePalette() {
  const payload = {
    name: elements.nameInput.value.trim(),
    description: elements.descriptionInput.value.trim(),
    colors: readColors(),
    tags: readTags()
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
    await loadTagCatalog();
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
    elements.adminItems.append(createBackendErrorState());
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

  item.append(top, swatches);
  return item;
}

function fillForm(palette) {
  elements.paletteId.value = palette.id;
  elements.nameInput.value = palette.name;
  elements.descriptionInput.value = palette.description;
  renderColors(palette.colors);
  renderTags(palette.tags);
  elements.formTitle.textContent = "Edit palette";
  elements.submitButton.textContent = "Update palette";
  elements.cancelEditButton.hidden = false;
  elements.nameInput.focus();
}

async function removePalette(id) {
  const confirmed = window.confirm("Delete this palette from the database?");

  if (!confirmed) {
    return;
  }

  try {
    await deletePalette(id);
    showToast("Palette deleted");
    await loadTagCatalog();
    await renderAdminList();
  } catch (error) {
    handleAdminError(error);
  }
}

function resetForm() {
  elements.form.reset();
  renderColors([]);
  renderTags([]);
  elements.tagInput.value = "";
  elements.paletteId.value = "";
  elements.formTitle.textContent = "Add palette";
  elements.submitButton.textContent = "Create palette";
  elements.cancelEditButton.hidden = true;
}

/* ---------------------------- Tag catalog CRUD ------------------------------ */

async function renderTagList() {
  clearElement(elements.tagItems);
  elements.tagCount.textContent = "Loading...";

  try {
    tagCatalog = await getTagCatalog();
    populateTagSuggestions();

    clearElement(elements.tagItems);
    elements.tagCount.textContent = `${tagCatalog.length} tag${tagCatalog.length === 1 ? "" : "s"}`;

    if (tagCatalog.length === 0) {
      elements.tagItems.append(createEmptyState("No tags yet", "Add your first tag using the form above."));
      return;
    }

    tagCatalog.forEach((tag) => {
      elements.tagItems.append(createTagItem(tag));
    });
  } catch (error) {
    clearElement(elements.tagItems);
    elements.tagCount.textContent = "API error";
    elements.tagItems.append(createBackendErrorState());
    showToast(error.message, "error");
  }
}

function createTagItem(tag) {
  const item = createElement("article", { className: "admin-item admin-item--tag" });

  const top = createElement("div", { className: "admin-item__top" });

  const info = createElement("div", { className: "tag-item__info" });
  const name = createElement("h3", { className: "admin-item__title", text: tag.name });
  const badge = createElement("span", {
    className: `tag-badge tag-badge--${tag.kind}`,
    text: tag.kind === "purpose" ? "Category" : "Tag"
  });
  const count = createElement("span", {
    className: "tag-item__count",
    text: `${tag.count} palette${tag.count === 1 ? "" : "s"}`
  });
  info.append(name, badge, count);

  const actions = createElement("div", { className: "admin-item__actions" });
  const toggleButton = createElement("button", {
    className: "button button--ghost",
    text: tag.kind === "purpose" ? "Make tag" : "Make category",
    attrs: { type: "button" }
  });
  const renameButton = createElement("button", {
    className: "button button--ghost",
    text: "Rename",
    attrs: { type: "button" }
  });
  const deleteButton = createElement("button", {
    className: "button button--danger",
    text: "Delete",
    attrs: { type: "button" }
  });

  toggleButton.addEventListener("click", () => toggleTagKind(tag));
  renameButton.addEventListener("click", () => renameTag(tag));
  deleteButton.addEventListener("click", () => removeTag(tag));

  actions.append(toggleButton, renameButton, deleteButton);
  top.append(info, actions);
  item.append(top);
  return item;
}

async function addTagFromForm() {
  const name = elements.newTagName.value.trim();
  const kind = elements.newTagKind.value;

  if (!name) {
    return;
  }

  try {
    await createTag({ name, kind });
    showToast("Tag added");
    elements.newTagName.value = "";
    await renderTagList();
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function toggleTagKind(tag) {
  const kind = tag.kind === "purpose" ? "free" : "purpose";

  try {
    await updateTag(tag.name, { kind });
    await renderTagList();
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function renameTag(tag) {
  const next = window.prompt(`Rename "${tag.name}" to:`, tag.name);

  if (next === null) {
    return;
  }

  const trimmed = next.trim();
  if (!trimmed || trimmed === tag.name) {
    return;
  }

  try {
    await updateTag(tag.name, { name: trimmed });
    showToast("Tag renamed");
    await renderTagList();
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function removeTag(tag) {
  const message = tag.count > 0
    ? `Delete "${tag.name}"? It will be removed from ${tag.count} palette${tag.count === 1 ? "" : "s"}.`
    : `Delete "${tag.name}"?`;

  if (!window.confirm(message)) {
    return;
  }

  try {
    await deleteTag(tag.name);
    showToast("Tag deleted");
    await renderTagList();
  } catch (error) {
    showToast(error.message, "error");
  }
}

function handleAdminError(error) {
  if (error.message.includes("401") || error.message.includes("credentials")) {
    clearAuth();
    showAccessMessage("Session expired", "Login again to continue working with the admin panel.");
  } else if (error.message.includes("403") || error.message.includes("Admin access")) {
    showAccessMessage("Admin role required", "This account does not have permission to manage palettes.");
  }

  showToast(error.message, "error");
}

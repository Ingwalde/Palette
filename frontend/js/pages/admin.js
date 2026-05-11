import {
  createPalette,
  deletePalette,
  getPalettes,
  updatePalette
} from "../api/palettesApi.js";
import { getCurrentUser } from "../api/authApi.js";
import { createEmptyState } from "../components/emptyState.js";
import { parseCommaSeparatedList } from "../utils/color.js";
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
}

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

  item.append(top, swatches);
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
    await renderAdminList();
  } catch (error) {
    handleAdminError(error);
  }
}

function resetForm() {
  elements.form.reset();
  elements.paletteId.value = "";
  elements.formTitle.textContent = "Add palette";
  elements.submitButton.textContent = "Create palette";
  elements.cancelEditButton.hidden = true;
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

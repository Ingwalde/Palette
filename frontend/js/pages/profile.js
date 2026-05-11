import { changePassword, getCurrentUser } from "../api/authApi.js";
import { clearAuth, getAccessToken, getStoredUser, saveAuth } from "../utils/authStorage.js";
import { qs } from "../utils/dom.js";
import { showToast } from "../utils/toast.js";

const elements = {
  avatar: qs("#accountAvatar"),
  username: qs("#accountUsername"),
  email: qs("#accountEmail"),
  logoutButton: qs("#logoutButton"),
  togglePasswordFormButton: qs("#togglePasswordFormButton"),
  cancelPasswordChangeButton: qs("#cancelPasswordChangeButton"),
  passwordForm: qs("#passwordForm"),
  currentPassword: qs("#currentPassword"),
  newPassword: qs("#newPassword"),
  confirmPassword: qs("#confirmPassword")
};

initProfilePage();

function initProfilePage() {
  if (!getAccessToken()) {
    window.location.href = "login.html";
    return;
  }

  elements.logoutButton.addEventListener("click", handleLogout);
  elements.togglePasswordFormButton.addEventListener("click", showPasswordForm);
  elements.cancelPasswordChangeButton.addEventListener("click", hidePasswordForm);
  elements.passwordForm.addEventListener("submit", handlePasswordChange);

  renderStoredUser();
  refreshUserFromBackend();
}

function renderStoredUser() {
  const user = getStoredUser();

  if (!user) {
    return;
  }

  renderUser(user);
}

async function refreshUserFromBackend() {
  try {
    const token = getAccessToken();
    const user = await getCurrentUser();
    saveAuth(token, user);
    renderUser(user);
  } catch (error) {
    clearAuth();
    showToast("Session expired. Please log in again.", "error");
    window.setTimeout(() => {
      window.location.href = "login.html";
    }, 600);
  }
}

function renderUser(user) {
  const initial = user.username?.charAt(0)?.toUpperCase() || "U";

  elements.avatar.textContent = initial;
  elements.username.textContent = user.username;
  elements.email.textContent = user.email;
}

function showPasswordForm() {
  elements.passwordForm.classList.remove("hidden");
  elements.togglePasswordFormButton.disabled = true;
  elements.currentPassword.focus();
}

function hidePasswordForm() {
  elements.passwordForm.reset();
  elements.passwordForm.classList.add("hidden");
  elements.togglePasswordFormButton.disabled = false;
}

async function handlePasswordChange(event) {
  event.preventDefault();

  const currentPassword = elements.currentPassword.value;
  const newPassword = elements.newPassword.value;
  const confirmPassword = elements.confirmPassword.value;

  if (newPassword !== confirmPassword) {
    showToast("New password confirmation does not match", "error");
    return;
  }

  if (currentPassword === newPassword) {
    showToast("New password must be different from current password", "error");
    return;
  }

  const submitButton = elements.passwordForm.querySelector('button[type="submit"]');

  try {
    setButtonLoading(submitButton, "Saving...");

    const user = await changePassword({
      current_password: currentPassword,
      new_password: newPassword,
      confirm_password: confirmPassword
    });

    saveAuth(getAccessToken(), user);
    hidePasswordForm();
    showToast("Password changed");
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    resetButton(submitButton, "Save new password");
  }
}

function handleLogout() {
  clearAuth();
  showToast("Logged out");

  window.setTimeout(() => {
    window.location.href = "index.html";
  }, 400);
}

function setButtonLoading(button, text) {
  if (!button) return;

  button.dataset.originalText = button.textContent;
  button.textContent = text;
  button.disabled = true;
}

function resetButton(button, fallbackText) {
  if (!button) return;

  button.textContent = button.dataset.originalText || fallbackText;
  button.disabled = false;
}

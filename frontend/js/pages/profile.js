import { changePassword, deleteAccount, getCurrentUser, resendVerification } from "../api/authApi.js";
import { clearAuth, getAccessToken, getStoredUser, saveAuth } from "../utils/authStorage.js";
import { qs, resetButton, setButtonLoading } from "../utils/dom.js";
import { showToast } from "../utils/toast.js";

const elements = {
  avatar: qs("#accountAvatar"),
  username: qs("#accountUsername"),
  email: qs("#accountEmail"),
  verifyBanner: qs("#verifyBanner"),
  resendVerificationButton: qs("#resendVerificationButton"),
  logoutButton: qs("#logoutButton"),
  togglePasswordFormButton: qs("#togglePasswordFormButton"),
  cancelPasswordChangeButton: qs("#cancelPasswordChangeButton"),
  passwordForm: qs("#passwordForm"),
  currentPassword: qs("#currentPassword"),
  newPassword: qs("#newPassword"),
  confirmPassword: qs("#confirmPassword"),
  deleteAccountButton: qs("#deleteAccountButton")
};

let currentEmail = "";

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
  elements.resendVerificationButton.addEventListener("click", handleResendVerification);
  elements.deleteAccountButton.addEventListener("click", handleDeleteAccount);

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

  currentEmail = user.email || "";
  elements.verifyBanner.classList.toggle("hidden", user.email_verified !== false);
}

async function handleResendVerification() {
  if (!currentEmail) {
    return;
  }

  const button = elements.resendVerificationButton;
  setButtonLoading(button, "Sending...");

  try {
    const result = await resendVerification(currentEmail);
    showToast(result.message);
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    resetButton(button, "Resend link");
  }
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

async function handleDeleteAccount() {
  const password = window.prompt(
    "Deleting your account is permanent and also removes your saved favorites.\n\n" +
      "Enter your password to confirm:"
  );

  if (!password) {
    return;
  }

  setButtonLoading(elements.deleteAccountButton, "Deleting...");

  try {
    await deleteAccount(password);
    clearAuth();
    showToast("Account deleted");
    window.setTimeout(() => {
      window.location.href = "index.html";
    }, 600);
  } catch (error) {
    showToast(error.message, "error");
    resetButton(elements.deleteAccountButton, "Delete account");
  }
}


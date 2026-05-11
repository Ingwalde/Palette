import { getCurrentUser, loginUser, registerUser } from "../api/authApi.js";
import { clearAuth, getAccessToken, saveAuth } from "../utils/authStorage.js";
import { qs } from "../utils/dom.js";
import { showToast } from "../utils/toast.js";

const elements = {
  loginForm: qs("#loginForm"),
  loginUsername: qs("#loginUsername"),
  loginPassword: qs("#loginPassword"),
  registerForm: qs("#registerForm"),
  registerUsername: qs("#registerUsername"),
  registerEmail: qs("#registerEmail"),
  registerPassword: qs("#registerPassword")
};

initLoginPage();

function initLoginPage() {
  bindEvents();
  refreshCurrentUser();
}

function bindEvents() {
  elements.loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await handleLogin();
  });

  elements.registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await handleRegister();
  });
}

async function handleLogin() {
  const submitButton = elements.loginForm.querySelector('button[type="submit"]');

  try {
    setButtonLoading(submitButton, "Logging in...");

    const result = await loginUser({
      username: elements.loginUsername.value.trim(),
      password: elements.loginPassword.value
    });

    saveAuth(result.access_token, result.user);
    elements.loginPassword.value = "";
    showToast("Logged in");

    window.setTimeout(() => {
      window.location.href = "profile.html";
    }, 250);
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    resetButton(submitButton, "Login");
  }
}

async function handleRegister() {
  const submitButton = elements.registerForm.querySelector('button[type="submit"]');
  const username = elements.registerUsername.value.trim();
  const email = elements.registerEmail.value.trim().toLowerCase();
  const password = elements.registerPassword.value;

  try {
    setButtonLoading(submitButton, "Creating account...");

    await registerUser({ username, email, password });

    elements.registerForm.reset();
    elements.loginUsername.value = username;
    elements.loginPassword.value = "";
    elements.loginPassword.focus();

    showToast("Account created. Now log in with your password.");
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    resetButton(submitButton, "Create account");
  }
}

async function refreshCurrentUser() {
  const currentToken = getAccessToken();

  if (!currentToken) {
    return;
  }

  try {
    const user = await getCurrentUser();
    saveAuth(currentToken, user);
    window.location.href = "profile.html";
  } catch {
    clearAuth();
  }
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

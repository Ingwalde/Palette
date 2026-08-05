import { resetPassword } from "../api/authApi.js";
import { qs, resetButton, setButtonLoading } from "../utils/dom.js";
import { showToast } from "../utils/toast.js";

const elements = {
  form: qs("#resetForm"),
  password: qs("#resetPassword"),
  confirm: qs("#resetConfirm"),
  error: qs("#resetError"),
  submit: qs("#resetSubmit")
};

const token = new URLSearchParams(window.location.search).get("token");

initResetPage();

function initResetPage() {
  if (!token) {
    showMissingToken();
    return;
  }

  elements.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await submitReset();
  });
}

async function submitReset() {
  elements.error.textContent = "";
  const newPassword = elements.password.value;
  const confirmPassword = elements.confirm.value;

  if (newPassword.length < 6) {
    elements.error.textContent = "Password must be at least 6 characters.";
    elements.password.focus();
    return;
  }
  if (newPassword !== confirmPassword) {
    elements.error.textContent = "Passwords do not match.";
    elements.confirm.focus();
    return;
  }

  setButtonLoading(elements.submit, "Resetting…");

  try {
    const result = await resetPassword({
      token,
      new_password: newPassword,
      confirm_password: confirmPassword
    });
    showToast("Password reset");
    elements.form.replaceChildren(
      buildInfo("Password reset", result.message, "Go to login", "login.html")
    );
  } catch (error) {
    resetButton(elements.submit, "Reset password");
    elements.error.textContent = error.message || "Could not reset the password.";
    showToast(error.message || "Something went wrong", "error");
  }
}

function showMissingToken() {
  elements.form.replaceChildren(
    buildInfo(
      "Reset link is missing",
      "This password reset link is missing its token. Request a new one.",
      "Request a new link",
      "forgot-password.html"
    )
  );
}

function buildInfo(title, text, linkLabel, href) {
  const wrapper = document.createElement("div");
  wrapper.className = "auth-card__result";

  const heading = document.createElement("h2");
  heading.textContent = title;

  const paragraph = document.createElement("p");
  paragraph.className = "muted";
  paragraph.textContent = text;

  const link = document.createElement("a");
  link.className = "button button--primary";
  link.href = href;
  link.textContent = linkLabel;

  wrapper.append(heading, paragraph, link);
  return wrapper;
}

import { resendVerification, verifyEmail } from "../api/authApi.js";
import { qs } from "../utils/dom.js";

const title = qs("#verifyTitle");
const message = qs("#verifyMessage");
const actions = qs("#verifyActions");

initVerifyPage();

async function initVerifyPage() {
  const token = new URLSearchParams(window.location.search).get("token");

  if (!token) {
    showError("This verification link is missing its token.");
    return;
  }

  try {
    await verifyEmail(token);
    showSuccess();
  } catch (error) {
    showError(error.message || "We could not verify your email.");
  }
}

function showSuccess() {
  title.textContent = "You're verified 🎉";
  message.textContent = "Your email address has been confirmed. You can log in now.";

  const okButton = document.createElement("a");
  okButton.className = "button button--primary";
  okButton.href = "login.html";
  okButton.textContent = "OK";

  actions.replaceChildren(okButton);
}

function showError(text) {
  title.textContent = "Verification failed";
  message.textContent = `${text} The link may be invalid or expired — request a new one below.`;

  const input = document.createElement("input");
  input.className = "input";
  input.type = "email";
  input.autocomplete = "email";
  input.placeholder = "you@example.com";

  const resendButton = document.createElement("button");
  resendButton.className = "button button--primary";
  resendButton.type = "button";
  resendButton.textContent = "Resend link";

  resendButton.addEventListener("click", async () => {
    const email = input.value.trim().toLowerCase();
    if (!email) {
      input.focus();
      return;
    }

    resendButton.disabled = true;
    resendButton.textContent = "Sending…";

    try {
      const result = await resendVerification(email);
      message.textContent = result.message;
    } catch (error) {
      message.textContent = error.message || "Could not send the link. Try again later.";
    } finally {
      resendButton.disabled = false;
      resendButton.textContent = "Resend link";
    }
  });

  actions.replaceChildren(input, resendButton);
}

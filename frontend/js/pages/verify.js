import { resendVerification, verifyEmail } from "../api/authApi.js";
import { saveAuth, saveRefreshToken } from "../utils/authStorage.js";
import { qs } from "../utils/dom.js";

const title = qs("#verifyTitle");
const message = qs("#verifyMessage");
const actions = qs("#verifyActions");

const SUCCESS_LINES = [
  "Boom — inbox conquered. You're in and ready to collect colors.",
  "Email confirmed and you're already signed in. Let's go make something bright.",
  "That's the one. You're verified, logged in, and the palettes are waiting.",
  "Handshake complete. Your account is live — time to hoard some gradients."
];

initVerifyPage();

async function initVerifyPage() {
  const token = new URLSearchParams(window.location.search).get("token");

  if (!token) {
    showError("This verification link is missing its token.");
    return;
  }

  try {
    const result = await verifyEmail(token);
    // Signed link — log the user straight in so they land on their account.
    saveAuth(result.access_token, result.user);
    saveRefreshToken(result.refresh_token);
    showSuccess(result.user);
  } catch (error) {
    showError(error.message || "We could not verify your email.");
  }
}

function showSuccess(user) {
  const name = user?.username ? `, ${user.username}` : "";
  title.textContent = `You're in${name}! 🎉`;
  message.textContent = SUCCESS_LINES[Math.floor(Math.random() * SUCCESS_LINES.length)];

  const okButton = document.createElement("a");
  okButton.className = "button button--primary";
  okButton.href = "profile.html";
  okButton.textContent = "Go to my account";

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

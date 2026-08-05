import { forgotPassword } from "../api/authApi.js";
import { qs, resetButton, setButtonLoading } from "../utils/dom.js";
import { showToast } from "../utils/toast.js";

const elements = {
  form: qs("#forgotForm"),
  email: qs("#forgotEmail"),
  error: qs("#forgotError"),
  submit: qs("#forgotSubmit")
};

initForgotPage();

function initForgotPage() {
  elements.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await requestReset();
  });
}

async function requestReset() {
  elements.error.textContent = "";
  const email = elements.email.value.trim().toLowerCase();

  if (!email) {
    elements.error.textContent = "Enter your account email.";
    elements.email.focus();
    return;
  }

  setButtonLoading(elements.submit, "Sending…");

  try {
    const result = await forgotPassword(email);
    // The response is intentionally generic so it does not reveal whether the email exists.
    elements.form.replaceChildren(
      buildInfo(
        "Check your inbox",
        result.message,
        "Back to login",
        "login.html"
      )
    );
  } catch (error) {
    resetButton(elements.submit, "Send reset link");
    elements.error.textContent = error.message || "Could not send the link. Try again later.";
    showToast(error.message || "Something went wrong", "error");
  }
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

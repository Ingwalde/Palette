// Auth tokens now live in httpOnly cookies the browser sends automatically and JS cannot read.
// localStorage only keeps the non-sensitive user object so the UI can show the logged-in state
// without a round-trip; the real source of truth is the cookie, verified server-side.
const USER_KEY = "palette:user";

export function saveUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getStoredUser() {
  try {
    const user = JSON.parse(localStorage.getItem(USER_KEY));
    return user && typeof user === "object" ? user : null;
  } catch {
    return null;
  }
}

export function clearAuth() {
  localStorage.removeItem(USER_KEY);
}

const ACCESS_TOKEN_KEY = "palette:access-token";
const USER_KEY = "palette:user";

export function saveAuth(token, user) {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
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
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isLoggedIn() {
  return Boolean(getAccessToken());
}

export function isStoredAdmin() {
  return Boolean(getStoredUser()?.is_admin);
}

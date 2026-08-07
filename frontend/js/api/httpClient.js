import { clearAuth } from "../utils/authStorage.js";
import { API_BASE_URL } from "./apiBase.js";

// Turn a FastAPI `detail` (string, validation-error array, or object) into a message.
export function formatApiError(detail) {
  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => item?.msg || JSON.stringify(item))
      .filter(Boolean)
      .join("; ");
  }

  if (detail && typeof detail === "object") {
    return detail.message || JSON.stringify(detail);
  }

  return "";
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// The csrf_token cookie is readable (not httpOnly) so we can echo it in the X-CSRF-Token header
// for double-submit CSRF protection on mutating requests.
function getCsrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

let refreshInFlight = null;

async function requestNewAccessToken() {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "X-CSRF-Token": getCsrfToken() }
    });

    if (!response.ok) {
      clearAuth();
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// Single-flight: concurrent 401s share one refresh so the rotating token isn't raced.
function refreshAccessToken() {
  if (!refreshInFlight) {
    refreshInFlight = requestNewAccessToken().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

function sendRequest(endpoint, options) {
  const method = (options.method || "GET").toUpperCase();
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (!SAFE_METHODS.has(method)) {
    headers["X-CSRF-Token"] = getCsrfToken();
  }

  return fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: "include",
    headers
  });
}

// Shared JSON request helper for every api/* module. Auth rides on httpOnly cookies (sent via
// credentials: "include"); mutating requests carry the CSRF header. On a 401 it transparently
// refreshes the access-token cookie once and retries. Returns null on 204; attaches the HTTP
// status to thrown errors.
export async function request(endpoint, options = {}) {
  let response = await sendRequest(endpoint, options);

  if (response.status === 401 && !endpoint.startsWith("/auth/refresh")) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      response = await sendRequest(endpoint, options);
    }
  }

  if (!response.ok) {
    let message = `API request failed with status ${response.status}`;

    try {
      const errorData = await response.json();
      message = formatApiError(errorData.detail) || message;
    } catch {
      // Non-JSON response — keep the default message.
    }

    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

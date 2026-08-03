import { clearAuth, getRefreshToken, saveAuth, saveRefreshToken } from "../utils/authStorage.js";
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

let refreshInFlight = null;

async function requestNewAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken })
    });

    if (!response.ok) {
      clearAuth();
      return null;
    }

    const data = await response.json();
    saveAuth(data.access_token, data.user);
    saveRefreshToken(data.refresh_token);
    return data.access_token;
  } catch {
    return null;
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

function sendRequest(endpoint, headers, requestOptions) {
  return fetch(`${API_BASE_URL}${endpoint}`, {
    ...requestOptions,
    headers: {
      "Content-Type": "application/json",
      ...headers
    }
  });
}

// Shared JSON request helper for every api/* module. Sends/receives JSON, transparently
// refreshes an expired access token once and retries, unwraps FastAPI error details,
// returns null on 204, and attaches the HTTP status to thrown errors.
export async function request(endpoint, options = {}) {
  const { headers = {}, ...requestOptions } = options;

  let response = await sendRequest(endpoint, headers, requestOptions);

  if (response.status === 401 && !endpoint.startsWith("/auth/refresh")) {
    const newAccessToken = await refreshAccessToken();
    if (newAccessToken) {
      const retryHeaders = { ...headers };
      if (retryHeaders.Authorization) {
        retryHeaders.Authorization = `Bearer ${newAccessToken}`;
      }
      response = await sendRequest(endpoint, retryHeaders, requestOptions);
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

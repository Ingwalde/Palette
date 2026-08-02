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

// Shared JSON request helper for every api/* module. Sends/receives JSON, unwraps FastAPI
// error details, returns null on 204, and attaches the HTTP status to thrown errors so
// callers can special-case (e.g. 401).
export async function request(endpoint, options = {}) {
  const { headers = {}, ...requestOptions } = options;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...requestOptions,
    headers: {
      "Content-Type": "application/json",
      ...headers
    }
  });

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

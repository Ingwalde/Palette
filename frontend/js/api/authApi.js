import { getAccessToken } from "../utils/authStorage.js";

const API_BASE_URL =
  location.protocol === "https:" ? "/api" : `http://${location.hostname}:8000/api`;

async function apiRequest(endpoint, options = {}) {
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
      // Keep the default message if the response is not JSON.
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export function registerUser(payload) {
  return apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function loginUser(payload) {
  return apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function verifyEmail(token) {
  return apiRequest(`/auth/verify?token=${encodeURIComponent(token)}`, {
    method: "GET"
  });
}

export function resendVerification(email) {
  return apiRequest("/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify({ email })
  });
}

export function getCurrentUser() {
  const token = getAccessToken();

  if (!token) {
    throw new Error("User is not logged in");
  }

  return apiRequest("/auth/me", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function changePassword(payload) {
  const token = getAccessToken();

  if (!token) {
    throw new Error("User is not logged in");
  }

  return apiRequest("/auth/password", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
}

export function deleteAccount() {
  const token = getAccessToken();

  if (!token) {
    throw new Error("User is not logged in");
  }

  return apiRequest("/auth/me", {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}


function formatApiError(detail) {
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

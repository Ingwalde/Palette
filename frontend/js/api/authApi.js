import { getAccessToken } from "../utils/authStorage.js";
import { request as apiRequest } from "./httpClient.js";

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

export function logoutUser(refreshToken) {
  return apiRequest("/auth/logout", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken })
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

export function forgotPassword(email) {
  return apiRequest("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email })
  });
}

export function resetPassword(payload) {
  return apiRequest("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(payload)
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

export function deleteAccount(password) {
  const token = getAccessToken();

  if (!token) {
    throw new Error("User is not logged in");
  }

  return apiRequest("/auth/me", {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ password })
  });
}

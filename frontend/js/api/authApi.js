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

export function logoutUser() {
  // The refresh token is read from the httpOnly cookie server-side; nothing to send.
  return apiRequest("/auth/logout", { method: "POST" });
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
  // Auth rides on the httpOnly cookie; a 401 means no valid session.
  return apiRequest("/auth/me");
}

export function changePassword(payload) {
  return apiRequest("/auth/password", {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function deleteAccount(password) {
  return apiRequest("/auth/me", {
    method: "DELETE",
    body: JSON.stringify({ password })
  });
}

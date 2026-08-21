import { request } from "../lib/http";
import type {
  User,
  LoginPayload,
  RegisterPayload,
  PasswordChangePayload,
  ResetPasswordPayload,
  MessageResponse,
} from "../types/api";

const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) });

// Registration answers with a generic message rather than the account, so that the reply reads
// the same for an address that is already registered as for a new one. Nothing here is told
// whether a user was created — which is the point.
export function register(payload: RegisterPayload): Promise<MessageResponse> {
  return request<MessageResponse>("/auth/register", { method: "POST", ...json(payload) });
}

export function login(payload: LoginPayload): Promise<User> {
  return request<User>("/auth/login", { method: "POST", ...json(payload) });
}

export function logout(): Promise<void> {
  // The refresh token is read from the httpOnly cookie server-side; nothing to send.
  return request<void>("/auth/logout", { method: "POST" });
}

export function logoutEverywhere(): Promise<void> {
  // Ends every session on every device: revokes all refresh tokens and bumps the user's
  // token_version, which retires access tokens already issued rather than waiting for expiry.
  return request<void>("/auth/logout-all", { method: "POST" });
}

export function getCurrentUser(): Promise<User> {
  // Auth rides on the httpOnly cookie; a 401 means no valid session.
  return request<User>("/auth/me");
}

export function verifyEmail(token: string): Promise<User> {
  // Signed link — the server logs the user straight in via cookies and returns the user.
  return request<User>(`/auth/verify?token=${encodeURIComponent(token)}`);
}

export function resendVerification(email: string): Promise<MessageResponse> {
  return request<MessageResponse>("/auth/resend-verification", {
    method: "POST",
    ...json({ email }),
  });
}

export function forgotPassword(email: string): Promise<MessageResponse> {
  return request<MessageResponse>("/auth/forgot-password", {
    method: "POST",
    ...json({ email }),
  });
}

export function resetPassword(payload: ResetPasswordPayload): Promise<MessageResponse> {
  return request<MessageResponse>("/auth/reset-password", {
    method: "POST",
    ...json(payload),
  });
}

export function changePassword(payload: PasswordChangePayload): Promise<MessageResponse> {
  return request<MessageResponse>("/auth/password", { method: "PUT", ...json(payload) });
}

export function deleteAccount(password: string): Promise<void> {
  return request<void>("/auth/me", { method: "DELETE", ...json({ password }) });
}

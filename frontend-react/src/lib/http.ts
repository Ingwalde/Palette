import { API_BASE_URL } from "./apiBase";

// Error carrying the HTTP status, thrown by `request` on a non-2xx response.
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type ProblemDetail = string | Array<{ msg?: string }> | { message?: string } | undefined;

// Turn a FastAPI / RFC7807 `detail` (string, validation-error array, or object) into a message.
export function formatApiError(detail: ProblemDetail): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => item?.msg ?? JSON.stringify(item))
      .filter(Boolean)
      .join("; ");
  }
  if (detail && typeof detail === "object") {
    return detail.message ?? JSON.stringify(detail);
  }
  return "";
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// The csrf_token cookie is readable (not httpOnly) so we can echo it in the X-CSRF-Token
// header for double-submit CSRF protection on mutating requests.
function getCsrfToken(): string {
  const match =
    typeof document !== "undefined"
      ? document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/)
      : null;
  return match ? decodeURIComponent(match[1]) : "";
}

// The AuthProvider registers a callback so a failed refresh can clear cached auth state,
// without this module depending on React or the query client.
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null): void {
  onUnauthorized = fn;
}

let refreshInFlight: Promise<boolean> | null = null;

async function requestNewAccessToken(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "X-CSRF-Token": getCsrfToken() },
    });
    if (!response.ok) {
      onUnauthorized?.();
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// Single-flight: concurrent 401s share one refresh so the rotating token isn't raced.
function refreshAccessToken(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = requestNewAccessToken().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

function sendRequest(endpoint: string, options: RequestInit): Promise<Response> {
  const method = (options.method ?? "GET").toUpperCase();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) ?? {}),
  };
  if (!SAFE_METHODS.has(method)) {
    headers["X-CSRF-Token"] = getCsrfToken();
  }
  return fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: "include",
    headers,
  });
}

// Shared JSON request helper. Auth rides on httpOnly cookies (credentials: "include");
// mutating requests carry the CSRF header. On a 401 it transparently refreshes the
// access-token cookie once and retries. Returns undefined on 204.
export async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
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
      const errorData = (await response.json()) as { detail?: ProblemDetail };
      message = formatApiError(errorData.detail) || message;
    } catch {
      // Non-JSON response — keep the default message.
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

// Build a query string from defined params (drops undefined/empty).
export function toQuery(params: Record<string, string | number | undefined>): string {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") usp.set(key, String(value));
  }
  const s = usp.toString();
  return s ? `?${s}` : "";
}

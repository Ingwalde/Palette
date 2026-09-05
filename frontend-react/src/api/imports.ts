import { API_BASE_URL } from "../lib/apiBase";
import { ApiError, formatApiError } from "../lib/http";

// A pasted image URL is fetched through the backend proxy (routers/imports.py) so its pixels can
// be read on a canvas without a cross-origin taint. The proxy returns raw image bytes, not JSON,
// so this bypasses the shared `request` helper and reads a Blob directly.
export async function fetchImageBlob(url: string): Promise<Blob> {
  let response: Response;
  try {
    response = await fetch(
      `${API_BASE_URL}/import/fetch?url=${encodeURIComponent(url)}`,
      { credentials: "include", signal: AbortSignal.timeout(20_000) },
    );
  } catch {
    throw new ApiError("Could not reach the image", 0);
  }
  if (!response.ok) {
    let message = `Could not fetch the image (${response.status})`;
    try {
      const body = (await response.json()) as { detail?: unknown };
      message = formatApiError(body.detail as never) || message;
    } catch {
      // Non-JSON error body — keep the default message.
    }
    throw new ApiError(message, response.status);
  }
  return response.blob();
}

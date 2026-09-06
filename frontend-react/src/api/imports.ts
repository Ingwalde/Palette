import { API_BASE_URL } from "../lib/apiBase";
import { ApiError, formatApiError, request } from "../lib/http";
import type {
  ImportDraft,
  ImportProviders,
  PinterestBoard,
  PinterestPin,
} from "../types/api";

// Which import providers this deployment offers, and whether the user has linked each. Read once
// when the Import page mounts to decide which buttons to show.
export function getProviders(): Promise<ImportProviders> {
  return request<ImportProviders>("/import/providers");
}

// The Figma authorize URL to send the browser to; the backend signs the state parameter.
export function figmaAuthorizeUrl(): Promise<{ url: string }> {
  return request<{ url: string }>("/import/figma/authorize");
}

export function figmaExtract(file: string): Promise<ImportDraft> {
  return request<ImportDraft>("/import/figma/extract", {
    method: "POST",
    body: JSON.stringify({ file }),
  });
}

export function figmaDisconnect(): Promise<void> {
  return request<void>("/import/figma", { method: "DELETE" });
}

export function pinterestAuthorizeUrl(): Promise<{ url: string }> {
  return request<{ url: string }>("/import/pinterest/authorize");
}

export function pinterestDisconnect(): Promise<void> {
  return request<void>("/import/pinterest", { method: "DELETE" });
}

export function pinterestBoards(): Promise<PinterestBoard[]> {
  return request<PinterestBoard[]>("/import/pinterest/boards");
}

export function pinterestPins(boardId: string): Promise<PinterestPin[]> {
  return request<PinterestPin[]>(
    `/import/pinterest/boards/${encodeURIComponent(boardId)}/pins`,
  );
}

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

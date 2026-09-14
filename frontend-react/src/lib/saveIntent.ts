import { addFavorite } from "../api/favorites";
import type { Palette } from "../types/api";

// A single requested action, not a guest collection. Survives the verification-email round trip.
const KEY = "palette:pending-save";
const MAX_AGE = 24 * 60 * 60 * 1000;
export interface SaveIntent {
  id: string;
  slug: string;
  name: string;
  returnTo: string;
  returnState: unknown;
  createdAt: number;
}
let fallback: SaveIntent | null = null;
let memoryOnly = false;

export function rememberSaveIntent(
  palette: Palette,
  returnTo: string,
  returnState: unknown,
) {
  const intent: SaveIntent = {
    id: crypto.randomUUID(),
    slug: palette.slug,
    name: palette.name,
    returnTo,
    returnState,
    createdAt: Date.now(),
  };
  fallback = intent;
  try {
    localStorage.setItem(KEY, JSON.stringify(intent));
    memoryOnly = false;
  } catch {
    memoryOnly = true;
  }
  return intent;
}

export function readSaveIntent(): SaveIntent | null {
  let value: unknown = fallback;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      try {
        value = JSON.parse(raw);
      } catch {
        return null;
      }
    } else {
      value = memoryOnly ? fallback : null;
    }
  } catch {
    /* Validate the in-memory fallback when storage is unavailable. */
  }
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<SaveIntent>;
  if (
    typeof candidate.id === "string" &&
    typeof candidate.slug === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.returnTo === "string" &&
    candidate.returnTo.startsWith("/") &&
    !candidate.returnTo.startsWith("//") &&
    !candidate.returnTo.includes("\\") &&
    typeof candidate.createdAt === "number" &&
    candidate.createdAt <= Date.now() &&
    Date.now() - candidate.createdAt < MAX_AGE
  ) {
    return candidate as SaveIntent;
  }
  return null;
}

export function clearSaveIntent(id: string) {
  if (fallback?.id === id) fallback = null;
  try {
    if (JSON.parse(localStorage.getItem(KEY) ?? "null")?.id === id)
      localStorage.removeItem(KEY);
  } catch {
    /* Storage unavailable. */
  }
}

// Share an in-flight completion across StrictMode effects and login handlers. POST is idempotent
// server-side too: replaying an interrupted request can never toggle a saved palette back off.
const completions = new Map<string, Promise<void>>();
export function completeSaveIntent(intent: SaveIntent): Promise<void> {
  const existing = completions.get(intent.id);
  if (existing) return existing;
  const pending = addFavorite(intent.slug).then(() => {
    clearSaveIntent(intent.id);
  });
  completions.set(intent.id, pending);
  // Bound completed entries while retaining enough history to deduplicate remounts.
  if (completions.size > 32) completions.delete(completions.keys().next().value!);
  void pending.catch(() => {
    completions.delete(intent.id);
  });
  return pending;
}

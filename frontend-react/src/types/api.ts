// API contract types mirroring the backend Pydantic schemas (backend/app/schemas.py).
// Keep in sync with the backend until an OpenAPI codegen step replaces this by hand.

export interface Palette {
  id: number;
  slug: string;
  name: string;
  description: string;
  colors: string[];
  tags: string[];
  // The owner's handle — the curator handle ("palette") for a seed palette. The palette's URL,
  // /u/:owner_handle/:slug, is built from it; see lib/palettePath.
  owner_handle: string;
  // Whether the owner has a profile photo — the card loads it from /users/:handle/avatar when
  // true. Absent on older fixtures.
  owner_has_avatar?: boolean;
  // "private" (owner-only) until published, then "public".
  visibility: PaletteVisibility;
  // "active", or "removed" by moderation (the owner still sees a removed palette). Optional so
  // older fixtures need not set it; the backend always returns it.
  status?: PaletteStatus;
  // The palette this was forked from, or null/absent. Optional: only the single-palette read
  // carries it.
  forked_from?: PaletteLineage | null;
  created_at: string;
  updated_at: string;
}

export type PaletteVisibility = "private" | "public";
export type PaletteStatus = "active" | "removed";

export interface PaletteLineage {
  name: string;
  slug: string;
  owner_handle: string;
}

export type ReportReason = "spam" | "offensive" | "copyright" | "other";

export interface Report {
  id: number;
  reason: ReportReason;
  detail: string;
  status: string;
  created_at: string;
  palette: PaletteLineage;
}

export interface PaletteList {
  items: Palette[];
  total: number;
  limit: number;
  offset: number;
}

export interface ProviderStatus {
  // Whether the deployment has credentials for this provider (else its UI is hidden).
  enabled: boolean;
  // Whether the current user has linked their account.
  connected: boolean;
}

export interface ImportProviders {
  figma: ProviderStatus;
  pinterest: ProviderStatus;
}

export interface ImportDraft {
  colors: string[];
}

export interface PinterestBoard {
  id: string;
  name: string;
}

export interface PinterestPin {
  id: string;
  image_url: string;
}

export type TagKind = "free" | "purpose";

export interface Tag {
  name: string;
  kind: TagKind;
  count: number;
}

export interface User {
  id: number;
  username: string;
  email: string;
  is_admin: boolean;
  email_verified: boolean;
  // A data: URL for the profile image, or null/absent to fall back to the username initial.
  avatar?: string | null;
  created_at: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  // A username OR an email — the backend decides by the "@".
  username: string;
  password: string;
}

export interface PasswordChangePayload {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface ResetPasswordPayload {
  token: string;
  new_password: string;
  confirm_password: string;
}

export interface MessageResponse {
  message: string;
}

// Query params for the paginated palette list.
export interface PaletteListParams {
  search?: string;
  tag?: string;
  // "az"/"za" are the admin list's; "new"/"popular"/"curated" are the community feed's.
  sort?: "default" | "az" | "za" | "new" | "popular" | "curated";
  limit?: number;
  offset?: number;
}

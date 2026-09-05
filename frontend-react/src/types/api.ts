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
  // "private" (owner-only) until published, then "public".
  visibility: PaletteVisibility;
  created_at: string;
  updated_at: string;
}

export type PaletteVisibility = "private" | "public";

export interface PaletteList {
  items: Palette[];
  total: number;
  limit: number;
  offset: number;
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

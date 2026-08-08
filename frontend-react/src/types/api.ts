// API contract types mirroring the backend Pydantic schemas (backend/app/schemas.py).
// Keep in sync with the backend until an OpenAPI codegen step replaces this by hand.

export interface Palette {
  id: number;
  slug: string;
  name: string;
  description: string;
  colors: string[];
  tags: string[];
  created_at: string;
  updated_at: string;
}

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
  sort?: "default" | "az" | "za";
  limit?: number;
  offset?: number;
}

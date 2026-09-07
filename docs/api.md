# Palette API Documentation

Base URL:

```text
http://localhost:8000/api/v1
```

Conventions:

- List endpoints are paginated and return an envelope `{ items, total, limit, offset }`
  with an `X-Total-Count` header (`limit` / `offset` query params).
- Errors are returned as `application/problem+json` (RFC 7807):
  `{ "type", "title", "status", "detail" }`.

Swagger UI (enable with `ENABLE_API_DOCS=true`):

```text
http://localhost:8000/api/docs
```

---

## Authentication

Protected endpoints authenticate with **httpOnly cookies**, not a Bearer header — the token is
never exposed to JavaScript. `POST /api/v1/auth/login` sets them, and the browser sends them
automatically; from `fetch`, that means `credentials: "include"`.

Every mutating request must also echo the readable `csrf_token` cookie back in a header:

```http
X-CSRF-Token: <value of the csrf_token cookie>
```

Missing or mismatched, the request is rejected with `403` before it reaches the endpoint. The
bootstrap endpoints (login, register, resend-verification, forgot-password, reset-password) are
exempt, since they run before a session exists.

The full endpoint list, cookie lifetimes and the revocation model are in [`auth.md`](auth.md).

---

## Public palette endpoints

### Get all palettes

```http
GET /api/v1/palettes
```

Optional query parameters:

```text
search — search by name, description, slug or tags
tag    — filter by tag
sort   — default | az | za
```

Examples:

```http
GET /api/v1/palettes?search=dark
GET /api/v1/palettes?tag=nature
GET /api/v1/palettes?sort=az
GET /api/v1/palettes?search=blue&tag=cold&sort=az
```

---

### Get all tags

```http
GET /api/v1/palettes/tags
```

Example response:

```json
["bold", "calm", "cold", "contrast", "dark"]
```

---

### Get one palette

```http
GET /api/v1/palettes/{slug}
```

Example:

```http
GET /api/v1/palettes/navy-orange
```

**Slugs are not permanent identifiers.** A palette's slug is derived from its name, and
renaming a palette re-derives it, so an external link to the old slug will 404. Nothing
breaks internally — favorites and every other relation reference the numeric `id` — but if
you are storing a reference, store `id`.

Slugs are unique. A name that would collide gets a numeric suffix: `sea-breeze`,
`sea-breeze-2`, `sea-breeze-3`.

---

### Searching

`search` matches, case-insensitively, anywhere inside the name, description, slug **or** the
tags. `%` and `_` are treated as literal characters, not wildcards.

Use `tag` instead of `search` for an exact tag match — it is a separate, exact filter.

---

## Authentication endpoints

### Register user

```http
POST /api/v1/auth/register
```

Body:

```json
{
  "username": "user",
  "email": "user@gmail.com",
  "password": "user123"
}
```

Returns `202 Accepted` with a generic message:

```json
{ "message": "Check your email to finish setting up your account." }
```

The reply is identical whether or not the address already has an account, so the endpoint cannot
be used to find out who is registered here — the same reason `/forgot-password` and
`/resend-verification` answer generically. When the address is already taken nothing is created,
and a message goes to that address explaining the attempt and how to reset the password.

A **username** that is taken is still reported with `409`: it is a handle the person is choosing
right now, and a silent failure would leave them believing they had registered when they had
not.

---

### Login

```http
POST /api/v1/auth/login
```

Body:

```json
{
  "username": "user",
  "password": "user123"
}
```

Accepts a **username or an email** in the `username` field.

The response body is the user. No token appears in it — the tokens are set as cookies:

```json
{
  "id": 2,
  "username": "user",
  "email": "user@gmail.com",
  "is_admin": false,
  "email_verified": false,
  "created_at": "2026-05-08T12:00:00Z"
}
```

```http
Set-Cookie: access_token=…; HttpOnly; Max-Age=86400; Path=/; SameSite=lax
Set-Cookie: refresh_token=…; HttpOnly; Max-Age=2592000; Path=/; SameSite=lax
Set-Cookie: csrf_token=…; Max-Age=2592000; Path=/; SameSite=lax
```

---

### Get current user

```http
GET /api/v1/auth/me
```

Reads the session cookie. Returns `401` when there is none.

---

### Change password

```http
PUT /api/v1/auth/password
```

Headers:

```http
X-CSRF-Token: <csrf_token cookie>
Content-Type: application/json
```

Body:

```json
{
  "current_password": "old-password",
  "new_password": "new-password",
  "confirm_password": "new-password"
}
```

---

### Session and account endpoints

Documented in full — with rate limits, cookie lifetimes and the revocation model — in
[`auth.md`](auth.md).

| Method   | Path                               | Purpose                                           |
| -------- | ---------------------------------- | ------------------------------------------------- |
| `GET`    | `/api/v1/auth/verify?token=`       | Confirm an emailed address, then sign the user in |
| `POST`   | `/api/v1/auth/resend-verification` | Re-send the confirmation email                    |
| `POST`   | `/api/v1/auth/forgot-password`     | Email a reset link                                |
| `POST`   | `/api/v1/auth/reset-password`      | Set a new password from that link (single use)    |
| `POST`   | `/api/v1/auth/refresh`             | Rotate the refresh token and re-issue the session |
| `POST`   | `/api/v1/auth/logout`              | End this browser's session                        |
| `POST`   | `/api/v1/auth/logout-all`          | End every session, on every device, immediately   |
| `DELETE` | `/api/v1/auth/me`                  | Delete the account (re-authenticates first)       |

Changing or resetting a password, and `logout-all`, retire every access token already issued —
not at expiry, but on the next request.

---

## Favorites endpoints

All favorites endpoints require a logged-in user.

### Get current user's favorite palettes

```http
GET /api/v1/favorites
```

---

### Add palette to favorites

```http
POST /api/v1/favorites/{slug}
```

Example:

```http
POST /api/v1/favorites/navy-orange
```

Mutating, so it needs the `X-CSRF-Token` header.

---

### Remove palette from favorites

```http
DELETE /api/v1/favorites/{slug}
```

Example:

```http
DELETE /api/v1/favorites/navy-orange
```

---

### Clear all favorites

```http
DELETE /api/v1/favorites
```

Example response:

```json
{
  "deleted": 3
}
```

---

## Admin-only palette endpoints

The following endpoints require a logged-in user with:

```text
is_admin = true
```

They authenticate with the session cookies and, being mutations, require the CSRF header:

```http
X-CSRF-Token: <csrf_token cookie>
```

### Create palette

```http
POST /api/v1/palettes
```

Body:

```json
{
  "name": "Nordic Blue",
  "description": "Cold Nordic-inspired palette.",
  "colors": ["#1B263B", "#415A77", "#778DA9", "#E0E1DD"],
  "tags": ["cold", "nordic", "clean"]
}
```

---

### Update palette

```http
PUT /api/v1/palettes/{id}
```

Body can include one or more fields:

```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "colors": ["#111111", "#222222", "#333333", "#444444"],
  "tags": ["dark", "minimal"]
}
```

---

### Delete palette

```http
DELETE /api/v1/palettes/{id}
```

Returns:

```text
204 No Content
```

---

## Community & import endpoints (v5.0)

Palettes are owned in v5.0. The frontend reads a single palette by owner handle and slug —
`GET /api/v1/users/{handle}/palettes/{slug}` — and the per-palette mutations below resolve their
target by palette **id** (or `(handle, slug)` for the read), consistent with the owner-scoped read.
Every mutation needs a session cookie and the `X-CSRF-Token` header.

### Owner-scoped palettes

| Method   | Endpoint                                    | Purpose                                             |
| -------- | ------------------------------------------- | --------------------------------------------------- |
| `GET`    | `/api/v1/users/{handle}/palettes/{slug}`    | Read one palette by owner and slug (public read)    |
| `GET`    | `/api/v1/palettes/mine`                     | The signed-in user's own palettes (any visibility)  |
| `POST`   | `/api/v1/palettes`                          | Create a palette (private until published)          |
| `PATCH`  | `/api/v1/palettes/{id}`                     | Edit a palette; set `visibility` to publish/unpublish |
| `DELETE` | `/api/v1/palettes/{id}`                     | Delete one of your palettes                         |
| `POST`   | `/api/v1/palettes/{id}/fork`                | Fork a public palette into your account (private)   |

Publishing is a `PATCH` that sets `visibility: "public"`; the server stamps `published_at`. The
public feed (`GET /api/v1/palettes`) returns only `visibility = public AND status = active`.

### Moderation

| Method | Endpoint                              | Purpose                                              |
| ------ | ------------------------------------- | ---------------------------------------------------- |
| `POST` | `/api/v1/palettes/{id}/report`        | Report a palette (rate-limited, idempotent per user) |
| `GET`  | `/api/v1/reports`                     | Admin: the open-report queue                          |
| `POST` | `/api/v1/reports/{id}/action`         | Admin: soft-remove the palette (`status = removed`)   |
| `POST` | `/api/v1/reports/{id}/dismiss`        | Admin: close the report, keep the palette live        |

A removed palette leaves the feed and every other viewer's reach; its owner still sees it.

### Import

| Method   | Endpoint                                        | Purpose                                                   |
| -------- | ----------------------------------------------- | --------------------------------------------------------- |
| `GET`    | `/api/v1/import/providers`                       | Which providers are enabled, and whether the user is linked |
| `GET`    | `/api/v1/import/fetch?url=`                       | Proxy an image URL for the client-side extractor (SSRF-fenced: http/https only, public host, no redirects, image-only, size-capped) |
| `GET`    | `/api/v1/import/figma/authorize`                 | Figma OAuth authorize URL                                 |
| `GET`    | `/api/v1/import/figma/callback?code=&state=`     | Figma OAuth callback (redirects back to the import page)  |
| `POST`   | `/api/v1/import/figma/extract`                   | Extract a Figma file's paint-style colours as a draft     |
| `DELETE` | `/api/v1/import/figma`                            | Unlink Figma                                              |
| `GET`    | `/api/v1/import/pinterest/authorize`             | Pinterest OAuth authorize URL                             |
| `GET`    | `/api/v1/import/pinterest/callback?code=&state=` | Pinterest OAuth callback                                  |
| `GET`    | `/api/v1/import/pinterest/boards`                 | List the linked account's boards                          |
| `GET`    | `/api/v1/import/pinterest/boards/{id}/pins`       | List a board's pins (image URLs for the extractor)        |
| `DELETE` | `/api/v1/import/pinterest`                         | Unlink Pinterest                                          |

Figma and Pinterest are gated on configuration: without a client id, secret and redirect URI the
endpoints return `404` and the UI hides the panel. Provider tokens are encrypted at rest; the OAuth
round-trip is authorised by a short-lived signed `state`, not a session cookie.

---

## Common status codes

| Code  | Meaning                                                                       |
| ----- | ----------------------------------------------------------------------------- |
| `200` | Successful request                                                            |
| `201` | Created                                                                       |
| `204` | Deleted successfully, no content returned                                     |
| `400` | Invalid request or incorrect current password                                 |
| `401` | No session cookie, or a token that expired or was revoked                     |
| `403` | Logged in but not admin, or a missing/mismatched `X-CSRF-Token` on a mutation |
| `404` | Palette not found                                                             |
| `409` | Username or email already registered                                          |
| `422` | Validation error                                                              |

# Palette API Documentation

Base URL:

```text
http://localhost:8000/api
```

Swagger UI:

```text
http://localhost:8000/docs
```

---

## Authentication

Protected endpoints use a Bearer token.

Header:

```http
Authorization: Bearer your_access_token
```

The token is returned by:

```http
POST /api/auth/login
```

---

## Public palette endpoints

### Get all palettes

```http
GET /api/palettes
```

Optional query parameters:

```text
search — search by name, description, slug or tags
tag    — filter by tag
sort   — default | az | za
```

Examples:

```http
GET /api/palettes?search=dark
GET /api/palettes?tag=nature
GET /api/palettes?sort=az
GET /api/palettes?search=blue&tag=cold&sort=az
```

---

### Get all tags

```http
GET /api/palettes/tags
```

Example response:

```json
["bold", "calm", "cold", "contrast", "dark"]
```

---

### Get one palette

```http
GET /api/palettes/{slug}
```

Example:

```http
GET /api/palettes/navy-orange
```

---

## Authentication endpoints

### Register user

```http
POST /api/auth/register
```

Body:

```json
{
  "username": "user",
  "email": "user@gmail.com",
  "password": "user123"
}
```

Returns the created user without the password.

---

### Login

```http
POST /api/auth/login
```

Body:

```json
{
  "username": "user",
  "password": "user123"
}
```

Example response:

```json
{
  "access_token": "jwt-token-here",
  "token_type": "bearer",
  "user": {
    "id": 2,
    "username": "user",
    "email": "user@gmail.com",
    "is_admin": false,
    "created_at": "2026-05-08T12:00:00"
  }
}
```

---

### Get current user

```http
GET /api/auth/me
```

Headers:

```http
Authorization: Bearer your_access_token
```

---

### Change password

```http
PUT /api/auth/password
```

Headers:

```http
Authorization: Bearer your_access_token
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

## Favorites endpoints

All favorites endpoints require a logged-in user.

### Get current user's favorite palettes

```http
GET /api/favorites
```

Headers:

```http
Authorization: Bearer your_access_token
```

---

### Get current user's favorite keys

```http
GET /api/favorites/keys
```

Returns palette slugs:

```json
["navy-orange", "eco"]
```

---

### Add palette to favorites

```http
POST /api/favorites/{slug}
```

Example:

```http
POST /api/favorites/navy-orange
```

Headers:

```http
Authorization: Bearer your_access_token
```

---

### Remove palette from favorites

```http
DELETE /api/favorites/{slug}
```

Example:

```http
DELETE /api/favorites/navy-orange
```

---

### Clear all favorites

```http
DELETE /api/favorites
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

They use the standard Bearer token header:

```http
Authorization: Bearer admin_access_token
```

### Create palette

```http
POST /api/palettes
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
PUT /api/palettes/{id}
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
DELETE /api/palettes/{id}
```

Returns:

```text
204 No Content
```

---

## Common status codes

| Code | Meaning |
|---|---|
| `200` | Successful request |
| `201` | Created |
| `204` | Deleted successfully, no content returned |
| `400` | Invalid request or incorrect current password |
| `401` | Missing, invalid or expired token |
| `403` | Logged in but not admin |
| `404` | Palette not found |
| `409` | Username or email already registered |
| `422` | Validation error |

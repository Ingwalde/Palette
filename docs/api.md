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

## Public endpoints

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

## Admin-protected endpoints

The following endpoints require an admin token.

Header:

```http
X-Admin-Token: your-admin-token
```

The token is configured locally in:

```text
backend/.env
```

Example:

```env
ADMIN_TOKEN=palette-admin-2026
```

Do not commit `.env` to GitHub. Commit only `.env.example`.

---

### Create palette

```http
POST /api/palettes
```

Headers:

```http
Content-Type: application/json
X-Admin-Token: your-admin-token
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

Headers:

```http
Content-Type: application/json
X-Admin-Token: your-admin-token
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

Headers:

```http
X-Admin-Token: your-admin-token
```

Returns:

```text
204 No Content
```

---

## Notes

- Public palette reading is available without authentication.
- Palette creation, editing and deletion require the admin token.
- Full email/password authentication is planned for v3.1.

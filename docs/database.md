# Database Documentation

Palette v3.1 uses SQLite for local development.

Database URL:

```text
sqlite:///./palette.db
```

When the backend is started from the `backend/` folder, the database file is created as:

```text
backend/palette.db
```

---

## Tables

### palettes

Stores color palette data.

| Column | Purpose |
|---|---|
| `id` | Primary key |
| `slug` | Unique URL-friendly palette identifier |
| `name` | Palette name |
| `description` | Palette description |
| `colors_json` | Colors stored as JSON text |
| `tags_json` | Tags stored as JSON text |
| `created_at` | Creation time |
| `updated_at` | Last update time |

The model exposes `colors` and `tags` as Python lists using properties.

---

### users

Stores user accounts.

| Column | Purpose |
|---|---|
| `id` | Primary key |
| `username` | Unique username |
| `email` | Unique email |
| `password_hash` | Hashed password |
| `is_admin` | Admin role flag |
| `created_at` | Creation time |
| `updated_at` | Last update time |

Passwords are stored as hashes, not plain text.

---

### favorites

Stores user-based saved palettes.

| Column | Purpose |
|---|---|
| `id` | Primary key |
| `user_id` | References `users.id` |
| `palette_id` | References `palettes.id` |
| `created_at` | When the palette was saved |

The pair `user_id + palette_id` is unique, so one user cannot save the same palette twice.

---

## Relationships

```text
One user can save many palettes.
One palette can be saved by many users.
```

This creates a many-to-many relationship through the `favorites` table.

---

## Local migrations

The project includes a small startup migration helper in `database.py` for local development.

It helps older local databases continue working after changes such as adding an email column to users.

For serious production use, a migration tool such as Alembic would be better.

---

## Reset local database

For local testing only, you can reset the database by deleting:

```text
backend/palette.db
```

Then restart the backend:

```bash
python -m uvicorn app.main:app --reload
```

The app will recreate tables and seed default palettes/admin user.

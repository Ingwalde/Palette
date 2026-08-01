# Database Documentation

Palette v4.0 uses **PostgreSQL** exclusively. There is no SQLite fallback — the backend
refuses to start without a `postgresql://` `DATABASE_URL`.

The URL is set automatically by Docker Compose:

```text
postgresql+psycopg://palette:palette@db:5432/palette
```

The data lives in the PostgreSQL `db` service and persists in the `pgdata` volume. The
test suite runs against a separate disposable PostgreSQL (`test-db` service, database
`palette_test`) via `docker compose --profile test run --rm tests`.

Connectivity uses the psycopg 3 driver (`postgresql+psycopg://`).

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

## Migrations

The schema is created directly from the SQLAlchemy models by `Base.metadata.create_all`
on startup. For evolving a production schema without dropping data, a migration tool
such as Alembic would be added (planned).

---

## Reset the database

Drop the data volume and bring the stack back up:

```bash
docker compose down -v
docker compose up --build
```

The app recreates the tables and seeds the default palettes and admin user.

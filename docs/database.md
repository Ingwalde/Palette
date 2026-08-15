# Database Documentation

Palette uses **PostgreSQL** exclusively (since v4.0). There is no SQLite fallback — the backend
refuses to start without a `postgresql://` `DATABASE_URL`.

The URL is set automatically by Docker Compose:

```text
postgresql+asyncpg://palette:palette@db:5432/palette
```

The data lives in the PostgreSQL `db` service and persists in the `pgdata` volume. The
test suite runs against a separate disposable PostgreSQL (`test-db` service, database
`palette_test`) via `docker compose --profile test run --rm tests`.

The request path is async end to end, so the URL Compose injects uses the **asyncpg**
driver. Alembic runs its migrations synchronously against the same database — that split
is why `database.py` builds a separate synchronous URL for the migration step.

---

## Tables

Source of truth is [`backend/app/models.py`](../backend/app/models.py); the ER diagram is in
[`architecture.md`](architecture.md).

### palettes

| Column        | Purpose                                          |
| ------------- | ------------------------------------------------ |
| `id`          | Primary key                                      |
| `slug`        | Unique, derived from the name; changes on rename |
| `name`        | Palette name                                     |
| `description` | Palette description                              |
| `colors`      | JSONB array of HEX strings                       |
| `tags`        | JSONB array of tag names, GIN-indexed            |
| `created_at`  | Creation time                                    |
| `updated_at`  | Last update time                                 |

`colors` and `tags` were `colors_json` / `tags_json` text columns until `0003_jsonb_arrays`.
They are real JSONB now, so tag filtering uses containment (`@>`) against the GIN index rather
than parsing in Python. Trigram indexes from `0008` back the `?search=` query.

### users

| Column              | Purpose                                                   |
| ------------------- | --------------------------------------------------------- |
| `id`                | Primary key                                               |
| `username`          | Unique username                                           |
| `email`             | Unique email                                              |
| `password_hash`     | Argon2id; legacy PBKDF2 upgraded on next login            |
| `is_admin`          | Admin role flag                                           |
| `token_version`     | Bumped to revoke every access token already issued        |
| `email_verified`    | Whether the address was confirmed — not enforced at login |
| `email_verified_at` | When it was confirmed                                     |
| `created_at`        | Creation time                                             |
| `updated_at`        | Last update time                                          |

### favorites

| Column       | Purpose                                       |
| ------------ | --------------------------------------------- |
| `id`         | Primary key                                   |
| `user_id`    | References `users.id`, `ON DELETE CASCADE`    |
| `palette_id` | References `palettes.id`, `ON DELETE CASCADE` |
| `created_at` | When the palette was saved                    |

`user_id + palette_id` is unique, so one user cannot save the same palette twice. The cascades
arrived in `0006`; before that, deleting a palette someone had favorited raised a foreign-key
violation and returned 500.

### refresh_tokens

| Column       | Purpose                                    |
| ------------ | ------------------------------------------ |
| `id`         | Primary key                                |
| `user_id`    | References `users.id`, `ON DELETE CASCADE` |
| `token_hash` | SHA-256 hex; the plaintext is never stored |
| `expires_at` | Expiry                                     |
| `revoked`    | Set when rotated or logged out             |
| `created_at` | Creation time                              |

Single-use: every `/auth/refresh` revokes the presented token and issues a new one.

### tags

| Column       | Purpose             |
| ------------ | ------------------- |
| `id`         | Primary key         |
| `name`       | Unique tag name     |
| `kind`       | `free` or `purpose` |
| `created_at` | Creation time       |

A **catalog**, not a join table. Palettes still store their tags inline in `palettes.tags`, so
the link is by value rather than a foreign key — a tag can exist on palettes without being in
the catalog, and the tags API reports both.

---

## Relationships

```text
One user can save many palettes.
One palette can be saved by many users.
```

This creates a many-to-many relationship through the `favorites` table.

---

## Migrations

Alembic, under `backend/alembic/`. They run **automatically** when the app starts — the
lifespan in `app/main.py` calls `database.run_migrations` — so a deploy never needs a separate
migrate step, and starting the new backend is the point of no return. That is why
`.github/workflows/deploy.yml` takes a database backup immediately before `up -d`.

The chain, oldest first:

| Revision                  | What it does                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------- |
| `0001_initial`            | users, palettes, favorites                                                            |
| `0002_email_verified`     | `users.email_verified` + `email_verified_at`                                          |
| `0003_jsonb_arrays`       | palette colors/tags to JSONB, GIN index on tags                                       |
| `0004_refresh_tokens`     | refresh token table                                                                   |
| `0005_tags_catalog`       | the tags catalog table                                                                |
| `0006_fk_cascades`        | `ON DELETE CASCADE` on favorites and refresh tokens                                   |
| `0007_user_token_version` | `users.token_version`, so access tokens can be revoked                                |
| `0008_search_indexes`     | `pg_trgm` + trigram indexes for `?search=`, and repairs the GIN index 0003 could skip |

Two conventions worth keeping:

- **Idempotent where it matters.** Databases that predate Alembic were stamped at the baseline,
  so several revisions probe `information_schema` or use `IF NOT EXISTS` rather than assuming.
  `0006` looks up the real constraint names in `pg_constraint` instead of trusting Postgres's
  default naming.
- **Test on an empty database, not the test database.** The pytest fixtures build the schema
  with `create_all` and drop it afterwards, which leaves `alembic_version` out of step. Check a
  chain like this:

  ```bash
  docker compose --profile test exec -T test-db psql -U palette -d postgres -c "CREATE DATABASE chain;"
  docker compose --profile test run --rm \
    -e DATABASE_URL=postgresql+asyncpg://palette:palette@test-db:5432/chain \
    tests sh -c "alembic upgrade head && alembic current"
  ```

`0008` runs `CREATE EXTENSION IF NOT EXISTS pg_trgm`, which needs superuser. The compose and VM
`POSTGRES_USER` is the database owner superuser, so it succeeds there; a managed Postgres with a
restricted role would need the extension enabled out of band first.

---

## Reset the database

Drop the data volume and bring the stack back up:

```bash
docker compose down -v
docker compose up --build
```

The app recreates the tables and seeds the default palettes and admin user.

# Architecture

Diagrams render natively on GitHub. Source of truth for the data model is
[`backend/app/models.py`](../backend/app/models.py); for the request path,
[`docker-compose.yml`](../docker-compose.yml) and the production Caddy config.

## Data model (ER)

Five tables. Favorites is the join between users and palettes; refresh tokens are per-user and
single-use (rotated on refresh). Tags are a **catalog** — palettes still store their tags inline
as a JSONB string array (GIN-indexed for fast containment filtering), so the link between
`palettes.tags` and `tags.name` is by value, not a foreign key.

```mermaid
erDiagram
    USERS ||--o{ FAVORITES : "saves"
    PALETTES ||--o{ FAVORITES : "saved in"
    USERS ||--o{ REFRESH_TOKENS : "owns"
    PALETTES }o..o{ TAGS : "referenced by name (JSONB, soft link)"

    USERS {
        int id PK
        string username UK
        string email UK
        string password_hash "Argon2id"
        bool is_admin
        int token_version "bumped to revoke every issued access token"
        bool email_verified
        datetime email_verified_at
        datetime created_at
        datetime updated_at
    }
    PALETTES {
        int id PK
        string slug UK
        string name
        text description
        jsonb colors "list of HEX"
        jsonb tags "list of tag names, GIN-indexed"
        datetime created_at
        datetime updated_at
    }
    TAGS {
        int id PK
        string name UK
        string kind "free | purpose"
        datetime created_at
    }
    FAVORITES {
        int id PK
        int user_id FK
        int palette_id FK
        datetime created_at
    }
    REFRESH_TOKENS {
        int id PK
        int user_id FK
        string token_hash UK "SHA-256 hex, plaintext never stored"
        datetime expires_at
        bool revoked
        datetime created_at
    }
```

## Request path (production)

Cloudflare terminates the edge; Caddy on the VM serves TLS and splits static frontend from the
API. Redis backs cross-process rate limiting; Sentry receives errors from both the backend and
the browser frontend when a DSN is set.

```mermaid
flowchart LR
    U["Browser"] -->|HTTPS| CF["Cloudflare"]
    CF --> CA["Caddy (reverse proxy, TLS)"]
    CA -->|"/*"| FE["nginx — static frontend + CSP/security headers"]
    CA -->|"/api/*"| BE["FastAPI backend (async)"]
    BE --> DB[("PostgreSQL")]
    BE --> RD[("Redis — rate limiting")]
    BE -. "errors (if DSN set)" .-> SN["Sentry"]
    U -. "errors + Web Vitals (if DSN set)" .-> SN
```

## Authentication flow (httpOnly cookies + CSRF)

Tokens live in httpOnly cookies so XSS cannot read them. Mutations carry the readable
`csrf_token` back in an `X-CSRF-Token` header (double-submit). Access expiry triggers a silent
refresh that rotates the single-use refresh token.

Access tokens are stateless JWTs, so they cannot be looked up and deleted. Instead they carry
the user's `token_version` as a claim, compared against the row on every request — bumping it
retires every token already issued, immediately. See [`auth.md`](auth.md).

```mermaid
sequenceDiagram
    participant C as Browser
    participant A as FastAPI /auth
    C->>A: POST /login (username or email + password)
    A->>A: Argon2id verify (timing-safe)
    A-->>C: Set-Cookie access + refresh (httpOnly, Secure) + csrf (readable)
    Note over C: mutating request
    C->>A: POST /palettes + X-CSRF-Token header
    A->>A: double-submit CSRF check (header == csrf cookie)
    A-->>C: 201 Created
    Note over C,A: access token expires
    C->>A: request -> 401
    C->>A: POST /auth/refresh (refresh cookie)
    A->>A: rotate refresh token (old one revoked, single-use)
    A-->>C: fresh cookies, retry succeeds
    Note over C,A: password changed / reset / logout-all
    A->>A: users.token_version += 1
    C->>A: request with the old access cookie
    A->>A: claim ver != users.token_version
    A-->>C: 401 immediately, not at expiry
```

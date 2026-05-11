# Palette v3.1 — Full-Stack Color Palette App with Authentication

Palette is a full-stack web application for browsing, searching, saving and exporting color palettes.

Version **3.1** adds user accounts, authentication, role-based admin access and account-based favorites on top of the FastAPI + SQLite backend introduced in v3.0.

```text
Frontend → Fetch API → FastAPI Backend → SQLite Database
```

---

## What changed from v2.0 to v3.1

| Area | v2.0 | v3.0 | v3.1 |
|---|---|---|---|
| Architecture | Frontend-only | Frontend + Backend | Full-stack with authentication |
| Palette data | Static JS data | SQLite database | SQLite database |
| Backend | No backend | FastAPI | FastAPI with auth and protected routes |
| API | No REST API | Palette REST API | Palette, auth and favorites APIs |
| Favorites | Browser localStorage | Browser localStorage | User-based favorites in database |
| Admin | No backend admin | Admin token | Admin role with Bearer token |
| Auth | None | Planned | Username, email and password auth |
| Account page | None | None | Personal account page |
| Password change | None | None | Supported |
| Export | CSS, SCSS, JSON, TXT | CSS, SCSS, JSON, TXT, PNG | CSS, SCSS, JSON, TXT, PNG |
| UI | Native selects | Custom dropdowns | Custom dropdowns, account flow, protected admin visibility |

---

## Features

### Frontend

- Modular JavaScript with ES Modules.
- Responsive HTML/CSS interface.
- Palette cards loaded from the backend API.
- Search by name, description, slug and tags.
- Tag filtering and sorting.
- Custom dropdown UI.
- Toast notifications and empty states.
- Save/remove favorites connected to the logged-in user.
- Account page with user details and session controls.
- Password change form with confirmation.
- Admin navigation hidden for guests and regular users.
- Export palettes as:
  - CSS variables;
  - SCSS variables;
  - JSON;
  - TXT;
  - PNG image with visual preview.
- HEX color copying.
- Palette name copying.
- Contrast status for palette cards.

### Backend

- FastAPI backend.
- SQLite database.
- SQLAlchemy models.
- Pydantic validation.
- Public palette API.
- Authentication API.
- User-based favorites API.
- Password hashing with PBKDF2-SHA256.
- JWT/Bearer token authentication with PyJWT.
- Admin-only create/update/delete palette actions.
- Automatic default palette seeding.
- Automatic first admin user creation from `.env` settings.
- Swagger UI documentation.
- CORS enabled for local frontend development.

---

## Project structure

```text
Palette/
├── frontend/
│   ├── index.html
│   ├── favorites.html
│   ├── export.html
│   ├── admin.html
│   ├── login.html
│   ├── profile.html
│   ├── css/
│   │   ├── base.css
│   │   ├── components.css
│   │   └── pages.css
│   └── js/
│       ├── api/
│       │   ├── authApi.js
│       │   ├── favoritesApi.js
│       │   └── palettesApi.js
│       ├── components/
│       │   ├── emptyState.js
│       │   └── paletteCard.js
│       ├── pages/
│       │   ├── admin.js
│       │   ├── export.js
│       │   ├── favorites.js
│       │   ├── home.js
│       │   ├── login.js
│       │   └── profile.js
│       └── utils/
│           ├── authNav.js
│           ├── authStorage.js
│           ├── color.js
│           ├── customSelect.js
│           ├── dom.js
│           └── toast.js
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── crud.py
│   │   ├── seed.py
│   │   ├── config.py
│   │   ├── security.py
│   │   └── routers/
│   │       ├── auth.py
│   │       ├── favorites.py
│   │       └── palettes.py
│   ├── .env.example
│   └── requirements.txt
│
├── docs/
│   ├── api.md
│   ├── auth.md
│   ├── database.md
│   ├── setup.md
│   └── troubleshooting.md
├── start_project.bat
├── README.md
├── CHANGELOG.md
├── ROADMAP.md
└── .gitignore
```

---

## Quick start on Windows

The easiest way to run the project locally is:

```text
start_project.bat
```

It starts:

```text
Backend:  http://localhost:8000
Frontend: http://localhost:5500
API docs: http://localhost:8000/docs
```

---

## Manual backend setup

Open a terminal in the `backend` folder.

### 1. Create virtual environment

```bash
python -m venv .venv
```

### 2. Activate virtual environment

Windows PowerShell:

```bash
.venv\Scripts\Activate.ps1
```

Windows CMD:

```bash
.venv\Scripts\activate.bat
```

macOS / Linux:

```bash
source .venv/bin/activate
```

### 3. Install dependencies

```bash
python -m pip install -r requirements.txt
```

### 4. Create local environment file

Create `backend/.env` from `backend/.env.example`:

```env
SECRET_KEY=change-this-secret-key-before-sharing
ACCESS_TOKEN_EXPIRE_MINUTES=1440
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_EMAIL=admin@palette.local
DEFAULT_ADMIN_PASSWORD=change-this-admin-password
```

For local testing only, you can use a simple password. Do not use a default or weak admin password in a public repository or production deployment.

### 5. Start backend

```bash
python -m uvicorn app.main:app --reload
```

Open:

```text
http://localhost:8000/docs
```

---

## Manual frontend setup

Open a second terminal in the `frontend` folder.

```bash
python -m http.server 5500
```

Open:

```text
http://localhost:5500
```

---

## Authentication flow

1. A user registers with username, email and password.
2. The backend hashes the password with PBKDF2-SHA256.
3. The user logs in with username and password.
4. The backend returns a Bearer token.
5. The frontend stores the token and user data locally.
6. Protected API requests send:

```http
Authorization: Bearer your_access_token
```

The first admin user is created automatically from `.env` when no admin exists yet.

---

## Main pages

| Page | Purpose |
|---|---|
| `index.html` | Browse, search, filter and sort palettes |
| `favorites.html` | View account-based saved palettes |
| `export.html` | Export palettes in several formats, including PNG |
| `login.html` | Register or log in |
| `profile.html` | Personal account page, password change and logout |
| `admin.html` | Admin-only palette CRUD interface |

---

## API overview

Public:

```http
GET /api/palettes
GET /api/palettes/tags
GET /api/palettes/{slug}
```

Authentication:

```http
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
PUT  /api/auth/password
```

Favorites:

```http
GET    /api/favorites
GET    /api/favorites/keys
POST   /api/favorites/{slug}
DELETE /api/favorites/{slug}
DELETE /api/favorites
```

Admin-only:

```http
POST   /api/palettes
PUT    /api/palettes/{id}
DELETE /api/palettes/{id}
```

Full API documentation is in [`docs/api.md`](docs/api.md).

---

## GitHub notes

Do not commit local runtime files:

```text
backend/.env
backend/.venv/
backend/palette.db
.git/
__pycache__/
*.zip
```

The repository should contain the source code and documentation, not the local virtual environment, local database or Git metadata from an archive.

---

## Documentation

- [`docs/setup.md`](docs/setup.md) — full setup guide.
- [`docs/api.md`](docs/api.md) — API endpoints.
- [`docs/auth.md`](docs/auth.md) — authentication and roles.
- [`docs/database.md`](docs/database.md) — database tables.
- [`docs/troubleshooting.md`](docs/troubleshooting.md) — common errors.
- [`SECURITY.md`](SECURITY.md) — security notes.
- [`CHANGELOG.md`](CHANGELOG.md) — version history.
- [`ROADMAP.md`](ROADMAP.md) — future plans.

---

## Security notes

This project is designed for local development and portfolio demonstration.

### Secrets

Do not commit local secrets to GitHub.

Never commit:

```text
backend/.env
```

Use this file only as a public template:

```text
backend/.env.example
```

Required environment variables:

```env
SECRET_KEY=change-this-secret-key-before-sharing
ACCESS_TOKEN_EXPIRE_MINUTES=1440
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_EMAIL=admin@palette.local
DEFAULT_ADMIN_PASSWORD=change-this-admin-password
```

### Admin account

The first admin user is created automatically if no admin exists yet.

Before sharing or deploying the project:

- change `SECRET_KEY`;
- change `DEFAULT_ADMIN_PASSWORD`;
- do not use weak default passwords;
- do not publish your real `.env` file.

### Password storage

Passwords are not stored as plain text.

The backend stores password hashes using:

```text
PBKDF2-SHA256 + salt
```

### Authentication

Protected API requests use:

```http
Authorization: Bearer your_access_token
```

Admin-only actions require:

```text
current_user.is_admin == true
```

### Local database

The SQLite database is a local runtime file.

Do not commit:

```text
backend/palette.db
*.db
*.sqlite
*.sqlite3
```

### Frontend token storage

The frontend stores the access token locally for development convenience.

For a production app, consider a more secure session strategy, stricter CORS settings, HTTPS-only deployment and refresh token handling.

### CORS

The current backend allows broad CORS for local development.

Before deployment, restrict allowed origins to the real frontend domain.


# Palette v3.2 — Full-Stack Color Palette App

Palette is a full-stack color palette web application for browsing, searching, saving and exporting color palettes.

Version **3.2** improves the v3.1 authentication release with a more polished export workflow, selected-palette export, PNG palette card export, a project changelog page, footer information panels and navigation stability improvements.

```text
Frontend → Fetch API → FastAPI Backend → SQLite Database
```

---

## What changed by version

| Area | v2.0 | v3.0 | v3.1 | v3.2 |
|---|---|---|---|---|
| Architecture | Frontend-only | Frontend + backend | Full-stack with authentication | Full-stack with UX/export polish |
| Palette data | Static JS data | SQLite database | SQLite database | SQLite database |
| Favorites | Browser localStorage | Browser localStorage | User-based favorites | User-based favorites |
| Admin | No backend admin | Admin token | Admin role with Bearer token | Protected admin flow |
| Auth | None | Planned | Username/email/password auth | Login/Account flow refined |
| Export | CSS/SCSS/JSON/TXT | CSS/SCSS/JSON/TXT/PNG | Account-based favorites export | Selected palette export + PNG palette card |
| UI | Native selects | Custom dropdowns | Account/admin visibility | Footer panels, changelog page, stable navigation |

---

## Features

### Frontend

- Responsive HTML/CSS interface.
- Modular JavaScript with ES Modules.
- Palette cards loaded from the backend API.
- Search by name, description, slug and tags.
- Tag filtering and sorting.
- Custom dropdown UI.
- Toast notifications and empty states.
- Save/remove favorites connected to the logged-in user.
- Account page with session controls and password change.
- Admin navigation hidden for guests and regular users.
- Export one selected palette or user favorites.
- Export formats: CSS, SCSS, JSON, TXT and PNG.
- PNG export preview and download.
- Selected palette PNG export as a standalone palette card.
- HEX color copying.
- Palette name copying.
- Palette contrast status rounded to one decimal.
- Changelog page inside the frontend.
- Bottom project information panel on each page.

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
- Login by username or email.
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
│   ├── changelog.html
│   ├── css/
│   └── js/
├── backend/
│   ├── app/
│   ├── requirements.txt
│   └── .env.example
├── docs/
├── README.md
├── CHANGELOG.md
├── ROADMAP.md
├── .gitignore
└── start_project.bat
```

---

## Quick start

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

Backend:

```text
http://localhost:8000
```

Swagger API docs:

```text
http://localhost:8000/docs
```

### Frontend

Open a second terminal:

```bash
cd frontend
python -m http.server 5500
```

Frontend:

```text
http://localhost:5500
```

---

## Environment variables

Create a local file:

```text
backend/.env
```

Use `backend/.env.example` as a template:

```env
SECRET_KEY=change-this-secret-key-before-sharing
ACCESS_TOKEN_EXPIRE_MINUTES=1440
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_EMAIL=admin@palette.local
DEFAULT_ADMIN_PASSWORD=change-this-admin-password
```

Do not commit `backend/.env`.

---

## API overview

```text
GET    /api/palettes
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me
PUT    /api/auth/password
GET    /api/favorites
POST   /api/favorites/{slug}
DELETE /api/favorites/{slug}
```

Admin actions require a Bearer token and `is_admin = true`.

---

## GitHub cleanup

Do not commit:

```text
.git/
backend/.venv/
backend/.env
backend/palette.db
__pycache__/
*.pyc
*.zip
PATCH_README.md
```

The repository should include `.env.example`, not `.env`.

---

## Version

Current portfolio release:

```text
v3.2.0
```

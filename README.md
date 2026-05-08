# Palette v3.0 — Full-Stack Color Palette App

Palette is a full-stack web application for browsing, searching, saving and exporting color palettes.

Version **3.0** upgrades the project from a frontend-only application to a full-stack architecture with a FastAPI backend and SQLite database.

```text
Frontend → Fetch API → FastAPI Backend → SQLite Database
```

> Authentication is intentionally not included in v3.0. Email/password registration, login, JWT tokens and user-based favorites are planned for v3.1.

---

## What's new in v3.0 compared to v2.0

| Area | v2.0 | v3.0 |
|---|---|---|
| Architecture | Frontend-only | Frontend + Backend |
| Palette data | Static JS file | SQLite database |
| Data loading | Local import from `palettes.js` | Fetch API requests to FastAPI |
| API | No backend API | REST API for palettes |
| Admin tools | No backend CRUD | Admin page for CRUD testing |
| Admin protection | Not applicable | Admin token for create/update/delete |
| Export | CSS, SCSS, JSON, TXT | CSS, SCSS, JSON, TXT, PNG |
| Favorites | localStorage | localStorage, planned database sync in v3.1 |
| UI | Native selects | Custom dropdown UI |
| Documentation | Basic docs | README, CHANGELOG, ROADMAP and API docs |

---

## Features

### Frontend

- Modular JavaScript with ES Modules
- Palette cards loaded from the backend API
- Search by name, description, slug and tags
- Tag filtering
- Sorting by name
- Favorites stored in `localStorage`
- Export palettes as:
  - CSS variables
  - SCSS variables
  - JSON
  - TXT
  - PNG image with visual preview
- HEX color copying
- Full palette copying
- Contrast status for each palette
- Toast notifications
- Empty states and loading/error states
- Custom dropdown components styled to match the UI
- Admin page for palette CRUD testing

### Backend

- FastAPI backend
- SQLite database
- SQLAlchemy models
- Pydantic schemas and validation
- REST API for palette management
- Search, filtering and sorting on the backend
- Automatic seed data for default palettes
- Swagger UI documentation
- CORS enabled for local frontend development
- Admin token protection for create/update/delete actions

---

## Project structure

```text
Palette/
├── frontend/
│   ├── index.html
│   ├── favorites.html
│   ├── export.html
│   ├── admin.html
│   ├── css/
│   │   ├── base.css
│   │   ├── components.css
│   │   └── pages.css
│   └── js/
│       ├── api/
│       │   └── palettesApi.js
│       ├── components/
│       │   ├── emptyState.js
│       │   └── paletteCard.js
│       ├── pages/
│       │   ├── admin.js
│       │   ├── export.js
│       │   ├── favorites.js
│       │   └── home.js
│       └── utils/
│           ├── color.js
│           ├── customSelect.js
│           ├── dom.js
│           ├── storage.js
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
│   │       └── palettes.py
│   ├── .env.example
│   └── requirements.txt
│
├── docs/
│   └── api.md
├── start_project.bat
├── README.md
├── CHANGELOG.md
├── ROADMAP.md
└── .gitignore
```

---

## Quick start on Windows

The easiest way to run the project locally is to use:

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
pip install -r requirements.txt
```

### 4. Create local environment file

Create a file named `.env` inside the `backend/` folder:

```env
ADMIN_TOKEN=change-this-admin-token
```

For local testing you can use any value, for example:

```env
ADMIN_TOKEN=palette-admin-2026
```

Do not commit `.env` to GitHub. Use `.env.example` as the public template.

### 5. Run backend

```bash
uvicorn app.main:app --reload
```

Backend will be available at:

```text
http://localhost:8000
```

Swagger API docs:

```text
http://localhost:8000/docs
```

Health check:

```text
http://localhost:8000/health
```

---

## Manual frontend setup

Open another terminal in the `frontend` folder.

Use VS Code Live Server or run:

```bash
python -m http.server 5500
```

Then open:

```text
http://localhost:5500
```

---

## API endpoints

Public endpoints:

```http
GET    /api/palettes
GET    /api/palettes?search=dark
GET    /api/palettes?tag=nature
GET    /api/palettes?sort=az
GET    /api/palettes/tags
GET    /api/palettes/{slug}
```

Admin-protected endpoints:

```http
POST   /api/palettes
PUT    /api/palettes/{id}
DELETE /api/palettes/{id}
```

Admin requests must include this header:

```http
X-Admin-Token: your-admin-token
```

More details are available in [`docs/api.md`](docs/api.md).

---

## Example palette JSON

```json
{
  "name": "Nordic Blue",
  "description": "Cold Nordic-inspired palette.",
  "colors": ["#1B263B", "#415A77", "#778DA9", "#E0E1DD"],
  "tags": ["cold", "nordic", "clean"]
}
```

---

## GitHub notes

Before committing v3.0, make sure the repository does not include local/generated files:

```text
.git/
backend/.venv/
backend/.env
backend/*.db
backend/app/__pycache__/
```

These are already covered by `.gitignore`, but if they were previously committed, remove them from Git tracking.

---

## Version status

### v2.0

Frontend-only version with ES Modules, localStorage favorites and export tools.

### v3.0

Full-stack version with FastAPI backend, SQLite database, REST API, admin token protection and PNG export.

### v3.1 planned

Email/password authentication, JWT tokens, user accounts and user-based favorites.

# Setup Guide

This guide explains how to run Palette v3.1 locally.

---

## Requirements

- Python 3.12+ recommended.
- A modern browser.
- VS Code or another editor.

---

## 1. Clone or open the project

Open the project root folder:

```text
Palette/
```

The root should contain:

```text
frontend/
backend/
README.md
CHANGELOG.md
ROADMAP.md
```

---

## 2. Backend setup

Open terminal in:

```text
Palette/backend
```

Create virtual environment:

```bash
python -m venv .venv
```

Activate it.

PowerShell:

```bash
.venv\Scripts\Activate.ps1
```

CMD:

```bash
.venv\Scripts\activate.bat
```

Install dependencies:

```bash
python -m pip install -r requirements.txt
```

---

## 3. Environment file

Create:

```text
backend/.env
```

Use this content for local testing:

```env
SECRET_KEY=palette-v3-1-local-secret
ACCESS_TOKEN_EXPIRE_MINUTES=1440
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_EMAIL=admin@palette.local
DEFAULT_ADMIN_PASSWORD=admin123456
```

Do not commit `.env` to GitHub.

---

## 4. Start backend

From `backend/`:

```bash
python -m uvicorn app.main:app --reload
```

Open:

```text
http://localhost:8000/docs
```

---

## 5. Frontend setup

Open a second terminal in:

```text
Palette/frontend
```

Start static server:

```bash
python -m http.server 5500
```

Open:

```text
http://localhost:5500
```

---

## 6. Test login

Open:

```text
http://localhost:5500/login.html
```

Admin test credentials from the example `.env`:

```text
username: admin
password: admin123456
```

Regular users can register from the Login page.

---

## 7. Useful pages

```text
Frontend:       http://localhost:5500
Login:          http://localhost:5500/login.html
Account:        http://localhost:5500/profile.html
Favorites:      http://localhost:5500/favorites.html
Export:         http://localhost:5500/export.html
Admin:          http://localhost:5500/admin.html
Backend API:    http://localhost:8000/docs
```

---

## 8. Optional Windows launcher

If `start_project.bat` exists, you can run it from the project root.

It starts backend and frontend automatically.

The script is safe to keep in GitHub if it does not contain secrets or personal paths.

# Troubleshooting

## Backend is not available

Frontend message:

```text
Backend is not available
```

Start the backend:

```bash
cd backend
python -m uvicorn app.main:app --reload
```

Check:

```text
http://localhost:8000/docs
http://localhost:8000/api/palettes
```

---

## ModuleNotFoundError: No module named 'jwt'

Install requirements:

```bash
cd backend
python -m pip install -r requirements.txt
```

Or install PyJWT directly:

```bash
python -m pip install PyJWT
```

Do not install the wrong package with only `pip install jwt`.

---

## 401 Could not validate credentials

Possible reasons:

- token expired;
- token was deleted;
- backend restarted with a different `SECRET_KEY`;
- localStorage contains old auth data.

Fix:

- log out and log in again;
- or clear browser localStorage keys:

```text
palette:access-token
palette:user
```

---

## 403 Admin access is required

You are logged in, but your user is not admin.

Use the admin account from `.env` or create a new local database with an admin user.

For local testing only:

```text
Delete backend/palette.db
Restart backend
Login with DEFAULT_ADMIN_USERNAME and DEFAULT_ADMIN_PASSWORD
```

---

## Username or email already registered

The user already exists in the database.

Options:

- log in instead of registering;
- use another username/email;
- delete `backend/palette.db` for a clean local test reset.

---

## Favorites not loading

Favorites require login in v3.1.

Check:

- backend is running;
- user is logged in;
- token exists in localStorage;
- `/api/favorites` works in Swagger with Bearer token.

---

## Admin tab is not visible

This is expected for:

- guests;
- regular users.

Admin tab is visible only if:

```text
user.is_admin = true
```

Backend still protects admin endpoints even if someone manually opens `admin.html`.

---

## Changed password but login fails

Check:

- you are using the new password;
- the current database is the expected database;
- backend was restarted from the `backend/` folder.

For local testing reset:

```text
Delete backend/palette.db
Restart backend
```

---

## PowerShell cannot activate virtual environment

Run:

```bash
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then:

```bash
.venv\Scripts\Activate.ps1
```

---

## Port already in use

If port `8000` is busy, stop the old backend process with `Ctrl + C`.

If port `5500` is busy, stop the old frontend server or use another port:

```bash
python -m http.server 5501
```

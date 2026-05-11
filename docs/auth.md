# Authentication Documentation

Palette v3.1 uses username, email and password authentication.

---

## User registration

The registration form asks for:

```text
username
email
password
```

Endpoint:

```http
POST /api/auth/register
```

The backend validates:

- username format;
- email format;
- password length;
- unique username;
- unique email.

New users are created with:

```text
is_admin = false
```

---

## Login

Endpoint:

```http
POST /api/auth/login
```

The user logs in with:

```text
username
password
```

If credentials are valid, the backend returns:

```text
access_token
user data
```

The frontend stores the token and user data locally for development use.

---

## Bearer token

Protected requests use:

```http
Authorization: Bearer your_access_token
```

The backend reads the token, validates it and loads the current user.

---

## Password hashing

Passwords are not stored in plain text.

The backend hashes passwords with:

```text
PBKDF2-SHA256
```

The stored hash contains:

```text
algorithm name
iteration count
salt
hash
```

---

## Personal account page

The page:

```text
frontend/profile.html
```

allows the user to:

- view account information;
- open favorites;
- change password;
- log out.

---

## Password change

Endpoint:

```http
PUT /api/auth/password
```

Requires login.

The form asks for:

```text
current password
new password
confirm new password
```

The backend checks:

- current password is correct;
- new password and confirmation match;
- new password passes validation.

---

## Admin role

Admin access is controlled by:

```text
user.is_admin
```

Admin-only endpoints require:

```text
is_admin = true
```

The Admin tab is hidden on the frontend unless the logged-in user is an admin.

Frontend hiding is only a UI improvement. The real protection is on the backend.

---

## First admin user

The first admin user is created automatically from `.env` if no admin exists.

Environment variables:

```env
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_EMAIL=admin@palette.local
DEFAULT_ADMIN_PASSWORD=change-this-admin-password
```

If a local test database already exists and the admin password does not change, delete `backend/palette.db` and restart the backend.

Do this only for local testing, because it removes local data.

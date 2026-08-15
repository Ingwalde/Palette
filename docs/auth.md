# Authentication

Palette authenticates with a username-or-email plus password, and keeps the session in
httpOnly cookies. Tokens are never exposed to JavaScript.

---

## Endpoints

| Method   | Path                               | Auth           | Rate limit |
| -------- | ---------------------------------- | -------------- | ---------- |
| `POST`   | `/api/v1/auth/register`            | —              | 10/hour    |
| `GET`    | `/api/v1/auth/verify?token=`       | —              | —          |
| `POST`   | `/api/v1/auth/resend-verification` | —              | 3/hour     |
| `POST`   | `/api/v1/auth/forgot-password`     | —              | 3/hour     |
| `POST`   | `/api/v1/auth/reset-password`      | —              | 5/hour     |
| `POST`   | `/api/v1/auth/login`               | —              | 5/minute   |
| `POST`   | `/api/v1/auth/refresh`             | refresh cookie | 30/minute  |
| `POST`   | `/api/v1/auth/logout`              | session        | —          |
| `POST`   | `/api/v1/auth/logout-all`          | session        | —          |
| `GET`    | `/api/v1/auth/me`                  | session        | —          |
| `PUT`    | `/api/v1/auth/password`            | session        | 10/hour    |
| `DELETE` | `/api/v1/auth/me`                  | session        | 5/hour     |

`/login` accepts **either** a username or an email in the `username` field. The strict
username pattern must never be applied to it — doing so once broke login-by-email with a 422.

---

## Session cookies

A successful login, verification or refresh sets three cookies:

| Cookie          | httpOnly | Lifetime                                     | Purpose                       |
| --------------- | -------- | -------------------------------------------- | ----------------------------- |
| `access_token`  | yes      | `ACCESS_TOKEN_EXPIRE_MINUTES` (default 1440) | the request credential        |
| `refresh_token` | yes      | `REFRESH_TOKEN_EXPIRE_DAYS` (default 30)     | obtains a new access token    |
| `csrf_token`    | **no**   | same as refresh                              | echoed back in `X-CSRF-Token` |

`csrf_token` is deliberately readable by JavaScript — it is the client's half of the
double-submit pair, and carries no authority on its own. It uses the refresh lifetime so a
`/refresh` call, itself CSRF-protected, always has a valid csrf cookie to present.

Set `COOKIE_SECURE=false` for plain-http local development, or the browser drops all three.

### CSRF

Every mutating request from a cookie-authenticated client must send `X-CSRF-Token` matching
the `csrf_token` cookie; the comparison is timing-safe. Enforced by middleware in `main.py`,
not per-endpoint. The bootstrap endpoints (`login`, `register`, `resend-verification`,
`forgot-password`, `reset-password`) are exempt because they run before any session exists.
Requests carrying no auth cookie skip the check — they have no ambient credentials to abuse —
and fall through to the endpoint's own authentication.

---

## Revocation

Access tokens are stateless JWTs, so they cannot be looked up and deleted. Instead each user
row carries `token_version`, the access token carries it as a `ver` claim, and
`get_current_user` compares the two on every request. This costs nothing extra: that
dependency already loads the user row.

The version is bumped — ending every session at once, immediately — by:

- `POST /auth/reset-password`
- `PUT /auth/password`
- `POST /auth/logout-all`

`PUT /auth/password` re-issues the caller's cookies afterwards, so changing your password
signs out your other devices but not the tab you are typing in.

`POST /auth/logout` is narrower on purpose: it revokes the refresh token it was given and
clears the cookies for that browser, leaving other devices alone. Use `logout-all` to end
everything — the profile page exposes it as a confirmed **Log out everywhere** control, so a
user who suspects someone else has access can act without changing their password.

Refresh tokens are opaque random strings; only their SHA-256 is stored. They are single-use
and rotated on every `/refresh`, with server-side revocation.

### Reuse detection

Because rotation is single-use, exactly one refresh token is valid per session at a time, and
the legitimate client always replaces its own after rotating. A token that is already revoked
but not yet expired coming back therefore means it exists in two copies.

That ends **every** session for the account: all refresh tokens are revoked and `token_version`
is bumped, so access tokens already issued stop working on their next request rather than at
expiry.

The bluntness is deliberate, and it follows from what the server can and cannot know. It cannot
tell the two holders apart — whichever rotated first now has a valid token and looks entirely
ordinary, and whichever presents the stale copy could be the owner who was raced or the thief
who lost. Ending both costs the owner one sign-in, which they can complete because they know
their password, and costs an attacker everything, because they do not.

A token that never existed is *not* treated this way: it is an ordinary `401`, because noise
must not look like an incident. The distinction is a stored row that is revoked and unexpired.

Reuse is logged at `WARNING` on the `palette.security` logger and reported to Sentry when a DSN
is configured, so it is visible after the fact rather than only in its effect on the user.

---

## Password hashing

New hashes use **Argon2id**. Legacy `pbkdf2_sha256` hashes are still verified and are
transparently upgraded to Argon2 on the next successful login; they are never written for new
passwords. The upgrade rewrites `password_hash` without the password having changed, so it
deliberately does **not** bump `token_version` — it is not a credential change and must not
log anyone out.

---

## Email verification is not enforced

Registration emails a verification link, `GET /auth/verify` marks the account verified and
logs the user straight in, and `POST /auth/resend-verification` re-sends it. But **nothing
gates on `email_verified`** — not `authenticate_user`, not `login`, not `get_current_user`,
not `require_admin_user`. An unverified account has full access.

This is deliberate, not an oversight. The field drives:

- the "please verify your email" banner on the profile page;
- the resend endpoint, which only sends for an existing _unverified_ account.

If that ever changes, decide explicitly which endpoints stay open to unverified users —
at minimum `login`, `verify`, `resend-verification` and read-only browsing — and update this
section along with the change.

---

## Password reset

`POST /auth/forgot-password` emails a link to `/reset-password?token=…` on the frontend. The
token is a JWT with a `reset_password` purpose claim, valid for
`PASSWORD_RESET_EXPIRE_HOURS` (default 1).

It is **single use**: the token carries the user's `token_version`, and completing a reset
bumps it, so replaying the same link fails for the rest of its window. The purpose claim also
means a verification token cannot be replayed as a reset token, or the reverse.

Both `forgot-password` and `resend-verification` always return the same generic message
whether or not the address is registered, so neither can be used to enumerate accounts.

---

## Admin role

Authorisation is `user.is_admin`, enforced by the `require_admin_user` dependency. The
frontend hides the Admin tab for non-admins, which is presentation only — the backend check
is the real one.

`DELETE /auth/me` refuses to delete the last remaining admin, otherwise the admin panel
becomes unreachable.

### First admin

Seeded at startup from the environment when no admin exists:

```env
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_EMAIL=admin@palette.local
DEFAULT_ADMIN_PASSWORD=change-this-admin-password
```

A placeholder password logs a warning at boot. Seeding happens only when there is no admin at
all; to reseed you must drop the database volume
(`docker compose down -v && docker compose up --build`), which destroys all data — local
testing only.

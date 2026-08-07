async def _register(client, username="alice", email="alice@test.com", password="strong-password"):
    return await client.post(
        "/api/v1/auth/register",
        json={"username": username, "email": email, "password": password},
    )


async def _login(client, username="alice", password="strong-password"):
    return await client.post(
        "/api/v1/auth/login", json={"username": username, "password": password}
    )


def _csrf(client):
    return {"X-CSRF-Token": client.cookies.get("csrf_token", "")}


async def test_register_happy_path(client):
    resp = await _register(client)
    assert resp.status_code == 201
    body = resp.json()
    assert body["username"] == "alice"
    assert body["email"] == "alice@test.com"
    assert body["is_admin"] is False
    assert "password" not in body
    assert "password_hash" not in body


async def test_register_duplicate_username(client):
    await _register(client)
    resp = await _register(client, email="other@test.com")
    assert resp.status_code == 409


async def test_register_duplicate_email(client):
    await _register(client)
    resp = await _register(client, username="bob")
    assert resp.status_code == 409


async def test_login_by_username(client):
    await _register(client)
    resp = await client.post(
        "/api/v1/auth/login", json={"username": "alice", "password": "strong-password"}
    )
    assert resp.status_code == 200
    # Tokens are delivered as httpOnly cookies; the body carries the user.
    assert resp.json()["username"] == "alice"
    assert "access_token" in resp.cookies
    assert "refresh_token" in resp.cookies
    assert "csrf_token" in resp.cookies


async def test_login_by_email(client):
    await _register(client)
    resp = await client.post(
        "/api/v1/auth/login",
        json={"username": "alice@test.com", "password": "strong-password"},
    )
    assert resp.status_code == 200


async def test_login_bad_password(client):
    await _register(client)
    resp = await client.post("/api/v1/auth/login", json={"username": "alice", "password": "wrong"})
    assert resp.status_code == 401


async def test_me_requires_token(client):
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 401


async def test_me_via_cookie(user_client):
    resp = await user_client.get("/api/v1/auth/me")
    assert resp.status_code == 200
    assert resp.json()["username"] == "normaluser"


async def test_password_change_wrong_current(user_client, user_csrf):
    resp = await user_client.put(
        "/api/v1/auth/password",
        headers=user_csrf,
        json={
            "current_password": "wrong",
            "new_password": "new-strong-password",
            "confirm_password": "new-strong-password",
        },
    )
    assert resp.status_code == 400


async def test_password_change_success(user_client, user_csrf):
    resp = await user_client.put(
        "/api/v1/auth/password",
        headers=user_csrf,
        json={
            "current_password": "strong-password",
            "new_password": "new-strong-password",
            "confirm_password": "new-strong-password",
        },
    )
    assert resp.status_code == 200

    old = await user_client.post(
        "/api/v1/auth/login", json={"username": "normaluser", "password": "strong-password"}
    )
    assert old.status_code == 401
    new = await user_client.post(
        "/api/v1/auth/login",
        json={"username": "normaluser", "password": "new-strong-password"},
    )
    assert new.status_code == 200


async def test_login_sets_refresh_cookie(client):
    await _register(client)
    resp = await _login(client)
    assert "refresh_token" in resp.cookies


async def test_refresh_rotates_and_revokes_old(client):
    await _register(client)
    await _login(client)
    csrf = _csrf(client)
    old_refresh = client.cookies.get("refresh_token")

    rotated = await client.post("/api/v1/auth/refresh", headers=csrf)
    assert rotated.status_code == 200
    assert client.cookies.get("refresh_token") != old_refresh

    # single-use: the old refresh token no longer works (send it explicitly with a valid csrf pair)
    reused = await client.post(
        "/api/v1/auth/refresh",
        headers={"X-CSRF-Token": "t"},
        cookies={"refresh_token": old_refresh, "csrf_token": "t"},
    )
    assert reused.status_code == 401


async def test_refresh_invalid_token(client):
    # No cookies at all -> no ambient credentials, refresh finds no token -> 401.
    resp = await client.post("/api/v1/auth/refresh")
    assert resp.status_code == 401


async def test_logout_revokes_refresh_token(client):
    await _register(client)
    await _login(client)
    csrf = _csrf(client)
    refresh = client.cookies.get("refresh_token")

    logout = await client.post("/api/v1/auth/logout", headers=csrf)
    assert logout.status_code == 204

    reused = await client.post(
        "/api/v1/auth/refresh",
        headers={"X-CSRF-Token": "t"},
        cookies={"refresh_token": refresh, "csrf_token": "t"},
    )
    assert reused.status_code == 401


async def test_login_upgrades_legacy_hash(client, db_session):
    from app import models
    from app.security import _pbkdf2_hash

    salt = "aa" * 16
    legacy = f"pbkdf2_sha256$210000${salt}${_pbkdf2_hash('strong-password', salt)}"
    user = models.User(username="legacyuser", email="legacy@test.com", password_hash=legacy)
    db_session.add(user)
    await db_session.commit()

    resp = await client.post(
        "/api/v1/auth/login",
        json={"username": "legacyuser", "password": "strong-password"},
    )
    assert resp.status_code == 200

    await db_session.refresh(user)
    assert user.password_hash.startswith("$argon2")


async def test_admin_gate_blocks_regular_user(user_client, user_csrf):
    resp = await user_client.post(
        "/api/v1/palettes",
        headers=user_csrf,
        json={"name": "Blocked", "colors": ["#112233"], "tags": []},
    )
    assert resp.status_code == 403

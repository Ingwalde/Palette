import logging


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


async def test_password_change_retires_other_sessions_but_not_this_one(user_client, user_csrf):
    other_device = user_client.cookies.get("access_token")
    assert (await user_client.get("/api/v1/auth/me")).status_code == 200

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

    # The cookie captured before the change is dead straight away, not in 24 hours.
    stale = await user_client.get("/api/v1/auth/me", cookies={"access_token": other_device})
    assert stale.status_code == 401
    # The caller keeps the tab they just used: the response re-issued their cookies.
    assert (await user_client.get("/api/v1/auth/me")).status_code == 200


async def test_logout_all_ends_every_session(user_client, user_csrf):
    other_device = user_client.cookies.get("access_token")

    resp = await user_client.post("/api/v1/auth/logout-all", headers=user_csrf)
    assert resp.status_code == 204

    for cookie in (other_device,):
        stale = await user_client.get("/api/v1/auth/me", cookies={"access_token": cookie})
        assert stale.status_code == 401


async def test_login_still_works_after_hash_upgrade(client, db_session):
    """The transparent Argon2 rehash must not count as a credential change.

    authenticate_user rewrites password_hash when the stored hash is legacy or uses outdated
    parameters. If that bumped token_version it would log the user out mid-login.
    """
    from app import crud
    from app.security import _pbkdf2_hash

    await _register(client, username="legacy", email="legacy@test.com", password="strong-password")
    user = await crud.get_user_by_username(db_session, "legacy")
    salt = "00112233445566778899aabbccddeeff"
    legacy = f"pbkdf2_sha256$210000${salt}${_pbkdf2_hash('strong-password', salt)}"
    await crud.update_user_password(db_session, user, legacy)
    version_before = user.token_version

    resp = await _login(client, username="legacy")
    assert resp.status_code == 200
    assert (await client.get("/api/v1/auth/me")).status_code == 200

    await db_session.refresh(user)
    assert user.password_hash.startswith("$argon2")
    assert user.token_version == version_before


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


async def test_refresh_reuse_ends_every_session_for_that_user(client, caplog):
    """A replayed refresh token means the token exists in two places, so both are cut off.

    The server cannot tell the victim from the thief: whoever rotated first now holds a valid
    token and looks normal, and whoever presents the stale copy could be either. Ending the
    whole session costs the real user one login and costs an attacker everything.
    """
    await _register(client)
    await _login(client)
    csrf = _csrf(client)
    old_refresh = client.cookies.get("refresh_token")

    rotated = await client.post("/api/v1/auth/refresh", headers=csrf)
    assert rotated.status_code == 200
    current_refresh = client.cookies.get("refresh_token")

    with caplog.at_level(logging.WARNING, logger="palette.security"):
        replayed = await client.post(
            "/api/v1/auth/refresh",
            headers={"X-CSRF-Token": "t"},
            cookies={"refresh_token": old_refresh, "csrf_token": "t"},
        )

    assert replayed.status_code == 401
    assert any("reuse detected" in r.getMessage().lower() for r in caplog.records), caplog.text

    # The token that raced ahead and looked legitimate is dead too — that is the point.
    after = await client.post(
        "/api/v1/auth/refresh",
        headers={"X-CSRF-Token": "t"},
        cookies={"refresh_token": current_refresh, "csrf_token": "t"},
    )
    assert after.status_code == 401


async def test_refresh_reuse_also_retires_issued_access_tokens(client, db_session):
    """Revoking refresh tokens alone would leave a stolen access token working for a day."""
    await _register(client)
    await _login(client)
    csrf = _csrf(client)
    access_before = client.cookies.get("access_token")
    old_refresh = client.cookies.get("refresh_token")

    await client.post("/api/v1/auth/refresh", headers=csrf)
    await client.post(
        "/api/v1/auth/refresh",
        headers={"X-CSRF-Token": "t"},
        cookies={"refresh_token": old_refresh, "csrf_token": "t"},
    )

    me = await client.get("/api/v1/auth/me", cookies={"access_token": access_before})
    assert me.status_code == 401


async def test_unknown_refresh_token_is_not_treated_as_reuse(client, caplog):
    """Noise must not look like an incident: a token that never existed is just a 401."""
    await _register(client)
    await _login(client)
    good_refresh = client.cookies.get("refresh_token")

    with caplog.at_level(logging.WARNING, logger="palette.security"):
        resp = await client.post(
            "/api/v1/auth/refresh",
            headers={"X-CSRF-Token": "t"},
            cookies={"refresh_token": "not-a-real-token", "csrf_token": "t"},
        )

    assert resp.status_code == 401
    assert not any("reuse detected" in r.getMessage().lower() for r in caplog.records)

    # And the real session is untouched by the noise.
    still_valid = await client.post(
        "/api/v1/auth/refresh",
        headers={"X-CSRF-Token": "t"},
        cookies={"refresh_token": good_refresh, "csrf_token": "t"},
    )
    assert still_valid.status_code == 200

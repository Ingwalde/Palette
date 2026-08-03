def _register(client, username="alice", email="alice@test.com", password="strong-password"):
    return client.post(
        "/api/v1/auth/register",
        json={"username": username, "email": email, "password": password},
    )


def test_register_happy_path(client):
    resp = _register(client)
    assert resp.status_code == 201
    body = resp.json()
    assert body["username"] == "alice"
    assert body["email"] == "alice@test.com"
    assert body["is_admin"] is False
    assert "password" not in body
    assert "password_hash" not in body


def test_register_duplicate_username(client):
    _register(client)
    resp = _register(client, email="other@test.com")
    assert resp.status_code == 409


def test_register_duplicate_email(client):
    _register(client)
    resp = _register(client, username="bob")
    assert resp.status_code == 409


def test_login_by_username(client):
    _register(client)
    resp = client.post(
        "/api/v1/auth/login", json={"username": "alice", "password": "strong-password"}
    )
    assert resp.status_code == 200
    assert resp.json()["access_token"]
    assert resp.json()["token_type"] == "bearer"


def test_login_by_email(client):
    _register(client)
    resp = client.post(
        "/api/v1/auth/login",
        json={"username": "alice@test.com", "password": "strong-password"},
    )
    assert resp.status_code == 200


def test_login_bad_password(client):
    _register(client)
    resp = client.post("/api/v1/auth/login", json={"username": "alice", "password": "wrong"})
    assert resp.status_code == 401


def test_me_requires_token(client):
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 401


def test_me_with_token(client, user_token):
    resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {user_token}"})
    assert resp.status_code == 200
    assert resp.json()["username"] == "normaluser"


def test_password_change_wrong_current(client, user_token):
    resp = client.put(
        "/api/v1/auth/password",
        headers={"Authorization": f"Bearer {user_token}"},
        json={
            "current_password": "wrong",
            "new_password": "new-strong-password",
            "confirm_password": "new-strong-password",
        },
    )
    assert resp.status_code == 400


def test_password_change_success(client, user_token):
    resp = client.put(
        "/api/v1/auth/password",
        headers={"Authorization": f"Bearer {user_token}"},
        json={
            "current_password": "strong-password",
            "new_password": "new-strong-password",
            "confirm_password": "new-strong-password",
        },
    )
    assert resp.status_code == 200

    old = client.post(
        "/api/v1/auth/login", json={"username": "normaluser", "password": "strong-password"}
    )
    assert old.status_code == 401
    new = client.post(
        "/api/v1/auth/login",
        json={"username": "normaluser", "password": "new-strong-password"},
    )
    assert new.status_code == 200


def _login(client, username="alice", password="strong-password"):
    return client.post(
        "/api/v1/auth/login", json={"username": username, "password": password}
    ).json()


def test_login_returns_refresh_token(client):
    _register(client)
    assert _login(client)["refresh_token"]


def test_refresh_rotates_and_revokes_old(client):
    _register(client)
    old_refresh = _login(client)["refresh_token"]

    rotated = client.post("/api/v1/auth/refresh", json={"refresh_token": old_refresh})
    assert rotated.status_code == 200
    body = rotated.json()
    assert body["access_token"]
    assert body["refresh_token"] != old_refresh

    # single-use: the old refresh token no longer works
    reused = client.post("/api/v1/auth/refresh", json={"refresh_token": old_refresh})
    assert reused.status_code == 401


def test_refresh_invalid_token(client):
    resp = client.post("/api/v1/auth/refresh", json={"refresh_token": "not-a-token"})
    assert resp.status_code == 401


def test_logout_revokes_refresh_token(client):
    _register(client)
    refresh = _login(client)["refresh_token"]

    assert client.post("/api/v1/auth/logout", json={"refresh_token": refresh}).status_code == 204
    assert client.post("/api/v1/auth/refresh", json={"refresh_token": refresh}).status_code == 401


def test_login_upgrades_legacy_hash(client, db_session):
    from app import models
    from app.security import _pbkdf2_hash

    salt = "aa" * 16
    legacy = f"pbkdf2_sha256$210000${salt}${_pbkdf2_hash('strong-password', salt)}"
    user = models.User(username="legacyuser", email="legacy@test.com", password_hash=legacy)
    db_session.add(user)
    db_session.commit()

    resp = client.post(
        "/api/v1/auth/login",
        json={"username": "legacyuser", "password": "strong-password"},
    )
    assert resp.status_code == 200

    db_session.refresh(user)
    assert user.password_hash.startswith("$argon2")


def test_admin_gate_blocks_regular_user(client, user_token):
    resp = client.post(
        "/api/v1/palettes",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"name": "Blocked", "colors": ["#112233"], "tags": []},
    )
    assert resp.status_code == 403

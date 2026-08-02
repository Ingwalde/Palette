def _register(client, username="alice", email="alice@test.com", password="strong-password"):
    return client.post(
        "/api/auth/register",
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
    resp = client.post("/api/auth/login", json={"username": "alice", "password": "strong-password"})
    assert resp.status_code == 200
    assert resp.json()["access_token"]
    assert resp.json()["token_type"] == "bearer"


def test_login_by_email(client):
    _register(client)
    resp = client.post(
        "/api/auth/login",
        json={"username": "alice@test.com", "password": "strong-password"},
    )
    assert resp.status_code == 200


def test_login_bad_password(client):
    _register(client)
    resp = client.post("/api/auth/login", json={"username": "alice", "password": "wrong"})
    assert resp.status_code == 401


def test_me_requires_token(client):
    resp = client.get("/api/auth/me")
    assert resp.status_code == 401


def test_me_with_token(client, user_token):
    resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {user_token}"})
    assert resp.status_code == 200
    assert resp.json()["username"] == "normaluser"


def test_password_change_wrong_current(client, user_token):
    resp = client.put(
        "/api/auth/password",
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
        "/api/auth/password",
        headers={"Authorization": f"Bearer {user_token}"},
        json={
            "current_password": "strong-password",
            "new_password": "new-strong-password",
            "confirm_password": "new-strong-password",
        },
    )
    assert resp.status_code == 200

    old = client.post(
        "/api/auth/login", json={"username": "normaluser", "password": "strong-password"}
    )
    assert old.status_code == 401
    new = client.post(
        "/api/auth/login",
        json={"username": "normaluser", "password": "new-strong-password"},
    )
    assert new.status_code == 200


def test_admin_gate_blocks_regular_user(client, user_token):
    resp = client.post(
        "/api/palettes",
        headers={"Authorization": f"Bearer {user_token}"},
        json={"name": "Blocked", "colors": ["#112233"], "tags": []},
    )
    assert resp.status_code == 403

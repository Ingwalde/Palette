def _register_and_login(client, username="dave", email="dave@test.com", password="strong-password"):
    client.post(
        "/api/auth/register",
        json={"username": username, "email": email, "password": password},
    )
    resp = client.post(
        "/api/auth/login", json={"username": username, "password": password}
    )
    return resp.json()["access_token"]


def test_delete_account_removes_user(client):
    token = _register_and_login(client)
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.delete("/api/auth/me", headers=headers)
    assert resp.status_code == 204

    # The old token no longer resolves to a user.
    me = client.get("/api/auth/me", headers=headers)
    assert me.status_code == 401

    # The account is gone, so re-login fails.
    login = client.post(
        "/api/auth/login", json={"username": "dave", "password": "strong-password"}
    )
    assert login.status_code == 401


def test_delete_account_requires_auth(client):
    resp = client.delete("/api/auth/me")
    assert resp.status_code == 401


def test_delete_only_admin_is_blocked(client, admin_token):
    resp = client.delete(
        "/api/auth/me", headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert resp.status_code == 400

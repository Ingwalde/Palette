def _register_and_login(client, username="dave", email="dave@test.com", password="strong-password"):
    client.post(
        "/api/v1/auth/register",
        json={"username": username, "email": email, "password": password},
    )
    resp = client.post("/api/v1/auth/login", json={"username": username, "password": password})
    return resp.json()["access_token"]


def _delete_account(client, token, password):
    # DELETE carries a body (the password), so use request() — TestClient.delete()
    # does not accept a JSON body.
    return client.request(
        "DELETE",
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
        json={"password": password},
    )


def test_delete_account_removes_user(client):
    token = _register_and_login(client)

    resp = _delete_account(client, token, "strong-password")
    assert resp.status_code == 204

    # The old token no longer resolves to a user.
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 401

    # The account is gone, so re-login fails.
    login = client.post(
        "/api/v1/auth/login", json={"username": "dave", "password": "strong-password"}
    )
    assert login.status_code == 401


def test_delete_account_wrong_password_is_rejected(client):
    token = _register_and_login(client)

    resp = _delete_account(client, token, "not-my-password")
    assert resp.status_code == 400

    # The account still exists.
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200


def test_delete_account_requires_auth(client):
    resp = client.request("DELETE", "/api/v1/auth/me", json={"password": "whatever"})
    assert resp.status_code == 401


def test_delete_only_admin_is_blocked(client, admin_token):
    resp = client.request(
        "DELETE",
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"password": "strong-password"},
    )
    assert resp.status_code == 400

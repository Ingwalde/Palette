async def _register_and_login(
    client, username="dave", email="dave@test.com", password="strong-password"
):
    await client.post(
        "/api/v1/auth/register",
        json={"username": username, "email": email, "password": password},
    )
    resp = await client.post(
        "/api/v1/auth/login", json={"username": username, "password": password}
    )
    return resp.json()["access_token"]


async def _delete_account(client, token, password):
    return await client.request(
        "DELETE",
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
        json={"password": password},
    )


async def test_delete_account_removes_user(client):
    token = await _register_and_login(client)

    resp = await _delete_account(client, token, "strong-password")
    assert resp.status_code == 204

    me = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 401

    login = await client.post(
        "/api/v1/auth/login", json={"username": "dave", "password": "strong-password"}
    )
    assert login.status_code == 401


async def test_delete_account_wrong_password_is_rejected(client):
    token = await _register_and_login(client)

    resp = await _delete_account(client, token, "not-my-password")
    assert resp.status_code == 400

    me = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200


async def test_delete_account_requires_auth(client):
    resp = await client.request("DELETE", "/api/v1/auth/me", json={"password": "whatever"})
    assert resp.status_code == 401


async def test_delete_only_admin_is_blocked(client, admin_token):
    resp = await client.request(
        "DELETE",
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"password": "strong-password"},
    )
    assert resp.status_code == 400

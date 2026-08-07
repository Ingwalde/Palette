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
    assert resp.status_code == 200
    return {"X-CSRF-Token": client.cookies.get("csrf_token", "")}


async def _delete_account(client, csrf, password):
    return await client.request(
        "DELETE", "/api/v1/auth/me", headers=csrf, json={"password": password}
    )


async def test_delete_account_removes_user(client):
    csrf = await _register_and_login(client)

    resp = await _delete_account(client, csrf, "strong-password")
    assert resp.status_code == 204

    me = await client.get("/api/v1/auth/me")
    assert me.status_code == 401

    login = await client.post(
        "/api/v1/auth/login", json={"username": "dave", "password": "strong-password"}
    )
    assert login.status_code == 401


async def test_delete_account_wrong_password_is_rejected(client):
    csrf = await _register_and_login(client)

    resp = await _delete_account(client, csrf, "not-my-password")
    assert resp.status_code == 400

    me = await client.get("/api/v1/auth/me")
    assert me.status_code == 200


async def test_delete_account_requires_auth(client):
    resp = await client.request("DELETE", "/api/v1/auth/me", json={"password": "whatever"})
    assert resp.status_code == 401


async def test_delete_only_admin_is_blocked(admin_client, admin_csrf):
    resp = await admin_client.request(
        "DELETE", "/api/v1/auth/me", headers=admin_csrf, json={"password": "strong-password"}
    )
    assert resp.status_code == 400

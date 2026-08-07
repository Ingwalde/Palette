import pytest_asyncio
from app.security import create_email_verification_token, create_password_reset_token


@pytest_asyncio.fixture
async def user(client):
    resp = await client.post(
        "/api/v1/auth/register",
        json={"username": "resetuser", "email": "reset@test.com", "password": "oldpassword1"},
    )
    return resp.json()


async def test_forgot_password_generic_for_unknown_email(client):
    resp = await client.post("/api/v1/auth/forgot-password", json={"email": "nobody@test.com"})
    assert resp.status_code == 200
    assert "reset link has been sent" in resp.json()["message"]


async def test_forgot_password_generic_for_known_email(client, user):
    resp = await client.post("/api/v1/auth/forgot-password", json={"email": "reset@test.com"})
    assert resp.status_code == 200


async def test_reset_password_success_and_invalidates_old(client, user):
    token = create_password_reset_token(user["id"])
    resp = await client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "new_password": "newpassword1", "confirm_password": "newpassword1"},
    )
    assert resp.status_code == 200

    new_login = await client.post(
        "/api/v1/auth/login", json={"username": "resetuser", "password": "newpassword1"}
    )
    assert new_login.status_code == 200

    old_login = await client.post(
        "/api/v1/auth/login", json={"username": "resetuser", "password": "oldpassword1"}
    )
    assert old_login.status_code == 401


async def test_reset_rejects_verification_token(client, user):
    # A token minted for email verification must not be usable to reset the password.
    token = create_email_verification_token(user["id"])
    resp = await client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "new_password": "newpassword1", "confirm_password": "newpassword1"},
    )
    assert resp.status_code == 400


async def test_reset_confirmation_mismatch(client, user):
    token = create_password_reset_token(user["id"])
    resp = await client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "new_password": "newpassword1", "confirm_password": "different2"},
    )
    assert resp.status_code == 422


async def test_reset_invalid_token(client):
    resp = await client.post(
        "/api/v1/auth/reset-password",
        json={
            "token": "not-a-real-token",
            "new_password": "newpassword1",
            "confirm_password": "newpassword1",
        },
    )
    assert resp.status_code == 400


async def test_reset_revokes_existing_refresh_tokens(client, user):
    login = await client.post(
        "/api/v1/auth/login", json={"username": "resetuser", "password": "oldpassword1"}
    )
    assert login.status_code == 200
    old_refresh = client.cookies.get("refresh_token")

    token = create_password_reset_token(user["id"])
    await client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "new_password": "newpassword1", "confirm_password": "newpassword1"},
    )

    # The refresh token issued before the reset must no longer work.
    resp = await client.post(
        "/api/v1/auth/refresh",
        headers={"X-CSRF-Token": "t"},
        cookies={"refresh_token": old_refresh, "csrf_token": "t"},
    )
    assert resp.status_code == 401

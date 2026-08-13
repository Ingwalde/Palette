import pytest_asyncio
from app import crud
from app.security import create_email_verification_token, create_password_reset_token


@pytest_asyncio.fixture
async def user(client, db_session):
    resp = await client.post(
        "/api/v1/auth/register",
        json={"username": "resetuser", "email": "reset@test.com", "password": "oldpassword1"},
    )
    # The ORM row, not the response body: reset tokens are minted from the user's
    # token_version, so the token builder needs the model.
    return await crud.get_user(db_session, resp.json()["id"])


async def test_forgot_password_generic_for_unknown_email(client):
    resp = await client.post("/api/v1/auth/forgot-password", json={"email": "nobody@test.com"})
    assert resp.status_code == 200
    assert "reset link has been sent" in resp.json()["message"]


async def test_forgot_password_generic_for_known_email(client, user):
    resp = await client.post("/api/v1/auth/forgot-password", json={"email": "reset@test.com"})
    assert resp.status_code == 200


async def test_reset_password_success_and_invalidates_old(client, user):
    token = create_password_reset_token(user)
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
    token = create_email_verification_token(user.id)
    resp = await client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "new_password": "newpassword1", "confirm_password": "newpassword1"},
    )
    assert resp.status_code == 400


async def test_reset_confirmation_mismatch(client, user):
    token = create_password_reset_token(user)
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

    token = create_password_reset_token(user)
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


async def test_reset_token_is_single_use(client, user):
    token = create_password_reset_token(user)
    body = {"token": token, "new_password": "newpassword1", "confirm_password": "newpassword1"}

    first = await client.post("/api/v1/auth/reset-password", json=body)
    assert first.status_code == 200

    # Same link, still inside its one-hour window: whoever read the email cannot reuse it.
    second = await client.post(
        "/api/v1/auth/reset-password",
        json={**body, "new_password": "attacker123", "confirm_password": "attacker123"},
    )
    assert second.status_code == 400

    still_mine = await client.post(
        "/api/v1/auth/login", json={"username": "resetuser", "password": "newpassword1"}
    )
    assert still_mine.status_code == 200


async def test_reset_kills_access_cookie_immediately(client, user):
    login = await client.post(
        "/api/v1/auth/login", json={"username": "resetuser", "password": "oldpassword1"}
    )
    assert login.status_code == 200
    stolen_access = client.cookies.get("access_token")
    assert (await client.get("/api/v1/auth/me")).status_code == 200

    token = create_password_reset_token(user)
    await client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "new_password": "newpassword1", "confirm_password": "newpassword1"},
    )

    # The access token was valid for a day; the version bump must retire it now, not at expiry.
    resp = await client.get("/api/v1/auth/me", cookies={"access_token": stolen_access})
    assert resp.status_code == 401

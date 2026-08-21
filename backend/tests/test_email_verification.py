from app import crud
from app.security import create_email_verification_token


async def _register(client, username="carol", email="carol@test.com", password="strong-password"):
    return await client.post(
        "/api/v1/auth/register",
        json={"username": username, "email": email, "password": password},
    )


async def test_new_user_is_unverified(client, db_session):
    resp = await _register(client)
    assert resp.status_code == 202
    # Registration no longer returns the account — it must read the same for an address that
    # already has one — so the unverified state is read from the row it created.
    created = await crud.get_user_by_email(db_session, "carol@test.com")
    assert created is not None
    assert created.email_verified is False


async def test_verify_marks_user_verified(client, db_session):
    await _register(client)
    user = await crud.get_user_by_email(db_session, "carol@test.com")
    token = create_email_verification_token(user.id)

    resp = await client.get("/api/v1/auth/verify", params={"token": token})
    assert resp.status_code == 200

    # Verifying via the email link logs the user straight in (sets auth cookies).
    assert resp.json()["email_verified"] is True
    assert "access_token" in resp.cookies

    me = await client.get("/api/v1/auth/me")
    assert me.status_code == 200
    assert me.json()["email_verified"] is True


async def test_verify_invalid_token(client):
    resp = await client.get("/api/v1/auth/verify", params={"token": "not-a-real-token"})
    assert resp.status_code == 400


async def test_email_token_rejected_as_access_cookie(client, db_session):
    await _register(client)
    user = await crud.get_user_by_email(db_session, "carol@test.com")
    token = create_email_verification_token(user.id)

    # A purpose-scoped verification token must not be accepted as an access token.
    resp = await client.get("/api/v1/auth/me", cookies={"access_token": token})
    assert resp.status_code == 401


async def test_login_allowed_when_unverified(client):
    await _register(client)
    resp = await client.post(
        "/api/v1/auth/login", json={"username": "carol", "password": "strong-password"}
    )
    assert resp.status_code == 200


async def test_resend_verification_is_generic(client):
    await _register(client)
    known = await client.post("/api/v1/auth/resend-verification", json={"email": "carol@test.com"})
    unknown = await client.post(
        "/api/v1/auth/resend-verification", json={"email": "nobody@test.com"}
    )

    assert known.status_code == 200
    assert unknown.status_code == 200
    # Same message for known and unknown emails — no account enumeration.
    assert known.json()["message"] == unknown.json()["message"]

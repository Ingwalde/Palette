from app import crud
from app.security import create_email_verification_token


def _register(client, username="carol", email="carol@test.com", password="strong-password"):
    return client.post(
        "/api/v1/auth/register",
        json={"username": username, "email": email, "password": password},
    )


def test_new_user_is_unverified(client):
    resp = _register(client)
    assert resp.status_code == 201
    assert resp.json()["email_verified"] is False


def test_verify_marks_user_verified(client, db_session):
    _register(client)
    user = crud.get_user_by_email(db_session, "carol@test.com")
    token = create_email_verification_token(user.id)

    resp = client.get("/api/v1/auth/verify", params={"token": token})
    assert resp.status_code == 200

    body = resp.json()
    # Verifying via the email link logs the user straight in.
    assert body["access_token"]
    assert body["user"]["email_verified"] is True

    me = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {body['access_token']}"},
    )
    assert me.status_code == 200
    assert me.json()["email_verified"] is True


def test_verify_invalid_token(client):
    resp = client.get("/api/v1/auth/verify", params={"token": "not-a-real-token"})
    assert resp.status_code == 400


def test_email_token_rejected_as_bearer(client, db_session):
    _register(client)
    user = crud.get_user_by_email(db_session, "carol@test.com")
    token = create_email_verification_token(user.id)

    resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 401


def test_login_allowed_when_unverified(client):
    _register(client)
    resp = client.post(
        "/api/v1/auth/login", json={"username": "carol", "password": "strong-password"}
    )
    assert resp.status_code == 200


def test_resend_verification_is_generic(client):
    _register(client)
    known = client.post("/api/v1/auth/resend-verification", json={"email": "carol@test.com"})
    unknown = client.post("/api/v1/auth/resend-verification", json={"email": "nobody@test.com"})

    assert known.status_code == 200
    assert unknown.status_code == 200
    # Same message for known and unknown emails — no account enumeration.
    assert known.json()["message"] == unknown.json()["message"]

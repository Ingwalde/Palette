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


async def test_seeding_refuses_to_promote_an_existing_user(db_session, caplog):
    """Seeding must not hand admin to whoever happens to hold the configured username.

    The previous behaviour promoted them *and* overwrote their password hash with
    DEFAULT_ADMIN_PASSWORD — locking the real owner out of their own account, silently, during
    startup. Refusing loudly is the only honest option: the alternative to a confusing failure
    is not a silent one.
    """
    import logging

    from app import crud, schemas

    victim = await crud.create_user(
        db=db_session,
        user_data=schemas.UserCreate(
            username="admin", email="someone@test.com", password="their-own-password"
        ),
        password_hash="their-own-hash",
        is_admin=False,
    )

    with caplog.at_level(logging.ERROR, logger="palette.crud"):
        result = await crud.create_admin_if_missing(
            db=db_session, username="admin", email="admin@palette.local", password_hash="seeded"
        )

    assert result is None
    assert any("Refusing to seed" in r.getMessage() for r in caplog.records), caplog.text

    await db_session.refresh(victim)
    assert victim.is_admin is False, "seeding granted admin to an existing account"
    assert victim.password_hash == "their-own-hash", "seeding overwrote a user's password"


async def test_seeding_also_refuses_on_a_case_mismatch(db_session, caplog):
    """`Admin` and `admin` are different rows to registration, which is what makes this the
    likeliest accident: the operator sets one and a user holds the other."""
    import logging

    from app import crud, schemas

    await crud.create_user(
        db=db_session,
        user_data=schemas.UserCreate(
            username="Admin", email="mixed@test.com", password="their-own-password"
        ),
        password_hash="their-own-hash",
        is_admin=False,
    )

    with caplog.at_level(logging.ERROR, logger="palette.crud"):
        result = await crud.create_admin_if_missing(
            db=db_session, username="admin", email="admin@palette.local", password_hash="seeded"
        )

    assert result is None
    assert any("Refusing to seed" in r.getMessage() for r in caplog.records)

import logging
import time

import pytest
from app import crud


async def _register(client, username="alice", email="alice@test.com", password="strong-password"):
    return await client.post(
        "/api/v1/auth/register",
        json={"username": username, "email": email, "password": password},
    )


async def _login(client, username="alice", password="strong-password"):
    return await client.post(
        "/api/v1/auth/login", json={"username": username, "password": password}
    )


def _csrf(client):
    return {"X-CSRF-Token": client.cookies.get("csrf_token", "")}


async def test_register_happy_path(client):
    resp = await _register(client)
    # 202 with a generic message, not 201 with the account: the reply has to read the same for
    # an address that is already registered, so it cannot describe a user that may not exist.
    assert resp.status_code == 202
    assert resp.json() == {"message": "Check your email to finish setting up your account."}


async def test_register_duplicate_username(client):
    await _register(client)
    resp = await _register(client, email="other@test.com")
    assert resp.status_code == 409


async def test_register_does_not_reveal_that_an_email_is_taken(client, db_session):
    """Registering twice with one address must be indistinguishable from registering once.

    /forgot-password and /resend-verification have always answered generically, and v4.9.0
    equalised the timing of login, all so that nobody can ask this service whether a given
    person has an account. Registration was the front door still answering: a 409 saying
    "Email is already registered" turned a list of addresses into a list of users.

    A taken username is still reported — see the endpoint's docstring — so the second attempt
    here uses a free one, which is exactly what a probe would do.
    """
    first = await _register(client)
    second = await _register(client, username="bob")

    assert (first.status_code, second.status_code) == (202, 202)
    assert first.json() == second.json()

    # And no second account was created behind the identical answer.
    assert await crud.get_user_by_username(db_session, "bob") is None


async def test_login_by_username(client):
    await _register(client)
    resp = await client.post(
        "/api/v1/auth/login", json={"username": "alice", "password": "strong-password"}
    )
    assert resp.status_code == 200
    # Tokens are delivered as httpOnly cookies; the body carries the user.
    assert resp.json()["username"] == "alice"
    assert "access_token" in resp.cookies
    assert "refresh_token" in resp.cookies
    assert "csrf_token" in resp.cookies


async def test_login_by_email(client):
    await _register(client)
    resp = await client.post(
        "/api/v1/auth/login",
        json={"username": "alice@test.com", "password": "strong-password"},
    )
    assert resp.status_code == 200


async def test_login_bad_password(client):
    await _register(client)
    resp = await client.post("/api/v1/auth/login", json={"username": "alice", "password": "wrong"})
    assert resp.status_code == 401


async def test_me_requires_token(client):
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 401


async def test_me_via_cookie(user_client):
    resp = await user_client.get("/api/v1/auth/me")
    assert resp.status_code == 200
    assert resp.json()["username"] == "normaluser"


async def test_password_change_wrong_current(user_client, user_csrf):
    resp = await user_client.put(
        "/api/v1/auth/password",
        headers=user_csrf,
        json={
            "current_password": "wrong",
            "new_password": "new-strong-password",
            "confirm_password": "new-strong-password",
        },
    )
    assert resp.status_code == 400


async def test_password_change_success(user_client, user_csrf):
    resp = await user_client.put(
        "/api/v1/auth/password",
        headers=user_csrf,
        json={
            "current_password": "strong-password",
            "new_password": "new-strong-password",
            "confirm_password": "new-strong-password",
        },
    )
    assert resp.status_code == 200

    old = await user_client.post(
        "/api/v1/auth/login", json={"username": "normaluser", "password": "strong-password"}
    )
    assert old.status_code == 401
    new = await user_client.post(
        "/api/v1/auth/login",
        json={"username": "normaluser", "password": "new-strong-password"},
    )
    assert new.status_code == 200


async def test_password_change_retires_other_sessions_but_not_this_one(user_client, user_csrf):
    other_device = user_client.cookies.get("access_token")
    assert (await user_client.get("/api/v1/auth/me")).status_code == 200

    resp = await user_client.put(
        "/api/v1/auth/password",
        headers=user_csrf,
        json={
            "current_password": "strong-password",
            "new_password": "new-strong-password",
            "confirm_password": "new-strong-password",
        },
    )
    assert resp.status_code == 200

    # The cookie captured before the change is dead straight away, not in 24 hours.
    stale = await user_client.get("/api/v1/auth/me", cookies={"access_token": other_device})
    assert stale.status_code == 401
    # The caller keeps the tab they just used: the response re-issued their cookies.
    assert (await user_client.get("/api/v1/auth/me")).status_code == 200


async def test_logout_all_ends_every_session(user_client, user_csrf):
    other_device = user_client.cookies.get("access_token")

    resp = await user_client.post("/api/v1/auth/logout-all", headers=user_csrf)
    assert resp.status_code == 204

    for cookie in (other_device,):
        stale = await user_client.get("/api/v1/auth/me", cookies={"access_token": cookie})
        assert stale.status_code == 401


async def test_login_still_works_after_hash_upgrade(client, db_session):
    """The transparent Argon2 rehash must not count as a credential change.

    authenticate_user rewrites password_hash when the stored hash is legacy or uses outdated
    parameters. If that bumped token_version it would log the user out mid-login.
    """
    from app import crud
    from app.security import _pbkdf2_hash

    await _register(client, username="legacy", email="legacy@test.com", password="strong-password")
    user = await crud.get_user_by_username(db_session, "legacy")
    salt = "00112233445566778899aabbccddeeff"
    legacy = f"pbkdf2_sha256$210000${salt}${_pbkdf2_hash('strong-password', salt)}"
    await crud.update_user_password(db_session, user, legacy)
    version_before = user.token_version

    resp = await _login(client, username="legacy")
    assert resp.status_code == 200
    assert (await client.get("/api/v1/auth/me")).status_code == 200

    await db_session.refresh(user)
    assert user.password_hash.startswith("$argon2")
    assert user.token_version == version_before


async def test_login_sets_refresh_cookie(client):
    await _register(client)
    resp = await _login(client)
    assert "refresh_token" in resp.cookies


async def test_refresh_rotates_and_revokes_old(client):
    await _register(client)
    await _login(client)
    csrf = _csrf(client)
    old_refresh = client.cookies.get("refresh_token")

    rotated = await client.post("/api/v1/auth/refresh", headers=csrf)
    assert rotated.status_code == 200
    assert client.cookies.get("refresh_token") != old_refresh

    # single-use: the old refresh token no longer works (send it explicitly with a valid csrf pair)
    reused = await client.post(
        "/api/v1/auth/refresh",
        headers={"X-CSRF-Token": "t"},
        cookies={"refresh_token": old_refresh, "csrf_token": "t"},
    )
    assert reused.status_code == 401


async def test_refresh_invalid_token(client):
    # No cookies at all -> no ambient credentials, refresh finds no token -> 401.
    resp = await client.post("/api/v1/auth/refresh")
    assert resp.status_code == 401


async def test_logout_revokes_refresh_token(client):
    await _register(client)
    await _login(client)
    csrf = _csrf(client)
    refresh = client.cookies.get("refresh_token")

    logout = await client.post("/api/v1/auth/logout", headers=csrf)
    assert logout.status_code == 204

    reused = await client.post(
        "/api/v1/auth/refresh",
        headers={"X-CSRF-Token": "t"},
        cookies={"refresh_token": refresh, "csrf_token": "t"},
    )
    assert reused.status_code == 401


async def test_login_upgrades_legacy_hash(client, db_session):
    from app import models
    from app.security import _pbkdf2_hash

    salt = "aa" * 16
    legacy = f"pbkdf2_sha256$210000${salt}${_pbkdf2_hash('strong-password', salt)}"
    user = models.User(username="legacyuser", email="legacy@test.com", password_hash=legacy)
    db_session.add(user)
    await db_session.commit()

    resp = await client.post(
        "/api/v1/auth/login",
        json={"username": "legacyuser", "password": "strong-password"},
    )
    assert resp.status_code == 200

    await db_session.refresh(user)
    assert user.password_hash.startswith("$argon2")


async def test_admin_gate_blocks_regular_user(user_client, user_csrf):
    resp = await user_client.post(
        "/api/v1/palettes",
        headers=user_csrf,
        json={"name": "Blocked", "colors": ["#112233"], "tags": []},
    )
    assert resp.status_code == 403


async def test_refresh_reuse_ends_every_session_for_that_user(client, caplog):
    """A replayed refresh token means the token exists in two places, so both are cut off.

    The server cannot tell the victim from the thief: whoever rotated first now holds a valid
    token and looks normal, and whoever presents the stale copy could be either. Ending the
    whole session costs the real user one login and costs an attacker everything.
    """
    await _register(client)
    await _login(client)
    csrf = _csrf(client)
    old_refresh = client.cookies.get("refresh_token")

    rotated = await client.post("/api/v1/auth/refresh", headers=csrf)
    assert rotated.status_code == 200
    current_refresh = client.cookies.get("refresh_token")

    with caplog.at_level(logging.WARNING, logger="palette.security"):
        replayed = await client.post(
            "/api/v1/auth/refresh",
            headers={"X-CSRF-Token": "t"},
            cookies={"refresh_token": old_refresh, "csrf_token": "t"},
        )

    assert replayed.status_code == 401
    assert any("reuse detected" in r.getMessage().lower() for r in caplog.records), caplog.text

    # The token that raced ahead and looked legitimate is dead too — that is the point.
    after = await client.post(
        "/api/v1/auth/refresh",
        headers={"X-CSRF-Token": "t"},
        cookies={"refresh_token": current_refresh, "csrf_token": "t"},
    )
    assert after.status_code == 401


async def test_refresh_reuse_also_retires_issued_access_tokens(client, db_session):
    """Revoking refresh tokens alone would leave a stolen access token working for a day."""
    await _register(client)
    await _login(client)
    csrf = _csrf(client)
    access_before = client.cookies.get("access_token")
    old_refresh = client.cookies.get("refresh_token")

    await client.post("/api/v1/auth/refresh", headers=csrf)
    await client.post(
        "/api/v1/auth/refresh",
        headers={"X-CSRF-Token": "t"},
        cookies={"refresh_token": old_refresh, "csrf_token": "t"},
    )

    me = await client.get("/api/v1/auth/me", cookies={"access_token": access_before})
    assert me.status_code == 401


async def test_unknown_refresh_token_is_not_treated_as_reuse(client, caplog):
    """Noise must not look like an incident: a token that never existed is just a 401."""
    await _register(client)
    await _login(client)
    good_refresh = client.cookies.get("refresh_token")

    with caplog.at_level(logging.WARNING, logger="palette.security"):
        resp = await client.post(
            "/api/v1/auth/refresh",
            headers={"X-CSRF-Token": "t"},
            cookies={"refresh_token": "not-a-real-token", "csrf_token": "t"},
        )

    assert resp.status_code == 401
    assert not any("reuse detected" in r.getMessage().lower() for r in caplog.records)

    # And the real session is untouched by the noise.
    still_valid = await client.post(
        "/api/v1/auth/refresh",
        headers={"X-CSRF-Token": "t"},
        cookies={"refresh_token": good_refresh, "csrf_token": "t"},
    )
    assert still_valid.status_code == 200


async def test_login_costs_the_same_whether_the_account_exists(client):
    """Login must not reveal which usernames are registered by how fast it answers.

    Before this, a miss returned before any hashing: ~12ms against ~120ms for a known account.
    A tenfold gap is measurable across the internet in a handful of requests, and it turns the
    login endpoint into a directory of who has an account. The fix verifies against a dummy
    hash when there is no user, so both paths pay the same Argon2 cost.

    The bound is loose on purpose — this asserts the orders of magnitude match, not that the
    times are identical, because a shared CI runner cannot promise the latter.
    """
    await _register(client)

    async def timed(username: str) -> float:
        start = time.perf_counter()
        resp = await client.post(
            "/api/v1/auth/login",
            json={"username": username, "password": "definitely-not-the-password"},
        )
        assert resp.status_code == 401
        return time.perf_counter() - start

    # Warm up: the first call in a process pays import and connection costs that have nothing
    # to do with hashing.
    await timed("alice")

    # Explicit loops: `min(await timed(...) for ...)` builds an async generator, which min()
    # cannot consume.
    existing = min([await timed("alice") for _ in range(3)])
    missing = min([await timed("nobody-with-this-name") for _ in range(3)])

    assert missing > existing * 0.5, (
        f"unknown account answered in {missing:.3f}s against {existing:.3f}s for a known one — "
        "the miss is still skipping the hash"
    )


async def test_losing_a_registration_race_gives_409_not_500(client, db_session, monkeypatch):
    """The pre-checks are advisory; the unique constraint is what decides.

    Two registrations racing for one username both pass the lookup, and one loses at the
    constraint. That window is what is simulated here: the lookups are patched to report the
    name as free, which is what the loser saw when it checked, so the request runs past the
    guards and fails at the insert instead.

    Patching is the point. An earlier version of this test simply pre-created the user, which
    passed with the handler deleted — it was exercising the pre-check and proving nothing.
    """
    from app import crud, routers, schemas

    await crud.create_user(
        db=db_session,
        user_data=schemas.UserCreate(
            username="racer", email="racer@test.com", password="strong-password"
        ),
        password_hash="x",
        is_admin=False,
    )

    async def _looks_free(*_args, **_kwargs):
        return None

    monkeypatch.setattr(routers.auth.crud, "get_user_by_username", _looks_free)
    monkeypatch.setattr(routers.auth.crud, "get_user_by_email", _looks_free)

    resp = await client.post(
        "/api/v1/auth/register",
        json={"username": "racer", "email": "racer@test.com", "password": "strong-password"},
    )
    assert resp.status_code == 409


@pytest.mark.parametrize(
    "password,reason",
    [
        ("short1", "under the length floor"),
        ("123456789012", "in the common list"),
        ("alice-secret-123", "contains the username"),
    ],
)
async def test_registration_refuses_weak_passwords(client, password, reason):
    """min_length was 6, so "123456" was accepted — in a project whose headline feature is auth.

    Twelve characters and a small refusal list, not a composition rule: mandating a symbol and a
    digit mostly produces "Password1!", while length is what costs an attacker work. The third
    case is the one a length floor alone misses — a long password containing the account name is
    guessed immediately.
    """
    resp = await client.post(
        "/api/v1/auth/register",
        json={"username": "alice", "email": "alice@test.com", "password": password},
    )
    assert resp.status_code == 422, f"accepted a password {reason}"


async def test_registration_accepts_a_reasonable_password(client):
    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "username": "alice",
            "email": "alice@test.com",
            "password": "correct-horse-battery",
        },
    )
    assert resp.status_code == 202


async def test_password_change_rejects_a_password_containing_the_username(user_client, user_csrf):
    """The rule registration enforces must not be optional one endpoint later.

    UserCreate refuses a password containing the account's own name or email. This endpoint
    takes only passwords, so the schema cannot see an identity to compare against — the check
    lives in the handler, where the request is authenticated and current_user is in hand.
    """
    resp = await user_client.put(
        "/api/v1/auth/password",
        headers=user_csrf,
        json={
            "current_password": "strong-password",
            "new_password": "normaluser-secret",
            "confirm_password": "normaluser-secret",
        },
    )
    assert resp.status_code == 422
    assert "username or email" in resp.json()["detail"].lower()

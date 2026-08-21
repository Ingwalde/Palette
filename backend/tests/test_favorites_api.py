"""The favorites endpoints over HTTP.

Every other router has a file like this one; favorites had two incidental calls inside the
palettes tests and nothing else, which left the router at 74% — the 404 branches, the CSRF
requirement, and whether one account can see another's saved palettes were all unasserted.
That last one is the reason this file exists: a favorite is per-user data, and nothing checked
that it stayed that way.
"""

import pytest_asyncio
from app import crud, schemas
from conftest import _make_user, csrf_headers, login


@pytest_asyncio.fixture
async def palette(db_session):
    return await crud.create_palette(
        db_session,
        schemas.PaletteCreate(name="Sea Breeze", colors=["#006D77"], tags=["cold"]),
    )


async def test_favorites_require_authentication(client):
    assert (await client.get("/api/v1/favorites")).status_code == 401


async def test_add_list_and_remove(user_client, user_csrf, palette):
    added = await user_client.post(f"/api/v1/favorites/{palette.slug}", headers=user_csrf)
    assert added.status_code == 201
    assert added.json()["slug"] == palette.slug

    listed = await user_client.get("/api/v1/favorites")
    assert [p["slug"] for p in listed.json()] == [palette.slug]

    removed = await user_client.delete(f"/api/v1/favorites/{palette.slug}", headers=user_csrf)
    assert removed.status_code == 204
    assert (await user_client.get("/api/v1/favorites")).json() == []


async def test_adding_the_same_palette_twice_is_not_an_error(user_client, user_csrf, palette):
    """Two clicks on one heart. The second is the state the caller asked for, not a conflict."""
    first = await user_client.post(f"/api/v1/favorites/{palette.slug}", headers=user_csrf)
    second = await user_client.post(f"/api/v1/favorites/{palette.slug}", headers=user_csrf)
    assert (first.status_code, second.status_code) == (201, 201)
    saved = (await user_client.get("/api/v1/favorites")).json()
    assert [p["slug"] for p in saved] == [palette.slug]


async def test_unknown_slug_is_404(user_client, user_csrf):
    # The requests are made before the asserts rather than inside them: an assert is the one
    # statement Python is allowed to remove (-O), and a test whose requests live there stops
    # sending them without failing.
    added = await user_client.post("/api/v1/favorites/no-such-palette", headers=user_csrf)
    removed = await user_client.delete("/api/v1/favorites/no-such-palette", headers=user_csrf)
    assert added.status_code == 404
    assert removed.status_code == 404


async def test_mutations_require_the_csrf_header(user_client, palette):
    """The cookie alone must not be enough: that is the whole point of double-submit."""
    added = await user_client.post(f"/api/v1/favorites/{palette.slug}")
    removed = await user_client.delete(f"/api/v1/favorites/{palette.slug}")
    cleared = await user_client.delete("/api/v1/favorites")
    assert (added.status_code, removed.status_code, cleared.status_code) == (403, 403, 403)


async def test_clear_reports_how_many_it_removed(user_client, user_csrf, db_session):
    for name in ("One", "Two"):
        created = await crud.create_palette(
            db_session, schemas.PaletteCreate(name=name, colors=["#123456"])
        )
        await user_client.post(f"/api/v1/favorites/{created.slug}", headers=user_csrf)

    cleared = await user_client.delete("/api/v1/favorites", headers=user_csrf)
    assert cleared.status_code == 200
    assert cleared.json() == {"deleted": 2}
    assert (await user_client.get("/api/v1/favorites")).json() == []


async def test_one_account_cannot_see_anothers_favorites(client, db_session, palette):
    """Favorites are per-user data, and the endpoints read the caller's identity, not a
    parameter — so the way this breaks is silent."""
    await _make_user(db_session, "alice", "alice@test.com", "strong-password")
    await _make_user(db_session, "bob", "bob@test.com", "strong-password")

    alice_csrf = await login(client, "alice", "strong-password")
    saved = await client.post(f"/api/v1/favorites/{palette.slug}", headers=alice_csrf)
    assert saved.status_code == 201

    await login(client, "bob", "strong-password")
    assert (await client.get("/api/v1/favorites")).json() == []

    # Bob clearing his own (empty) favorites must not touch Alice's.
    await client.delete("/api/v1/favorites", headers=csrf_headers(client))

    await login(client, "alice", "strong-password")
    saved = (await client.get("/api/v1/favorites")).json()
    assert [p["slug"] for p in saved] == [palette.slug]

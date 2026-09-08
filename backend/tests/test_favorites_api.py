"""The favorites endpoints over HTTP.

Every other router has a file like this one; favorites had two incidental calls inside the
palettes tests and nothing else, which left the router at 74% — the 404 branches, the CSRF
requirement, and whether one account can see another's saved palettes were all unasserted.
That last one is the reason this file exists: a favorite is per-user data, and nothing checked
that it stayed that way.
"""

import pytest_asyncio
from app import crud, schemas
from conftest import TestingSessionLocal, _make_user, csrf_headers, login


async def _make_palette(
    db,
    name,
    *,
    owner_id=None,
    visibility="public",
    status="active",
    colors=None,
):
    """Create a palette in a chosen visibility/status. create_palette makes everything private by
    default; favorites are normally saved on *public* palettes, so that is this helper's default."""
    palette = await crud.create_palette(
        db,
        schemas.PaletteCreate(name=name, colors=colors or ["#006D77"], tags=["cold"]),
        owner_id=owner_id,
    )
    palette.visibility = visibility
    palette.status = status
    await db.commit()
    await db.refresh(palette)
    return palette


@pytest_asyncio.fixture
async def palette(db_session):
    return await _make_palette(db_session, "Sea Breeze")


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
        created = await _make_palette(db_session, name, colors=["#123456"])
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


# --- Visibility: a favorite must never leak a private or moderation-removed palette -------------


async def test_cannot_favorite_a_private_palette_of_another_user(client, db_session):
    owner = await _make_user(db_session, "owner", "owner@test.com", "strong-password")
    private = await _make_palette(db_session, "Secret", owner_id=owner.id, visibility="private")
    await _make_user(db_session, "stranger", "stranger@test.com", "strong-password")

    csrf = await login(client, "stranger", "strong-password")
    resp = await client.post(f"/api/v1/favorites/{private.slug}", headers=csrf)
    # 404, not 403 — saving must not confirm a hidden palette exists, nor return its data.
    assert resp.status_code == 404


async def test_cannot_favorite_a_removed_palette(client, db_session):
    removed = await _make_palette(db_session, "Gone", status="removed")
    await _make_user(db_session, "stranger", "stranger@test.com", "strong-password")

    csrf = await login(client, "stranger", "strong-password")
    resp = await client.post(f"/api/v1/favorites/{removed.slug}", headers=csrf)
    assert resp.status_code == 404


async def test_favorite_that_went_private_is_hidden_but_still_removable(client, db_session):
    owner = await _make_user(db_session, "owner", "owner@test.com", "strong-password")
    public = await _make_palette(db_session, "Was Public", owner_id=owner.id)
    await _make_user(db_session, "fan", "fan@test.com", "strong-password")

    csrf = await login(client, "fan", "strong-password")
    saved = await client.post(f"/api/v1/favorites/{public.slug}", headers=csrf)
    assert saved.status_code == 201

    # The owner makes it private after it was saved.
    public.visibility = "private"
    await db_session.commit()

    # The stranger's favorites list no longer discloses it.
    assert (await client.get("/api/v1/favorites")).json() == []

    # But they can still un-save it — removal returns no palette data, only 204.
    removed = await client.delete(f"/api/v1/favorites/{public.slug}", headers=csrf_headers(client))
    assert removed.status_code == 204


async def test_owner_still_sees_their_own_now_private_favorite(client, db_session):
    owner = await _make_user(db_session, "owner", "owner@test.com", "strong-password")
    public = await _make_palette(db_session, "Mine", owner_id=owner.id)

    csrf = await login(client, "owner", "strong-password")
    assert (await client.post(f"/api/v1/favorites/{public.slug}", headers=csrf)).status_code == 201

    public.visibility = "private"
    await db_session.commit()

    listed = (await client.get("/api/v1/favorites")).json()
    assert [p["slug"] for p in listed] == [public.slug]


async def test_admin_still_sees_a_removed_favorite(admin_client, db_session):
    public = await _make_palette(db_session, "Reported")
    saved = await admin_client.post(
        f"/api/v1/favorites/{public.slug}", headers=csrf_headers(admin_client)
    )
    assert saved.status_code == 201

    public.status = "removed"
    await db_session.commit()

    listed = (await admin_client.get("/api/v1/favorites")).json()
    assert [p["slug"] for p in listed] == [public.slug]


# --- favorites_count stays exact through every path (drives the Most popular sort) --------------


async def test_favorites_count_tracks_add_remove_clear(user_client, user_csrf, db_session):
    p = await _make_palette(db_session, "Counted")

    await user_client.post(f"/api/v1/favorites/{p.slug}", headers=user_csrf)
    await db_session.refresh(p)
    assert p.favorites_count == 1

    # Saving again is idempotent: the unique constraint blocks a second row, so no double-count.
    await user_client.post(f"/api/v1/favorites/{p.slug}", headers=user_csrf)
    await db_session.refresh(p)
    assert p.favorites_count == 1

    await user_client.delete(f"/api/v1/favorites/{p.slug}", headers=user_csrf)
    await db_session.refresh(p)
    assert p.favorites_count == 0

    # Removing what is already gone must not push the counter negative.
    await user_client.delete(f"/api/v1/favorites/{p.slug}", headers=user_csrf)
    await db_session.refresh(p)
    assert p.favorites_count == 0


async def test_clear_favorites_decrements_each_count(user_client, user_csrf, db_session):
    a = await _make_palette(db_session, "Clear A")
    b = await _make_palette(db_session, "Clear B")
    await user_client.post(f"/api/v1/favorites/{a.slug}", headers=user_csrf)
    await user_client.post(f"/api/v1/favorites/{b.slug}", headers=user_csrf)

    await user_client.delete("/api/v1/favorites", headers=user_csrf)
    for p in (a, b):
        await db_session.refresh(p)
        assert p.favorites_count == 0


async def test_favorites_count_survives_account_deletion(db_session):
    p = await _make_palette(db_session, "Kept")
    user = await _make_user(db_session, "leaver", "leaver@test.com", "strong-password")
    await crud.add_user_favorite(db_session, user, p)
    await db_session.refresh(p)
    assert p.favorites_count == 1

    await crud.delete_user(db_session, user)
    await db_session.refresh(p)
    assert p.favorites_count == 0


async def test_favorites_count_decrements_on_cascade_user_delete(db_session):
    # Deleting the user row directly relies on the ON DELETE CASCADE to remove the favorite; the
    # trigger fires on that cascade delete, which application code never sees.
    p = await _make_palette(db_session, "Cascaded")
    user = await _make_user(db_session, "cascade", "cascade@test.com", "strong-password")
    await crud.add_user_favorite(db_session, user, p)
    await db_session.refresh(p)
    assert p.favorites_count == 1

    await db_session.delete(user)
    await db_session.commit()
    await db_session.refresh(p)
    assert p.favorites_count == 0


async def test_favorites_count_under_separate_sessions(db_session):
    p = await _make_palette(db_session, "Shared")
    u1 = await _make_user(db_session, "one", "one@test.com", "strong-password")
    u2 = await _make_user(db_session, "two", "two@test.com", "strong-password")

    # Two independent DB sessions each save the palette for a different user. The trigger's row lock
    # serialises the two counter updates, so neither increment is lost.
    async with TestingSessionLocal() as s1, TestingSessionLocal() as s2:
        await crud.add_user_favorite(s1, u1, p)
        await crud.add_user_favorite(s2, u2, p)

    await db_session.refresh(p)
    assert p.favorites_count == 2


async def test_most_popular_order_reflects_saves(client, db_session):
    alpha = await _make_palette(db_session, "Alpha")
    beta = await _make_palette(db_session, "Beta")

    fan1 = await _make_user(db_session, "fan1", "fan1@test.com", "strong-password")
    fan2 = await _make_user(db_session, "fan2", "fan2@test.com", "strong-password")
    # Beta gets two saves, Alpha one, so Beta must sort ahead under "popular".
    await crud.add_user_favorite(db_session, fan1, beta)
    await crud.add_user_favorite(db_session, fan2, beta)
    await crud.add_user_favorite(db_session, fan1, alpha)

    listed = (await client.get("/api/v1/palettes", params={"sort": "popular"})).json()
    slugs = [p["slug"] for p in listed["items"]]
    assert slugs.index(beta.slug) < slugs.index(alpha.slug)

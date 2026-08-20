from app import crud, schemas
from app.security import hash_password


def _palette(name="Sunset Vibes", colors=None, tags=None):
    return schemas.PaletteCreate(
        name=name,
        colors=colors or ["#112233", "#445566"],
        tags=tags or ["warm"],
    )


def test_slugify():
    assert crud.slugify("  Hello World!! ") == "hello-world"
    assert crud.slugify("###") == "palette"


async def test_unique_slug_collision(db_session):
    await crud.create_palette(db_session, _palette("Ocean"))
    second = await crud.create_palette(db_session, _palette("Ocean"))
    assert second.slug == "ocean-2"


async def test_create_and_get_by_slug(db_session):
    created = await crud.create_palette(db_session, _palette("Forest"))
    fetched = await crud.get_palette_by_slug(db_session, "forest")
    assert fetched is not None
    assert fetched.id == created.id
    assert fetched.colors == ["#112233", "#445566"]


async def test_update_palette_changes_slug(db_session):
    palette = await crud.create_palette(db_session, _palette("Old Name"))
    updated = await crud.update_palette(
        db_session, palette, schemas.PaletteUpdate(name="Brand New Name")
    )
    assert updated.slug == "brand-new-name"


async def test_delete_palette(db_session):
    palette = await crud.create_palette(db_session, _palette("Temp"))
    await crud.delete_palette(db_session, palette)
    assert await crud.get_palette_by_slug(db_session, "temp") is None


async def test_create_many_if_empty_is_noop_when_populated(db_session):
    first = await crud.create_many_if_empty(db_session, [_palette("Aa"), _palette("Bb")])
    assert first == 2
    second = await crud.create_many_if_empty(db_session, [_palette("Cc")])
    assert second == 0


async def _user(db, is_admin=False):
    return await crud.create_user(
        db,
        schemas.UserCreate(username="favuser", email="fav@test.com", password="strong-password"),
        hash_password("strong-password"),
        is_admin=is_admin,
    )


async def test_favorites_add_idempotent_and_remove(db_session):
    user = await _user(db_session)
    palette = await crud.create_palette(db_session, _palette("Favable"))

    await crud.add_user_favorite(db_session, user, palette)
    await crud.add_user_favorite(db_session, user, palette)  # duplicate is ignored

    assert await crud.is_user_favorite(db_session, user, palette) is True
    assert await crud.get_user_favorite_keys(db_session, user) == [palette.slug]

    assert await crud.remove_user_favorite(db_session, user, palette) is True
    assert await crud.is_user_favorite(db_session, user, palette) is False
    assert await crud.remove_user_favorite(db_session, user, palette) is False


async def test_clear_user_favorites(db_session):
    user = await _user(db_session)
    p1 = await crud.create_palette(db_session, _palette("One"))
    p2 = await crud.create_palette(db_session, _palette("Two"))
    await crud.add_user_favorite(db_session, user, p1)
    await crud.add_user_favorite(db_session, user, p2)

    assert await crud.clear_user_favorites(db_session, user) == 2
    assert await crud.get_user_favorite_keys(db_session, user) == []


async def test_favorite_add_survives_a_lost_race(db_session):
    """Two requests saving the same palette at once must not produce a server error.

    add_user_favorite checks before it inserts, so the check can pass in both callers before
    either commits — a double-clicked heart, or two tabs. uq_user_palette_favorite then decides,
    and the loser used to surface an IntegrityError as a 500 for a button pressed twice. Raced
    here on purpose with two sessions rather than asserted through the sequential path, which
    never reaches the constraint at all.
    """
    import asyncio

    from conftest import TestingSessionLocal

    user = await _user(db_session)
    palette = await crud.create_palette(db_session, _palette("Contested"))

    async def add() -> None:
        async with TestingSessionLocal() as session:
            fresh_user = await crud.get_user(session, user.id)
            fresh_palette = await crud.get_palette(session, palette.id)
            assert fresh_user is not None and fresh_palette is not None
            await crud.add_user_favorite(session, fresh_user, fresh_palette)

    await asyncio.gather(add(), add())

    # Whoever won, the caller's intent holds and exactly one row exists.
    assert await crud.get_user_favorite_keys(db_session, user) == [palette.slug]


async def test_purge_expired_refresh_tokens(db_session):
    """Expired rows are unreachable by every path that reads them, so they are only storage.

    Every login writes one and every rotation writes another while the old row is merely
    flagged revoked, so without this the table grew for the lifetime of the deployment.
    """
    from datetime import UTC, datetime, timedelta

    user = await _user(db_session)
    now = datetime.now(UTC)
    await crud.create_refresh_token(db_session, user.id, "live-hash", now + timedelta(days=1))
    await crud.create_refresh_token(db_session, user.id, "dead-hash", now - timedelta(seconds=1))

    assert await crud.purge_expired_refresh_tokens(db_session) == 1
    assert await crud.get_refresh_token(db_session, "dead-hash") is None
    assert await crud.get_refresh_token(db_session, "live-hash") is not None

    # Nothing left to remove, so a second run is a no-op rather than an error.
    assert await crud.purge_expired_refresh_tokens(db_session) == 0

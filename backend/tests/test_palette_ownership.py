"""Owner-scoped palette CRUD (v5.0 step 2.2): any signed-in user creates private palettes;
edit/delete is owner-or-admin; a private palette is invisible to everyone else.

Each actor gets its own AsyncClient (own cookie jar), because the shared `client` fixture holds a
single session — two roles cannot both be logged into it at once.
"""

from contextlib import asynccontextmanager

from app import crud, models, schemas
from app.main import app
from app.security import hash_password
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select


def _new_client() -> AsyncClient:
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


def _csrf(client: AsyncClient) -> dict[str, str]:
    return {"X-CSRF-Token": client.cookies.get("csrf_token", "")}


@asynccontextmanager
async def _actor(username: str, db_session, *, is_admin: bool = False):
    """A fresh client logged in as a newly created user, closed on exit. A context manager because
    the client must be opened (via `async with`) before the login request, not after."""
    await crud.create_user(
        db=db_session,
        user_data=schemas.UserCreate(
            username=username, email=f"{username}@test.com", password="strong-password"
        ),
        password_hash=hash_password("strong-password"),
        is_admin=is_admin,
    )
    async with _new_client() as client:
        await client.post(
            "/api/v1/auth/login",
            json={"username": username, "password": "strong-password"},
        )
        yield client


async def _create(client: AsyncClient, name: str) -> dict:
    resp = await client.post(
        "/api/v1/palettes",
        headers=_csrf(client),
        json={"name": name, "colors": ["#abcdef"]},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


async def test_signed_in_user_creates_a_private_palette(db_session):
    async with _actor("maker", db_session) as maker:
        body = await _create(maker, "My Draft")
    assert body["owner_handle"] == "maker"

    palette = (
        await db_session.execute(select(models.Palette).where(models.Palette.slug == body["slug"]))
    ).scalar_one()
    assert palette.visibility == "private"
    assert palette.owner_id is not None


async def test_guest_cannot_create(client):
    # No auth cookie, so the CSRF middleware lets it through to the endpoint's own auth check.
    resp = await client.post("/api/v1/palettes", json={"name": "Nope", "colors": ["#123456"]})
    assert resp.status_code == 401


async def test_owner_edits_and_deletes_own(db_session):
    async with _actor("owner1", db_session) as owner:
        created = await _create(owner, "Mine")
        pid = created["id"]

        edited = await owner.put(
            f"/api/v1/palettes/{pid}", headers=_csrf(owner), json={"name": "Mine Renamed"}
        )
        assert edited.status_code == 200
        assert edited.json()["name"] == "Mine Renamed"

        deleted = await owner.delete(f"/api/v1/palettes/{pid}", headers=_csrf(owner))
        assert deleted.status_code == 204


async def test_cannot_edit_another_users_palette(db_session):
    async with _actor("owner2", db_session) as owner:
        pid = (await _create(owner, "Not Yours"))["id"]

    async with _actor("intruder", db_session) as intruder:
        # 404, not 403: editing a palette you do not own must not confirm it exists.
        resp = await intruder.put(
            f"/api/v1/palettes/{pid}", headers=_csrf(intruder), json={"name": "Hijacked"}
        )
        assert resp.status_code == 404


async def test_admin_can_edit_any_palette(db_session):
    async with _actor("owner3", db_session) as owner:
        pid = (await _create(owner, "User Owned"))["id"]

    async with _actor("mod", db_session, is_admin=True) as admin:
        resp = await admin.put(
            f"/api/v1/palettes/{pid}", headers=_csrf(admin), json={"name": "Moderated"}
        )
        assert resp.status_code == 200


async def test_private_palette_hidden_from_others(db_session):
    async with _actor("owner4", db_session) as owner:
        created = await _create(owner, "Secret")
        handle, slug = created["owner_handle"], created["slug"]

        # The owner reads it.
        assert (await owner.get(f"/api/v1/users/{handle}/palettes/{slug}")).status_code == 200

    # A guest cannot — 404, its existence undisclosed — on both the scoped and the flat route.
    async with _new_client() as anon:
        assert (await anon.get(f"/api/v1/users/{handle}/palettes/{slug}")).status_code == 404
        assert (await anon.get(f"/api/v1/palettes/{slug}")).status_code == 404

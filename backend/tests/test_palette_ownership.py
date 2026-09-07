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


async def test_mine_lists_only_your_own(db_session):
    async with _actor("lister", db_session) as me:
        await _create(me, "Mine One")
        await _create(me, "Mine Two")
        mine = (await me.get("/api/v1/palettes/mine")).json()
        assert mine["total"] == 2
        assert {p["name"] for p in mine["items"]} == {"Mine One", "Mine Two"}
        assert all(p["visibility"] == "private" for p in mine["items"])

    async with _actor("other-lister", db_session) as other:
        assert (await other.get("/api/v1/palettes/mine")).json()["total"] == 0


async def test_mine_requires_auth(client):
    assert (await client.get("/api/v1/palettes/mine")).status_code == 401


async def test_publish_and_unpublish_toggles_visibility(db_session):
    async with _actor("publisher", db_session) as me:
        created = await _create(me, "Draft")
        pid, handle, slug = created["id"], created["owner_handle"], created["slug"]

        published = await me.put(
            f"/api/v1/palettes/{pid}", headers=_csrf(me), json={"visibility": "public"}
        )
        assert published.status_code == 200
        assert published.json()["visibility"] == "public"

    # Now visible to a guest.
    async with _new_client() as anon:
        assert (await anon.get(f"/api/v1/users/{handle}/palettes/{slug}")).status_code == 200

    # Publishing then re-privatising hides it again.
    async with _actor("republisher", db_session) as owner:
        c = await _create(owner, "Oncemore")
        cid, chandle, cslug = c["id"], c["owner_handle"], c["slug"]
        await owner.put(
            f"/api/v1/palettes/{cid}", headers=_csrf(owner), json={"visibility": "public"}
        )
        await owner.put(
            f"/api/v1/palettes/{cid}", headers=_csrf(owner), json={"visibility": "private"}
        )
    async with _new_client() as anon:
        assert (await anon.get(f"/api/v1/users/{chandle}/palettes/{cslug}")).status_code == 404


async def _publish(client, pid):
    resp = await client.put(
        f"/api/v1/palettes/{pid}", headers=_csrf(client), json={"visibility": "public"}
    )
    assert resp.status_code == 200, resp.text


async def test_fork_copies_a_public_palette_into_your_account(db_session):
    async with _actor("source-owner", db_session) as owner:
        src = await _create(owner, "Original")
        await _publish(owner, src["id"])
        src_id = src["id"]

    async with _actor("forker", db_session) as forker:
        forked = await forker.post(f"/api/v1/palettes/{src_id}/fork", headers=_csrf(forker))
        assert forked.status_code == 201, forked.text
        body = forked.json()
        assert body["owner_handle"] == "forker"
        assert body["visibility"] == "private"
        assert body["name"] == "Original"
        assert body["forked_from"]["slug"] == src["slug"]
        assert body["forked_from"]["owner_handle"] == "source-owner"

    # The source's fork counter went up.
    src_row = await crud.get_palette(db_session, src_id)
    assert src_row.forks_count == 1


async def test_fork_requires_auth(client, db_session):
    async with _actor("owner-x", db_session) as owner:
        src = await _create(owner, "Public One")
        await _publish(owner, src["id"])
        src_id = src["id"]
    assert (await client.post(f"/api/v1/palettes/{src_id}/fork")).status_code == 401


async def test_cannot_fork_a_private_palette_you_do_not_own(db_session):
    async with _actor("private-owner", db_session) as owner:
        src_id = (await _create(owner, "Secret"))["id"]

    async with _actor("stranger", db_session) as stranger:
        resp = await stranger.post(f"/api/v1/palettes/{src_id}/fork", headers=_csrf(stranger))
        assert resp.status_code == 404


async def _public(owner, name):
    p = await _create(owner, name)
    await _publish(owner, p["id"])
    return p


async def test_report_is_idempotent(db_session):
    async with _actor("rep-owner", db_session) as owner:
        pid = (await _public(owner, "Reportable"))["id"]
    async with _actor("reporter", db_session) as reporter:
        r1 = await reporter.post(
            f"/api/v1/palettes/{pid}/report", headers=_csrf(reporter), json={"reason": "spam"}
        )
        r2 = await reporter.post(
            f"/api/v1/palettes/{pid}/report", headers=_csrf(reporter), json={"reason": "spam"}
        )
        assert r1.status_code == 201 and r2.status_code == 201
        assert r1.json()["id"] == r2.json()["id"]


async def test_report_requires_auth(client, db_session):
    async with _actor("rep-owner2", db_session) as owner:
        pid = (await _public(owner, "Reportable Two"))["id"]
    resp = await client.post(f"/api/v1/palettes/{pid}/report", json={"reason": "spam"})
    assert resp.status_code == 401


async def test_reports_queue_is_admin_only(db_session):
    async with _actor("plain-user", db_session) as user:
        assert (await user.get("/api/v1/reports")).status_code == 403


async def test_admin_action_removes_the_palette(db_session):
    async with _actor("bad-owner", db_session) as owner:
        p = await _public(owner, "Bad One")
        pid, handle, slug = p["id"], p["owner_handle"], p["slug"]
    async with _actor("flagger", db_session) as flagger:
        await flagger.post(
            f"/api/v1/palettes/{pid}/report",
            headers=_csrf(flagger),
            json={"reason": "offensive"},
        )
    async with _actor("mod-admin", db_session, is_admin=True) as admin:
        queue = (await admin.get("/api/v1/reports")).json()
        assert len(queue) == 1
        assert queue[0]["palette"]["slug"] == slug
        actioned = await admin.post(
            f"/api/v1/reports/{queue[0]['id']}/action", headers=_csrf(admin)
        )
        assert actioned.status_code == 200
        assert actioned.json()["status"] == "actioned"
        # The queue is empty once the only open report is closed.
        assert (await admin.get("/api/v1/reports")).json() == []

    # The palette is soft-removed: gone from the public feed and 404 to a guest, but the row lives.
    async with _new_client() as anon:
        feed = (await anon.get("/api/v1/palettes")).json()["items"]
        assert slug not in {p["slug"] for p in feed}
        assert (await anon.get(f"/api/v1/users/{handle}/palettes/{slug}")).status_code == 404
    removed = await crud.get_palette(db_session, pid)
    assert removed is not None and removed.status == "removed"


async def test_admin_dismiss_keeps_the_palette(db_session):
    async with _actor("ok-owner", db_session) as owner:
        p = await _public(owner, "Fine One")
        pid, slug = p["id"], p["slug"]
    async with _actor("flagger2", db_session) as flagger:
        await flagger.post(
            f"/api/v1/palettes/{pid}/report", headers=_csrf(flagger), json={"reason": "other"}
        )
    async with _actor("mod-admin2", db_session, is_admin=True) as admin:
        rid = (await admin.get("/api/v1/reports")).json()[0]["id"]
        dismissed = await admin.post(f"/api/v1/reports/{rid}/dismiss", headers=_csrf(admin))
        assert dismissed.json()["status"] == "dismissed"
        assert (await admin.get("/api/v1/reports")).json() == []

    async with _new_client() as anon:
        feed = (await anon.get("/api/v1/palettes")).json()["items"]
        assert slug in {p["slug"] for p in feed}

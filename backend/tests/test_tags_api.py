import pytest_asyncio
from app import crud, schemas


@pytest_asyncio.fixture
async def palette_with_tags(db_session):
    await crud.create_palette(
        db_session,
        schemas.PaletteCreate(name="Tagged One", colors=["#112233"], tags=["web", "retro"]),
    )


async def test_catalog_starts_empty(client):
    resp = await client.get("/api/v1/tags")
    assert resp.status_code == 200
    assert resp.json() == []


async def test_create_requires_auth(client):
    resp = await client.post("/api/v1/tags", json={"name": "web"})
    assert resp.status_code == 401


async def test_create_normalizes_and_rejects_duplicate(admin_client, admin_csrf):
    created = await admin_client.post(
        "/api/v1/tags", headers=admin_csrf, json={"name": "Branding", "kind": "purpose"}
    )
    assert created.status_code == 201
    assert created.json() == {"name": "branding", "kind": "purpose", "count": 0}

    dup = await admin_client.post("/api/v1/tags", headers=admin_csrf, json={"name": "branding"})
    assert dup.status_code == 409


async def test_catalog_merges_palette_tags(admin_client, admin_csrf, palette_with_tags):
    await admin_client.post(
        "/api/v1/tags", headers=admin_csrf, json={"name": "web", "kind": "purpose"}
    )

    catalog = (await admin_client.get("/api/v1/tags")).json()
    by_name = {tag["name"]: tag for tag in catalog}

    # A purpose catalog tag also used by one palette.
    assert by_name["web"] == {"name": "web", "kind": "purpose", "count": 1}
    # A tag that exists only inside a palette shows up as a free tag with its usage count.
    assert by_name["retro"] == {"name": "retro", "kind": "free", "count": 1}
    # Purpose categories are listed before free tags.
    assert catalog[0]["kind"] == "purpose"


async def test_rename_propagates_to_palettes(admin_client, admin_csrf, palette_with_tags):
    # "retro" exists only inside the palette; renaming still updates it.
    resp = await admin_client.patch(
        "/api/v1/tags/retro", headers=admin_csrf, json={"name": "vintage"}
    )
    assert resp.status_code == 200

    tags = (await admin_client.get("/api/v1/palettes")).json()["items"][0]["tags"]
    assert "vintage" in tags
    assert "retro" not in tags


async def test_rename_clash_returns_409(admin_client, admin_csrf):
    await admin_client.post("/api/v1/tags", headers=admin_csrf, json={"name": "one"})
    await admin_client.post("/api/v1/tags", headers=admin_csrf, json={"name": "two"})

    resp = await admin_client.patch("/api/v1/tags/one", headers=admin_csrf, json={"name": "two"})
    assert resp.status_code == 409


async def test_reclassify_kind(admin_client, admin_csrf):
    await admin_client.post(
        "/api/v1/tags", headers=admin_csrf, json={"name": "solo", "kind": "free"}
    )

    resp = await admin_client.patch(
        "/api/v1/tags/solo", headers=admin_csrf, json={"kind": "purpose"}
    )
    assert resp.status_code == 200
    assert resp.json()["kind"] == "purpose"


async def test_delete_removes_from_catalog_and_palettes(
    admin_client, admin_csrf, palette_with_tags
):
    resp = await admin_client.delete("/api/v1/tags/web", headers=admin_csrf)
    assert resp.status_code == 204

    tags = (await admin_client.get("/api/v1/palettes")).json()["items"][0]["tags"]
    assert "web" not in tags

    catalog = (await admin_client.get("/api/v1/tags")).json()
    assert all(tag["name"] != "web" for tag in catalog)


async def test_delete_missing_returns_404(admin_client, admin_csrf):
    assert (await admin_client.delete("/api/v1/tags/nope", headers=admin_csrf)).status_code == 404


async def test_non_admin_cannot_manage(user_client, user_csrf):
    resp = await user_client.post("/api/v1/tags", headers=user_csrf, json={"name": "x"})
    assert resp.status_code == 403

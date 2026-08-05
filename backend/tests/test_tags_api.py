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


async def test_create_normalizes_and_rejects_duplicate(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}

    created = await client.post(
        "/api/v1/tags", headers=headers, json={"name": "Branding", "kind": "purpose"}
    )
    assert created.status_code == 201
    assert created.json() == {"name": "branding", "kind": "purpose", "count": 0}

    dup = await client.post("/api/v1/tags", headers=headers, json={"name": "branding"})
    assert dup.status_code == 409


async def test_catalog_merges_palette_tags(client, admin_token, palette_with_tags):
    headers = {"Authorization": f"Bearer {admin_token}"}
    await client.post("/api/v1/tags", headers=headers, json={"name": "web", "kind": "purpose"})

    catalog = (await client.get("/api/v1/tags")).json()
    by_name = {tag["name"]: tag for tag in catalog}

    # A purpose catalog tag also used by one palette.
    assert by_name["web"] == {"name": "web", "kind": "purpose", "count": 1}
    # A tag that exists only inside a palette shows up as a free tag with its usage count.
    assert by_name["retro"] == {"name": "retro", "kind": "free", "count": 1}
    # Purpose categories are listed before free tags.
    assert catalog[0]["kind"] == "purpose"


async def test_rename_propagates_to_palettes(client, admin_token, palette_with_tags):
    headers = {"Authorization": f"Bearer {admin_token}"}

    # "retro" exists only inside the palette; renaming still updates it.
    resp = await client.patch("/api/v1/tags/retro", headers=headers, json={"name": "vintage"})
    assert resp.status_code == 200

    tags = (await client.get("/api/v1/palettes")).json()["items"][0]["tags"]
    assert "vintage" in tags
    assert "retro" not in tags


async def test_rename_clash_returns_409(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    await client.post("/api/v1/tags", headers=headers, json={"name": "one"})
    await client.post("/api/v1/tags", headers=headers, json={"name": "two"})

    resp = await client.patch("/api/v1/tags/one", headers=headers, json={"name": "two"})
    assert resp.status_code == 409


async def test_reclassify_kind(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    await client.post("/api/v1/tags", headers=headers, json={"name": "solo", "kind": "free"})

    resp = await client.patch("/api/v1/tags/solo", headers=headers, json={"kind": "purpose"})
    assert resp.status_code == 200
    assert resp.json()["kind"] == "purpose"


async def test_delete_removes_from_catalog_and_palettes(client, admin_token, palette_with_tags):
    headers = {"Authorization": f"Bearer {admin_token}"}

    resp = await client.delete("/api/v1/tags/web", headers=headers)
    assert resp.status_code == 204

    tags = (await client.get("/api/v1/palettes")).json()["items"][0]["tags"]
    assert "web" not in tags

    catalog = (await client.get("/api/v1/tags")).json()
    assert all(tag["name"] != "web" for tag in catalog)


async def test_delete_missing_returns_404(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    assert (await client.delete("/api/v1/tags/nope", headers=headers)).status_code == 404


async def test_non_admin_cannot_manage(client, user_token):
    headers = {"Authorization": f"Bearer {user_token}"}
    resp = await client.post("/api/v1/tags", headers=headers, json={"name": "x"})
    assert resp.status_code == 403

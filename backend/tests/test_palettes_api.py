import pytest_asyncio
from app import crud, schemas


@pytest_asyncio.fixture
async def seeded(db_session):
    await crud.create_palette(
        db_session,
        schemas.PaletteCreate(name="Alpha Warm", colors=["#aa1122"], tags=["warm", "bold"]),
    )
    await crud.create_palette(
        db_session,
        schemas.PaletteCreate(name="Beta Cold", colors=["#1122aa"], tags=["cold"]),
    )
    await crud.create_palette(
        db_session,
        schemas.PaletteCreate(name="Gamma Warm", colors=["#aa8811"], tags=["warm"]),
    )


async def test_list_all(client, seeded):
    resp = await client.get("/api/v1/palettes")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 3
    assert len(body["items"]) == 3
    assert resp.headers["X-Total-Count"] == "3"


async def test_search(client, seeded):
    resp = await client.get("/api/v1/palettes", params={"search": "beta"})
    assert [p["name"] for p in resp.json()["items"]] == ["Beta Cold"]


async def test_tag_filter(client, seeded):
    resp = await client.get("/api/v1/palettes", params={"tag": "warm"})
    names = {p["name"] for p in resp.json()["items"]}
    assert names == {"Alpha Warm", "Gamma Warm"}


async def test_sort_az_za(client, seeded):
    az = (await client.get("/api/v1/palettes", params={"sort": "az"})).json()["items"]
    za = (await client.get("/api/v1/palettes", params={"sort": "za"})).json()["items"]
    az_names = [p["name"] for p in az]
    za_names = [p["name"] for p in za]
    assert az_names == sorted(az_names)
    assert za_names == sorted(za_names, reverse=True)


async def test_get_by_slug_404(client):
    assert (await client.get("/api/v1/palettes/does-not-exist")).status_code == 404


async def test_error_is_problem_json(client):
    resp = await client.get("/api/v1/palettes/does-not-exist")
    assert resp.status_code == 404
    assert resp.headers["content-type"].startswith("application/problem+json")
    body = resp.json()
    assert body["status"] == 404
    assert body["title"]
    assert body["detail"] == "Palette not found"


async def test_create_requires_auth(client):
    resp = await client.post(
        "/api/v1/palettes", json={"name": "NoAuth", "colors": ["#123456"], "tags": []}
    )
    assert resp.status_code == 401


async def test_admin_create_update_delete(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}

    created = await client.post(
        "/api/v1/palettes",
        headers=headers,
        json={"name": "Admin Made", "colors": ["#123456", "#654321"], "tags": ["new"]},
    )
    assert created.status_code == 201
    palette_id = created.json()["id"]

    updated = await client.put(
        f"/api/v1/palettes/{palette_id}",
        headers=headers,
        json={"name": "Admin Renamed"},
    )
    assert updated.status_code == 200
    assert updated.json()["slug"] == "admin-renamed"

    deleted = await client.delete(f"/api/v1/palettes/{palette_id}", headers=headers)
    assert deleted.status_code == 204

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


async def test_search_matches_tags(client, seeded):
    # Tags are searchable through the JSONB-as-text branch, not just the ?tag= filter.
    resp = await client.get("/api/v1/palettes", params={"search": "bol"})
    assert [p["name"] for p in resp.json()["items"]] == ["Alpha Warm"]


async def test_search_treats_wildcards_literally(client, seeded):
    # "%" used to be passed straight into LIKE and matched every palette.
    for pattern in ("%", "_", "%%"):
        resp = await client.get("/api/v1/palettes", params={"search": pattern})
        assert resp.json()["total"] == 0, f"{pattern!r} behaved as a wildcard"


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


async def test_admin_create_update_delete(admin_client, admin_csrf):
    created = await admin_client.post(
        "/api/v1/palettes",
        headers=admin_csrf,
        json={"name": "Admin Made", "colors": ["#123456", "#654321"], "tags": ["new"]},
    )
    assert created.status_code == 201
    palette_id = created.json()["id"]

    updated = await admin_client.put(
        f"/api/v1/palettes/{palette_id}",
        headers=admin_csrf,
        json={"name": "Admin Renamed"},
    )
    assert updated.status_code == 200
    assert updated.json()["slug"] == "admin-renamed"

    deleted = await admin_client.delete(f"/api/v1/palettes/{palette_id}", headers=admin_csrf)
    assert deleted.status_code == 204


async def test_update_with_unchanged_name_keeps_slug(admin_client, admin_csrf):
    created = await admin_client.post(
        "/api/v1/palettes",
        headers=admin_csrf,
        json={"name": "Stable Name", "colors": ["#123456"], "tags": []},
    )
    palette_id, original_slug = created.json()["id"], created.json()["slug"]

    updated = await admin_client.put(
        f"/api/v1/palettes/{palette_id}",
        headers=admin_csrf,
        json={"name": "Stable Name", "description": "only the description moved"},
    )
    assert updated.status_code == 200
    assert updated.json()["slug"] == original_slug


async def test_seeding_gives_colliding_names_distinct_slugs(db_session):
    created = await crud.create_many_if_empty(
        db_session,
        [
            schemas.PaletteCreate(name="Same Name", colors=["#111111"], tags=[]),
            schemas.PaletteCreate(name="Same Name", colors=["#222222"], tags=[]),
            schemas.PaletteCreate(name="Same Name", colors=["#333333"], tags=[]),
        ],
    )
    assert created == 3

    slugs = [p.slug for p in await crud.get_palettes(db_session)]
    assert sorted(slugs) == ["same-name", "same-name-2", "same-name-3"]


async def _login(client, username, password="strong-password"):
    resp = await client.post(
        "/api/v1/auth/login", json={"username": username, "password": password}
    )
    assert resp.status_code == 200
    return {"X-CSRF-Token": client.cookies.get("csrf_token", "")}


async def test_admin_delete_palette_that_someone_favorited(admin_client, admin_csrf):
    """favorites.palette_id references the palette, so deleting it must cascade.

    Without ON DELETE CASCADE this raises ForeignKeyViolation and the endpoint 500s.
    """
    created = await admin_client.post(
        "/api/v1/palettes",
        headers=admin_csrf,
        json={"name": "Loved Palette", "colors": ["#123456"], "tags": []},
    )
    assert created.status_code == 201
    palette_id, slug = created.json()["id"], created.json()["slug"]

    await admin_client.post(
        "/api/v1/auth/register",
        json={"username": "fan", "email": "fan@test.com", "password": "strong-password"},
    )
    fan_csrf = await _login(admin_client, "fan")
    favorited = await admin_client.post(f"/api/v1/favorites/{slug}", headers=fan_csrf)
    assert favorited.status_code == 201

    csrf = await _login(admin_client, "adminuser")
    deleted = await admin_client.delete(f"/api/v1/palettes/{palette_id}", headers=csrf)
    assert deleted.status_code == 204

    await _login(admin_client, "fan")
    assert (await admin_client.get("/api/v1/favorites")).json() == []


async def test_list_includes_owner_handle(client, seeded):
    # Every palette carries the owner handle the frontend builds its /u/:handle/:slug URL from;
    # a palette with no owner falls back to the curator handle.
    body = (await client.get("/api/v1/palettes")).json()
    assert all(p["owner_handle"] == "palette" for p in body["items"])


async def test_read_palette_by_owner_handle(client, seeded):
    slug = (await client.get("/api/v1/palettes")).json()["items"][0]["slug"]
    resp = await client.get(f"/api/v1/users/palette/palettes/{slug}")
    assert resp.status_code == 200
    body = resp.json()
    assert body["slug"] == slug
    assert body["owner_handle"] == "palette"


async def test_read_palette_wrong_handle_is_404(client, seeded):
    # A real slug under the wrong handle must not leak across owners.
    slug = (await client.get("/api/v1/palettes")).json()["items"][0]["slug"]
    resp = await client.get(f"/api/v1/users/nobody/palettes/{slug}")
    assert resp.status_code == 404


async def test_read_palette_unknown_slug_is_404(client):
    resp = await client.get("/api/v1/users/palette/palettes/does-not-exist")
    assert resp.status_code == 404

import pytest
from app import crud, schemas


@pytest.fixture
def seeded(db_session):
    crud.create_palette(
        db_session,
        schemas.PaletteCreate(name="Alpha Warm", colors=["#aa1122"], tags=["warm", "bold"]),
    )
    crud.create_palette(
        db_session,
        schemas.PaletteCreate(name="Beta Cold", colors=["#1122aa"], tags=["cold"]),
    )
    crud.create_palette(
        db_session,
        schemas.PaletteCreate(name="Gamma Warm", colors=["#aa8811"], tags=["warm"]),
    )


def test_list_all(client, seeded):
    resp = client.get("/api/v1/palettes")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 3
    assert len(body["items"]) == 3
    assert resp.headers["X-Total-Count"] == "3"


def test_search(client, seeded):
    resp = client.get("/api/v1/palettes", params={"search": "beta"})
    assert [p["name"] for p in resp.json()["items"]] == ["Beta Cold"]


def test_tag_filter(client, seeded):
    resp = client.get("/api/v1/palettes", params={"tag": "warm"})
    names = {p["name"] for p in resp.json()["items"]}
    assert names == {"Alpha Warm", "Gamma Warm"}


def test_sort_az_za(client, seeded):
    az = [p["name"] for p in client.get("/api/v1/palettes", params={"sort": "az"}).json()["items"]]
    za = [p["name"] for p in client.get("/api/v1/palettes", params={"sort": "za"}).json()["items"]]
    assert az == sorted(az)
    assert za == sorted(za, reverse=True)


def test_get_by_slug_404(client):
    assert client.get("/api/v1/palettes/does-not-exist").status_code == 404


def test_error_is_problem_json(client):
    resp = client.get("/api/v1/palettes/does-not-exist")
    assert resp.status_code == 404
    assert resp.headers["content-type"].startswith("application/problem+json")
    body = resp.json()
    assert body["status"] == 404
    assert body["title"]
    assert body["detail"] == "Palette not found"


def test_create_requires_auth(client):
    resp = client.post(
        "/api/v1/palettes", json={"name": "NoAuth", "colors": ["#123456"], "tags": []}
    )
    assert resp.status_code == 401


def test_admin_create_update_delete(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}

    created = client.post(
        "/api/v1/palettes",
        headers=headers,
        json={"name": "Admin Made", "colors": ["#123456", "#654321"], "tags": ["new"]},
    )
    assert created.status_code == 201
    palette_id = created.json()["id"]

    updated = client.put(
        f"/api/v1/palettes/{palette_id}",
        headers=headers,
        json={"name": "Admin Renamed"},
    )
    assert updated.status_code == 200
    assert updated.json()["slug"] == "admin-renamed"

    deleted = client.delete(f"/api/v1/palettes/{palette_id}", headers=headers)
    assert deleted.status_code == 204

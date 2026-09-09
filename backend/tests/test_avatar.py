"""The profile-avatar endpoints (routers/users.py): a size-capped image data URL on the user."""

import pytest
from conftest import csrf_headers

# A 1x1 PNG as a data URL — the smallest valid case.
_PNG = (
    "data:image/png;base64,"
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
)


@pytest.mark.asyncio
async def test_set_and_read_avatar(user_client):
    resp = await user_client.put(
        "/api/v1/users/me/avatar", json={"avatar": _PNG}, headers=csrf_headers(user_client)
    )
    assert resp.status_code == 200
    assert resp.json()["avatar"] == _PNG
    # It comes back on the session too.
    me = await user_client.get("/api/v1/auth/me")
    assert me.json()["avatar"] == _PNG


@pytest.mark.asyncio
async def test_avatar_requires_auth(client):
    resp = await client.put("/api/v1/users/me/avatar", json={"avatar": _PNG})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_non_image_data_url_is_rejected(user_client):
    resp = await user_client.put(
        "/api/v1/users/me/avatar",
        json={"avatar": "data:text/html;base64,PGgxPmhp"},
        headers=csrf_headers(user_client),
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_oversized_avatar_is_rejected(user_client):
    huge = "data:image/png;base64," + ("A" * 700_001)
    resp = await user_client.put(
        "/api/v1/users/me/avatar", json={"avatar": huge}, headers=csrf_headers(user_client)
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_clear_avatar(user_client):
    await user_client.put(
        "/api/v1/users/me/avatar", json={"avatar": _PNG}, headers=csrf_headers(user_client)
    )
    resp = await user_client.request(
        "DELETE", "/api/v1/users/me/avatar", headers=csrf_headers(user_client)
    )
    assert resp.status_code == 204
    me = await user_client.get("/api/v1/auth/me")
    assert me.json()["avatar"] is None


@pytest.mark.asyncio
async def test_public_avatar_endpoint_serves_the_image(user_client, client):
    await user_client.put(
        "/api/v1/users/me/avatar", json={"avatar": _PNG}, headers=csrf_headers(user_client)
    )
    # Anyone (even logged out) can fetch it by handle, as a real cacheable image.
    resp = await client.get("/api/v1/users/normaluser/avatar")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "image/png"
    assert resp.headers.get("cache-control") == "public, max-age=3600"
    assert "etag" in resp.headers
    # The bytes are the decoded PNG, not the data URL.
    assert resp.content[:8] == b"\x89PNG\r\n\x1a\n"


@pytest.mark.asyncio
async def test_public_avatar_404_when_absent(client):
    assert (await client.get("/api/v1/users/normaluser/avatar")).status_code == 404
    assert (await client.get("/api/v1/users/nobody/avatar")).status_code == 404


@pytest.mark.asyncio
async def test_public_profile_and_404(user_client, client):
    resp = await client.get("/api/v1/users/normaluser")
    assert resp.status_code == 200
    body = resp.json()
    assert body["handle"] == "normaluser"
    assert body["has_avatar"] is False
    assert body["palette_count"] == 0
    assert "created_at" in body
    # An unknown handle is a real not-found, not an empty profile.
    assert (await client.get("/api/v1/users/nobody")).status_code == 404
    assert (await client.get("/api/v1/users/nobody/palettes")).status_code == 404


@pytest.mark.asyncio
async def test_avatar_304_on_matching_etag(user_client, client):
    await user_client.put(
        "/api/v1/users/me/avatar", json={"avatar": _PNG}, headers=csrf_headers(user_client)
    )
    first = await client.get("/api/v1/users/normaluser/avatar")
    assert first.status_code == 200
    etag = first.headers["etag"]
    # A conditional request with the same ETag gets 304 and no body.
    again = await client.get("/api/v1/users/normaluser/avatar", headers={"If-None-Match": etag})
    assert again.status_code == 304
    assert again.content == b""

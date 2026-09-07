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

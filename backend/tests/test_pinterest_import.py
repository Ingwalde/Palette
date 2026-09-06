"""Pinterest import (routers/pinterest.py) — the OAuth link and board/pin listing.

Every Pinterest HTTP call is served by an httpx.MockTransport, so no real Pinterest app or network
is needed. The provider is force-enabled per test by setting its credentials on the live settings.
"""

import httpx
import pytest
from app import config, crud
from app.routers import pinterest
from app.security import decode_oauth_state, encrypt_secret

_RealAsyncClient = httpx.AsyncClient


def _enable(monkeypatch):
    monkeypatch.setattr(config.settings, "pinterest_client_id", "pid", raising=False)
    monkeypatch.setattr(config.settings, "pinterest_client_secret", "psecret", raising=False)
    monkeypatch.setattr(
        config.settings,
        "pinterest_redirect_uri",
        "https://app.test/api/v1/import/pinterest/callback",
        raising=False,
    )


def _mock(monkeypatch, handler):
    def factory(*_args, **kwargs):
        kwargs.pop("timeout", None)
        kwargs.pop("follow_redirects", None)
        return _RealAsyncClient(transport=httpx.MockTransport(handler), **kwargs)

    monkeypatch.setattr(pinterest.httpx, "AsyncClient", factory)


def _default_handler(request: httpx.Request) -> httpx.Response:
    path = request.url.path
    if path.endswith("/oauth/token"):
        return httpx.Response(
            200,
            json={"access_token": "at-1", "refresh_token": "rt-1", "expires_in": 3600},
        )
    if path.endswith("/boards"):
        return httpx.Response(
            200,
            json={"items": [{"id": "b1", "name": "Moodboard"}, {"id": "b2", "name": "Colors"}]},
        )
    if "/pins" in path:
        return httpx.Response(
            200,
            json={
                "items": [
                    {
                        "id": "p1",
                        "media": {"images": {"600x": {"url": "https://i.pinimg.com/p1.jpg"}}},
                    },
                    # A pin with no image is dropped from the list.
                    {"id": "p2", "media": {"images": {}}},
                ]
            },
        )
    return httpx.Response(404, json={})


async def _user_id(db):
    user = await crud.get_user_by_username(db, "normaluser")
    return user.id


async def _connect(db, uid):
    await crud.upsert_oauth_token(
        db,
        uid,
        "pinterest",
        access_token=encrypt_secret("at-1"),
        refresh_token=None,
        expires_at=None,
    )


# --- gating --------------------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_providers_reports_pinterest_disabled_by_default(client):
    resp = await client.get("/api/v1/import/providers")
    assert resp.json()["pinterest"]["enabled"] is False


@pytest.mark.asyncio
async def test_boards_is_404_when_disabled(user_client):
    resp = await user_client.get("/api/v1/import/pinterest/boards")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_authorize_returns_a_signed_url(user_client, monkeypatch):
    _enable(monkeypatch)
    resp = await user_client.get("/api/v1/import/pinterest/authorize")
    assert resp.status_code == 200
    url = resp.json()["url"]
    assert url.startswith("https://www.pinterest.com/oauth/?")
    state = httpx.URL(url).params["state"]
    assert decode_oauth_state(state, "pinterest") is not None


# --- boards / pins -------------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_lists_boards(user_client, db_session, monkeypatch):
    _enable(monkeypatch)
    _mock(monkeypatch, _default_handler)
    await _connect(db_session, await _user_id(db_session))
    resp = await user_client.get("/api/v1/import/pinterest/boards")
    assert resp.status_code == 200
    assert [b["name"] for b in resp.json()] == ["Moodboard", "Colors"]


@pytest.mark.asyncio
async def test_lists_pins_with_image_urls_only(user_client, db_session, monkeypatch):
    _enable(monkeypatch)
    _mock(monkeypatch, _default_handler)
    await _connect(db_session, await _user_id(db_session))
    resp = await user_client.get("/api/v1/import/pinterest/boards/b1/pins")
    assert resp.status_code == 200
    pins = resp.json()
    # p2 (no image) is dropped.
    assert pins == [{"id": "p1", "image_url": "https://i.pinimg.com/p1.jpg"}]


@pytest.mark.asyncio
async def test_boards_without_a_token_is_a_clean_error(user_client, monkeypatch):
    _enable(monkeypatch)
    _mock(monkeypatch, _default_handler)
    resp = await user_client.get("/api/v1/import/pinterest/boards")
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_expired_token_is_refreshed(user_client, db_session, monkeypatch):
    from datetime import UTC, datetime, timedelta

    _enable(monkeypatch)
    calls = {"token": 0}

    def handler(request):
        if request.url.path.endswith("/oauth/token"):
            calls["token"] += 1
        return _default_handler(request)

    _mock(monkeypatch, handler)
    uid = await _user_id(db_session)
    await crud.upsert_oauth_token(
        db_session,
        uid,
        "pinterest",
        access_token=encrypt_secret("at-old"),
        refresh_token=encrypt_secret("rt-1"),
        expires_at=datetime.now(UTC) - timedelta(minutes=1),
    )
    resp = await user_client.get("/api/v1/import/pinterest/boards")
    assert resp.status_code == 200
    assert calls["token"] == 1

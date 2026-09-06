"""Figma import (routers/figma.py) — the OAuth link and the file→palette extractor.

Every Figma HTTP call is served by an httpx.MockTransport, so no real Figma app or network is
needed. The provider is force-enabled per test by setting its credentials on the live settings.
"""

import httpx
import pytest
from app import config, crud
from app.routers import figma
from app.security import decode_oauth_state, encrypt_secret
from conftest import csrf_headers

_RealAsyncClient = httpx.AsyncClient


def _enable(monkeypatch):
    monkeypatch.setattr(config.settings, "figma_client_id", "cid", raising=False)
    monkeypatch.setattr(config.settings, "figma_client_secret", "csecret", raising=False)
    monkeypatch.setattr(
        config.settings,
        "figma_redirect_uri",
        "https://app.test/api/v1/import/figma/callback",
        raising=False,
    )


def _mock_figma(monkeypatch, handler):
    def factory(*_args, **kwargs):
        kwargs.pop("timeout", None)
        kwargs.pop("follow_redirects", None)
        return _RealAsyncClient(transport=httpx.MockTransport(handler), **kwargs)

    monkeypatch.setattr(figma.httpx, "AsyncClient", factory)


def _default_handler(request: httpx.Request) -> httpx.Response:
    path = request.url.path
    if path.endswith("/oauth/token"):
        return httpx.Response(
            200,
            json={"access_token": "at-1", "refresh_token": "rt-1", "expires_in": 3600},
        )
    if path.endswith("/oauth/refresh"):
        return httpx.Response(200, json={"access_token": "at-2", "expires_in": 3600})
    if path.endswith("/styles"):
        return httpx.Response(
            200,
            json={
                "meta": {
                    "styles": [
                        {"node_id": "1:2", "style_type": "FILL"},
                        {"node_id": "1:3", "style_type": "FILL"},
                        {"node_id": "1:4", "style_type": "TEXT"},
                    ]
                }
            },
        )
    if "/nodes" in path:
        return httpx.Response(
            200,
            json={
                "nodes": {
                    "1:2": {
                        "document": {
                            "fills": [{"type": "SOLID", "color": {"r": 1, "g": 0, "b": 0}}]
                        }
                    },
                    "1:3": {
                        "document": {
                            "fills": [{"type": "SOLID", "color": {"r": 0, "g": 0.5, "b": 1}}]
                        }
                    },
                }
            },
        )
    return httpx.Response(404, json={})


async def _user_id(db):
    user = await crud.get_user_by_username(db, "normaluser")
    return user.id


# --- gating --------------------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_providers_reports_figma_disabled_by_default(client):
    resp = await client.get("/api/v1/import/providers")
    assert resp.status_code == 200
    body = resp.json()
    assert body["figma"]["enabled"] is False
    assert body["pinterest"]["enabled"] is False


@pytest.mark.asyncio
async def test_extract_is_404_when_disabled(user_client):
    resp = await user_client.post(
        "/api/v1/import/figma/extract",
        json={"file": "ABC123"},
        headers=csrf_headers(user_client),
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_authorize_returns_a_signed_url(user_client, monkeypatch):
    _enable(monkeypatch)
    resp = await user_client.get("/api/v1/import/figma/authorize")
    assert resp.status_code == 200
    url = resp.json()["url"]
    assert url.startswith("https://www.figma.com/oauth?")
    assert "client_id=cid" in url
    # The state parameter must decode back to this provider.
    state = httpx.URL(url).params["state"]
    assert decode_oauth_state(state, "figma") is not None


# --- extract -------------------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_providers_reports_connected(user_client, db_session, monkeypatch):
    _enable(monkeypatch)
    uid = await _user_id(db_session)
    await crud.upsert_oauth_token(
        db_session,
        uid,
        "figma",
        access_token=encrypt_secret("at-1"),
        refresh_token=None,
        expires_at=None,
    )
    resp = await user_client.get("/api/v1/import/providers")
    body = resp.json()
    assert body["figma"] == {"enabled": True, "connected": True}


@pytest.mark.asyncio
async def test_extract_maps_fill_styles_to_a_draft(user_client, db_session, monkeypatch):
    _enable(monkeypatch)
    _mock_figma(monkeypatch, _default_handler)
    uid = await _user_id(db_session)
    await crud.upsert_oauth_token(
        db_session,
        uid,
        "figma",
        access_token=encrypt_secret("at-1"),
        refresh_token=None,
        expires_at=None,
    )
    resp = await user_client.post(
        "/api/v1/import/figma/extract",
        json={"file": "https://www.figma.com/file/ABC123/My-File"},
        headers=csrf_headers(user_client),
    )
    assert resp.status_code == 200
    assert resp.json()["colors"] == ["#FF0000", "#0080FF"]


@pytest.mark.asyncio
async def test_extract_without_a_token_is_a_clean_error(user_client, monkeypatch):
    _enable(monkeypatch)
    _mock_figma(monkeypatch, _default_handler)
    resp = await user_client.post(
        "/api/v1/import/figma/extract",
        json={"file": "ABC123"},
        headers=csrf_headers(user_client),
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_extract_with_no_styles_is_an_empty_draft(user_client, db_session, monkeypatch):
    _enable(monkeypatch)

    def handler(request):
        if request.url.path.endswith("/styles"):
            return httpx.Response(200, json={"meta": {"styles": []}})
        return _default_handler(request)

    _mock_figma(monkeypatch, handler)
    uid = await _user_id(db_session)
    await crud.upsert_oauth_token(
        db_session,
        uid,
        "figma",
        access_token=encrypt_secret("at-1"),
        refresh_token=None,
        expires_at=None,
    )
    resp = await user_client.post(
        "/api/v1/import/figma/extract",
        json={"file": "ABC123"},
        headers=csrf_headers(user_client),
    )
    assert resp.status_code == 200
    assert resp.json()["colors"] == []


@pytest.mark.asyncio
async def test_expired_token_is_refreshed_before_extract(user_client, db_session, monkeypatch):
    from datetime import UTC, datetime, timedelta

    _enable(monkeypatch)
    calls = {"refresh": 0}

    def handler(request):
        if request.url.path.endswith("/oauth/refresh"):
            calls["refresh"] += 1
        return _default_handler(request)

    _mock_figma(monkeypatch, handler)
    uid = await _user_id(db_session)
    await crud.upsert_oauth_token(
        db_session,
        uid,
        "figma",
        access_token=encrypt_secret("at-old"),
        refresh_token=encrypt_secret("rt-1"),
        expires_at=datetime.now(UTC) - timedelta(minutes=1),
    )
    resp = await user_client.post(
        "/api/v1/import/figma/extract",
        json={"file": "ABC123"},
        headers=csrf_headers(user_client),
    )
    assert resp.status_code == 200
    assert calls["refresh"] == 1


# --- security unit -------------------------------------------------------------------------------


def test_token_encryption_round_trips():
    cipher = encrypt_secret("super-secret-token")
    assert cipher != "super-secret-token"
    from app.security import decrypt_secret

    assert decrypt_secret(cipher) == "super-secret-token"


def test_oauth_state_rejects_wrong_provider():
    from app.security import create_oauth_state

    state = create_oauth_state(7, "figma")
    assert decode_oauth_state(state, "figma") == 7
    assert decode_oauth_state(state, "pinterest") is None
    assert decode_oauth_state("garbage", "figma") is None

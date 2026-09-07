"""The image-fetch proxy behind the palette extractor (routers/imports.py).

The fenced network path is exercised with an httpx.MockTransport so no real host is contacted; the
SSRF guard is exercised directly against loopback/scheme literals, which never reach the network.
"""

import httpx
import pytest
from app.routers import imports

# Captured before any monkeypatch: the factory below replaces httpx.AsyncClient on the module, so
# it must reach the genuine class through this alias rather than the patched name (which would make
# the factory call itself).
_RealAsyncClient = httpx.AsyncClient

PNG_BYTES = bytes.fromhex(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4"
    "890000000a49444154789c6360000002000154a24f4e0000000049454e44ae426082"
)


def _mock_client(handler):
    """Patch imports.httpx.AsyncClient so every fetch is served by `handler`, offline."""

    def factory(*_args, **kwargs):
        kwargs.pop("follow_redirects", None)
        kwargs.pop("timeout", None)
        return _RealAsyncClient(transport=httpx.MockTransport(handler), **kwargs)

    return factory


@pytest.mark.asyncio
async def test_fetch_requires_auth(client):
    resp = await client.get("/api/v1/import/fetch", params={"url": "https://x.test/a.png"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_non_http_scheme_is_rejected(user_client):
    resp = await user_client.get("/api/v1/import/fetch", params={"url": "file:///etc/passwd"})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_private_host_is_rejected(user_client):
    # Resolves to loopback; the SSRF guard refuses it before any request goes out.
    resp = await user_client.get(
        "/api/v1/import/fetch", params={"url": "http://127.0.0.1/metadata"}
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_fetches_a_real_image(user_client, monkeypatch):
    monkeypatch.setattr(imports, "_is_public_address", lambda host: True)
    monkeypatch.setattr(
        imports.httpx,
        "AsyncClient",
        _mock_client(
            lambda request: httpx.Response(
                200, content=PNG_BYTES, headers={"content-type": "image/png"}
            )
        ),
    )
    resp = await user_client.get("/api/v1/import/fetch", params={"url": "https://cdn.test/a.png"})
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "image/png"
    assert resp.content == PNG_BYTES


@pytest.mark.asyncio
async def test_non_image_response_is_rejected(user_client, monkeypatch):
    monkeypatch.setattr(imports, "_is_public_address", lambda host: True)
    monkeypatch.setattr(
        imports.httpx,
        "AsyncClient",
        _mock_client(
            lambda request: httpx.Response(
                200, content=b"<html>", headers={"content-type": "text/html"}
            )
        ),
    )
    resp = await user_client.get(
        "/api/v1/import/fetch", params={"url": "https://cdn.test/page.html"}
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_oversized_body_is_rejected(user_client, monkeypatch):
    monkeypatch.setattr(imports, "_is_public_address", lambda host: True)
    monkeypatch.setattr(imports, "_MAX_BYTES", 8)
    monkeypatch.setattr(
        imports.httpx,
        "AsyncClient",
        _mock_client(
            lambda request: httpx.Response(
                200, content=b"0123456789abcdef", headers={"content-type": "image/png"}
            )
        ),
    )
    resp = await user_client.get("/api/v1/import/fetch", params={"url": "https://cdn.test/big.png"})
    assert resp.status_code == 422

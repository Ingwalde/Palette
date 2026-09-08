"""The image-fetch proxy behind the palette extractor (routers/imports.py).

The fenced network path is exercised with an httpx.MockTransport so no real host is contacted, and
DNS is substituted so the tests never touch production or real internal services. The SSRF guard is
exercised against literals (loopback, link-local metadata) and against a domain whose DNS answer is
private; the DNS-rebinding case asserts the socket actually connects to the *validated* IP.
"""

import socket

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

# A stable, routable public address to stand in for a resolved image host (documentation range).
PUBLIC_IPV4 = "93.184.216.34"
PUBLIC_IPV6 = "2606:2800:220:1:248:1893:25c8:1946"


def _addrinfo(*ips: str) -> list:
    out = []
    for ip in ips:
        family = socket.AF_INET6 if ":" in ip else socket.AF_INET
        sockaddr = (ip, 0, 0, 0) if family == socket.AF_INET6 else (ip, 0)
        out.append((family, socket.SOCK_STREAM, socket.IPPROTO_TCP, "", sockaddr))
    return out


def _patch_dns(monkeypatch, *ips: str) -> None:
    """Make the proxy's resolver return `ips`. Patches the imports._getaddrinfo seam only, so the
    database driver's own name resolution is untouched (a global socket patch would send asyncpg to
    these fake addresses too)."""

    async def _fake(_host: str) -> list:
        return _addrinfo(*ips)

    monkeypatch.setattr(imports, "_getaddrinfo", _fake)


def _patch_dns_failure(monkeypatch) -> None:
    async def _boom(_host: str) -> list:
        raise socket.gaierror("name resolution failed")

    monkeypatch.setattr(imports, "_getaddrinfo", _boom)


def _mock_client(handler):
    """Patch imports.httpx.AsyncClient so every fetch is served by `handler`, offline."""

    def factory(*_args, **kwargs):
        kwargs.pop("follow_redirects", None)
        kwargs.pop("timeout", None)
        return _RealAsyncClient(transport=httpx.MockTransport(handler), **kwargs)

    return factory


def _patch_transport(monkeypatch, handler) -> None:
    monkeypatch.setattr(imports.httpx, "AsyncClient", _mock_client(handler))


def _image_handler(seen: list, *, content=PNG_BYTES, content_type="image/png", status=200):
    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return httpx.Response(status, content=content, headers={"content-type": content_type})

    return handler


@pytest.mark.asyncio
async def test_fetch_requires_auth(client):
    resp = await client.get("/api/v1/import/fetch", params={"url": "https://x.test/a.png"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_non_http_scheme_is_rejected(user_client):
    resp = await user_client.get("/api/v1/import/fetch", params={"url": "file:///etc/passwd"})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_private_literal_is_rejected(user_client):
    # Resolves to loopback; the SSRF guard refuses it before any request goes out.
    resp = await user_client.get(
        "/api/v1/import/fetch", params={"url": "http://127.0.0.1/metadata"}
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_ipv6_loopback_literal_is_rejected(user_client):
    resp = await user_client.get("/api/v1/import/fetch", params={"url": "http://[::1]/x.png"})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_link_local_metadata_is_rejected(user_client):
    # 169.254.169.254 is the cloud metadata endpoint; link-local, so blocked.
    resp = await user_client.get(
        "/api/v1/import/fetch", params={"url": "http://169.254.169.254/latest/meta-data"}
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_domain_resolving_to_private_is_rejected(user_client, monkeypatch):
    # A public-looking name whose DNS answer is a private address must be refused, and no request
    # may leave: the transport handler would record a call if one did.
    _patch_dns(monkeypatch, "10.0.0.5")
    seen: list = []
    _patch_transport(monkeypatch, _image_handler(seen))
    resp = await user_client.get(
        "/api/v1/import/fetch", params={"url": "https://internal.test/a.png"}
    )
    assert resp.status_code == 422
    assert seen == []


@pytest.mark.asyncio
async def test_mixed_public_and_private_answer_is_rejected(user_client, monkeypatch):
    # A single internal address in a round-robin must sink the whole host.
    _patch_dns(monkeypatch, PUBLIC_IPV4, "10.1.2.3")
    seen: list = []
    _patch_transport(monkeypatch, _image_handler(seen))
    resp = await user_client.get(
        "/api/v1/import/fetch", params={"url": "https://roundrobin.test/a.png"}
    )
    assert resp.status_code == 422
    assert seen == []


@pytest.mark.asyncio
async def test_dns_failure_is_rejected(user_client, monkeypatch):
    _patch_dns_failure(monkeypatch)
    resp = await user_client.get(
        "/api/v1/import/fetch", params={"url": "https://nxdomain.test/a.png"}
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_connection_is_pinned_to_the_validated_ip(user_client, monkeypatch):
    # The core of the DNS-rebinding fix: the socket connects to the validated address, and the
    # original host is preserved as Host header and TLS SNI. A second DNS lookup that later returned
    # an internal address could not redirect the connection, because it targets the IP literal.
    _patch_dns(monkeypatch, PUBLIC_IPV4)
    seen: list = []
    _patch_transport(monkeypatch, _image_handler(seen))
    resp = await user_client.get(
        "/api/v1/import/fetch", params={"url": "https://example.test/a.png"}
    )
    assert resp.status_code == 200
    assert resp.content == PNG_BYTES
    assert len(seen) == 1
    assert seen[0].url.host == PUBLIC_IPV4
    assert seen[0].headers["host"] == "example.test"
    assert seen[0].extensions.get("sni_hostname") == "example.test"


@pytest.mark.asyncio
async def test_ipv6_host_pins_to_the_validated_ip(user_client, monkeypatch):
    _patch_dns(monkeypatch, PUBLIC_IPV6)
    seen: list = []
    _patch_transport(monkeypatch, _image_handler(seen))
    resp = await user_client.get("/api/v1/import/fetch", params={"url": "https://v6.test/a.png"})
    assert resp.status_code == 200
    assert len(seen) == 1
    assert seen[0].url.host == PUBLIC_IPV6
    assert seen[0].headers["host"] == "v6.test"


@pytest.mark.asyncio
async def test_fetches_a_real_image(user_client, monkeypatch):
    _patch_dns(monkeypatch, PUBLIC_IPV4)
    seen: list = []
    _patch_transport(monkeypatch, _image_handler(seen))
    resp = await user_client.get("/api/v1/import/fetch", params={"url": "https://cdn.test/a.png"})
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "image/png"
    assert resp.content == PNG_BYTES


@pytest.mark.asyncio
async def test_non_image_response_is_rejected(user_client, monkeypatch):
    _patch_dns(monkeypatch, PUBLIC_IPV4)
    seen: list = []
    _patch_transport(monkeypatch, _image_handler(seen, content=b"<html>", content_type="text/html"))
    resp = await user_client.get(
        "/api/v1/import/fetch", params={"url": "https://cdn.test/page.html"}
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_redirect_is_not_followed(user_client, monkeypatch):
    # follow_redirects=False: the 302 is returned as-is (not chased to its internal Location), and
    # its non-image content-type makes it a 422. The transport is hit exactly once.
    _patch_dns(monkeypatch, PUBLIC_IPV4)
    seen: list = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return httpx.Response(
            302, headers={"location": "http://169.254.169.254/", "content-type": "text/html"}
        )

    _patch_transport(monkeypatch, handler)
    resp = await user_client.get("/api/v1/import/fetch", params={"url": "https://cdn.test/redir"})
    assert resp.status_code == 422
    assert len(seen) == 1


@pytest.mark.asyncio
async def test_oversized_body_is_rejected(user_client, monkeypatch):
    _patch_dns(monkeypatch, PUBLIC_IPV4)
    monkeypatch.setattr(imports, "_MAX_BYTES", 8)
    seen: list = []
    _patch_transport(monkeypatch, _image_handler(seen, content=b"0123456789abcdef"))
    resp = await user_client.get("/api/v1/import/fetch", params={"url": "https://cdn.test/big.png"})
    assert resp.status_code == 422

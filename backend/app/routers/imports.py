"""Import helpers — currently a single image-fetch proxy for the palette extractor.

A pasted image URL cannot be decoded in the browser: reading its pixels on a canvas is a
cross-origin taint the CORS policy of most image hosts forbids. So the SPA hands the URL to this
proxy, which fetches the bytes server-side and streams them back from our own origin, where the
canvas can read them.

Fetching an arbitrary user-supplied URL server-side is an SSRF primitive, so the fetch is fenced:
only http/https, the resolved host must be a public address (no loopback, private, link-local or
otherwise reserved ranges — which is what blocks cloud metadata endpoints and internal services),
redirects are not followed (a public URL could 302 to an internal one), the response must be an
image, and both the declared and the actual body size are capped.
"""

import asyncio
import ipaddress
import socket

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from .. import crud, models, schemas
from ..config import settings
from ..database import get_db
from ..rate_limit import limiter
from ..security import get_current_user, get_optional_user

router = APIRouter(prefix="/import", tags=["import"])


@router.get("/providers", response_model=schemas.ImportProviders)
async def import_providers(
    db: AsyncSession = Depends(get_db),
    current_user: models.User | None = Depends(get_optional_user),
) -> schemas.ImportProviders:
    """What the SPA reads once to decide which import buttons to show, and whether the user has
    already linked each provider. `connected` is always False for a guest."""

    async def status(provider: str, enabled: bool) -> schemas.ProviderStatus:
        connected = False
        if enabled and current_user is not None:
            connected = await crud.get_oauth_token(db, current_user.id, provider) is not None
        return schemas.ProviderStatus(enabled=enabled, connected=connected)

    return schemas.ImportProviders(
        figma=await status("figma", settings.figma_import_enabled),
        pinterest=await status("pinterest", settings.pinterest_import_enabled),
    )


# Fetching a remote URL on the user's behalf is a spam/abuse vector; keep it tight.
_FETCH_LIMIT = "30/hour"
# Palette extraction only needs a modest image; refuse anything a photo host would call huge.
_MAX_BYTES = 8 * 1024 * 1024
_ALLOWED_SCHEMES = frozenset({"http", "https"})


def _is_forbidden_ip(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    """A non-routable or otherwise dangerous address — loopback, private, link-local (which is what
    blocks 169.254.169.254 cloud metadata), multicast, reserved or unspecified."""
    return (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
    )


async def _getaddrinfo(host: str) -> list:
    """Resolve `host` off the event loop (getaddrinfo is blocking). A thin, patchable seam so tests
    can substitute DNS for this proxy alone without touching the process-wide socket.getaddrinfo the
    database driver also uses."""
    loop = asyncio.get_running_loop()
    return await loop.getaddrinfo(host, None, type=socket.SOCK_STREAM, proto=socket.IPPROTO_TCP)


async def _resolve_public_ip(host: str) -> str | None:
    """Resolve `host` and return one address to connect to, but only if EVERY address it resolves to
    is a routable public one; otherwise None (unknown host, or any private/reserved answer — a
    partly-internal round-robin must not slip a single internal address through).

    Returning the concrete IP is what actually closes the DNS-rebinding gap: the caller connects to
    this validated address directly, instead of validating the name here and letting the HTTP client
    resolve it again — possibly to a different, internal address — a moment later.
    """
    try:
        infos = await _getaddrinfo(host)
    except socket.gaierror:
        return None
    if not infos:
        return None
    chosen: str | None = None
    for info in infos:
        addr = str(info[4][0]).split("%", 1)[0]  # drop any IPv6 zone id
        try:
            ip = ipaddress.ip_address(addr)
        except ValueError:
            return None
        if _is_forbidden_ip(ip):
            return None
        if chosen is None:
            chosen = addr
    return chosen


@router.get("/fetch")
@limiter.limit(_FETCH_LIMIT)
async def fetch_image(
    request: Request,
    url: str = Query(..., max_length=2048),
    # Sign-in required so the proxy is not an open relay for anonymous traffic.
    current_user: models.User = Depends(get_current_user),
) -> Response:
    parsed = httpx.URL(url)
    if parsed.scheme not in _ALLOWED_SCHEMES:
        raise HTTPException(status_code=422, detail="Only http and https URLs are allowed")
    host = parsed.host
    if not host:
        raise HTTPException(status_code=422, detail="That host cannot be fetched")

    ip = await _resolve_public_ip(host)
    if ip is None:
        raise HTTPException(status_code=422, detail="That host cannot be fetched")

    # Connect straight to the validated IP so a second, unvalidated DNS lookup by the HTTP client
    # cannot swap in an internal address between the check and the connection (DNS rebinding). The
    # original host is preserved as the Host header and the TLS SNI / certificate hostname, so
    # virtual hosting and certificate verification still work — TLS verification is never weakened.
    connect_url = parsed.copy_with(host=ip)
    bracketed = f"[{host}]" if ":" in host else host
    host_header = bracketed if parsed.port is None else f"{bracketed}:{parsed.port}"
    request_headers = {"Host": host_header}
    request_extensions = {"sni_hostname": host}

    client = httpx.AsyncClient(follow_redirects=False, timeout=httpx.Timeout(10.0))
    try:
        async with (
            client,
            client.stream(
                "GET", connect_url, headers=request_headers, extensions=request_extensions
            ) as response,
        ):
            if response.status_code >= 400:
                raise HTTPException(status_code=502, detail="The image could not be fetched")

            content_type = response.headers.get("content-type", "").split(";")[0].strip()
            if not content_type.startswith("image/"):
                raise HTTPException(status_code=422, detail="That URL is not an image")

            declared = response.headers.get("content-length")
            if declared is not None and declared.isdigit() and int(declared) > _MAX_BYTES:
                raise HTTPException(status_code=422, detail="That image is too large")

            chunks: list[bytes] = []
            total = 0
            async for chunk in response.aiter_bytes():
                total += len(chunk)
                if total > _MAX_BYTES:
                    raise HTTPException(status_code=422, detail="That image is too large")
                chunks.append(chunk)
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="The image could not be fetched") from None

    # Cache-Control mirrors the short-lived, per-request nature of the proxy — nothing here is a
    # stable asset worth a CDN caching.
    return Response(
        content=b"".join(chunks),
        media_type=content_type,
        headers={"Cache-Control": "private, max-age=0, no-store"},
    )

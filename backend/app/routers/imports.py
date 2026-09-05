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

import ipaddress
import socket

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import Response

from .. import models
from ..rate_limit import limiter
from ..security import get_current_user

router = APIRouter(prefix="/import", tags=["import"])

# Fetching a remote URL on the user's behalf is a spam/abuse vector; keep it tight.
_FETCH_LIMIT = "30/hour"
# Palette extraction only needs a modest image; refuse anything a photo host would call huge.
_MAX_BYTES = 8 * 1024 * 1024
_ALLOWED_SCHEMES = frozenset({"http", "https"})


def _is_public_address(host: str) -> bool:
    """True only if every address the host resolves to is a routable, public one.

    Resolving here (rather than trusting the literal in the URL) closes the DNS-rebinding gap: a
    hostname that resolves to 169.254.169.254 or 10.x is rejected the same as the literal would be.
    """
    try:
        infos = socket.getaddrinfo(host, None, proto=socket.IPPROTO_TCP)
    except socket.gaierror:
        return False
    if not infos:
        return False
    for info in infos:
        addr = info[4][0]
        try:
            ip = ipaddress.ip_address(addr)
        except ValueError:
            return False
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_multicast
            or ip.is_reserved
            or ip.is_unspecified
        ):
            return False
    return True


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
    if not host or not _is_public_address(host):
        raise HTTPException(status_code=422, detail="That host cannot be fetched")

    client = httpx.AsyncClient(follow_redirects=False, timeout=httpx.Timeout(10.0))
    try:
        async with client, client.stream("GET", url) as response:
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

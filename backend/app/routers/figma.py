"""Figma import — link a Figma account over OAuth2 and pull a file's paint-style colours.

The provider is gated on configuration: with no client id / secret / redirect URI the endpoints
answer 404 and the UI hides the button (see ``settings.figma_import_enabled``). Read is not
Enterprise-gated the way write is, which is why this is import-only.

The OAuth round-trip carries no server-side session: the ``state`` parameter is a short-lived
signed token whose subject is the user id, so the callback trusts the signature rather than a
cookie (a top-level redirect back from Figma is exactly where SameSite cookies are least reliable).
Provider tokens are encrypted at rest; the plaintext never leaves this module.
"""

import re
from datetime import UTC, datetime, timedelta

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from .. import crud, models, schemas
from ..config import settings
from ..database import get_db
from ..rate_limit import limiter
from ..security import (
    create_oauth_state,
    decode_oauth_state,
    decrypt_secret,
    encrypt_secret,
    get_current_user,
)

router = APIRouter(prefix="/import/figma", tags=["import"])

PROVIDER = "figma"
_SCOPE = "file_read"
_AUTHORIZE_URL = "https://www.figma.com/oauth"
_TOKEN_URL = "https://api.figma.com/v1/oauth/token"
_REFRESH_URL = "https://api.figma.com/v1/oauth/refresh"
_API_BASE = "https://api.figma.com/v1"
# A Figma file URL is /file/<key>/... or /design/<key>/...; accept a bare key too.
_FILE_KEY_RE = re.compile(r"(?:/(?:file|design)/)([A-Za-z0-9]+)")
_BARE_KEY_RE = re.compile(r"^[A-Za-z0-9]+$")
_EXTRACT_LIMIT = "30/hour"
_MAX_COLORS = 12


def require_figma_enabled() -> None:
    if not settings.figma_import_enabled:
        raise HTTPException(status_code=404, detail="Figma import is not configured")


def _file_key(value: str) -> str | None:
    value = value.strip()
    if _BARE_KEY_RE.match(value):
        return value
    match = _FILE_KEY_RE.search(value)
    return match.group(1) if match else None


def _color_to_hex(color: dict) -> str:
    def channel(name: str) -> int:
        return max(0, min(255, round(float(color.get(name, 0)) * 255)))

    return f"#{channel('r'):02X}{channel('g'):02X}{channel('b'):02X}"


async def _valid_access_token(db: AsyncSession, token: models.OAuthToken) -> str:
    """Return a usable access token, refreshing it first if it has expired."""
    if token.expires_at is not None and token.expires_at <= datetime.now(UTC):
        if not token.refresh_token:
            raise HTTPException(status_code=401, detail="Reconnect your Figma account")
        refreshed = await _refresh(decrypt_secret(token.refresh_token))
        access = refreshed["access_token"]
        expires_at = datetime.now(UTC) + timedelta(seconds=int(refreshed.get("expires_in", 0)))
        await crud.upsert_oauth_token(
            db,
            token.user_id,
            PROVIDER,
            access_token=encrypt_secret(access),
            # Figma's refresh response may or may not rotate the refresh token; keep the old one
            # when it does not return a new one.
            refresh_token=token.refresh_token
            if "refresh_token" not in refreshed
            else encrypt_secret(refreshed["refresh_token"]),
            expires_at=expires_at,
            scope=token.scope,
        )
        return access
    return decrypt_secret(token.access_token)


async def _exchange_code(code: str) -> dict:
    data = {
        "client_id": settings.figma_client_id,
        "client_secret": settings.figma_client_secret,
        "redirect_uri": settings.figma_redirect_uri,
        "code": code,
        "grant_type": "authorization_code",
    }
    async with httpx.AsyncClient(timeout=httpx.Timeout(15.0)) as client:
        response = await client.post(_TOKEN_URL, data=data)
    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail="Figma rejected the authorization")
    return response.json()


async def _refresh(refresh_token: str) -> dict:
    data = {
        "client_id": settings.figma_client_id,
        "client_secret": settings.figma_client_secret,
        "refresh_token": refresh_token,
    }
    async with httpx.AsyncClient(timeout=httpx.Timeout(15.0)) as client:
        response = await client.post(_REFRESH_URL, data=data)
    if response.status_code >= 400:
        raise HTTPException(status_code=401, detail="Reconnect your Figma account")
    return response.json()


async def _get_json(url: str, access_token: str) -> dict:
    async with httpx.AsyncClient(timeout=httpx.Timeout(15.0)) as client:
        response = await client.get(url, headers={"Authorization": f"Bearer {access_token}"})
    if response.status_code == 401:
        raise HTTPException(status_code=401, detail="Reconnect your Figma account")
    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail="Figma could not read that file")
    return response.json()


@router.get("/authorize", response_model=schemas.OAuthAuthorizeUrl)
async def authorize(
    _: None = Depends(require_figma_enabled),
    current_user: models.User = Depends(get_current_user),
) -> schemas.OAuthAuthorizeUrl:
    """Return the Figma authorize URL for the SPA to redirect the browser to."""
    state = create_oauth_state(current_user.id, PROVIDER)
    query = httpx.QueryParams(
        {
            "client_id": settings.figma_client_id,
            "redirect_uri": settings.figma_redirect_uri,
            "scope": _SCOPE,
            "state": state,
            "response_type": "code",
        }
    )
    return schemas.OAuthAuthorizeUrl(url=f"{_AUTHORIZE_URL}?{query}")


@router.get("/callback")
async def callback(
    state: str = "",
    code: str = "",
    error: str = "",
    _: None = Depends(require_figma_enabled),
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    """Exchange the code for a token and store it, then bounce back to the import page.

    Authorised by the signed ``state`` (its subject is the user id) rather than a session cookie.
    """
    landing = f"{settings.public_base_url}/import"
    user_id = decode_oauth_state(state, PROVIDER) if state else None
    if error or code == "" or user_id is None:
        return RedirectResponse(url=f"{landing}?figma=error", status_code=303)

    user = await crud.get_user(db, user_id)
    if user is None:
        return RedirectResponse(url=f"{landing}?figma=error", status_code=303)

    try:
        token = await _exchange_code(code)
    except HTTPException:
        return RedirectResponse(url=f"{landing}?figma=error", status_code=303)

    expires_at = None
    if token.get("expires_in"):
        expires_at = datetime.now(UTC) + timedelta(seconds=int(token["expires_in"]))
    await crud.upsert_oauth_token(
        db,
        user_id,
        PROVIDER,
        access_token=encrypt_secret(token["access_token"]),
        refresh_token=encrypt_secret(token["refresh_token"])
        if token.get("refresh_token")
        else None,
        expires_at=expires_at,
        scope=_SCOPE,
    )
    return RedirectResponse(url=f"{landing}?figma=connected", status_code=303)


@router.delete("", status_code=204)
async def disconnect(
    _: None = Depends(require_figma_enabled),
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    await crud.delete_oauth_token(db, current_user.id, PROVIDER)


@router.post("/extract", response_model=schemas.ImportDraft)
@limiter.limit(_EXTRACT_LIMIT)
async def extract(
    request: Request,
    payload: schemas.FigmaExtractRequest,
    _: None = Depends(require_figma_enabled),
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> schemas.ImportDraft:
    """Pull the solid fill colours of a Figma file's paint styles into a palette draft."""
    key = _file_key(payload.file)
    if key is None:
        raise HTTPException(status_code=422, detail="That does not look like a Figma file")

    token = await crud.get_oauth_token(db, current_user.id, PROVIDER)
    if token is None:
        raise HTTPException(status_code=400, detail="Connect your Figma account first")
    access = await _valid_access_token(db, token)

    styles = await _get_json(f"{_API_BASE}/files/{key}/styles", access)
    fill_ids = [
        style["node_id"]
        for style in styles.get("meta", {}).get("styles", [])
        if style.get("style_type") == "FILL" and style.get("node_id")
    ]
    if not fill_ids:
        return schemas.ImportDraft(colors=[])

    nodes = await _get_json(f"{_API_BASE}/files/{key}/nodes?ids={','.join(fill_ids)}", access)
    colors: list[str] = []
    seen: set[str] = set()
    for node_id in fill_ids:
        document = nodes.get("nodes", {}).get(node_id, {}).get("document", {})
        for fill in document.get("fills", []):
            if fill.get("type") != "SOLID" or "color" not in fill:
                continue
            hex_value = _color_to_hex(fill["color"])
            if hex_value not in seen:
                seen.add(hex_value)
                colors.append(hex_value)
        if len(colors) >= _MAX_COLORS:
            break

    return schemas.ImportDraft(colors=colors[:_MAX_COLORS])

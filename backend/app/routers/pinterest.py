"""Pinterest import — link a Pinterest account over OAuth2 and list a board's pins.

A pin carries an image, not a palette, so this router only supplies the pin image URLs; the SPA
runs a chosen pin's image through the same proxy + client-side extractor as a pasted link. That is
why there is no /extract here — the extractor from step 4.1 already does the colour work.

Gated on configuration exactly like Figma (client id / secret / redirect URI). It stays behind
that gate for a second reason too: production Pinterest API access needs app review, so a release
ships the code dark until a reviewed app's credentials are configured. Token handling mirrors
Figma — encrypted at rest, refreshed server-side, authorised by a signed state rather than a
cookie.
"""

import base64
from datetime import UTC, datetime, timedelta

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from .. import crud, models, schemas
from ..config import settings
from ..database import get_db
from ..security import (
    create_oauth_state,
    decode_oauth_state,
    decrypt_secret,
    encrypt_secret,
    get_current_user,
)

router = APIRouter(prefix="/import/pinterest", tags=["import"])

PROVIDER = "pinterest"
_SCOPE = "boards:read,pins:read"
_AUTHORIZE_URL = "https://www.pinterest.com/oauth/"
_TOKEN_URL = "https://api.pinterest.com/v5/oauth/token"
_API_BASE = "https://api.pinterest.com/v5"
_MAX_PINS = 50


def require_pinterest_enabled() -> None:
    if not settings.pinterest_import_enabled:
        raise HTTPException(status_code=404, detail="Pinterest import is not configured")


def _basic_auth() -> str:
    raw = f"{settings.pinterest_client_id}:{settings.pinterest_client_secret}".encode()
    return base64.b64encode(raw).decode()


async def _token_request(data: dict) -> dict:
    # Pinterest authenticates the token/refresh calls with HTTP Basic (client id : secret).
    headers = {"Authorization": f"Basic {_basic_auth()}"}
    async with httpx.AsyncClient(timeout=httpx.Timeout(15.0)) as client:
        response = await client.post(_TOKEN_URL, data=data, headers=headers)
    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail="Pinterest rejected the authorization")
    return response.json()


async def _valid_access_token(db: AsyncSession, token: models.OAuthToken) -> str:
    if token.expires_at is not None and token.expires_at <= datetime.now(UTC):
        if not token.refresh_token:
            raise HTTPException(status_code=401, detail="Reconnect your Pinterest account")
        refreshed = await _token_request(
            {"grant_type": "refresh_token", "refresh_token": decrypt_secret(token.refresh_token)}
        )
        access = refreshed["access_token"]
        expires_at = datetime.now(UTC) + timedelta(seconds=int(refreshed.get("expires_in", 0)))
        await crud.upsert_oauth_token(
            db,
            token.user_id,
            PROVIDER,
            access_token=encrypt_secret(access),
            refresh_token=token.refresh_token
            if "refresh_token" not in refreshed
            else encrypt_secret(refreshed["refresh_token"]),
            expires_at=expires_at,
            scope=token.scope,
        )
        return access
    return decrypt_secret(token.access_token)


async def _get_json(url: str, access_token: str) -> dict:
    async with httpx.AsyncClient(timeout=httpx.Timeout(15.0)) as client:
        response = await client.get(url, headers={"Authorization": f"Bearer {access_token}"})
    if response.status_code == 401:
        raise HTTPException(status_code=401, detail="Reconnect your Pinterest account")
    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail="Pinterest could not read that")
    return response.json()


async def _access_for(db: AsyncSession, user_id: int) -> str:
    token = await crud.get_oauth_token(db, user_id, PROVIDER)
    if token is None:
        raise HTTPException(status_code=400, detail="Connect your Pinterest account first")
    return await _valid_access_token(db, token)


def _pin_image_url(pin: dict) -> str | None:
    images = pin.get("media", {}).get("images", {})
    if not isinstance(images, dict) or not images:
        return None
    # Prefer the largest offered rendition; keys are sizes like "150x150" / "600x" / "originals".
    preferred = ("originals", "1200x", "600x")
    for key in preferred:
        url = images.get(key, {}).get("url")
        if url:
            return url
    # Otherwise take whatever the first rendition is.
    for value in images.values():
        if isinstance(value, dict) and value.get("url"):
            return value["url"]
    return None


@router.get("/authorize", response_model=schemas.OAuthAuthorizeUrl)
async def authorize(
    _: None = Depends(require_pinterest_enabled),
    current_user: models.User = Depends(get_current_user),
) -> schemas.OAuthAuthorizeUrl:
    state = create_oauth_state(current_user.id, PROVIDER)
    query = httpx.QueryParams(
        {
            "client_id": settings.pinterest_client_id,
            "redirect_uri": settings.pinterest_redirect_uri,
            "response_type": "code",
            "scope": _SCOPE,
            "state": state,
        }
    )
    return schemas.OAuthAuthorizeUrl(url=f"{_AUTHORIZE_URL}?{query}")


@router.get("/callback")
async def callback(
    state: str = "",
    code: str = "",
    error: str = "",
    _: None = Depends(require_pinterest_enabled),
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    landing = f"{settings.public_base_url}/import"
    user_id = decode_oauth_state(state, PROVIDER) if state else None
    if error or code == "" or user_id is None:
        return RedirectResponse(url=f"{landing}?pinterest=error", status_code=303)

    user = await crud.get_user(db, user_id)
    if user is None:
        return RedirectResponse(url=f"{landing}?pinterest=error", status_code=303)

    try:
        token = await _token_request(
            {
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": settings.pinterest_redirect_uri,
            }
        )
    except HTTPException:
        return RedirectResponse(url=f"{landing}?pinterest=error", status_code=303)

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
    return RedirectResponse(url=f"{landing}?pinterest=connected", status_code=303)


@router.delete("", status_code=204)
async def disconnect(
    _: None = Depends(require_pinterest_enabled),
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    await crud.delete_oauth_token(db, current_user.id, PROVIDER)


@router.get("/boards", response_model=list[schemas.PinterestBoard])
async def list_boards(
    _: None = Depends(require_pinterest_enabled),
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[schemas.PinterestBoard]:
    access = await _access_for(db, current_user.id)
    data = await _get_json(f"{_API_BASE}/boards", access)
    return [
        schemas.PinterestBoard(id=str(board["id"]), name=board.get("name", "Untitled"))
        for board in data.get("items", [])
        if board.get("id")
    ]


@router.get("/boards/{board_id}/pins", response_model=list[schemas.PinterestPin])
async def list_pins(
    board_id: str,
    _: None = Depends(require_pinterest_enabled),
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[schemas.PinterestPin]:
    access = await _access_for(db, current_user.id)
    data = await _get_json(f"{_API_BASE}/boards/{board_id}/pins", access)
    pins: list[schemas.PinterestPin] = []
    for pin in data.get("items", []):
        url = _pin_image_url(pin)
        if pin.get("id") and url:
            pins.append(schemas.PinterestPin(id=str(pin["id"]), image_url=url))
        if len(pins) >= _MAX_PINS:
            break
    return pins

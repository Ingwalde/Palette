import base64
import binascii
import hashlib

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from .. import crud, models, schemas
from ..database import get_db
from ..rate_limit import limiter
from ..security import get_current_user, get_optional_user

router = APIRouter(prefix="/users", tags=["users"])

# Maps a stored data: URL prefix to the media type served back for the avatar image.
_AVATAR_MEDIA_TYPES = {
    "data:image/png;base64,": "image/png",
    "data:image/jpeg;base64,": "image/jpeg",
    "data:image/webp;base64,": "image/webp",
    "data:image/gif;base64,": "image/gif",
}

# Uploading a fresh avatar is not something a user does in a tight loop.
_AVATAR_LIMIT = "30/hour"


@router.get("/{handle}/palettes/{slug}", response_model=schemas.PaletteRead)
async def read_palette_for_owner(
    handle: str,
    slug: str,
    db: AsyncSession = Depends(get_db),
    viewer: models.User | None = Depends(get_optional_user),
):
    """A single palette scoped by its owner's handle — the shape the frontend links to as
    /u/:handle/:slug. A slug that exists under a different owner, or a private palette the viewer
    does not own, 404s rather than leaking across handles or disclosing its existence."""
    palette = await crud.get_palette_for_owner(db, handle, slug, viewer=viewer)
    if palette is None:
        raise HTTPException(status_code=404, detail="Palette not found")
    return palette


@router.get("/{handle}", response_model=schemas.PublicProfile)
async def read_public_profile(handle: str, db: AsyncSession = Depends(get_db)):
    """The public profile for `handle` — the header of the /u/:handle page. 404 for an account
    that does not exist, so a stranger URL is a genuine not-found rather than an empty listing."""
    user = await crud.get_user_by_username(db, handle)
    if user is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return {
        "handle": user.username,
        "has_avatar": bool(user.avatar),
        "created_at": user.created_at,
        "palette_count": await crud.count_palettes(db=db, owner=handle),
    }


@router.get("/{handle}/palettes", response_model=schemas.PaletteList)
async def read_palettes_for_owner(
    handle: str,
    response: Response,
    sort: str = Query(default="new", pattern="^(default|az|za|new|popular|curated)$"),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """The public palettes owned by `handle` — the profile listing linked from a card's byline.
    Only public, active palettes appear (the same feed rules as the home catalogue), so this never
    exposes a user's private drafts. 404 when the account does not exist."""
    if await crud.get_user_by_username(db, handle) is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    items = await crud.get_palettes(db=db, sort=sort, limit=limit, offset=offset, owner=handle)
    total = await crud.count_palettes(db=db, owner=handle)
    response.headers["X-Total-Count"] = str(total)
    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.get("/{handle}/avatar")
async def read_avatar(handle: str, request: Request, db: AsyncSession = Depends(get_db)):
    """Serve a user's avatar as a real, cacheable image, so a card list can reference it by URL
    instead of embedding every avatar's data URL inline. 404 when the account or its photo is
    absent. The stored value is a validated `data:image/...;base64,` URL — decoded here."""
    user = await crud.get_user_by_username(db, handle)
    if user is None or not user.avatar:
        raise HTTPException(status_code=404, detail="Avatar not found")

    prefix, _, encoded = user.avatar.partition(",")
    media_type = _AVATAR_MEDIA_TYPES.get(prefix + ",")
    if media_type is None:
        # A stored value that predates the current validator; nothing safe to serve.
        raise HTTPException(status_code=404, detail="Avatar not found")

    # ETag from the stored data URL itself, so an unchanged avatar can answer a conditional
    # request with 304 without decoding the image at all.
    etag = f'"{hashlib.sha256(user.avatar.encode()).hexdigest()[:16]}"'
    cache_headers = {"Cache-Control": "public, max-age=3600", "ETag": etag}
    if request.headers.get("if-none-match") == etag:
        return Response(status_code=304, headers=cache_headers)

    try:
        data = base64.b64decode(encoded, validate=True)
    except (binascii.Error, ValueError):
        raise HTTPException(status_code=404, detail="Avatar not found") from None

    return Response(content=data, media_type=media_type, headers=cache_headers)


@router.put("/me/avatar", response_model=schemas.UserRead)
@limiter.limit(_AVATAR_LIMIT)
async def set_my_avatar(
    request: Request,
    payload: schemas.AvatarUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Set the signed-in user's avatar to a (validated, size-capped) image data URL."""
    return await crud.set_user_avatar(db, current_user, payload.avatar)


@router.delete("/me/avatar", status_code=status.HTTP_204_NO_CONTENT)
async def clear_my_avatar(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    await crud.set_user_avatar(db, current_user, None)

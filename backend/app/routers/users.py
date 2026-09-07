from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from .. import crud, models, schemas
from ..database import get_db
from ..rate_limit import limiter
from ..security import get_current_user, get_optional_user

router = APIRouter(prefix="/users", tags=["users"])

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

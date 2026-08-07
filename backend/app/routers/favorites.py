from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from .. import crud, models, schemas
from ..database import get_db
from ..rate_limit import limiter
from ..security import get_current_user

router = APIRouter(prefix="/favorites", tags=["favorites"])

# Favorites toggle often, so allow a higher rate than admin content writes.
_WRITE_LIMIT = "120/minute"


@router.get("", response_model=list[schemas.PaletteRead])
async def read_favorites(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return await crud.get_user_favorite_palettes(db, current_user)


@router.get("/keys", response_model=list[str])
async def read_favorite_keys(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return await crud.get_user_favorite_keys(db, current_user)


@router.post("/{slug}", response_model=schemas.PaletteRead, status_code=status.HTTP_201_CREATED)
@limiter.limit(_WRITE_LIMIT)
async def add_favorite(
    request: Request,
    slug: str,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    palette = await crud.get_palette_by_slug(db, slug)

    if palette is None:
        raise HTTPException(status_code=404, detail="Palette not found")

    return await crud.add_user_favorite(db, current_user, palette)


@router.delete("/{slug}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(_WRITE_LIMIT)
async def remove_favorite(
    request: Request,
    slug: str,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    palette = await crud.get_palette_by_slug(db, slug)

    if palette is None:
        raise HTTPException(status_code=404, detail="Palette not found")

    await crud.remove_user_favorite(db, current_user, palette)
    return


@router.delete("")
@limiter.limit(_WRITE_LIMIT)
async def clear_favorites(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    deleted_count = await crud.clear_user_favorites(db, current_user)
    return {"deleted": deleted_count}

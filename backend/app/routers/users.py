from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from .. import crud, schemas
from ..database import get_db

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/{handle}/palettes/{slug}", response_model=schemas.PaletteRead)
async def read_palette_for_owner(
    handle: str, slug: str, db: AsyncSession = Depends(get_db)
):
    """A single palette scoped by its owner's handle — the shape the frontend links to as
    /u/:handle/:slug. A slug that exists under a different owner 404s rather than leaking across
    handles."""
    palette = await crud.get_palette_for_owner(db, handle, slug)
    if palette is None:
        raise HTTPException(status_code=404, detail="Palette not found")
    return palette

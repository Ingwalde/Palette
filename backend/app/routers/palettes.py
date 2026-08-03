from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from .. import crud, schemas
from ..database import get_db
from ..security import require_admin_user

router = APIRouter(prefix="/palettes", tags=["palettes"])


@router.get("", response_model=schemas.PaletteList)
async def read_palettes(
    response: Response,
    search: str | None = Query(
        default=None, description="Search by name, description, slug or tag"
    ),
    tag: str | None = Query(default=None, description="Filter by tag"),
    sort: str = Query(default="default", pattern="^(default|az|za)$"),
    limit: int = Query(default=100, ge=1, le=500, description="Max results to return"),
    offset: int = Query(default=0, ge=0, description="Number of results to skip"),
    db: AsyncSession = Depends(get_db),
):
    items = await crud.get_palettes(
        db=db, search=search, tag=tag, sort=sort, limit=limit, offset=offset
    )
    total = await crud.count_palettes(db=db, search=search, tag=tag)
    response.headers["X-Total-Count"] = str(total)
    # Returned as a dict; FastAPI serialises it through the PaletteList response_model.
    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.get("/tags", response_model=list[str])
async def read_tags(db: AsyncSession = Depends(get_db)):
    return await crud.get_tags(db)


@router.get("/{slug}", response_model=schemas.PaletteRead)
async def read_palette(slug: str, db: AsyncSession = Depends(get_db)):
    palette = await crud.get_palette_by_slug(db, slug)

    if palette is None:
        raise HTTPException(status_code=404, detail="Palette not found")

    return palette


@router.post("", response_model=schemas.PaletteRead, status_code=status.HTTP_201_CREATED)
async def create_palette(
    palette_data: schemas.PaletteCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin_user),
):
    return await crud.create_palette(db, palette_data)


@router.put("/{palette_id}", response_model=schemas.PaletteRead)
async def update_palette(
    palette_id: int,
    palette_data: schemas.PaletteUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin_user),
):
    palette = await crud.get_palette(db, palette_id)

    if palette is None:
        raise HTTPException(status_code=404, detail="Palette not found")

    return await crud.update_palette(db, palette, palette_data)


@router.delete("/{palette_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_palette(
    palette_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin_user),
):
    palette = await crud.get_palette(db, palette_id)

    if palette is None:
        raise HTTPException(status_code=404, detail="Palette not found")

    await crud.delete_palette(db, palette)
    return

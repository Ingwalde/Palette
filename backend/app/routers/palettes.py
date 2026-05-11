from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..database import get_db
from ..security import require_admin_user

router = APIRouter(prefix="/palettes", tags=["palettes"])


@router.get("", response_model=list[schemas.PaletteRead])
def read_palettes(
    search: str | None = Query(default=None, description="Search by name, description, slug or tag"),
    tag: str | None = Query(default=None, description="Filter by tag"),
    sort: str = Query(default="default", pattern="^(default|az|za)$"),
    db: Session = Depends(get_db),
):
    return crud.get_palettes(db=db, search=search, tag=tag, sort=sort)


@router.get("/tags", response_model=list[str])
def read_tags(db: Session = Depends(get_db)):
    return crud.get_tags(db)


@router.get("/{slug}", response_model=schemas.PaletteRead)
def read_palette(slug: str, db: Session = Depends(get_db)):
    palette = crud.get_palette_by_slug(db, slug)

    if palette is None:
        raise HTTPException(status_code=404, detail="Palette not found")

    return palette


@router.post("", response_model=schemas.PaletteRead, status_code=status.HTTP_201_CREATED)
def create_palette(
    palette_data: schemas.PaletteCreate,
    db: Session = Depends(get_db),
    _ = Depends(require_admin_user),
):
    return crud.create_palette(db, palette_data)


@router.put("/{palette_id}", response_model=schemas.PaletteRead)
def update_palette(
    palette_id: int,
    palette_data: schemas.PaletteUpdate,
    db: Session = Depends(get_db),
    _ = Depends(require_admin_user),
):
    palette = crud.get_palette(db, palette_id)

    if palette is None:
        raise HTTPException(status_code=404, detail="Palette not found")

    return crud.update_palette(db, palette, palette_data)


@router.delete("/{palette_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_palette(
    palette_id: int,
    db: Session = Depends(get_db),
    _ = Depends(require_admin_user),
):
    palette = crud.get_palette(db, palette_id)

    if palette is None:
        raise HTTPException(status_code=404, detail="Palette not found")

    crud.delete_palette(db, palette)
    return None

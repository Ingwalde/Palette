from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import crud, models, schemas
from ..database import get_db
from ..security import get_current_user

router = APIRouter(prefix="/favorites", tags=["favorites"])


@router.get("", response_model=list[schemas.PaletteRead])
def read_favorites(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return crud.get_user_favorite_palettes(db, current_user)


@router.get("/keys", response_model=list[str])
def read_favorite_keys(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return crud.get_user_favorite_keys(db, current_user)


@router.post("/{slug}", response_model=schemas.PaletteRead, status_code=status.HTTP_201_CREATED)
def add_favorite(
    slug: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    palette = crud.get_palette_by_slug(db, slug)

    if palette is None:
        raise HTTPException(status_code=404, detail="Palette not found")

    return crud.add_user_favorite(db, current_user, palette)


@router.delete("/{slug}", status_code=status.HTTP_204_NO_CONTENT)
def remove_favorite(
    slug: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    palette = crud.get_palette_by_slug(db, slug)

    if palette is None:
        raise HTTPException(status_code=404, detail="Palette not found")

    crud.remove_user_favorite(db, current_user, palette)
    return None


@router.delete("")
def clear_favorites(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    deleted_count = crud.clear_user_favorites(db, current_user)
    return {"deleted": deleted_count}

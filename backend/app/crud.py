import re
from typing import Iterable

from sqlalchemy.orm import Session

from . import models, schemas


def slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = value.strip("-")
    return value or "palette"


def get_unique_slug(db: Session, base_slug: str, current_palette_id: int | None = None) -> str:
    base_slug = slugify(base_slug)
    slug = base_slug
    counter = 2

    while True:
        query = db.query(models.Palette).filter(models.Palette.slug == slug)
        if current_palette_id is not None:
            query = query.filter(models.Palette.id != current_palette_id)

        exists = query.first()
        if not exists:
            return slug

        slug = f"{base_slug}-{counter}"
        counter += 1


def get_palette(db: Session, palette_id: int) -> models.Palette | None:
    return db.query(models.Palette).filter(models.Palette.id == palette_id).first()


def get_palette_by_slug(db: Session, slug: str) -> models.Palette | None:
    return db.query(models.Palette).filter(models.Palette.slug == slug).first()


def get_palettes(
    db: Session,
    search: str | None = None,
    tag: str | None = None,
    sort: str = "default",
) -> list[models.Palette]:
    palettes = db.query(models.Palette).all()

    if search:
        search_value = search.lower().strip()
        palettes = [
            palette for palette in palettes
            if search_value in " ".join([
                palette.name,
                palette.description,
                palette.slug,
                " ".join(palette.tags),
            ]).lower()
        ]

    if tag:
        tag_value = tag.lower().strip().replace("#", "")
        palettes = [palette for palette in palettes if tag_value in palette.tags]

    if sort == "az":
        palettes.sort(key=lambda palette: palette.name.lower())
    elif sort == "za":
        palettes.sort(key=lambda palette: palette.name.lower(), reverse=True)
    else:
        palettes.sort(key=lambda palette: palette.id)

    return palettes


def get_tags(db: Session) -> list[str]:
    tags: set[str] = set()

    for palette in db.query(models.Palette).all():
        tags.update(palette.tags)

    return sorted(tags)


def create_palette(db: Session, palette_data: schemas.PaletteCreate) -> models.Palette:
    desired_slug = palette_data.slug or palette_data.name
    slug = get_unique_slug(db, desired_slug)

    palette = models.Palette(
        slug=slug,
        name=palette_data.name,
        description=palette_data.description,
    )
    palette.colors = palette_data.colors
    palette.tags = palette_data.tags

    db.add(palette)
    db.commit()
    db.refresh(palette)
    return palette


def update_palette(
    db: Session,
    palette: models.Palette,
    palette_data: schemas.PaletteUpdate,
) -> models.Palette:
    data = palette_data.model_dump(exclude_unset=True)

    if "name" in data and data["name"] is not None:
        palette.name = data["name"]
        palette.slug = get_unique_slug(db, palette.name, current_palette_id=palette.id)

    if "description" in data and data["description"] is not None:
        palette.description = data["description"]

    if "colors" in data and data["colors"] is not None:
        palette.colors = data["colors"]

    if "tags" in data and data["tags"] is not None:
        palette.tags = data["tags"]

    db.commit()
    db.refresh(palette)
    return palette


def delete_palette(db: Session, palette: models.Palette) -> None:
    db.delete(palette)
    db.commit()


def create_many_if_empty(db: Session, palettes: Iterable[schemas.PaletteCreate]) -> int:
    existing_count = db.query(models.Palette).count()
    if existing_count > 0:
        return 0

    created_count = 0
    for palette_data in palettes:
        create_palette(db, palette_data)
        created_count += 1

    return created_count

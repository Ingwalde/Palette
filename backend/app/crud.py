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



def get_user(db: Session, user_id: int) -> models.User | None:
    return db.query(models.User).filter(models.User.id == user_id).first()


def get_user_by_username(db: Session, username: str) -> models.User | None:
    return db.query(models.User).filter(models.User.username == username).first()


def get_user_by_email(db: Session, email: str) -> models.User | None:
    return db.query(models.User).filter(models.User.email == email.lower()).first()


def create_user(
    db: Session,
    user_data: schemas.UserCreate,
    password_hash: str,
    is_admin: bool = False,
) -> models.User:
    user = models.User(
        username=user_data.username,
        email=user_data.email,
        password_hash=password_hash,
        is_admin=is_admin,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def create_admin_if_missing(db: Session, username: str, email: str, password_hash: str) -> models.User | None:
    admin_exists = db.query(models.User).filter(models.User.is_admin.is_(True)).first()
    if admin_exists:
        if not admin_exists.email:
            admin_exists.email = email
            db.commit()
            db.refresh(admin_exists)
        return None

    existing_user = get_user_by_username(db, username)
    if existing_user:
        existing_user.is_admin = True
        existing_user.email = existing_user.email or email
        existing_user.password_hash = password_hash
        db.commit()
        db.refresh(existing_user)
        return existing_user

    user = models.User(
        username=username,
        email=email,
        password_hash=password_hash,
        is_admin=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_user_favorite_palettes(db: Session, user: models.User) -> list[models.Palette]:
    return (
        db.query(models.Palette)
        .join(models.Favorite, models.Favorite.palette_id == models.Palette.id)
        .filter(models.Favorite.user_id == user.id)
        .order_by(models.Favorite.created_at.desc())
        .all()
    )


def get_user_favorite_keys(db: Session, user: models.User) -> list[str]:
    return [palette.slug for palette in get_user_favorite_palettes(db, user)]


def is_user_favorite(db: Session, user: models.User, palette: models.Palette) -> bool:
    return db.query(models.Favorite).filter(
        models.Favorite.user_id == user.id,
        models.Favorite.palette_id == palette.id,
    ).first() is not None


def add_user_favorite(db: Session, user: models.User, palette: models.Palette) -> models.Palette:
    existing_favorite = db.query(models.Favorite).filter(
        models.Favorite.user_id == user.id,
        models.Favorite.palette_id == palette.id,
    ).first()

    if existing_favorite:
        return palette

    favorite = models.Favorite(
        user_id=user.id,
        palette_id=palette.id,
    )
    db.add(favorite)
    db.commit()
    return palette


def remove_user_favorite(db: Session, user: models.User, palette: models.Palette) -> bool:
    favorite = db.query(models.Favorite).filter(
        models.Favorite.user_id == user.id,
        models.Favorite.palette_id == palette.id,
    ).first()

    if favorite is None:
        return False

    db.delete(favorite)
    db.commit()
    return True


def clear_user_favorites(db: Session, user: models.User) -> int:
    favorites_query = db.query(models.Favorite).filter(models.Favorite.user_id == user.id)
    deleted_count = favorites_query.count()
    favorites_query.delete(synchronize_session=False)
    db.commit()
    return deleted_count



def update_user_password(db: Session, user: models.User, password_hash: str) -> models.User:
    user.password_hash = password_hash
    db.commit()
    db.refresh(user)
    return user

import re
from collections.abc import Iterable
from datetime import UTC, datetime

from sqlalchemy import Select, Text, cast, delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from . import models, schemas


def slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = value.strip("-")
    return value or "palette"


async def get_unique_slug(
    db: AsyncSession, base_slug: str, current_palette_id: int | None = None
) -> str:
    base_slug = slugify(base_slug)
    slug = base_slug
    counter = 2

    while True:
        stmt = select(models.Palette).where(models.Palette.slug == slug)
        if current_palette_id is not None:
            stmt = stmt.where(models.Palette.id != current_palette_id)

        exists = (await db.execute(stmt)).scalars().first()
        if not exists:
            return slug

        slug = f"{base_slug}-{counter}"
        counter += 1


async def get_palette(db: AsyncSession, palette_id: int) -> models.Palette | None:
    return await db.get(models.Palette, palette_id)


async def get_palette_by_slug(db: AsyncSession, slug: str) -> models.Palette | None:
    stmt = select(models.Palette).where(models.Palette.slug == slug)
    return (await db.execute(stmt)).scalars().first()


def _filtered_palettes_stmt(search: str | None, tag: str | None) -> Select:
    stmt = select(models.Palette)

    if search:
        like = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                models.Palette.name.ilike(like),
                models.Palette.description.ilike(like),
                models.Palette.slug.ilike(like),
                cast(models.Palette.tags, Text).ilike(like),
            )
        )

    if tag:
        tag_value = tag.strip().lower().replace("#", "")
        # JSONB containment (@>) uses the GIN index: palettes whose tags include the value.
        stmt = stmt.where(models.Palette.tags.contains([tag_value]))

    return stmt


async def get_palettes(
    db: AsyncSession,
    search: str | None = None,
    tag: str | None = None,
    sort: str = "default",
    limit: int | None = None,
    offset: int = 0,
) -> list[models.Palette]:
    stmt = _filtered_palettes_stmt(search, tag)

    if sort == "az":
        stmt = stmt.order_by(func.lower(models.Palette.name).asc())
    elif sort == "za":
        stmt = stmt.order_by(func.lower(models.Palette.name).desc())
    else:
        stmt = stmt.order_by(models.Palette.id.asc())

    if offset:
        stmt = stmt.offset(offset)
    if limit is not None:
        stmt = stmt.limit(limit)

    result = await db.execute(stmt)
    return list(result.scalars().all())


async def count_palettes(
    db: AsyncSession, search: str | None = None, tag: str | None = None
) -> int:
    stmt = select(func.count()).select_from(_filtered_palettes_stmt(search, tag).subquery())
    return await db.scalar(stmt) or 0


async def get_tags(db: AsyncSession) -> list[str]:
    all_tags: set[str] = set()

    # tags is a JSONB array — SQLAlchemy returns a native list, no JSON parsing needed.
    result = await db.execute(select(models.Palette.tags))
    for (tags,) in result.all():
        all_tags.update(tags or [])

    return sorted(all_tags)


async def get_tag_by_name(db: AsyncSession, name: str) -> models.Tag | None:
    stmt = select(models.Tag).where(models.Tag.name == name)
    return (await db.execute(stmt)).scalars().first()


async def _palette_tag_counts(db: AsyncSession) -> dict[str, int]:
    counts: dict[str, int] = {}
    result = await db.execute(select(models.Palette.tags))
    for (tags,) in result.all():
        for tag in tags or []:
            counts[tag] = counts.get(tag, 0) + 1
    return counts


async def list_tag_catalog(db: AsyncSession) -> list[dict]:
    """Every tag known to the app: catalog rows plus any tag currently used by a palette
    but not yet in the catalog. Each entry carries its kind and palette usage count."""
    counts = await _palette_tag_counts(db)
    catalog = (await db.execute(select(models.Tag))).scalars().all()
    catalog_by_name = {tag.name: tag for tag in catalog}

    names = set(counts) | set(catalog_by_name)
    entries = [
        {
            "name": name,
            "kind": catalog_by_name[name].kind if name in catalog_by_name else "free",
            "count": counts.get(name, 0),
        }
        for name in names
    ]
    # Purpose categories first, then alphabetical.
    entries.sort(key=lambda entry: (entry["kind"] != "purpose", entry["name"]))
    return entries


async def create_tag(db: AsyncSession, tag_data: schemas.TagCreate) -> models.Tag:
    tag = models.Tag(name=tag_data.name, kind=tag_data.kind)
    db.add(tag)
    await db.commit()
    await db.refresh(tag)
    return tag


async def _rename_tag_in_palettes(db: AsyncSession, old: str, new: str) -> int:
    stmt = select(models.Palette).where(models.Palette.tags.contains([old]))
    palettes = (await db.execute(stmt)).scalars().all()
    for palette in palettes:
        renamed: list[str] = []
        for tag in palette.tags:
            value = new if tag == old else tag
            if value not in renamed:
                renamed.append(value)
        palette.tags = renamed
    return len(palettes)


async def update_tag(db: AsyncSession, tag: models.Tag, tag_data: schemas.TagUpdate) -> models.Tag:
    data = tag_data.model_dump(exclude_unset=True)

    new_name = data.get("name")
    if new_name is not None and new_name != tag.name:
        await _rename_tag_in_palettes(db, tag.name, new_name)
        tag.name = new_name

    if data.get("kind") is not None:
        tag.kind = data["kind"]

    await db.commit()
    await db.refresh(tag)
    return tag


async def delete_tag_everywhere(db: AsyncSession, name: str) -> int:
    """Remove a tag from the catalog (if present) and strip it from every palette."""
    stmt = select(models.Palette).where(models.Palette.tags.contains([name]))
    palettes = (await db.execute(stmt)).scalars().all()
    for palette in palettes:
        palette.tags = [tag for tag in palette.tags if tag != name]

    tag = await get_tag_by_name(db, name)
    if tag is not None:
        await db.delete(tag)

    await db.commit()
    return len(palettes)


async def create_palette(db: AsyncSession, palette_data: schemas.PaletteCreate) -> models.Palette:
    desired_slug = palette_data.slug or palette_data.name
    slug = await get_unique_slug(db, desired_slug)

    palette = models.Palette(
        slug=slug,
        name=palette_data.name,
        description=palette_data.description,
        colors=palette_data.colors,
        tags=palette_data.tags,
    )

    db.add(palette)
    await db.commit()
    await db.refresh(palette)
    return palette


async def update_palette(
    db: AsyncSession,
    palette: models.Palette,
    palette_data: schemas.PaletteUpdate,
) -> models.Palette:
    data = palette_data.model_dump(exclude_unset=True)

    if "name" in data and data["name"] is not None:
        palette.name = data["name"]
        palette.slug = await get_unique_slug(db, palette.name, current_palette_id=palette.id)

    if "description" in data and data["description"] is not None:
        palette.description = data["description"]

    if "colors" in data and data["colors"] is not None:
        palette.colors = data["colors"]

    if "tags" in data and data["tags"] is not None:
        palette.tags = data["tags"]

    await db.commit()
    await db.refresh(palette)
    return palette


async def delete_palette(db: AsyncSession, palette: models.Palette) -> None:
    await db.delete(palette)
    await db.commit()


async def create_many_if_empty(db: AsyncSession, palettes: Iterable[schemas.PaletteCreate]) -> int:
    existing_count = await db.scalar(select(func.count(models.Palette.id)))
    if existing_count and existing_count > 0:
        return 0

    created_count = 0
    for palette_data in palettes:
        await create_palette(db, palette_data)
        created_count += 1

    return created_count


async def get_user(db: AsyncSession, user_id: int) -> models.User | None:
    return await db.get(models.User, user_id)


async def get_user_by_username(db: AsyncSession, username: str) -> models.User | None:
    stmt = select(models.User).where(models.User.username == username)
    return (await db.execute(stmt)).scalars().first()


async def get_user_by_email(db: AsyncSession, email: str) -> models.User | None:
    stmt = select(models.User).where(models.User.email == email.lower())
    return (await db.execute(stmt)).scalars().first()


async def create_user(
    db: AsyncSession,
    user_data: schemas.UserCreate,
    password_hash: str,
    is_admin: bool = False,
    email_verified: bool = False,
) -> models.User:
    user = models.User(
        username=user_data.username,
        email=user_data.email,
        password_hash=password_hash,
        is_admin=is_admin,
        email_verified=email_verified,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def set_email_verified(db: AsyncSession, user: models.User) -> models.User:
    user.email_verified = True
    user.email_verified_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(user)
    return user


async def is_only_admin(db: AsyncSession, user: models.User) -> bool:
    if not user.is_admin:
        return False

    stmt = select(models.User).where(models.User.is_admin.is_(True), models.User.id != user.id)
    other_admin = (await db.execute(stmt)).scalars().first()
    return other_admin is None


async def create_admin_if_missing(
    db: AsyncSession, username: str, email: str, password_hash: str
) -> models.User | None:
    admin_exists = (
        (await db.execute(select(models.User).where(models.User.is_admin.is_(True))))
        .scalars()
        .first()
    )
    if admin_exists:
        changed = False
        if not admin_exists.email:
            admin_exists.email = email
            changed = True
        if not admin_exists.email_verified:
            admin_exists.email_verified = True
            changed = True
        if changed:
            await db.commit()
            await db.refresh(admin_exists)
        return None

    existing_user = await get_user_by_username(db, username)
    if existing_user:
        existing_user.is_admin = True
        existing_user.email = existing_user.email or email
        existing_user.password_hash = password_hash
        existing_user.email_verified = True
        await db.commit()
        await db.refresh(existing_user)
        return existing_user

    user = models.User(
        username=username,
        email=email,
        password_hash=password_hash,
        is_admin=True,
        email_verified=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def get_user_favorite_palettes(db: AsyncSession, user: models.User) -> list[models.Palette]:
    stmt = (
        select(models.Palette)
        .join(models.Favorite, models.Favorite.palette_id == models.Palette.id)
        .where(models.Favorite.user_id == user.id)
        .order_by(models.Favorite.created_at.desc())
    )
    return list((await db.execute(stmt)).scalars().all())


async def get_user_favorite_keys(db: AsyncSession, user: models.User) -> list[str]:
    return [palette.slug for palette in await get_user_favorite_palettes(db, user)]


async def is_user_favorite(db: AsyncSession, user: models.User, palette: models.Palette) -> bool:
    stmt = select(models.Favorite).where(
        models.Favorite.user_id == user.id,
        models.Favorite.palette_id == palette.id,
    )
    return (await db.execute(stmt)).scalars().first() is not None


async def add_user_favorite(
    db: AsyncSession, user: models.User, palette: models.Palette
) -> models.Palette:
    stmt = select(models.Favorite).where(
        models.Favorite.user_id == user.id,
        models.Favorite.palette_id == palette.id,
    )
    if (await db.execute(stmt)).scalars().first():
        return palette

    favorite = models.Favorite(user_id=user.id, palette_id=palette.id)
    db.add(favorite)
    await db.commit()
    return palette


async def remove_user_favorite(
    db: AsyncSession, user: models.User, palette: models.Palette
) -> bool:
    stmt = select(models.Favorite).where(
        models.Favorite.user_id == user.id,
        models.Favorite.palette_id == palette.id,
    )
    favorite = (await db.execute(stmt)).scalars().first()
    if favorite is None:
        return False

    await db.delete(favorite)
    await db.commit()
    return True


async def clear_user_favorites(db: AsyncSession, user: models.User) -> int:
    deleted_count = await db.scalar(
        select(func.count(models.Favorite.id)).where(models.Favorite.user_id == user.id)
    )
    await db.execute(delete(models.Favorite).where(models.Favorite.user_id == user.id))
    await db.commit()
    return deleted_count or 0


async def update_user_password(
    db: AsyncSession, user: models.User, password_hash: str
) -> models.User:
    user.password_hash = password_hash
    await db.commit()
    await db.refresh(user)
    return user


async def bump_token_version(db: AsyncSession, user: models.User) -> models.User:
    """Invalidate every access token already issued for this user.

    Call alongside revoke_all_refresh_tokens wherever a session must end everywhere at once.
    Deliberately not part of update_user_password: that is also used for the transparent
    Argon2 rehash on login, which must not log anyone out.
    """
    user.token_version += 1
    await db.commit()
    await db.refresh(user)
    return user


async def delete_user(db: AsyncSession, user: models.User) -> None:
    # No ON DELETE cascade, so remove dependent rows before deleting the user.
    await db.execute(delete(models.Favorite).where(models.Favorite.user_id == user.id))
    await db.execute(delete(models.RefreshToken).where(models.RefreshToken.user_id == user.id))
    await db.delete(user)
    await db.commit()


async def create_refresh_token(
    db: AsyncSession, user_id: int, token_hash: str, expires_at: datetime
) -> models.RefreshToken:
    token = models.RefreshToken(user_id=user_id, token_hash=token_hash, expires_at=expires_at)
    db.add(token)
    await db.commit()
    await db.refresh(token)
    return token


async def get_refresh_token(db: AsyncSession, token_hash: str) -> models.RefreshToken | None:
    stmt = select(models.RefreshToken).where(models.RefreshToken.token_hash == token_hash)
    return (await db.execute(stmt)).scalars().first()


async def revoke_refresh_token(db: AsyncSession, token: models.RefreshToken) -> None:
    token.revoked = True
    await db.commit()


async def revoke_all_refresh_tokens(db: AsyncSession, user_id: int) -> None:
    """Invalidate every refresh token for a user — used after a password reset so any
    existing sessions are logged out."""
    await db.execute(delete(models.RefreshToken).where(models.RefreshToken.user_id == user_id))
    await db.commit()

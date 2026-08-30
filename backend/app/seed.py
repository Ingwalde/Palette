import json
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession

from .crud import create_many_if_empty
from .schemas import PaletteCreate

# Default starter palettes live in data (seed_palettes.json) rather than inline code, so
# the content can be edited without touching Python. They are only inserted on first run
# (create_many_if_empty), when the palettes table is empty.
_PALETTES_FILE = Path(__file__).parent / "seed_palettes.json"


def _load_default_palettes() -> list[PaletteCreate]:
    raw = json.loads(_PALETTES_FILE.read_text(encoding="utf-8"))
    return [PaletteCreate(**item) for item in raw]


DEFAULT_PALETTES = _load_default_palettes()


async def seed_default_palettes(db: AsyncSession) -> int:
    return await create_many_if_empty(db, DEFAULT_PALETTES)


# Standard "what is this palette for" categories, seeded into the tag catalog as
# kind="purpose". Idempotent per name, so editing this list only adds new ones.
DEFAULT_PURPOSE_TAGS = [
    "web",
    "branding",
    "ui",
    "print",
    "poster",
    "packaging",
    "illustration",
    "data-viz",
    "presentation",
    "game",
]


async def seed_default_tags(db: AsyncSession) -> int:
    from sqlalchemy import select

    from .crud import create_tag
    from .models import Tag
    from .schemas import TagCreate

    # One query for which of the defaults already exist, instead of a SELECT per name every
    # startup. Only the missing ones are created.
    existing = set(
        (await db.execute(select(Tag.name).where(Tag.name.in_(DEFAULT_PURPOSE_TAGS)))).scalars()
    )
    created = 0
    for name in DEFAULT_PURPOSE_TAGS:
        if name not in existing:
            await create_tag(db, TagCreate(name=name, kind="purpose"))
            created += 1
    return created


async def seed_default_admin_user(db: AsyncSession) -> bool:
    from .config import settings
    from .crud import create_admin_if_missing
    from .security import hash_password

    created_user = await create_admin_if_missing(
        db=db,
        username=settings.default_admin_username,
        email=settings.default_admin_email,
        password_hash=hash_password(settings.default_admin_password),
    )
    return created_user is not None

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

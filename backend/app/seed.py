from sqlalchemy.orm import Session

from .crud import create_many_if_empty
from .schemas import PaletteCreate

DEFAULT_PALETTES = [
    PaletteCreate(
        name="Navy Orange",
        description="Deep navy colors with a bright orange accent for strong visual hierarchy.",
        colors=["#0d1846", "#406eb7", "#e95623", "#e3e3e3"],
        tags=["contrast", "dark", "modern"],
    ),
    PaletteCreate(
        name="Pink Sunflower",
        description="Soft pastel palette with a dark base and warm yellow accent.",
        colors=["#191919", "#F6D883", "#F3F3EE", "#FCD5D3"],
        tags=["pastel", "warm", "soft"],
    ),
    PaletteCreate(
        name="Green Strawberry",
        description="Natural green tones mixed with strawberry red shades.",
        colors=["#ED402F", "#6B7F64", "#D59A7A", "#9C0D0F"],
        tags=["nature", "warm", "bold"],
    ),
    PaletteCreate(
        name="Sea Breeze",
        description="Fresh blue and green colors inspired by the sea.",
        colors=["#005f73", "#0a9396", "#94d2bd", "#e9d8a6"],
        tags=["cold", "sea", "calm"],
    ),
    PaletteCreate(
        name="Eco",
        description="Muted earth colors for calm eco-oriented designs.",
        colors=["#6b705c", "#a5a58d", "#b7b7a4", "#cb997e"],
        tags=["eco", "nature", "minimal"],
    ),
    PaletteCreate(
        name="Minimalism",
        description="Neutral dark palette with a soft beige color for balance.",
        colors=["#2c3639", "#3f4e4f", "#a27b5b", "#dcd7c9"],
        tags=["minimal", "dark", "neutral"],
    ),
    PaletteCreate(
        name="Christmas Nostalgia",
        description="Warm festive colors with a nostalgic winter feeling.",
        colors=["#f1e5d1", "#c75d4d", "#325c46", "#7a3e3e"],
        tags=["holiday", "warm", "retro"],
    ),
    PaletteCreate(
        name="Lavender Night",
        description="Purple night palette for creative and atmospheric interfaces.",
        colors=["#1f1b2e", "#4a3f73", "#9f86c0", "#e0b1cb"],
        tags=["dark", "purple", "creative"],
    ),
    PaletteCreate(
        name="Desert Clay",
        description="Warm clay and sand colors for cozy visual design.",
        colors=["#6f4e37", "#a47551", "#d0a98f", "#f4e1d2"],
        tags=["warm", "earth", "neutral"],
    ),
    PaletteCreate(
        name="Nordic Frost",
        description="Clean Nordic palette with cold blue and light gray tones.",
        colors=["#233142", "#455d7a", "#f7f7f7", "#e3e3e3"],
        tags=["cold", "nordic", "clean"],
    ),
    PaletteCreate(
        name="Matcha Cream",
        description="Green matcha-inspired palette with a creamy background tone.",
        colors=["#3a5a40", "#588157", "#a3b18a", "#dad7cd"],
        tags=["nature", "green", "soft"],
    ),
    PaletteCreate(
        name="Retro Pop",
        description="Bright retro colors for expressive and energetic designs.",
        colors=["#2d1e2f", "#f9c80e", "#f86624", "#43bccd"],
        tags=["retro", "bold", "contrast"],
    ),
]


def seed_default_palettes(db: Session) -> int:
    return create_many_if_empty(db, DEFAULT_PALETTES)



def seed_default_admin_user(db: Session) -> bool:
    from .config import DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD, DEFAULT_ADMIN_USERNAME
    from .crud import create_admin_if_missing
    from .security import hash_password

    created_user = create_admin_if_missing(
        db=db,
        username=DEFAULT_ADMIN_USERNAME,
        email=DEFAULT_ADMIN_EMAIL,
        password_hash=hash_password(DEFAULT_ADMIN_PASSWORD),
    )
    return created_user is not None

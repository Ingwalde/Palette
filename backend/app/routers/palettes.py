from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from .. import crud, models, schemas
from ..database import get_db
from ..rate_limit import limiter
from ..security import get_current_user, get_optional_user

router = APIRouter(prefix="/palettes", tags=["palettes"])

# Generous ceiling on write operations — enough for real editing, a brake on abuse.
_WRITE_LIMIT = "60/minute"
# Creation is the spam vector (each makes a row), so it is capped harder than edits.
_CREATE_LIMIT = "20/hour"
_REPORT_LIMIT = "10/hour"


@router.get("", response_model=schemas.PaletteList)
async def read_palettes(
    response: Response,
    search: str | None = Query(
        default=None, description="Search by name, description, slug or tag"
    ),
    tag: str | None = Query(default=None, description="Filter by tag"),
    sort: str = Query(default="default", pattern="^(default|az|za|new|popular|curated)$"),
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


@router.get("/mine", response_model=schemas.PaletteList)
async def read_my_palettes(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """The signed-in user's own palettes, private ones included — declared before /{slug} so
    "mine" is not read as a slug."""
    items = await crud.get_palettes_for_user(db, current_user.id)
    return {"items": items, "total": len(items), "limit": len(items), "offset": 0}


@router.get("/{slug}", response_model=schemas.PaletteRead)
async def read_palette(
    slug: str,
    db: AsyncSession = Depends(get_db),
    viewer: models.User | None = Depends(get_optional_user),
):
    palette = await crud.get_palette_by_slug(db, slug)

    # A private palette is 404 to anyone but its owner or an admin — a 404, not a 403, so its
    # existence is not disclosed.
    if palette is None or not crud.palette_visible_to(palette, viewer):
        raise HTTPException(status_code=404, detail="Palette not found")

    return palette


@router.post("", response_model=schemas.PaletteRead, status_code=status.HTTP_201_CREATED)
@limiter.limit(_CREATE_LIMIT)
async def create_palette(
    request: Request,
    palette_data: schemas.PaletteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Any signed-in user creates palettes now, not only admins; the palette is created private
    # (the model default) and made public later by publishing.
    return await crud.create_palette(db, palette_data, owner_id=current_user.id)


@router.post(
    "/{palette_id}/fork",
    response_model=schemas.PaletteRead,
    status_code=status.HTTP_201_CREATED,
)
@limiter.limit(_CREATE_LIMIT)
async def fork_palette(
    request: Request,
    palette_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Copy a palette into your own account as a private draft, with its lineage recorded. Only a
    palette you can see may be forked — a private one you do not own 404s."""
    source = await crud.get_palette(db, palette_id)
    if source is None or not crud.palette_visible_to(source, current_user):
        raise HTTPException(status_code=404, detail="Palette not found")
    return await crud.fork_palette(db, source, current_user.id)


@router.post(
    "/{palette_id}/report",
    response_model=schemas.ReportRead,
    status_code=status.HTTP_201_CREATED,
)
@limiter.limit(_REPORT_LIMIT)
async def report_palette(
    request: Request,
    palette_id: int,
    report_data: schemas.ReportCreate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Flag a palette for moderation. Only a palette you can see may be reported; a second report
    of the same palette by the same user is idempotent."""
    palette = await crud.get_palette(db, palette_id)
    if palette is None or not crud.palette_visible_to(palette, current_user):
        raise HTTPException(status_code=404, detail="Palette not found")
    return await crud.create_report(
        db, palette.id, current_user.id, report_data.reason, report_data.detail
    )


async def _owned_palette(palette_id: int, db: AsyncSession, user: models.User) -> models.Palette:
    """The palette, if it exists and the user may edit it — otherwise 404. Editing another user's
    palette 404s rather than 403s, so its existence is not disclosed."""
    palette = await crud.get_palette(db, palette_id)
    if palette is None or not crud.palette_editable_by(palette, user):
        raise HTTPException(status_code=404, detail="Palette not found")
    return palette


@router.put("/{palette_id}", response_model=schemas.PaletteRead)
@limiter.limit(_WRITE_LIMIT)
async def update_palette(
    request: Request,
    palette_id: int,
    palette_data: schemas.PaletteUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    palette = await _owned_palette(palette_id, db, current_user)
    return await crud.update_palette(db, palette, palette_data)


@router.delete("/{palette_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(_WRITE_LIMIT)
async def delete_palette(
    request: Request,
    palette_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    palette = await _owned_palette(palette_id, db, current_user)
    await crud.delete_palette(db, palette)
    return

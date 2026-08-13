from urllib.parse import unquote

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from .. import crud, schemas
from ..database import get_db
from ..rate_limit import limiter
from ..schemas import normalize_tag
from ..security import require_admin_user

router = APIRouter(prefix="/tags", tags=["tags"])

_WRITE_LIMIT = "60/minute"


@router.get("", response_model=list[schemas.TagRead])
async def read_tag_catalog(db: AsyncSession = Depends(get_db)):
    """Full tag catalog with kind and palette usage count. Public, so the palette form and
    filters can offer suggestions."""
    return await crud.list_tag_catalog(db)


@router.post("", response_model=schemas.TagRead, status_code=status.HTTP_201_CREATED)
@limiter.limit(_WRITE_LIMIT)
async def create_tag(
    request: Request,
    tag_data: schemas.TagCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin_user),
):
    if await crud.get_tag_by_name(db, tag_data.name) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Tag already exists")

    tag = await crud.create_tag(db, tag_data)
    return {"name": tag.name, "kind": tag.kind, "count": 0}


@router.patch("/{name}", response_model=schemas.TagRead)
@limiter.limit(_WRITE_LIMIT)
async def update_tag(
    request: Request,
    name: str,
    tag_data: schemas.TagUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin_user),
):
    current_name = normalize_tag(unquote(name))
    tag = await crud.get_tag_by_name(db, current_name)

    # A tag may exist only inside palette JSONB arrays (not yet in the catalog); adopt it
    # into the catalog so it can be renamed / reclassified.
    if tag is None:
        if not await crud.tag_in_use(db, current_name):
            raise HTTPException(status_code=404, detail="Tag not found")
        tag = await crud.create_tag(db, schemas.TagCreate(name=current_name, kind="free"))

    new_name = tag_data.name
    if new_name is not None and new_name != tag.name:
        clash = await crud.get_tag_by_name(db, new_name)
        if clash is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Another tag with that name already exists",
            )

    updated = await crud.update_tag(db, tag, tag_data)
    count = await crud.count_palettes_with_tag(db, updated.name)
    return {"name": updated.name, "kind": updated.kind, "count": count}


@router.delete("/{name}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(_WRITE_LIMIT)
async def delete_tag(
    request: Request,
    name: str,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin_user),
):
    target = normalize_tag(unquote(name))
    tag = await crud.get_tag_by_name(db, target)

    if tag is None and not await crud.tag_in_use(db, target):
        raise HTTPException(status_code=404, detail="Tag not found")

    await crud.delete_tag_everywhere(db, target)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

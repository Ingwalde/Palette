from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from .. import crud, schemas
from ..database import get_db
from ..rate_limit import limiter
from ..security import require_admin_user

router = APIRouter(prefix="/reports", tags=["reports"])

_ADMIN_LIMIT = "60/minute"


@router.get("", response_model=list[schemas.ReportRead])
async def list_reports(
    db: AsyncSession = Depends(get_db),
    _: object = Depends(require_admin_user),
):
    """The admin review queue: open reports, newest first."""
    return await crud.list_open_reports(db)


@router.post("/{report_id}/action", response_model=schemas.ReportRead)
@limiter.limit(_ADMIN_LIMIT)
async def action_report(
    request: Request,
    report_id: int,
    db: AsyncSession = Depends(get_db),
    _: object = Depends(require_admin_user),
):
    """Uphold a report — remove the palette (soft takedown) and close the report."""
    report = await crud.get_report(db, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    return await crud.action_report(db, report)


@router.post("/{report_id}/dismiss", response_model=schemas.ReportRead)
@limiter.limit(_ADMIN_LIMIT)
async def dismiss_report(
    request: Request,
    report_id: int,
    db: AsyncSession = Depends(get_db),
    _: object = Depends(require_admin_user),
):
    report = await crud.get_report(db, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    return await crud.dismiss_report(db, report)

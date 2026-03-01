from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List

from app.database import get_db
from app.models import ActivityLog, Profile
from app.schemas import ActivityLogOut
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/api/activity-log", tags=["activity-log"])


@router.get("", response_model=List[ActivityLogOut])
async def list_activity_log(
    action: Optional[str] = Query(None),
    limit: int = Query(100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    query = select(ActivityLog).order_by(ActivityLog.created_at.desc()).limit(limit)

    if action:
        query = query.where(ActivityLog.action == action)

    # Members see only their own activity
    if current_user["role"] == "member":
        from uuid import UUID
        query = query.where(ActivityLog.user_id == UUID(current_user["id"]))

    result = await db.execute(query)
    logs = result.scalars().all()

    # Fetch user names
    user_ids = list({log.user_id for log in logs if log.user_id})
    name_map = {}
    if user_ids:
        profiles = (await db.execute(
            select(Profile).where(Profile.id.in_(user_ids))
        )).scalars().all()
        name_map = {str(p.id): p.full_name or "Unknown" for p in profiles}

    return [
        ActivityLogOut(
            id=log.id,
            user_id=log.user_id,
            action=log.action,
            entity_type=log.entity_type,
            entity_id=log.entity_id,
            details=log.details,
            created_at=log.created_at,
            user_name=name_map.get(str(log.user_id), "System") if log.user_id else "System",
        )
        for log in logs
    ]
